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
