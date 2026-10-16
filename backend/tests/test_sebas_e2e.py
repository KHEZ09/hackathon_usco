import jwt

from app import create_app


def _headers(app, permissions: list[str], subject: str = "demo-operator"):
    token = jwt.encode(
        {
            "sub": subject,
            "role": "admin",
            "permissions": permissions,
            "iat": 1730000000,
            "exp": 4102444800,
            "iss": app.config["JWT_ISSUER"],
            "jti": f"e2e-{subject}",
            "type": "access",
        },
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}", "X-Request-ID": "e2e-demo"}


def test_order_traceability_blockchain_and_ai_demo_flow():
    app = create_app()
    app.config["OLLAMA_BASE_URL"] = None
    client = app.test_client()
    headers = _headers(app, ["*"])

    created = client.post(
        "/api/v1/orders",
        headers=headers,
        json={
            "product": "Cacao",
            "quantity": 25,
            "origin": "Pitalito",
            "destination": "Bogotá",
        },
    )
    assert created.status_code == 201
    order_id = created.get_json()["order"]["id"]
    assert created.get_json()["blockchain"]["status"] == "ANCHORED"

    transition = client.patch(
        f"/api/v1/orders/{order_id}/status",
        headers=headers,
        json={"status": "CONFIRMED"},
    )
    assert transition.status_code == 200
    assert transition.get_json()["blockchain"]["status"] == "ANCHORED"

    audit = client.get(f"/api/v1/audit/orders/{order_id}/verify", headers=headers)
    assert audit.status_code == 200
    assert audit.get_json()["verified"] is True

    anchor = client.post(
        "/api/v1/blockchain/anchors", headers=headers, json={"order_id": order_id}
    )
    assert anchor.status_code == 200
    assert anchor.get_json()["idempotent"] is True
    event_hash = anchor.get_json()["anchor"]["event_hash"]

    receipt = client.get(f"/api/v1/blockchain/anchors/{event_hash}", headers=headers)
    assert receipt.status_code == 200
    assert receipt.get_json()["anchor"]["verified"] is True

    summary = client.post(
        f"/api/v1/ai/orders/{order_id}/summary", headers=headers
    )
    assert summary.status_code == 200
    assert summary.get_json()["insight"]["source"] == "local-rules"
    assert summary.headers["X-Request-ID"] == "e2e-demo"
