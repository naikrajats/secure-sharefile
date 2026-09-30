import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from main import app, startup_event
from database import SessionLocal
from models import ShareLink

client = TestClient(app)

def run_tests():
    db_file = os.path.join(os.path.dirname(__file__), "secure_share.db")
    if os.path.exists(db_file):
        try:
            os.remove(db_file)
        except Exception:
            pass
    print("--- 1. Testing Application Startup ---")
    startup_event()
    res = client.get("/")
    assert res.status_code == 200, f"Root failed: {res.text}"
    print("[PASS] Root API endpoint is healthy")

    print("--- 2. Testing Account Registration ---")
    res = client.post("/api/auth/register", json={
        "email": f"test-{uuid.uuid4()}@example.test",
        "password": "test-password",
        "full_name": "SecureDrive Test User",
    })
    assert res.status_code == 200, f"Registration failed: {res.text}"
    auth_data = res.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[PASS] Registered test user: {auth_data['user']['full_name']}")

    recipient_email = f"recipient-{uuid.uuid4()}@example.test"
    recipient_response = client.post("/api/auth/register", json={
        "email": recipient_email,
        "password": "recipient-password",
        "full_name": "Invited Recipient",
    })
    assert recipient_response.status_code == 200
    recipient_headers = {"Authorization": f"Bearer {recipient_response.json()['access_token']}"}
    outsider_response = client.post("/api/auth/register", json={
        "email": f"outsider-{uuid.uuid4()}@example.test",
        "password": "outsider-password",
        "full_name": "Uninvited User",
    })
    assert outsider_response.status_code == 200
    outsider_headers = {"Authorization": f"Bearer {outsider_response.json()['access_token']}"}

    print("--- 3. Creating Test Files & Share Links ---")
    sample_files = []
    for filename, contents in [
        ("Project_Titan_Confidential_Brief.txt", b"Confidential project brief"),
        ("Q3_Acquisition_Plan.txt", b"Acquisition plan"),
        ("Launch_Credentials.txt", b"Demo-only sample credentials"),
        ("../../path-traversal.txt", b"The stored name must be sanitized"),
    ]:
        res = client.post(
            "/api/files/upload",
            headers=headers,
            files={"file": (filename, contents, "text/plain")},
        )
        assert res.status_code == 200, f"Upload failed: {res.text}"
        sample_files.append(res.json())

    share_requests = [
        {"file_id": sample_files[0]["id"], "expires_in_minutes": 60, "max_downloads": 3, "password": "secure2026"},
        {"file_id": sample_files[1]["id"], "expires_in_minutes": 60, "max_downloads": 1},
        {"file_id": sample_files[2]["id"], "expires_in_minutes": 60, "max_downloads": 1, "burn_after_reading": True},
    ]
    created_shares = []
    for share_request in share_requests:
        res = client.post("/api/shares", headers=headers, json=share_request)
        assert res.status_code == 200, f"Share creation failed: {res.text}"
        assert res.json()["expires_at"].endswith("Z"), "Share expiry must include its UTC timezone"
        created_shares.append(res.json())

    restricted_response = client.post("/api/shares", headers=headers, json={
        "file_id": sample_files[0]["id"],
        "expires_in_minutes": 60,
        "max_downloads": 0,
        "recipient_emails": [recipient_email],
        "allow_download": False,
    })
    assert restricted_response.status_code == 200, f"Restricted share creation failed: {restricted_response.text}"
    restricted_share = restricted_response.json()
    race_response = client.post("/api/shares", headers=headers, json={
        "file_id": sample_files[0]["id"],
        "expires_in_minutes": 60,
        "max_downloads": 1,
    })
    assert race_response.status_code == 200, f"Race-test share creation failed: {race_response.text}"
    race_share = race_response.json()

    db = SessionLocal()
    try:
        expired_share = db.query(ShareLink).filter(ShareLink.id == created_shares[1]["id"]).first()
        expired_share.expires_at = datetime.now(timezone.utc) - timedelta(hours=1)
        db.commit()
    finally:
        db.close()

    print("--- 4. Testing Files Listing ---")
    res = client.get("/api/files", headers=headers)
    assert res.status_code == 200
    files = res.json()
    assert len(files) == 4, "Test files not found"
    assert sample_files[3]["original_name"] == "path-traversal.txt"
    assert len(sample_files[3]["checksum_sha256"]) == 64
    test_file = files[0]
    print(f"[PASS] Retrieved {len(files)} files, first file: {test_file['original_name']}")

    print("--- 5. Testing Share Links Listing ---")
    res = client.get("/api/shares", headers=headers)
    assert res.status_code == 200
    shares = res.json()
    assert len(shares) == 5, "Test shares not found"
    print(f"[PASS] Found {len(shares)} test share links")

    # Find the password-protected share and expired share
    pwd_share = next(s for s in shares if s["is_password_protected"])
    expired_share = next(s for s in shares if s["status"] == "EXPIRED")
    burn_share = next(s for s in shares if s["burn_after_reading"])

    print(f"Password share token: {pwd_share['token'][:20]}...")
    print(f"Expired share token: {expired_share['token'][:20]}...")

    print("--- 5a. Testing Invited Recipient Access & View Tracking ---")
    restricted_token = restricted_share["token"]
    assert restricted_share["allow_download"] is False
    res = client.get(f"/api/public/shares/{restricted_token}/info")
    assert res.status_code == 200
    assert res.json()["status"] == "AUTH_REQUIRED"
    assert res.json()["allow_download"] is False
    res = client.get(f"/api/public/shares/{restricted_token}/info", headers=outsider_headers)
    assert res.json()["status"] == "AUTH_REQUIRED"
    res = client.post(f"/api/public/shares/{restricted_token}/download", json={})
    assert res.status_code == 403
    res = client.post(f"/api/public/shares/{restricted_token}/download", headers=outsider_headers, json={})
    assert res.status_code == 403
    res = client.post(f"/api/public/shares/{restricted_token}/download", headers=recipient_headers, json={})
    assert res.status_code == 403
    for _ in range(2):
        res = client.get(f"/api/public/shares/{restricted_token}/info", headers=recipient_headers)
        assert res.json()["valid"] is True
        assert res.json()["allow_download"] is False
    res = client.post(f"/api/public/shares/{restricted_token}/preview", headers=recipient_headers, json={})
    assert res.status_code == 200
    assert res.headers["content-disposition"].startswith("inline;")
    assert b"Confidential project brief" in res.content

    res = client.get("/api/shares", headers=headers)
    assert res.status_code == 200
    tracked_share = next(share for share in res.json() if share["id"] == restricted_share["id"])
    assert tracked_share["recipient_emails"] == [recipient_email]
    assert tracked_share["allow_download"] is False
    assert tracked_share["download_count"] == 0
    assert tracked_share["viewers_count"] == 1
    assert tracked_share["viewers"][0]["email"] == recipient_email
    print("[PASS] Restricted link requires the invited account and counts one unique viewer")

    print("--- 5. Testing Public Info Endpoint ---")
    res = client.get(f"/api/public/shares/{pwd_share['token']}/info")
    assert res.status_code == 200
    info = res.json()
    assert info["valid"] == True
    assert info["requires_password"] == True
    assert info["expires_at"].endswith("Z"), "Public share expiry must include its UTC timezone"
    print("[PASS] Public info verified for password-protected link")

    res = client.get("/api/shares", headers=headers)
    public_share = next(share for share in res.json() if share["id"] == pwd_share["id"])
    assert public_share["viewers_count"] == 1
    assert public_share["viewers"][0]["email"] is None

    print("--- 6a. Testing Concurrent Download Limit ---")
    def attempt_race_download(_):
        response = client.post(f"/api/public/shares/{race_share['token']}/download", json={})
        return response.status_code

    with ThreadPoolExecutor(max_workers=8) as executor:
        race_statuses = list(executor.map(attempt_race_download, range(8)))
    assert race_statuses.count(200) == 1, f"Expected exactly one successful download, got {race_statuses}"
    assert race_statuses.count(410) == 7, f"Expected the remaining downloads to be exhausted, got {race_statuses}"
    print("[PASS] Atomic download cap permits exactly one concurrent download")

    print("--- 6. Testing Public Download with Wrong & Correct Password ---")
    # Wrong password
    res = client.post(f"/api/public/shares/{pwd_share['token']}/download", json={"password": "wrong"})
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print("[PASS] Blocked download with incorrect password")

    # Correct password
    res = client.post(f"/api/public/shares/{pwd_share['token']}/download", json={"password": "secure2026"})
    assert res.status_code == 200
    assert len(res.content) > 0
    print(f"[PASS] Downloaded {len(res.content)} bytes with correct password")

    print("--- 7. Testing Expired Link Rejection ---")
    res = client.get(f"/api/public/shares/{expired_share['token']}/info")
    info = res.json()
    assert info["valid"] == False
    assert info["status"] == "EXPIRED"

    res = client.post(f"/api/public/shares/{expired_share['token']}/download", json={})
    assert res.status_code == 410
    print("[PASS] Expired link rejected with HTTP 410 Gone")

    print("--- 8. Testing Tampered Signature Rejection ---")
    tampered_token = pwd_share['token'][:-5] + "XXXXX"
    res = client.get(f"/api/public/shares/{tampered_token}/info")
    info = res.json()
    assert info["valid"] == False
    assert info["status"] == "INVALID_SIGNATURE"
    print("[PASS] Tampered cryptographic signature rejected")

    print("--- 9. Testing Audit Trail Retrieval ---")
    res = client.get(f"/api/shares/{pwd_share['id']}/logs", headers=headers)
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) >= 2 # wrong pass + success pass
    print(f"[PASS] Audit trail contains {len(logs)} entries:")
    for l in logs[:3]:
        print(f"      - [{l['accessed_at']}] Status: {l['status']}, IP: {l['ip_address']}")

    print("\n[SUCCESS] ALL BACKEND SECURITY & LOGIC TESTS PASSED!\n")

if __name__ == "__main__":
    run_tests()
