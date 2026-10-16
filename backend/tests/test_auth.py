import jwt
import pytest
from flask import jsonify

from app import create_app
from app.auth_tokens.jwt_service import TokenError, TokenService
from app.auth_tokens.passwords import hash_password
from app.config import ConfigurationError, Settings
from app.security.middleware import require_access_token
from app.security.permissions import require_permissions


class FakeUserRepository:
    def __init__(self, row):
        self.row = row

    def by_login(self, login):
        return self.row if login.lower() == self.row["email"].lower() else None


class FakeAuthRepository:
    def __init__(self, row):
        self.row = row
        self.tokens = {}

    def insert_refresh_token(self, user_id, token_hash, ttl_seconds):
        self.tokens[token_hash] = self.row

    def rotate_refresh_token(self, token_hash, replacement_hash, ttl_seconds):
        row = self.tokens.pop(token_hash, None)
        if row is not None:
            self.tokens[replacement_hash] = row
        return row


def _auth_app():
    row = {
        "user_id": "user-1",
        "full_name": "Operador Demo",
        "email": "operador@orivia.test",
        "password_hash": hash_password("correct-password"),
        "account_status": "ACTIVE",
        "roles": ["OPERATOR"],
    }
    app = create_app()
    app.extensions["orivia_user_repository"] = FakeUserRepository(row)
    app.extensions["orivia_auth_repository"] = FakeAuthRepository(row)
    return app


def test_protected_endpoint_requires_token():
    client = create_app().test_client()

    response = client.get("/api/v1/auth/me")

    assert response.status_code == 401
    assert response.get_json()["error"] == "AUTHENTICATION_REQUIRED"


def test_valid_access_token_allows_me_endpoint():
    app = create_app()
    service = TokenService(
        secret_key=app.config["JWT_SECRET_KEY"],
        issuer=app.config["JWT_ISSUER"],
        access_ttl_seconds=app.config["ACCESS_TOKEN_TTL_SECONDS"],
    )
    token = service.issue_access_token(
        subject="user-1", role="operator", permissions=["orders:read"]
    )

    response = app.test_client().get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert response.get_json()["user"]["sub"] == "user-1"


def test_login_issues_access_and_refresh_tokens_with_server_permissions():
    app = _auth_app()

    response = app.test_client().post(
        "/api/v1/auth/login",
        json={"email": "operador@orivia.test", "password": "correct-password"},
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body["token_type"] == "Bearer"
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["user"]["email"] == "operador@orivia.test"
    assert "password_hash" not in body["user"]

    me = app.test_client().get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me.status_code == 200
    assert me.get_json()["user"]["role"] == "OPERATOR"
    assert "orders:create" in me.get_json()["user"]["permissions"]


def test_login_rejects_invalid_credentials_without_leaking_account_state():
    app = _auth_app()

    response = app.test_client().post(
        "/api/v1/auth/login",
        json={"email": "operador@orivia.test", "password": "wrong-password"},
    )

    assert response.status_code == 401
    assert response.get_json()["error"] == "INVALID_CREDENTIALS"


def test_refresh_rotates_token_and_revokes_previous_token():
    app = _auth_app()
    client = app.test_client()
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "operador@orivia.test", "password": "correct-password"},
    )
    original_refresh = login.get_json()["refresh_token"]

    refreshed = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": original_refresh}
    )
    assert refreshed.status_code == 200
    replacement = refreshed.get_json()["refresh_token"]
    assert replacement != original_refresh

    replay = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": original_refresh}
    )
    assert replay.status_code == 401
    assert replay.get_json()["error"] == "INVALID_REFRESH_TOKEN"


def test_permission_decorator_rejects_missing_permission():
    app = create_app()

    @app.get("/test/orders")
    @require_access_token
    @require_permissions("orders:create")
    def protected_route():
        return jsonify({"status": "ok"})

    service = TokenService(
        secret_key=app.config["JWT_SECRET_KEY"],
        issuer=app.config["JWT_ISSUER"],
        access_ttl_seconds=app.config["ACCESS_TOKEN_TTL_SECONDS"],
    )
    token = service.issue_access_token(
        subject="user-1", role="viewer", permissions=["orders:read"]
    )

    response = app.test_client().get(
        "/test/orders", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403
    assert response.get_json()["error"] == "FORBIDDEN"


def test_token_rejects_malformed_permissions():
    service = TokenService(
        secret_key="x" * 32,
        issuer="orivia-api",
        access_ttl_seconds=3600,
    )
    token = service.issue_access_token(
        subject="user-1", role="operator", permissions=["orders:read"]
    )
    payload = jwt.decode(
        token,
        "x" * 32,
        algorithms=["HS256"],
        options={"verify_signature": False},
    )
    payload["permissions"] = "orders:read"
    malformed = jwt.encode(payload, "x" * 32, algorithm="HS256")

    with pytest.raises(TokenError):
        service.decode_access_token(malformed)


def test_production_rejects_development_jwt_secret(monkeypatch):
    monkeypatch.setenv("ORIVIA_ENV", "production")
    monkeypatch.delenv("ORIVIA_JWT_SECRET_KEY", raising=False)

    with pytest.raises(ConfigurationError):
        Settings.from_env()
