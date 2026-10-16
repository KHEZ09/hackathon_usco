import jwt
import pytest
from flask import jsonify

from app import create_app
from app.auth_tokens.jwt_service import TokenError, TokenService
from app.config import ConfigurationError, Settings
from app.security.middleware import require_access_token
from app.security.permissions import require_permissions


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
