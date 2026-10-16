import jwt

from app import create_app


def _headers(app, permissions: list[str], subject: str = "rf01-operator"):
    token = jwt.encode(
        {
            "sub": subject,
            "role": "operator",
            "permissions": permissions,
            "iat": 1730000000,
            "exp": 4102444800,
            "iss": app.config["JWT_ISSUER"],
            "jti": f"rf01-{subject}",
            "type": "access",
        },
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def test_rf01_reception_persists_and_rejects_non_positive_quantity():
    app = create_app()
    client = app.test_client()
    headers = _headers(app, ["lots:create", "lots:read", "lots:transform"])

    created = client.post(
        "/api/v1/lots",
        headers=headers,
        json={
            "lot_id": "RF01-001",
            "product": "Cacao seco",
            "origin": "Rivera, Huila",
            "producer": "Finca Sintética",
            "received_kg": 100,
            "received_at": "2026-10-16",
        },
    )
    assert created.status_code == 201
    lot = created.get_json()["lot"]
    assert lot["id"] == "RF01-001"
    assert lot["received_kg"] == 100
    assert lot["available_kg"] == 100
    assert lot["received_at"] == "2026-10-16"
    assert lot["history_verified"] is True
    assert created.get_json()["blockchain"]["status"] == "ANCHORED"

    invalid = client.post(
        "/api/v1/lots",
        headers=headers,
        json={
            "lot_id": "RF01-INVALID",
            "product": "Cacao",
            "origin": "Rivera",
            "producer": "Productor",
            "received_kg": 0,
        },
    )
    assert invalid.status_code == 409


def test_rf02_transformation_calculates_merma_controls_inventory_and_is_idempotent():
    app = create_app()
    client = app.test_client()
    headers = _headers(app, ["lots:create", "lots:read", "lots:transform"])
    client.post(
        "/api/v1/lots",
        headers=headers,
        json={
            "lot_id": "RF02-001",
            "product": "Cacao seco",
            "origin": "Rivera, Huila",
            "producer": "Finca Sintética",
            "received_kg": 100,
        },
    )

    payload = {
        "operation_code": "OP-RF02-001",
        "stage": "Fermentación y secado",
        "responsible": "Operador de beneficio",
        "input_kg": 100,
        "output_kg": 80,
        "incident": "Lluvias durante el secado solar.",
    }
    transformed = client.post(
        "/api/v1/lots/RF02-001/transformations",
        headers=headers,
        json=payload,
    )
    assert transformed.status_code == 201
    result = transformed.get_json()
    assert result["lot"]["available_kg"] == 80
    operation = result["lot"]["transformations"][0]
    assert operation["merma_pct"] == 20
    assert operation["alert"]["type"] == "MERMA"
    assert result["blockchain"]["status"] == "ANCHORED"

    retry = client.post(
        "/api/v1/lots/RF02-001/transformations",
        headers=headers,
        json={**payload, "input_kg": 1, "output_kg": 1},
    )
    assert retry.status_code == 200
    assert retry.get_json()["idempotent"] is True
    assert retry.get_json()["lot"]["available_kg"] == 80

    excessive = client.post(
        "/api/v1/lots/RF02-001/transformations",
        headers=headers,
        json={**payload, "operation_code": "OP-RF02-002", "input_kg": 81},
    )
    assert excessive.status_code == 409


def test_rf01_rf02_are_not_available_to_read_only_operator():
    app = create_app()
    client = app.test_client()
    headers = _headers(app, ["lots:read"], subject="rf01-read-only")
    response = client.post(
        "/api/v1/lots",
        headers=headers,
        json={
            "lot_id": "RF01-FORBIDDEN",
            "product": "Cacao",
            "origin": "Rivera",
            "producer": "Productor",
            "received_kg": 10,
        },
    )
    assert response.status_code == 403
