import os
import hashlib
from typing import Tuple

STORAGE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "storage")
os.makedirs(STORAGE_DIR, exist_ok=True)

MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB for hackathon demo

def save_uploaded_file(file_obj, storage_uuid: str) -> Tuple[int, str]:
    """
    Saves an uploaded file stream to the isolated vault storage using its UUID.
    Computes and returns (size_bytes, sha256_checksum).
    """
    dest_path = os.path.join(STORAGE_DIR, storage_uuid)
    hasher = hashlib.sha256()
    size = 0

    with open(dest_path, "wb") as f:
        while chunk := file_obj.read(1024 * 64):
            size += len(chunk)
            if size > MAX_FILE_SIZE_BYTES:
                f.close()
                if os.path.exists(dest_path):
                    os.remove(dest_path)
                raise ValueError(f"File size exceeds maximum allowed limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB")
            hasher.update(chunk)
            f.write(chunk)

    return size, hasher.hexdigest()

def get_file_path(storage_uuid: str) -> str:
    """Return the absolute path of a stored file, verifying it stays within STORAGE_DIR."""
    # Defend against path traversal
    safe_name = os.path.basename(storage_uuid)
    path = os.path.join(STORAGE_DIR, safe_name)
    return path

def delete_stored_file(storage_uuid: str) -> bool:
    """Safely delete file from disk storage."""
    try:
        path = get_file_path(storage_uuid)
        if os.path.exists(path):
            os.remove(path)
            return True
    except Exception:
        pass
    return False
