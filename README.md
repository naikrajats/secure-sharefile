# 📁 SecureDrive — Google Drive with Cryptographic Expiring Links

> **Real Working Hackathon Prototype**: A full-featured Google Drive file management interface equipped with self-destructing burner links, HMAC-SHA256 signatures, live in-browser file previews, and a tamper-evident access audit center.

---

## ⚡ Quick Start (1-Click Run)

### Option A: Windows Launcher (Easiest)
Double-click `start.bat` in the project root. It automatically opens:
- 🌐 **Frontend Web App**: [http://localhost:5173](http://localhost:5173)

### Option B: Manual Commands
```bash
# Terminal 1: Backend
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### Signing Key
On first backend startup, SecureDrive creates `backend/.secret_key` for local development and reuses it across reloads. The key is ignored by Git. For deployments, set `SECRET_KEY` to a securely generated value of at least 32 bytes before starting the backend. Rotating the signing key invalidates existing login sessions and share URLs; recreate links after changing it.

---

## 🏆 Problem Statement Compliance Matrix

| Requirement | Implementation in SecureBurn | Code Location |
|---|---|---|
| **Secure file upload** | Sanitized UUID filenames on disk (blocks path traversal), 50MB cap, SHA256 checksums | [`backend/storage_manager.py`](backend/storage_manager.py) |
| **Authentication & authorization** | JWT Bearer authentication with account registration and sign-in | [`backend/routes/auth.py`](backend/routes/auth.py) |
| **Time-based link expiration** | Custom expiry from 1 minute to 7 days with live ticking countdown timers | [`backend/routes/shares.py`](backend/routes/shares.py) |
| **Download-count-based expiration** | Atomic SQL decrement (`download_count < max_downloads`) preventing race conditions | [`backend/routes/public.py`](backend/routes/public.py) |
| **Signed access tokens** | HMAC-SHA256 signature binding file ID, share ID, expiry, and nonce | [`backend/security.py`](backend/security.py) |
| **File access control** | Optional passphrase protection (PBKDF2-HMAC-SHA256 hashed) | [`backend/routes/public.py`](backend/routes/public.py) |
| **View-only links** | Download endpoint is blocked; browser preview supports PDFs, images, and text files | [`backend/routes/public.py`](backend/routes/public.py) |
| **Recipient sharing and view tracking** | Restrict links to existing SecureDrive accounts; show unique viewers and their view times to the sender | [`backend/routes/shares.py`](backend/routes/shares.py) |
| **Download activity tracking** | Complete audit trail recording Client IP, User-Agent, timestamp, and status | [`backend/models.py`](backend/models.py) |
| **Emergency Revocation** | Immediate "Revoke Link" kill-switch | [`backend/routes/shares.py`](backend/routes/shares.py) |
| **Burn-after-reading** | Instant file deletion from disk upon 1st successful download | [`backend/routes/public.py`](backend/routes/public.py) |

---

## 🎤 3-Minute Winning Demo Script

1. **Open the Web App ([http://localhost:5173](http://localhost:5173))**:
   - Create an account or sign in, then upload a file to the vault.
2. **Create a 1-Minute Burner Link**:
   - Click **"+ Create Burner Link"**.
   - Drop a sample file or pick `Project_Titan_Confidential_Brief.pdf`.
   - Set expiration to **5 Mins**, max downloads to **1 (Burn after reading)**, or set a passphrase like `pass123`.
   - Optionally enter existing SecureDrive account emails to restrict who can open the link; the owner can inspect unique viewers in link management.
   - Click **Generate Expiring Link**.
3. **Show Off the Phone QR Code**:
   - Point your phone camera at the on-screen QR code or copy the link to a new incognito window.
4. **Download & Trigger Self-Destruction**:
   - Notice the live ticking countdown timer and "1 download remaining" indicator.
   - Enter passphrase (if locked) and click **"Download File Securely"**.
   - The file downloads immediately.
   - Refresh the page: It now shows **"Burner Link Expired / Download Limit Exceeded"**!
5. **Open Audit Logs**:
   - Back in the dashboard, click **"Audit Logs"** on that file.
   - Show the judges your exact IP address, browser/device user-agent, and the timestamp of the download event.
---

## 🛡️ Security Architecture Talking Points for Judges

When judges ask: *"Why is this more secure than a standard storage link?"*

1. **Cryptographic Integrity (HMAC-SHA256)**:
   - The token contains the file ID and expiration timestamp signed by a server secret. If an attacker modifies the URL to extend the expiry or guess another file ID, the signature verification fails before any database lookup.
2. **Atomic Enforcement Against Concurrency Attacks**:
   - Simultaneous download requests cannot bypass download limits because increments are performed atomically at the SQL level (`UPDATE shares SET download_count = download_count + 1 WHERE download_count < max_downloads`).
3. **Defense-in-Depth Vault Storage**:
   - Files are stored on disk with randomized UUID names (e.g. `storage/7f2b9a...`) with no executable extension and no original file metadata. Path traversal attacks (`../../etc/passwd`) are completely thwarted.
4. **Tamper-Evident Audit Trail**:
   - Every attempt—successful downloads, wrong password submissions, and expired link access—is logged for forensics.

---

## 🧪 Running Automated Tests

A comprehensive integration test suite is included in the backend:
```bash
cd backend
python test_backend.py
```
This tests:
- Application startup and account registration
- HMAC signed token generation & verification
- Tampered URL signature rejection
- Atomic download counter increments
- Wrong password vs correct password handling
- HTTP 410 Gone on expired links
- Audit trail recording
