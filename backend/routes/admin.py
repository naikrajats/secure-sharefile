from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database import get_db
from models import AuditLog, ContentReport, FileRecord, ShareLink, User, ensure_utc
from routes.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])
reports_router = APIRouter(prefix="/api/reports", tags=["Reports"])


class UserStatusRequest(BaseModel):
    is_active: bool


class ReportCreateRequest(BaseModel):
    target_type: str = Field(pattern="^(file|user)$")
    target_id: str
    reason: str = Field(min_length=3, max_length=80)
    details: Optional[str] = Field(default=None, max_length=2000)


class ReportResolutionRequest(BaseModel):
    status: str = Field(pattern="^(REVIEWED|DISMISSED)$")
    resolution_note: Optional[str] = Field(default=None, max_length=2000)


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")
    return current_user


def report_target_label(db: Session, report: ContentReport) -> Optional[str]:
    if report.target_type == "user":
        target = db.query(User).filter(User.id == report.target_id).first()
        return target.email if target else "Deleted account"
    target_file = db.query(FileRecord).filter(FileRecord.id == report.target_id).first()
    return target_file.original_name if target_file else "Deleted file"


@router.get("/summary")
def get_admin_summary(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).all()
    files = db.query(FileRecord).filter(FileRecord.is_deleted == False).all()
    shares = db.query(ShareLink).all()
    successful_downloads = db.query(AuditLog).filter(AuditLog.status == "SUCCESS").count()
    open_reports = db.query(ContentReport).filter(ContentReport.status == "OPEN").count()

    return {
        "users_total": len(users),
        "users_active": sum(1 for user in users if user.is_active),
        "files_total": len(files),
        "storage_bytes": sum(file_record.size_bytes for file_record in files),
        "shares_total": len(shares),
        "shares_active": sum(1 for share in shares if share.status == "ACTIVE"),
        "successful_downloads": successful_downloads,
        "open_reports": open_reports,
    }


@router.get("/users")
def list_users(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "is_admin": user.is_admin,
            "created_at": ensure_utc(user.created_at),
            "files_count": sum(1 for file_record in user.files if not file_record.is_deleted),
            "shares_count": len(user.shares),
        }
        for user in users
    ]


@router.patch("/users/{user_id}/activation")
def update_user_activation(
    user_id: str,
    req: UserStatusRequest,
    current_admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.id == current_admin.id and not req.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own admin account")
    if user.is_admin and not req.is_active:
        active_admin_count = db.query(User).filter(User.is_admin == True, User.is_active == True).count()
        if active_admin_count <= 1:
            raise HTTPException(status_code=400, detail="The last active admin cannot be deactivated")

    user.is_active = req.is_active
    db.commit()
    return {"id": user.id, "is_active": user.is_active}


@router.get("/shares")
def list_all_shares(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    shares = db.query(ShareLink).order_by(ShareLink.created_at.desc()).all()
    return [
        {
            "id": share.id,
            "file_name": share.file.original_name,
            "owner_email": share.creator.email,
            "status": share.status,
            "created_at": ensure_utc(share.created_at),
            "expires_at": ensure_utc(share.expires_at),
            "download_count": share.download_count,
            "max_downloads": share.max_downloads,
            "viewers_count": len(share.view_events),
            "is_revoked": share.is_revoked,
        }
        for share in shares
    ]


@router.post("/shares/{share_id}/revoke")
def admin_revoke_share(
    share_id: str,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    share = db.query(ShareLink).filter(ShareLink.id == share_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share link not found")
    share.is_revoked = True
    db.commit()
    return {"id": share.id, "status": "REVOKED"}


@router.get("/activity")
def list_activity(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    events = db.query(AuditLog).order_by(AuditLog.accessed_at.desc()).limit(200).all()
    return [
        {
            "id": event.id,
            "status": event.status,
            "accessed_at": ensure_utc(event.accessed_at),
            "ip_address": event.ip_address,
            "user_agent": event.user_agent,
            "file_name": event.share.file.original_name,
            "owner_email": event.share.creator.email,
            "share_id": event.share_id,
        }
        for event in events
    ]


@router.get("/reports")
def list_reports(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    reports = db.query(ContentReport).order_by(ContentReport.created_at.desc()).limit(500).all()
    return [
        {
            "id": report.id,
            "reporter_email": report.reporter.email,
            "target_type": report.target_type,
            "target_id": report.target_id,
            "target_label": report_target_label(db, report),
            "reason": report.reason,
            "details": report.details,
            "status": report.status,
            "resolution_note": report.resolution_note,
            "created_at": ensure_utc(report.created_at),
        }
        for report in reports
    ]


@router.patch("/reports/{report_id}")
def resolve_report(
    report_id: str,
    req: ReportResolutionRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    report = db.query(ContentReport).filter(ContentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = req.status
    report.resolution_note = req.resolution_note
    report.resolved_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": report.id, "status": report.status}


@reports_router.post("")
def create_report(
    req: ReportCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target_id = req.target_id.strip()
    if req.target_type == "file":
        target = db.query(FileRecord).filter(FileRecord.id == target_id, FileRecord.is_deleted == False).first()
        if not target:
            raise HTTPException(status_code=404, detail="File not found")
    else:
        target = db.query(User).filter(
            User.is_active == True,
            (User.id == target_id) | (User.email == target_id.lower()),
        ).first()
        if not target:
            raise HTTPException(status_code=404, detail="User not found")
        if target.id == current_user.id:
            raise HTTPException(status_code=400, detail="You cannot report your own account")

    duplicate = db.query(ContentReport).filter(
        ContentReport.reporter_id == current_user.id,
        ContentReport.target_type == req.target_type,
        ContentReport.target_id == target_id,
        ContentReport.status == "OPEN",
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="You already have an open report for this item")

    report = ContentReport(
        reporter_id=current_user.id,
        target_type=req.target_type,
        target_id=target_id,
        reason=req.reason.strip(),
        details=req.details.strip() if req.details and req.details.strip() else None,
    )
    db.add(report)
    db.commit()
    return {"id": report.id, "status": report.status}