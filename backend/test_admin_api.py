import unittest
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app
from models import AuditLog, FileRecord, ShareLink, User
from security import generate_signed_share_token, hash_password


class AdminApiTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)

        def override_get_db():
            db = self.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

        db = self.SessionLocal()
        self.admin = User(
            email="admin@example.test",
            hashed_password=hash_password("admin-password"),
            full_name="Test Admin",
            is_admin=True,
        )
        self.user = User(
            email="user@example.test",
            hashed_password=hash_password("user-password"),
            full_name="Test User",
        )
        db.add_all([self.admin, self.user])
        db.flush()
        file_record = FileRecord(
            user_id=self.user.id,
            original_name="reported.txt",
            size_bytes=12,
            mime_type="text/plain",
        )
        db.add(file_record)
        db.flush()
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        share = ShareLink(
            file_id=file_record.id,
            user_id=self.user.id,
            token="pending",
            expires_at=expires_at,
            max_downloads=3,
            download_count=1,
        )
        db.add(share)
        db.flush()
        share.token = generate_signed_share_token(share.id, file_record.id, expires_at, 3)
        db.add(AuditLog(share_id=share.id, ip_address="192.0.2.1", status="SUCCESS"))
        db.commit()
        self.share_id = share.id
        self.file_id = file_record.id
        self.user_id = self.user.id
        db.close()

        self.admin_token = self._login("admin@example.test", "admin-password")
        self.user_token = self._login("user@example.test", "user-password")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        self.user_headers = {"Authorization": f"Bearer {self.user_token}"}

    def tearDown(self):
        app.dependency_overrides.clear()
        self.engine.dispose()

    def _login(self, email, password):
        response = self.client.post("/api/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["access_token"]

    def test_admin_routes_are_forbidden_to_regular_users(self):
        self.assertEqual(self.client.get("/api/admin/summary").status_code, 401)
        self.assertEqual(self.client.get("/api/admin/summary", headers=self.user_headers).status_code, 403)

    def test_admin_can_view_statistics_and_revoke_share(self):
        summary = self.client.get("/api/admin/summary", headers=self.admin_headers)
        self.assertEqual(summary.status_code, 200, summary.text)
        self.assertEqual(summary.json()["users_total"], 2)
        self.assertEqual(summary.json()["successful_downloads"], 1)

        activity = self.client.get("/api/admin/activity", headers=self.admin_headers)
        self.assertEqual(activity.status_code, 200, activity.text)
        self.assertEqual(activity.json()[0]["file_name"], "reported.txt")

        revoked = self.client.post(f"/api/admin/shares/{self.share_id}/revoke", headers=self.admin_headers)
        self.assertEqual(revoked.status_code, 200, revoked.text)
        db = self.SessionLocal()
        try:
            self.assertTrue(db.query(ShareLink).filter(ShareLink.id == self.share_id).first().is_revoked)
        finally:
            db.close()

    def test_users_can_report_content_and_admin_can_resolve(self):
        report = self.client.post(
            "/api/reports",
            headers=self.user_headers,
            json={"target_type": "file", "target_id": self.file_id, "reason": "Malware concern"},
        )
        self.assertEqual(report.status_code, 200, report.text)
        report_id = report.json()["id"]

        duplicate = self.client.post(
            "/api/reports",
            headers=self.user_headers,
            json={"target_type": "file", "target_id": self.file_id, "reason": "Malware concern"},
        )
        self.assertEqual(duplicate.status_code, 409)

        reports = self.client.get("/api/admin/reports", headers=self.admin_headers)
        self.assertEqual(reports.status_code, 200, reports.text)
        self.assertEqual(reports.json()[0]["target_label"], "reported.txt")

        resolved = self.client.patch(
            f"/api/admin/reports/{report_id}",
            headers=self.admin_headers,
            json={"status": "REVIEWED", "resolution_note": "Reviewed"},
        )
        self.assertEqual(resolved.status_code, 200, resolved.text)
        self.assertEqual(resolved.json()["status"], "REVIEWED")

    def test_admin_can_activate_and_deactivate_accounts(self):
        deactivated = self.client.patch(
            f"/api/admin/users/{self.user_id}/activation",
            headers=self.admin_headers,
            json={"is_active": False},
        )
        self.assertEqual(deactivated.status_code, 200, deactivated.text)
        self.assertEqual(self.client.get("/api/auth/me", headers=self.user_headers).status_code, 403)

        activated = self.client.patch(
            f"/api/admin/users/{self.user_id}/activation",
            headers=self.admin_headers,
            json={"is_active": True},
        )
        self.assertEqual(activated.status_code, 200, activated.text)
        self.assertEqual(self.client.get("/api/auth/me", headers=self.user_headers).status_code, 200)


if __name__ == "__main__":
    unittest.main()