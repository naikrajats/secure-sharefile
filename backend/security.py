import os
import secrets
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
import jwt

def load_secret_key() -> str:
    configured_key = os.getenv("SECRET_KEY")
    if configured_key:
        if len(configured_key.encode("utf-8")) < 32:
            raise RuntimeError("SECRET_KEY must contain at least 32 bytes")
        return configured_key

    key_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".secret_key")
    try:
        file_descriptor = os.open(key_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError:
        with open(key_path, "r", encoding="ascii") as key_file:
            local_key = key_file.read().strip()
    else:
        local_key = secrets.token_urlsafe(48)
        with os.fdopen(file_descriptor, "w", encoding="ascii") as key_file:
            key_file.write(local_key)

    if len(local_key.encode("ascii")) < 32:
        raise RuntimeError("The local signing key is missing or invalid")
    return local_key


SECRET_KEY = load_secret_key()
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# ==========================================
# Password Hashing (PBKDF2-HMAC-SHA256)
# ==========================================
def hash_password(password: str) -> str:
    """Secure password hashing using standard library PBKDF2-HMAC-SHA256."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return f"pbkdf2:sha256:100000:{salt}:{key}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against stored salt and PBKDF2 hash with constant-time comparison."""
    try:
        parts = hashed_password.split(":")
        if len(parts) != 5 or parts[0] != "pbkdf2" or parts[1] != "sha256":
            return False
        iterations = int(parts[2])
        salt = parts[3]
        expected_key = parts[4]
        computed_key = hashlib.pbkdf2_hmac(
            'sha256',
            plain_password.encode('utf-8'),
            salt.encode('utf-8'),
            iterations
        ).hex()
        return hmac.compare_digest(computed_key, expected_key)
    except Exception:
        return False

# ==========================================
# User JWT Authentication
# ==========================================
def create_user_token(user_id: str, email: str) -> str:
    """Generate JWT for authenticated user session."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "type": "user_auth"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_user_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate user JWT."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "user_auth":
            return None
        return payload
    except jwt.PyJWTError:
        return None

# ==========================================
# Cryptographically Signed Share Tokens
# ==========================================
def generate_signed_share_token(share_id: str, file_id: str, expires_at: datetime, max_downloads: int) -> str:
    """
    Generate an HMAC-SHA256 signed access token for a share link.
    Contains share_id, file_id, expiry, max_downloads, and random nonce.
    Tampering with the token or expiry date renders the signature invalid.
    """
    nonce = secrets.token_urlsafe(8)
    exp_timestamp = int(expires_at.replace(tzinfo=timezone.utc).timestamp()) if expires_at.tzinfo is None else int(expires_at.timestamp())
    
    payload = {
        "share_id": share_id,
        "file_id": file_id,
        "exp": exp_timestamp,
        "max": max_downloads,
        "nonce": nonce,
        "type": "share_link"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_signed_share_token(token: str) -> Tuple[bool, bool, Optional[Dict[str, Any]], Optional[str]]:
    """
    Verify the cryptographic signature and expiration of a share token.
    Returns: (is_signature_valid, is_expired, payload, error_reason)
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": False})
        if payload.get("type") != "share_link":
            return False, False, None, "Invalid token type"
            
        # Check expiration timestamp from token
        exp = payload.get("exp")
        is_expired = False
        if exp and datetime.now(timezone.utc).timestamp() > exp:
            is_expired = True
            
        return True, is_expired, payload, None
    except jwt.InvalidSignatureError:
        return False, False, None, "Cryptographic signature mismatch (tampered link)"
    except jwt.PyJWTError as e:
        return False, False, None, f"Malformed token: {str(e)}"
