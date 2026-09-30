import os
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from database import get_db
from models import ShareLink, FileRecord, AuditLog, ShareView, User, ensure_utc
from routes.auth import get_optional_current_user
from security import verify_signed_share_token, verify_password
from storage_manager import get_file_path, delete_stored_file

router = APIRouter(prefix="/api/public/shares", tags=["Public Recipient"])

class ShareInfoResponse(BaseModel):
    valid: bool
    status: str # ACTIVE, EXPIRED, EXHAUSTED, REVOKED, AUTH_REQUIRED, INVALID_SIGNATURE, NOT_FOUND
    file_name: Optional[str] = None
    size_bytes: Optional[int] = None
    mime_type: Optional[str] = None
    expires_at: Optional[datetime] = None
    max_downloads: Optional[int] = None
    download_count: Optional[int] = None
    downloads_left: Optional[int] = None
    burn_after_reading: bool = False
    allow_download: bool = True
    requires_password: bool = False
    error_message: Optional[str] = None

class DownloadRequest(BaseModel):
    password: Optional[str] = None

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

def log_audit(db: Session, share_id: str, ip: str, ua: str, status_code: str):
    try:
        audit = AuditLog(
            share_id=share_id,
            ip_address=ip[:64] if ip else None,
            user_agent=ua[:500] if ua else None,
            status=status_code
        )
        db.add(audit)
        db.commit()
    except Exception:
        db.rollback()

def can_access_share(share: ShareLink, current_user: Optional[User]) -> bool:
    if not share.recipients:
        return True
    if current_user and current_user.id == share.user_id:
        return True
    return bool(current_user and any(recipient.user_id == current_user.id for recipient in share.recipients))

def record_share_view(db: Session, share: ShareLink, current_user: Optional[User], ip: str, user_agent: str):
    if current_user and current_user.id == share.user_id:
        return

    existing_view = db.query(ShareView).filter(ShareView.share_id == share.id)
    if current_user:
        existing_view = existing_view.filter(ShareView.viewer_id == current_user.id)
    else:
        existing_view = existing_view.filter(
            ShareView.viewer_id.is_(None),
            ShareView.ip_address == ip,
        )
    if existing_view.first():
        return

    db.add(
        ShareView(
            share_id=share.id,
            viewer_id=current_user.id if current_user else None,
            viewer_name=current_user.full_name if current_user else None,
            viewer_email=current_user.email if current_user else None,
            ip_address=ip[:64] if ip else None,
            user_agent=user_agent[:500] if user_agent else None,
        )
    )
    db.commit()

