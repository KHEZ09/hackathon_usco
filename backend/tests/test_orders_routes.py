import jwt

from app import create_app


def _token(app, *, subject="operator-1", permissions=None):
    return jwt.encode(
        {
            "sub": subject,
            "role": "operator",
            "permissions": permissions
            if permissions is not None
            else [
                "orders:read",
                "orders:create",
                "orders:update",
                "tracking:read",
            ],
            "iat": 1730000000,
            "exp": 4102444800,
            "iss": app.config["JWT_ISSUER"],
            "jti": f"test-{subject}",
            "type": "access",
        },
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )


def test_orders_flow_creates_transitions_and_timeline():
    app = create_app()
    client = app.test_client()
    headers = {"Authorization": f"Bearer {_token(app)}"}

    created = client.post(
        "/api/v1/orders",
        headers=headers,
        json={
            "product": "Cacao seco",
            "quantity": 25,
            "origin": "Huila",
            "destination": "Neiva",
        },
    )

    assert created.status_code == 201
    order_id = created.get_json()["order"]["id"]
    fetched = client.get(f"/api/v1/orders/{order_id}", headers=headers)
    listed = client.get("/api/v1/orders", headers=headers)
    changed = client.patch(
        f"/api/v1/orders/{order_id}/status",
        headers=headers,
        json={"status": "CONFIRMED"},
    )
    timeline = client.get(
        f"/api/v1/orders/{order_id}/timeline",
        headers=headers,
    )

    assert changed.status_code == 200
    assert changed.get_json()["order"]["status"] == "CONFIRMED"
    assert fetched.status_code == 200
    assert fetched.get_json()["order"]["status"] == "CREATED"
    assert listed.status_code == 200
    assert len(listed.get_json()["orders"]) == 1
    assert timeline.status_code == 200
    assert len(timeline.get_json()["events"]) == 2
    assert timeline.get_json()["events"][1]["previous_event_hash"]


def test_orders_reject_forbidden_creation_and_invalid_transition():
    app = create_app()
    client = app.test_client()
    viewer_headers = {
        "Authorization": f"Bearer {_token(app, subject='viewer-1', permissions=['orders:read'])}"
    }

    forbidden = client.post(
        "/api/v1/orders",
        headers=viewer_headers,
        json={"product": "Cacao", "quantity": 1},
    )
    assert forbidden.status_code == 403

    headers = {"Authorization": f"Bearer {_token(app)}"}
    created = client.post(
        "/api/v1/orders",
        headers=headers,
        json={"product": "Cacao", "quantity": 1},
    )
    order_id = created.get_json()["order"]["id"]
    invalid = client.patch(
        f"/api/v1/orders/{order_id}/status",
        headers=headers,
        json={"status": "DELIVERED"},
    )

    assert invalid.status_code == 409
    assert invalid.get_json()["error"] == "INVALID_ORDER_TRANSITION"


def test_orders_reject_missing_authentication_and_invalid_payload():
    app = create_app()
    client = app.test_client()
    unauthenticated = client.get("/api/v1/orders")
    assert unauthenticated.status_code == 401

    headers = {"Authorization": f"Bearer {_token(app)}"}
    invalid = client.post(
        "/api/v1/orders",
        headers=headers,
        json={"product": "Cacao", "quantity": "many"},
    )

    assert invalid.status_code == 400
    assert invalid.get_json()["error"] == "INVALID_ORDER"


def test_orders_enforce_owner_access_for_non_admin_principals():
    app = create_app()
    client = app.test_client()
    owner_headers = {
        "Authorization": f"Bearer {_token(app, subject='owner-1')}"
    }
    other_headers = {
        "Authorization": f"Bearer {_token(app, subject='other-1')}"
    }

    created = client.post(
        "/api/v1/orders",
        headers=owner_headers,
        json={"product": "Cacao", "quantity": 1},
    )
    order_id = created.get_json()["order"]["id"]

    assert client.get(f"/api/v1/orders/{order_id}", headers=other_headers).status_code == 404
    assert client.get("/api/v1/orders", headers=other_headers).get_json()["orders"] == []
    assert (
        client.get(f"/api/v1/orders/{order_id}/timeline", headers=other_headers).status_code
        == 404
    )
    assert (
        client.patch(
            f"/api/v1/orders/{order_id}/status",
            headers=other_headers,
            json={"status": "CONFIRMED"},
        ).status_code
        == 404
    )
