from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta, timezone

from database import get_db
from models import User, FileRecord, ShareLink, AuditLog, ShareRecipient, ShareView, ensure_utc
from routes.auth import get_current_user
from security import generate_signed_share_token, hash_password

router = APIRouter(prefix="/api/shares", tags=["Shares"])

class CreateShareRequest(BaseModel):
    file_id: str
    expires_in_minutes: int = Field(default=60, ge=1, le=10080) # 1 min to 7 days
    max_downloads: int = Field(default=1, ge=0) # 0 means unlimited
    password: Optional[str] = None
    burn_after_reading: bool = False
    recipient_emails: List[str] = Field(default_factory=list, max_length=50)
    allow_download: bool = True

class ShareViewerResponse(BaseModel):
    full_name: Optional[str]
    email: Optional[str]
    ip_address: Optional[str]
    viewed_at: datetime

class AuditLogResponse(BaseModel):
    id: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    status: str
    accessed_at: datetime

class ShareResponse(BaseModel):
    id: str
    file_id: str
    file_name: str
    file_size_bytes: int
    token: str
    share_url: str
    expires_at: datetime
    max_downloads: int
    download_count: int
    burn_after_reading: bool
    allow_download: bool
    is_password_protected: bool
    status: str
    created_at: datetime
    audit_logs_count: int
    recipient_emails: List[str]
    viewers_count: int
    viewers: List[ShareViewerResponse]

def build_share_response(share: ShareLink) -> ShareResponse:
    viewers = [
        ShareViewerResponse(
            full_name=view.viewer.full_name if view.viewer else None,
            email=view.viewer.email if view.viewer else view.viewer_email,
            ip_address=view.ip_address if not view.viewer else None,
            viewed_at=ensure_utc(view.viewed_at),
        )
        for view in sorted(share.view_events, key=lambda item: item.viewed_at, reverse=True)
    ]
    return ShareResponse(
        id=share.id,
        file_id=share.file.id,
        file_name=share.file.original_name,
        file_size_bytes=share.file.size_bytes,
        token=share.token,
        share_url=f"/share/{share.token}",
        expires_at=ensure_utc(share.expires_at),
        max_downloads=share.max_downloads,
        download_count=share.download_count,
        burn_after_reading=share.burn_after_reading,
        allow_download=share.allow_download,
        is_password_protected=bool(share.password_hash),
        status=share.status,
        created_at=share.created_at,
        audit_logs_count=len(share.audit_logs),
        recipient_emails=sorted(recipient.recipient.email for recipient in share.recipients),
        viewers_count=len(viewers),
        viewers=viewers,
    )

@router.post("", response_model=ShareResponse)
def create_share(
    req: CreateShareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify file ownership
    file_record = db.query(FileRecord).filter(
        FileRecord.id == req.file_id,
        FileRecord.user_id == current_user.id,
        FileRecord.is_deleted == False
    ).first()

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found or has been deleted")

    if req.burn_after_reading and not req.allow_download:
        raise HTTPException(status_code=400, detail="Burn-after-reading requires downloads to be enabled")

    recipient_emails = sorted({email.strip().lower() for email in req.recipient_emails if email.strip()})
    if current_user.email in recipient_emails:
        raise HTTPException(status_code=400, detail="You cannot add yourself as a recipient")
    recipients = db.query(User).filter(User.email.in_(recipient_emails)).all() if recipient_emails else []
    found_emails = {recipient.email for recipient in recipients}
    missing_emails = [email for email in recipient_emails if email not in found_emails]
    if missing_emails:
        raise HTTPException(
            status_code=404,
            detail=f"SecureDrive account not found for: {', '.join(missing_emails)}",
        )

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=req.expires_in_minutes)
    
    max_downloads = 1 if req.burn_after_reading else req.max_downloads
    password_hash = hash_password(req.password) if req.password and req.password.strip() else None

    # Instantiate ShareLink record
    share = ShareLink(
        file_id=file_record.id,
        user_id=current_user.id,
        token="temp-token",
        password_hash=password_hash,
        expires_at=expires_at,
        max_downloads=max_downloads,
        download_count=0,
        burn_after_reading=req.burn_after_reading,
        allow_download=req.allow_download,
        is_revoked=False
    )
    db.add(share)
    db.flush()

    db.add_all(
        ShareRecipient(share_id=share.id, user_id=recipient.id)
        for recipient in recipients
    )

    # Generate HMAC-SHA256 signed access token
    signed_token = generate_signed_share_token(
        share_id=share.id,
        file_id=file_record.id,
        expires_at=expires_at,
        max_downloads=max_downloads
    )
    share.token = signed_token
    db.commit()
    db.refresh(share)

    return build_share_response(share)

@router.get("", response_model=List[ShareResponse])
def list_shares(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    shares = db.query(ShareLink).filter(
        ShareLink.user_id == current_user.id
    ).order_by(ShareLink.created_at.desc()).all()

    return [build_share_response(share) for share in shares]

@router.post("/{share_id}/revoke")
def revoke_share(
    share_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    share = db.query(ShareLink).filter(
        ShareLink.id == share_id,
        ShareLink.user_id == current_user.id
    ).first()

    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")

    share.is_revoked = True
    db.commit()
    return {"message": "Share link has been revoked immediately", "status": "REVOKED"}

@router.get("/{share_id}/logs", response_model=List[AuditLogResponse])
def get_share_audit_logs(
    share_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    share = db.query(ShareLink).filter(
        ShareLink.id == share_id,
        ShareLink.user_id == current_user.id
    ).first()

    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")

    logs = db.query(AuditLog).filter(
        AuditLog.share_id == share.id
    ).order_by(AuditLog.accessed_at.desc()).all()

    return [
        AuditLogResponse(
            id=log.id,
            ip_address=log.ip_address,
            user_agent=log.user_agent,
            status=log.status,
            accessed_at=log.accessed_at
        )
        for log in logs
    ]
