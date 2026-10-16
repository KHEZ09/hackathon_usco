from flask import request

from app import create_app


def test_security_headers_and_request_id_are_present():
    app = create_app()
    response = app.test_client().get("/health", headers={"X-Request-ID": "demo-123"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "demo-123"
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"
    assert response.headers["Content-Security-Policy"] == (
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
    )
    assert response.headers["Permissions-Policy"] == (
        "camera=(), microphone=(), geolocation=()"
    )


def test_unexpected_errors_are_json_without_internal_details():
    app = create_app()

    @app.get("/test-unexpected-error")
    def unexpected_error():
        raise RuntimeError("secret database detail")

    response = app.test_client().get("/test-unexpected-error")

    assert response.status_code == 500
    assert response.get_json()["error"] == "INTERNAL_SERVER_ERROR"
    assert "secret database detail" not in response.get_data(as_text=True)


def test_oversized_payload_returns_json_error():
    app = create_app()

    @app.post("/test-payload")
    def payload():
        request.get_data()
        return {"ok": True}

    response = app.test_client().post(
        "/test-payload",
        data=b"x" * (app.config["MAX_CONTENT_LENGTH"] + 1),
        content_type="application/octet-stream",
    )

    assert response.status_code == 413
    assert response.get_json()["error"] == "PAYLOAD_TOO_LARGE"
