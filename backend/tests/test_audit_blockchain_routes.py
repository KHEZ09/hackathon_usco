from dataclasses import replace

import jwt

from app import create_app


def _token(app, *, subject: str, role: str, permissions: list[str]) -> str:
    return jwt.encode(
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


def _headers(app, *, subject: str, role: str, permissions: list[str]) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_token(app, subject=subject, role=role, permissions=permissions)}"
    }


def _create_order(app):
    return app.test_client().post(
        "/api/v1/orders",
        headers=_headers(
            app,
            subject="operator-1",
            role="operator",
            permissions=["orders:create", "orders:read", "orders:update", "tracking:read"],
        ),
        json={"product": "Cacao", "quantity": 10, "origin": "Huila"},
    )


def test_audit_verification_and_blockchain_anchor_flow():
    app = create_app()
    client = app.test_client()
    created = _create_order(app)
    order_id = created.get_json()["order"]["id"]

    audit_headers = _headers(
        app,
        subject="accounting-1",
        role="accounting",
        permissions=["audit:read"],
    )
    audit = client.get(f"/api/v1/audit/orders/{order_id}", headers=audit_headers)
    verification = client.get(
        f"/api/v1/audit/orders/{order_id}/verify", headers=audit_headers
    )
    viewer_audit = client.get(
        f"/api/v1/audit/orders/{order_id}",
        headers=_headers(
            app,
            subject="viewer-1",
            role="viewer",
            permissions=["orders:read", "tracking:read", "blockchain:read"],
        ),
    )

    assert audit.status_code == 200
    assert len(audit.get_json()["audits"]) == 1
    assert audit.get_json()["verified"] is True
    assert verification.get_json() == {
        "event_count": 1,
        "order_id": order_id,
        "verified": True,
    }
    assert viewer_audit.status_code == 403

    admin_headers = _headers(
        app,
        subject="admin-1",
        role="admin",
        permissions=["*"],
    )
    anchored = client.post(
        "/api/v1/blockchain/anchors",
        headers=admin_headers,
        json={"order_id": order_id},
    )
    event_hash = anchored.get_json()["anchor"]["event_hash"]
    receipt = client.get(
        f"/api/v1/blockchain/anchors/{event_hash}",
        headers=_headers(
            app,
            subject="viewer-1",
            role="viewer",
            permissions=["blockchain:read"],
        ),
    )

    assert anchored.status_code == 200
    assert anchored.get_json()["idempotent"] is True
    assert receipt.status_code == 200
    assert receipt.get_json()["anchor"]["verified"] is True

    repeated = client.post(
        "/api/v1/blockchain/anchors",
        headers=admin_headers,
        json={"order_id": order_id},
    )
    assert repeated.status_code == 200
    assert repeated.get_json()["idempotent"] is True


def test_tampered_chain_cannot_be_verified_or_anchored():
    app = create_app()
    client = app.test_client()
    created = _create_order(app)
    order_id = created.get_json()["order"]["id"]
    repository = app.extensions["orivia_order_repository"]
    order = repository.get(order_id)
    order.events[0] = replace(order.events[0], event_hash="sha256:tampered")

    audit_headers = _headers(
        app,
        subject="accounting-1",
        role="accounting",
        permissions=["audit:read"],
    )
    verification = client.get(
        f"/api/v1/audit/orders/{order_id}/verify", headers=audit_headers
    )
    blocked_anchor = client.post(
        "/api/v1/blockchain/anchors",
        headers=_headers(
            app,
            subject="admin-1",
            role="admin",
            permissions=["*"],
        ),
        json={"order_id": order_id},
    )

    assert verification.status_code == 200
    assert verification.get_json()["verified"] is False
    assert blocked_anchor.status_code == 409
    assert blocked_anchor.get_json()["error"] == "INTEGRITY_CHECK_FAILED"
