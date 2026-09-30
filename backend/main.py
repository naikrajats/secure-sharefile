from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from database import engine, Base
from routes import auth, files, shares, public

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

@app.on_event("startup")
def startup_event():
    Base.metadata.create_all(bind=engine)
    share_columns = {column["name"] for column in inspect(engine).get_columns("shares")}
    if "allow_download" not in share_columns:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE shares ADD COLUMN allow_download BOOLEAN NOT NULL DEFAULT 1"))

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