@router.get("/{token}/info", response_model=ShareInfoResponse)
def get_share_info(
    token: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    # 1. Cryptographic Signature Verification
    is_valid, is_token_expired, payload, error = verify_signed_share_token(token)
    if not is_valid:
        return ShareInfoResponse(
            valid=False,
            status="INVALID_SIGNATURE",
            error_message=error or "Cryptographic signature invalid or link tampered"
        )

    # 2. Database Lookup
    share = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not share or not share.file or share.file.is_deleted:
        return ShareInfoResponse(
            valid=False,
            status="NOT_FOUND",
            error_message="Share link no longer exists"
        )

    file_record = share.file

    if not can_access_share(share, current_user):
        return ShareInfoResponse(
            valid=False,
            status="AUTH_REQUIRED",
            allow_download=share.allow_download,
            error_message="This link is limited to invited SecureDrive accounts. Sign in with an invited account.",
        )

    # Calculate remaining downloads
    downloads_left = None
    if share.max_downloads > 0:
        downloads_left = max(0, share.max_downloads - share.download_count)

    share_status = share.status
    if is_token_expired and share_status == "ACTIVE":
        share_status = "EXPIRED"

    if share_status == "ACTIVE":
        record_share_view(
            db,
            share,
            current_user,
            get_client_ip(request),
            request.headers.get("user-agent", "unknown"),
        )

    return ShareInfoResponse(
        valid=(share_status == "ACTIVE"),
        status=share_status,
        file_name=file_record.original_name,
        size_bytes=file_record.size_bytes,
        mime_type=file_record.mime_type,
        expires_at=ensure_utc(share.expires_at),
        max_downloads=share.max_downloads,
        download_count=share.download_count,
        downloads_left=downloads_left,
        burn_after_reading=share.burn_after_reading,
        allow_download=share.allow_download,
        requires_password=bool(share.password_hash),
        error_message=None if share_status == "ACTIVE" else f"This link is {share_status.lower()}"
    )

@router.post("/{token}/download")
def download_shared_file(
    token: str,
    req: DownloadRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    ip = get_client_ip(request)
    ua = request.headers.get("user-agent", "unknown")

    # 1. Cryptographic Signature Verification
    is_valid, is_token_expired, payload, error = verify_signed_share_token(token)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error or "Cryptographic verification failed: link signature is invalid or tampered"
        )

    # 2. Database Lookup
    share = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not share or not share.file or share.file.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File or link not found")

    if not can_access_share(share, current_user):
        log_audit(db, share.id, ip, ua, "BLOCKED")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This link is limited to invited SecureDrive accounts",
        )

    # 3. Status checks with Audit Logging
    if share.is_revoked:
        log_audit(db, share.id, ip, ua, "REVOKED")
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This link was revoked by the sender")

    if share.is_expired or is_token_expired:
        log_audit(db, share.id, ip, ua, "EXPIRED")
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This link has expired by time")

    if share.is_exhausted:
        log_audit(db, share.id, ip, ua, "EXHAUSTED")
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Download limit has been reached for this link")

    if not share.allow_download:
        log_audit(db, share.id, ip, ua, "BLOCKED")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="The sender disabled downloads for this link")

    # 4. Password validation
    if share.password_hash:
        if not req.password or not verify_password(req.password, share.password_hash):
            log_audit(db, share.id, ip, ua, "WRONG_PASSWORD")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect passphrase")

    # 5. ATOMIC SQL Counter Increment
    # Defends against race conditions / concurrency bypass attacks
    if share.max_downloads > 0:
        rows_updated = db.query(ShareLink).filter(
            ShareLink.id == share.id,
            ShareLink.download_count < ShareLink.max_downloads,
            ShareLink.is_revoked == False
        ).update(
            {ShareLink.download_count: ShareLink.download_count + 1},
            synchronize_session="fetch"
        )
        if rows_updated == 0:
            log_audit(db, share.id, ip, ua, "EXHAUSTED")
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Download limit reached during simultaneous request"
            )
    else:
        db.query(ShareLink).filter(ShareLink.id == share.id).update(
            {ShareLink.download_count: ShareLink.download_count + 1},
            synchronize_session="fetch"
        )

    # 6. Log successful download
    log_audit(db, share.id, ip, ua, "SUCCESS")
    db.commit()

    file_path = get_file_path(share.file.storage_uuid)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file missing from disk")

    # 7. Burn after reading handler
    if share.burn_after_reading:
        # Mark file as shredded/deleted and schedule disk file deletion
        share.file.is_deleted = True
        db.commit()
        background_tasks.add_task(delete_stored_file, share.file.storage_uuid)

    # 8. Stream file
    return FileResponse(
        path=file_path,
        media_type=share.file.mime_type or "application/octet-stream",
        filename=share.file.original_name,
        headers={
            "Content-Disposition": f'attachment; filename="{share.file.original_name}"',
            "X-Download-Success": "true"
        }
    )

@router.post("/{token}/preview")
def preview_shared_file(
    token: str,
    req: DownloadRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    ip = get_client_ip(request)
    ua = request.headers.get("user-agent", "unknown")

    is_valid, is_token_expired, _, error = verify_signed_share_token(token)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=error or "Invalid share signature")

    share = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not share or not share.file or share.file.is_deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File or link not found")

    if not can_access_share(share, current_user):
        log_audit(db, share.id, ip, ua, "BLOCKED")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This link is limited to invited SecureDrive accounts")

    if share.is_revoked:
        log_audit(db, share.id, ip, ua, "REVOKED")
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This link was revoked by the sender")
    if share.is_expired or is_token_expired:
        log_audit(db, share.id, ip, ua, "EXPIRED")
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="This link has expired by time")
    if share.is_exhausted:
        log_audit(db, share.id, ip, ua, "EXHAUSTED")
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Download limit has been reached for this link")
    if share.password_hash and (not req.password or not verify_password(req.password, share.password_hash)):
        log_audit(db, share.id, ip, ua, "WRONG_PASSWORD")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect passphrase")

    mime_type = share.file.mime_type or "application/octet-stream"
    is_image = mime_type.startswith("image/") and mime_type != "image/svg+xml"
    is_text = mime_type.startswith("text/") and mime_type not in {"text/html", "text/xml"}
    if mime_type != "application/pdf" and not is_image and not is_text:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="In-browser preview is supported for PDFs, images, and text files only",
        )

    file_path = get_file_path(share.file.storage_uuid)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file missing from disk")

    record_share_view(db, share, current_user, ip, ua)
    safe_filename = quote(share.file.original_name, safe="")
    return FileResponse(
        path=file_path,
        media_type=mime_type,
        headers={
            "Content-Disposition": f"inline; filename*=UTF-8''{safe_filename}",
            "X-Content-Type-Options": "nosniff",
        },
    )
