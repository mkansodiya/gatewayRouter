import unittest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.database import Base
from app.models import Admin
from app.main import app, hash_password, get_db

# Create an in-memory SQLite database for test runs
engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class TestAuthAPI(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        self.db = TestingSessionLocal()
        
        # Override the dependency to use the testing session
        def override_get_db():
            try:
                yield self.db
            finally:
                pass
        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        
        # Seed test admin user
        self.admin = Admin(
            username="admin",
            hashed_password=hash_password("admin123")
        )
        self.db.add(self.admin)
        self.db.commit()

    def tearDown(self):
        app.dependency_overrides.clear()
        self.db.close()
        Base.metadata.drop_all(bind=engine)

    def test_admin_login_success(self):
        response = self.client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "admin123"}
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("token", data)

    def test_admin_login_fail(self):
        response = self.client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "wrong_password"}
        )
        self.assertEqual(response.status_code, 401)
        self.assertIn("detail", response.json())

    def test_update_admin_credentials_requires_auth(self):
        response = self.client.patch(
            "/api/admin/credentials",
            json={"username": "new_admin"}
        )
        self.assertEqual(response.status_code, 401)

    def test_update_admin_credentials_success(self):
        # 1. Login to get JWT token
        login_resp = self.client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "admin123"}
        )
        token = login_resp.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Update username and password
        update_resp = self.client.patch(
            "/api/admin/credentials",
            json={"username": "custom_admin", "password": "new_password_123"},
            headers=headers
        )
        self.assertEqual(update_resp.status_code, 200)
        new_data = update_resp.json()
        self.assertEqual(new_data["status"], "success")
        self.assertIn("token", new_data)

        # 3. Verify old credentials no longer work
        old_login_resp = self.client.post(
            "/api/admin/login",
            json={"username": "admin", "password": "admin123"}
        )
        self.assertEqual(old_login_resp.status_code, 401)

        # 4. Verify new credentials work
        new_login_resp = self.client.post(
            "/api/admin/login",
            json={"username": "custom_admin", "password": "new_password_123"}
        )
        self.assertEqual(new_login_resp.status_code, 200)
