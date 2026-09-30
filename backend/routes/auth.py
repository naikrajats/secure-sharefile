from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models import User
from security import hash_password, verify_password, create_user_token, decode_user_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security_bearer = HTTPBearer(auto_error=False)

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = decode_user_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    payload = decode_user_token(credentials.credentials)
    if not payload:
        return None
    return db.query(User).filter(User.id == payload.get("sub")).first()

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")

    new_user = User(
        email=req.email.lower(),
        hashed_password=hash_password(req.password),
        full_name=req.full_name
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_user_token(new_user.id, new_user.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=new_user.id, email=new_user.email, full_name=new_user.full_name)
    )

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid email or password")

    token = create_user_token(user.id, user.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=user.id, email=user.email, full_name=user.full_name)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name
    )
