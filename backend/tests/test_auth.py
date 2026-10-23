from datetime import UTC, datetime, timedelta

import jwt
import pytest

from app.config import get_settings
from app.models import Role
from tests.conftest import PASSWORD

PROTECTED = [
    ("get", "/api/auth/me"),
    ("get", "/api/users"),
    ("post", "/api/users"),
    ("patch", "/api/users/1"),
    ("delete", "/api/users/1"),
    ("get", "/api/subjects"),
    ("post", "/api/subjects"),
    ("patch", "/api/subjects/1"),
    ("delete", "/api/subjects/1"),
    ("get", "/api/subjects/1/syllabus"),
    ("get", "/api/timetables"),
    ("get", "/api/timetables/3"),
    ("put", "/api/timetables/3"),
    ("post", "/api/timetables/3/generate"),
    ("get", "/api/timetables/conflicts"),
    ("post", "/api/chat"),
    ("get", "/api/prompts"),
]


@pytest.mark.parametrize(("method", "path"), PROTECTED)
def test_every_endpoint_requires_a_token(client, method, path):
    response = getattr(client, method)(path)
    assert response.status_code == 401


def test_login_returns_token_and_never_the_password_hash(client, admin):
    response = client.post("/api/auth/login", json={"username": "admin", "password": PASSWORD})
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["role"] == "admin"
    assert "password" not in str(body).lower().replace("password_", "")
    assert "password_hash" not in body["user"]


@pytest.mark.parametrize("username", ["admin", "nobody"])
def test_bad_credentials_get_401(client, admin, username):
    response = client.post("/api/auth/login", json={"username": username, "password": "wrong-password1"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid username or password"


def test_login_is_rate_limited(client, admin):
    for _ in range(get_settings().login_max_attempts):
        assert client.post("/api/auth/login", json={"username": "admin", "password": "nope-nope1"}).status_code == 401
    response = client.post("/api/auth/login", json={"username": "admin", "password": PASSWORD})
    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_inactive_user_cannot_log_in(client, make_user):
    user = make_user(Role.TEACHER, is_active=False)
    response = client.post("/api/auth/login", json={"username": user.username, "password": PASSWORD})
    assert response.status_code == 401


def _token(user_id: int, key: str, **overrides) -> str:
    now = datetime.now(UTC)
    payload = {"sub": str(user_id), "ver": 0, "iat": now, "exp": now + timedelta(minutes=5)} | overrides
    return jwt.encode(payload, key, algorithm="HS256")


def test_forged_token_is_rejected(client, admin):
    forged = _token(admin.id, "default_secret_key-guessed-by-an-attacker-xxxxxxxx")
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401


def test_expired_token_is_rejected(client, admin):
    expired = _token(admin.id, get_settings().secret_key, exp=datetime.now(UTC) - timedelta(seconds=1))
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401


def test_logout_invalidates_the_token(client, admin_headers):
    assert client.get("/api/auth/me", headers=admin_headers).status_code == 200
    assert client.post("/api/auth/logout", headers=admin_headers).status_code == 204
    assert client.get("/api/auth/me", headers=admin_headers).status_code == 401


def test_change_password(client, admin, admin_headers):
    response = client.post(
        "/api/auth/me/password",
        headers=admin_headers,
        json={"current_password": "wrong-one1", "new_password": "N3w-password"},
    )
    assert response.status_code == 400

    response = client.post(
        "/api/auth/me/password",
        headers=admin_headers,
        json={"current_password": PASSWORD, "new_password": "N3w-password"},
    )
    assert response.status_code == 204
    assert client.get("/api/auth/me", headers=admin_headers).status_code == 401
    assert client.post("/api/auth/login", json={"username": "admin", "password": "N3w-password"}).status_code == 200


def test_preferences_are_saved_for_the_current_user(client, admin_headers):
    response = client.put("/api/auth/me/preferences", headers=admin_headers, json={"theme": "dark", "color": "blue"})
    assert response.status_code == 200
    assert client.get("/api/auth/me", headers=admin_headers).json()["preferences"] == {"theme": "dark", "color": "blue"}
    bad = client.put("/api/auth/me/preferences", headers=admin_headers, json={"theme": "dark", "color": "<script>"})
    assert bad.status_code == 422


def test_security_headers_are_set(client):
    response = client.get("/api/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
