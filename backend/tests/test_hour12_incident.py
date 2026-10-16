import jwt

from app import create_app


def _headers(app, permissions, subject="hour12-admin"):
    token = jwt.encode(
        {
            "sub": subject,
            "role": "test",
            "permissions": permissions,
            "iat": 1730000000,
            "exp": 4102444800,
            "iss": app.config["JWT_ISSUER"],
            "jti": f"hour12-{subject}",
            "type": "access",
        },
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def test_cac001_regression_blocks_lot_keeps_history_and_explains_quantity():
    app = create_app()
    client = app.test_client()
    admin = _headers(app, ["*"])

    before = client.get("/api/v1/public/lots/CAC001")
    blocked = client.patch(
        "/api/v1/lots/CAC001/status",
        headers=admin,
        json={
            "status": "BLOCKED",
            "reason": "Incidencia informada durante la hora 12.",
        },
    )
    timeline = client.get("/api/v1/lots/CAC001/timeline", headers=admin)

    assert before.status_code == 200
    assert before.get_json()["lot"]["available_for_order"] is True
    public_before = before.get_json()["lot"]
    assert public_before["history_verified"] is True
    assert len(public_before["timeline"]) == 1
    assert "actor_id" not in public_before["timeline"][0]
    assert blocked.status_code == 200
    result = blocked.get_json()["lot"]
    blockchain = blocked.get_json()["blockchain"]
    assert result["status"] == "BLOCKED"
    assert result["available_kg"] == 0
    assert result["affected_quantities"]["affected_kg"] == 80
    assert result["history_verified"] is True
    assert len(result["audits"]) == 1
    assert blockchain["status"] == "ANCHORED"
    assert blockchain["network"] == "memory"
    assert app.extensions["orivia_blockchain_anchor"].verify(
        app.extensions["orivia_blockchain_anchor"].get(blockchain["event_hash"])
    ) is True
    assert timeline.status_code == 200
    assert timeline.get_json()["history_verified"] is True
    assert len(timeline.get_json()["events"]) == 2

    after = client.get("/api/v1/public/lots/CAC001")
    public_lot = after.get_json()["lot"]
    assert public_lot["status"] == "BLOCKED"
    assert public_lot["available_for_order"] is False
    assert public_lot["history_verified"] is True
    assert len(public_lot["timeline"]) == 2
    assert public_lot["timeline"][-1]["blockchain"]["status"] == "ANCHORED"
    assert public_lot["timeline"][-1]["blockchain"]["verified"] is True
    assert "audits" not in public_lot
    assert "reason" not in public_lot


def test_hour12_status_change_requires_reason_and_admin_permission():
    app = create_app()
    client = app.test_client()
    operator = _headers(app, ["lots:read"], subject="operator")
    admin = _headers(app, ["*"])

    forbidden = client.patch(
        "/api/v1/lots/CAC001/status",
        headers=operator,
        json={"status": "BLOCKED", "reason": "No autorizado"},
    )
    invalid = client.patch(
        "/api/v1/lots/CAC001/status",
        headers=admin,
        json={"status": "BLOCKED", "reason": ""},
    )

    assert forbidden.status_code == 403
    assert invalid.status_code == 409


def test_lot_hash_chain_detects_tampering_without_deleting_history():
    app = create_app()
    repository = app.extensions["orivia_lot_repository"]
    lot = repository.get("CAC001")
    assert lot is not None
    assert repository.verify_history("CAC001") is True

    event = lot.events[0]
    lot.payloads[event.event_id]["origin"] = "Tampered"

    assert repository.verify_history("CAC001") is False
    assert len(lot.events) == 1
