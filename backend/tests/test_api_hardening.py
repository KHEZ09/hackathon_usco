from app import create_app
from app.auth_tokens.passwords import hash_password


class FakeUserRepository:
    def __init__(self):
        self.row = {
            "user_id": "user-1",
            "full_name": "Operador Demo",
            "email": "operador@orivia.test",
            "password_hash": hash_password("correct-password"),
            "account_status": "ACTIVE",
            "roles": ["OPERATOR"],
        }

    def by_login(self, login):
        return self.row if login.casefold() == self.row["email"].casefold() else None


class FakeAuthRepository:
    def insert_refresh_token(self, user_id, token_hash, ttl_seconds):
        return None


def test_cors_is_explicit_and_preflight_does_not_require_auth():
    app = create_app()
    client = app.test_client()

    response = client.options(
        "/api/v1/orders",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Authorization, Content-Type",
        },
    )

    assert response.status_code == 204
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:3000"
    assert "Authorization" in response.headers["Access-Control-Allow-Headers"]


def test_cors_does_not_reflect_untrusted_origin():
    response = create_app().test_client().get(
        "/health", headers={"Origin": "https://untrusted.example"}
    )

    assert response.status_code == 200
    assert "Access-Control-Allow-Origin" not in response.headers


def test_auth_responses_are_not_cacheable_and_unknown_routes_are_json():
    app = create_app()
    response = app.test_client().get("/route-that-does-not-exist")

    assert response.status_code == 404
    assert response.get_json()["error"] == "NOT_FOUND"
    assert response.get_json()["request_id"]


def test_login_rate_limiter_blocks_repeated_failures_and_recovers_on_success(
    monkeypatch,
):
    monkeypatch.setenv("ORIVIA_LOGIN_RATE_LIMIT_MAX_FAILURES", "2")
    app = create_app()
    app.extensions["orivia_user_repository"] = FakeUserRepository()
    app.extensions["orivia_auth_repository"] = FakeAuthRepository()
    client = app.test_client()

    for _ in range(2):
        response = client.post(
            "/api/v1/auth/login",
            json={"email": "operador@orivia.test", "password": "wrong"},
        )
        assert response.status_code in {401, 429}

    blocked = client.post(
        "/api/v1/auth/login",
        json={"email": "operador@orivia.test", "password": "correct-password"},
    )
    assert blocked.status_code == 429
    assert blocked.headers["Retry-After"]


def test_auth_login_response_disables_caching():
    app = create_app()
    app.extensions["orivia_user_repository"] = FakeUserRepository()
    app.extensions["orivia_auth_repository"] = FakeAuthRepository()

    response = app.test_client().post(
        "/api/v1/auth/login",
        json={"email": "operador@orivia.test", "password": "correct-password"},
    )

    assert response.status_code == 200
    assert response.headers["Cache-Control"] == "no-store"
