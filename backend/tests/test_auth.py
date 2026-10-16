from app import create_app
from app.auth_tokens.jwt_service import TokenService


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
