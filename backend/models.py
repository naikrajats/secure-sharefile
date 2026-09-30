import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

def ensure_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=utc_now)
    is_active = Column(Boolean, default=True, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)

    files = relationship("FileRecord", back_populates="owner", cascade="all, delete-orphan")
    shares = relationship("ShareLink", back_populates="creator", cascade="all, delete-orphan")
    received_shares = relationship("ShareRecipient", back_populates="recipient", cascade="all, delete-orphan")
    share_views = relationship("ShareView", back_populates="viewer")
    reports = relationship("ContentReport", back_populates="reporter", cascade="all, delete-orphan")

class FileRecord(Base):
    __tablename__ = "files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    original_name = Column(String(255), nullable=False)
    storage_uuid = Column(String(36), unique=True, nullable=False, default=generate_uuid)
    size_bytes = Column(Integer, nullable=False)
    mime_type = Column(String(128), default="application/octet-stream")
    checksum_sha256 = Column(String(64), nullable=True)
    is_deleted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    owner = relationship("User", back_populates="files")
    shares = relationship("ShareLink", back_populates="file", cascade="all, delete-orphan")

class ShareLink(Base):
    __tablename__ = "shares"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    file_id = Column(String(36), ForeignKey("files.id"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    token = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)
    expires_at = Column(DateTime, nullable=False)
    max_downloads = Column(Integer, default=1)  # 0 or negative = unlimited
    download_count = Column(Integer, default=0, nullable=False)
    burn_after_reading = Column(Boolean, default=False)
    allow_download = Column(Boolean, default=True, nullable=False)
    is_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    creator = relationship("User", back_populates="shares")
    file = relationship("FileRecord", back_populates="shares")
    audit_logs = relationship("AuditLog", back_populates="share", cascade="all, delete-orphan", order_by="desc(AuditLog.accessed_at)")
    recipients = relationship("ShareRecipient", back_populates="share", cascade="all, delete-orphan")
    view_events = relationship("ShareView", back_populates="share", cascade="all, delete-orphan")

    @property
    def is_expired(self) -> bool:
        now = datetime.now(timezone.utc)
        # handle offset-naive vs offset-aware comparisons
        exp = self.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        return now > exp

    @property
    def is_exhausted(self) -> bool:
        if self.max_downloads > 0 and self.download_count >= self.max_downloads:
            return True
        return False

    @property
    def status(self) -> str:
        if self.is_revoked:
            return "REVOKED"
        if self.is_expired:
            return "EXPIRED"
        if self.is_exhausted:
            return "EXHAUSTED"
        return "ACTIVE"

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    share_id = Column(String(36), ForeignKey("shares.id"), nullable=False)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(Text, nullable=True)
    status = Column(String(32), nullable=False)  # SUCCESS, EXPIRED, EXHAUSTED, REVOKED, WRONG_PASSWORD, BLOCKED
    accessed_at = Column(DateTime, default=utc_now)

    share = relationship("ShareLink", back_populates="audit_logs")

class ShareRecipient(Base):
    __tablename__ = "share_recipients"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    share_id = Column(String(36), ForeignKey("shares.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=utc_now)

    share = relationship("ShareLink", back_populates="recipients")
    recipient = relationship("User", back_populates="received_shares")

class ShareView(Base):
    __tablename__ = "share_views"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    share_id = Column(String(36), ForeignKey("shares.id"), nullable=False, index=True)
    viewer_id = Column(String(36), ForeignKey("users.id"), nullable=True, index=True)
    viewer_name = Column(String(255), nullable=True)
    viewer_email = Column(String(255), nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(Text, nullable=True)
    viewed_at = Column(DateTime, default=utc_now)

    share = relationship("ShareLink", back_populates="view_events")
    viewer = relationship("User", back_populates="share_views")

class ContentReport(Base):
    __tablename__ = "content_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    reporter_id = Column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    target_type = Column(String(16), nullable=False)
    target_id = Column(String(36), nullable=False, index=True)
    reason = Column(String(80), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(String(16), default="OPEN", nullable=False, index=True)
    resolution_note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    reporter = relationship("User", back_populates="reports")

