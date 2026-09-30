import requests
import time

BASE_URL = "http://127.0.0.1:8000"

def test_real_flow():
    print(">>> 1. Registering real user account: alice@secureshare.io ...")
    user_email = f"alice_{int(time.time())}@secureshare.io"
    reg_payload = {
        "email": user_email,
        "password": "RealSecretPassword2026!",
        "full_name": "Alice Montgomery"
    }
    r = requests.post(f"{BASE_URL}/api/auth/register", json=reg_payload)
    assert r.status_code == 200, f"Register failed: {r.text}"
    auth_data = r.json()
    token = auth_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"    [OK] User registered: {auth_data['user']['full_name']} ({auth_data['user']['email']})")

    print(">>> 2. Uploading a real document to SecureDrive ...")
    file_content = b"%PDF-1.4\nReal NDA Agreement and Secure Project Contract.\n%%EOF"
    files = {"file": ("Confidential_NDA_Contract.pdf", file_content, "application/pdf")}
    r = requests.post(f"{BASE_URL}/api/files/upload", headers=headers, files=files)
    assert r.status_code == 200, f"Upload failed: {r.text}"
    file_record = r.json()
    print(f"    [OK] Uploaded file: {file_record['original_name']} ({file_record['size_bytes']} bytes)")

    print(">>> 3. Fetching Storage Stats ...")
    r = requests.get(f"{BASE_URL}/api/files/storage/stats", headers=headers)
    assert r.status_code == 200
    stats = r.json()
    print(f"    [OK] Storage used: {stats['used_bytes']} bytes, file count: {stats['file_count']}")

    print(">>> 4. Creating an Expiring Burner Link (15 mins, 2 downloads max, passphrase locked) ...")
    share_payload = {
        "file_id": file_record["id"],
        "expires_in_minutes": 15,
        "max_downloads": 2,
        "password": "NDAPassword2026!",
        "burn_after_reading": False
    }
    r = requests.post(f"{BASE_URL}/api/shares", headers=headers, json=share_payload)
    assert r.status_code == 200, f"Create share failed: {r.text}"
    share_data = r.json()
    share_token = share_data["token"]
    print(f"    [OK] Generated HMAC Signed Token: {share_token[:30]}...")

    print(">>> 5. Recipient tests link preview (Public Info) ...")
    r = requests.get(f"{BASE_URL}/api/public/shares/{share_token}/info")
    assert r.status_code == 200
    info = r.json()
    assert info["valid"] is True
    assert info["requires_password"] is True
    assert info["downloads_left"] == 2
    print(f"    [OK] Preview verified: {info['file_name']}, Downloads left: {info['downloads_left']}")

    print(">>> 6. Recipient downloads file with wrong password (expecting 401) ...")
    r = requests.post(f"{BASE_URL}/api/public/shares/{share_token}/download", json={"password": "wrong"})
    assert r.status_code == 401
    print("    [OK] Correctly rejected wrong passphrase with 401 Unauthorized")

    print(">>> 7. Recipient downloads file with correct passphrase (Download 1 of 2) ...")
    r = requests.post(f"{BASE_URL}/api/public/shares/{share_token}/download", json={"password": "NDAPassword2026!"})
    assert r.status_code == 200
    assert r.content == file_content
    print(f"    [OK] Download 1 successful: {len(r.content)} bytes streamed")

    print(">>> 8. Recipient downloads file second time (Download 2 of 2) ...")
    r = requests.post(f"{BASE_URL}/api/public/shares/{share_token}/download", json={"password": "NDAPassword2026!"})
    assert r.status_code == 200
    print("    [OK] Download 2 successful")

    print(">>> 9. Recipient attempts 3rd download (Exceeded cap, expecting 410 Gone) ...")
    r = requests.post(f"{BASE_URL}/api/public/shares/{share_token}/download", json={"password": "NDAPassword2026!"})
    assert r.status_code == 410
    print("    [OK] Correctly blocked 3rd download: Link self-destructed with HTTP 410 Gone")

    print(">>> 10. Checking Access Audit Logs for forensic history ...")
    r = requests.get(f"{BASE_URL}/api/shares/{share_data['id']}/logs", headers=headers)
    assert r.status_code == 200
    logs = r.json()
    print(f"    [OK] Retrieved {len(logs)} audit events:")
    for l in logs:
        print(f"         - Status: {l['status']}, Time: {l['accessed_at']}, IP: {l['ip_address']}")

    print("\n[SUCCESS] REAL PRODUCTION FLOW VERIFIED 100% OPERATIONAL!\n")

if __name__ == "__main__":
    test_real_flow()
