import jwt

from app import create_app


def _headers(app, *, subject: str, role: str, permissions: list[str]) -> dict[str, str]:
    token = jwt.encode(
        {
            "sub": subject,
            "role": role,
            "permissions": permissions,
            "iat": 1730000000,
            "exp": 4102444800,
            "iss": app.config["JWT_ISSUER"],
            "jti": f"test-{subject}",
            "type": "access",
        },
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def _create_order(app, suffix: str = "") -> str:
    client = app.test_client()
    response = client.post(
        "/api/v1/orders",
        headers=_headers(
            app,
            subject=f"operator{suffix}",
            role="operator",
            permissions=["orders:create", "orders:read", "tracking:read"],
        ),
        json={"product": "Cacao", "quantity": 10, "origin": "Huila"},
    )
    assert response.status_code == 201
    return response.get_json()["order"]["id"]


def test_ai_summary_audit_and_analytics_work_without_ollama():
    app = create_app()
    app.config["OLLAMA_BASE_URL"] = None
    client = app.test_client()
    order_id = _create_order(app)

    summary = client.post(
        f"/api/v1/ai/orders/{order_id}/summary",
        headers=_headers(
            app,
            subject="viewer-1",
            role="viewer",
            permissions=["orders:read"],
        ),
    )
    audit = client.post(
        f"/api/v1/ai/orders/{order_id}/audit",
        headers=_headers(
            app,
            subject="accounting-1",
            role="accounting",
            permissions=["audit:read"],
        ),
    )
    analytics = client.post(
        "/api/v1/ai/analytics",
        headers=_headers(
            app,
            subject="viewer-1",
            role="viewer",
            permissions=["orders:read"],
        ),
    )

    assert summary.status_code == 200
    assert summary.get_json()["insight"]["source"] == "local-rules"
    assert "CREATED" in summary.get_json()["insight"]["text"]
    assert audit.status_code == 200
    assert "verificada" in audit.get_json()["insight"]["text"]
    assert analytics.status_code == 200
    assert "1 pedidos" in analytics.get_json()["insight"]["text"]


def test_ai_audit_requires_audit_permission_and_missing_order_is_404():
    app = create_app()
    app.config["OLLAMA_BASE_URL"] = None
    client = app.test_client()
    viewer_headers = _headers(
        app,
        subject="viewer-1",
        role="viewer",
        permissions=["orders:read"],
    )

    forbidden = client.post(
        "/api/v1/ai/orders/missing/audit",
        headers=viewer_headers,
    )
    missing = client.post(
        "/api/v1/ai/orders/missing/summary",
        headers=viewer_headers,
    )

    assert forbidden.status_code == 403
    assert missing.status_code == 404
