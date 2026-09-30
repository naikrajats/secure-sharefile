import os
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import User, FileRecord, ShareLink
from routes.auth import get_current_user
from storage_manager import save_uploaded_file, delete_stored_file

router = APIRouter(prefix="/api/files", tags=["Files"])

class FileResponse(BaseModel):
    id: str
    original_name: str
    size_bytes: int
    mime_type: str
    checksum_sha256: Optional[str]
    created_at: datetime
    active_shares_count: int
    total_shares_count: int

@router.post("/upload", response_model=FileResponse)
def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")
    
    # Sanitize filename (defend against path traversal)
    safe_filename = os.path.basename(file.filename)
    
    # Generate unique record
    file_record = FileRecord(
        user_id=current_user.id,
        original_name=safe_filename,
        size_bytes=0,
        mime_type=file.content_type or "application/octet-stream"
    )
    db.add(file_record)
    db.flush()

    try:
        size, checksum = save_uploaded_file(file.file, file_record.storage_uuid)
        file_record.size_bytes = size
        file_record.checksum_sha256 = checksum
        db.commit()
        db.refresh(file_record)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        delete_stored_file(file_record.storage_uuid)
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")

    return FileResponse(
        id=file_record.id,
        original_name=file_record.original_name,
        size_bytes=file_record.size_bytes,
        mime_type=file_record.mime_type,
        checksum_sha256=file_record.checksum_sha256,
        created_at=file_record.created_at,
        active_shares_count=0,
        total_shares_count=0
    )

@router.get("", response_model=List[FileResponse])
def list_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    files = db.query(FileRecord).filter(
        FileRecord.user_id == current_user.id,
        FileRecord.is_deleted == False
    ).order_by(FileRecord.created_at.desc()).all()

    result = []
    for f in files:
        active_count = sum(1 for s in f.shares if s.status == "ACTIVE")
        result.append(
            FileResponse(
                id=f.id,
                original_name=f.original_name,
                size_bytes=f.size_bytes,
                mime_type=f.mime_type,
                checksum_sha256=f.checksum_sha256,
                created_at=f.created_at,
                active_shares_count=active_count,
                total_shares_count=len(f.shares)
            )
        )
    return result

@router.get("/storage/stats")
def get_storage_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    files = db.query(FileRecord).filter(
        FileRecord.user_id == current_user.id,
        FileRecord.is_deleted == False
    ).all()

    used_bytes = sum(f.size_bytes for f in files)
    max_quota_bytes = 500 * 1024 * 1024 # 500 MB quota for hackathon demo

    return {
        "used_bytes": used_bytes,
        "quota_bytes": max_quota_bytes,
        "percentage": round((used_bytes / max_quota_bytes) * 100, 1),
        "file_count": len(files)
    }

@router.get("/{file_id}/content")
def get_file_content(
    file_id: str,
    download: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from fastapi.responses import FileResponse
    from storage_manager import get_file_path

    file_record = db.query(FileRecord).filter(
        FileRecord.id == file_id,
        FileRecord.user_id == current_user.id,
        FileRecord.is_deleted == False
    ).first()

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    file_path = get_file_path(file_record.storage_uuid)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File missing from storage vault")

    disposition_type = "attachment" if download else "inline"

    return FileResponse(
        path=file_path,
        media_type=file_record.mime_type or "application/octet-stream",
        filename=file_record.original_name,
        headers={
            "Content-Disposition": f'{disposition_type}; filename="{file_record.original_name}"'
        }
    )

@router.delete("/{file_id}")
def delete_file(
    file_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file_record = db.query(FileRecord).filter(
        FileRecord.id == file_id,
        FileRecord.user_id == current_user.id
    ).first()

    if not file_record:
        raise HTTPException(status_code=404, detail="File not found")

    file_record.is_deleted = True
    delete_stored_file(file_record.storage_uuid)
    db.commit()
    return {"message": "File deleted successfully"}
