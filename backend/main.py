import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from database import engine, Base
from routes import admin, auth, files, shares, public

app = FastAPI(
    title="SecureDrive — Expiring Link File Vault API",
    description="Cryptographic signed link file sharing with dual time/count auto-destruction and audit trails.",
    version="1.0.0",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Download-Success"]
)

app.include_router(auth.router)
app.include_router(files.router)
app.include_router(shares.router)
app.include_router(public.router)
app.include_router(admin.reports_router)
app.include_router(admin.router)

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    user_columns = {column["name"] for column in inspect(engine).get_columns("users")}
    with engine.begin() as connection:
        if "is_active" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"))
        if "is_admin" not in user_columns:
            connection.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0"))
    share_columns = {column["name"] for column in inspect(engine).get_columns("shares")}
    if "allow_download" not in share_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE shares ADD COLUMN allow_download BOOLEAN NOT NULL DEFAULT 1"))

    admin_email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    if admin_email:
        from database import SessionLocal
        from models import User

        db = SessionLocal()
        try:
            admin_user = db.query(User).filter(User.email == admin_email).first()
            if admin_user and not admin_user.is_admin:
                admin_user.is_admin = True
                db.commit()
        finally:
            db.close()
@app.get("/")
def root():
    return {
        "service": "SecureDrive API",
        "status": "online",
        "features": [
            "HMAC-SHA256 Signed Links",
            "Atomic Download Limits",
            "Time-Based Expiration",
            "Burn After Reading",
            "Passphrase Protection",
            "Access Audit Trail"
        ]
    }
