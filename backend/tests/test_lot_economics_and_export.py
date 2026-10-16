"""RF04, RF05, RF10, RF11 y RF12 sobre lotes trazables (pruebas del jurado)."""

import jwt

from app import create_app

ADMIN = ["*"]
OPERATOR = ["lots:read", "lots:create", "lots:transform"]
BUYER = ["lots:read", "orders:read"]


def _headers(app, permissions, subject="tester"):
    token = jwt.encode(
        {
            "sub": subject,
            "role": "admin" if permissions == ADMIN else "operator",
            "permissions": permissions,
            "iat": 1730000000,
            "exp": 4102444800,
            "iss": app.config["JWT_ISSUER"],
            "jti": f"eco-{subject}",
            "type": "access",
        },
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def _new_lot(client, headers, lot_id, received=100, origin="Rivera, Huila"):
    response = client.post(
        "/api/v1/lots",
        headers=headers,
        json={"lot_id": lot_id, "product": "Cacao seco", "origin": origin, "producer": "Productor A", "received_kg": received},
    )
    assert response.status_code == 201, response.get_json()


def test_base_example_unit_cost_and_margin_match_the_challenge():
    app = create_app()
    client = app.test_client()
    admin = _headers(app, ADMIN, "admin")
    operator = _headers(app, OPERATOR, "op")
    _new_lot(client, operator, "JUR-001", 100)
    transformed = client.post(
        "/api/v1/lots/JUR-001/transformations",
        headers=operator,
        json={"operation_code": "OP-JUR-1", "stage": "Fermentación y secado", "responsible": "Operador", "input_kg": 100, "output_kg": 80},
    )
    assert transformed.status_code == 201

    saved = client.put(
        "/api/v1/lots/JUR-001/economics",
        headers=admin,
        json={"total_cost_cop": 1_600_000, "sale_price_cop_kg": 25_000, "included_costs": "Mano de obra y energía"},
    )
    assert saved.status_code == 200
    lot = saved.get_json()["lot"]
    eco = lot["economics"]
    assert eco["sellable_kg"] == 80
    assert eco["unit_cost_cop_kg"] == 20_000
    assert eco["margin_pct"] == 20
    assert "÷" in eco["formulas"]["costo_unitario"]
    assert lot["merma_pct"] == 20
    assert any(a["type"] == "MERMA" and "20.0%" in a["cause"] for a in lot["alerts"])


def test_values_are_calculated_not_fixed():
    app = create_app()
    client = app.test_client()
    admin = _headers(app, ADMIN, "admin")
    _new_lot(client, _headers(app, OPERATOR), "JUR-002", 50)
    saved = client.put(
        "/api/v1/lots/JUR-002/economics",
        headers=admin,
        json={"total_cost_cop": 1_000_000, "sale_price_cop_kg": 40_000, "included_costs": "Transporte"},
    )
    eco = saved.get_json()["lot"]["economics"]
    assert eco["unit_cost_cop_kg"] == 20_000  # 1.000.000 / 50
    assert eco["margin_pct"] == 50  # (40.000 - 20.000) / 40.000


def test_zero_output_and_zero_price_never_divide_by_zero():
    app = create_app()
    client = app.test_client()
    admin = _headers(app, ADMIN, "admin")
    operator = _headers(app, OPERATOR, "op")
    _new_lot(client, operator, "JUR-003", 10)
    client.post(
        "/api/v1/lots/JUR-003/transformations",
        headers=operator,
        json={"operation_code": "OP-JUR-3", "stage": "Secado", "responsible": "Operador", "input_kg": 10, "output_kg": 0},
    )
    saved = client.put(
        "/api/v1/lots/JUR-003/economics",
        headers=admin,
        json={"total_cost_cop": 500_000, "sale_price_cop_kg": 0, "included_costs": "Energía"},
    )
    assert saved.status_code == 200
    eco = saved.get_json()["lot"]["economics"]
    assert eco["unit_cost_cop_kg"] is None
    assert eco["margin_pct"] is None
    assert any("dividir entre cero" in note for note in eco["notes"])


def test_economics_validation_and_permissions():
    app = create_app()
    client = app.test_client()
    admin = _headers(app, ADMIN, "admin")
    operator = _headers(app, OPERATOR, "op")

    negative = client.put("/api/v1/lots/CAC001/economics", headers=admin, json={"total_cost_cop": -1, "sale_price_cop_kg": 1})
    assert negative.status_code == 400
    missing_explanation = client.put("/api/v1/lots/CAC001/economics", headers=admin, json={"total_cost_cop": 10, "sale_price_cop_kg": 1})
    assert missing_explanation.status_code == 400

    denied = client.put(
        "/api/v1/lots/CAC001/economics",
        headers=operator,
        json={"total_cost_cop": 1, "sale_price_cop_kg": 1, "included_costs": "x"},
    )
    assert denied.status_code == 403
    assert client.get("/api/v1/lots/export.csv", headers=operator).status_code == 403


def test_costs_are_hidden_from_non_accounting_roles():
    app = create_app()
    client = app.test_client()
    buyer_list = client.get("/api/v1/lots", headers=_headers(app, BUYER, "buyer")).get_json()["data"]
    assert buyer_list and all("economics" not in lot for lot in buyer_list)
    admin_list = client.get("/api/v1/lots", headers=_headers(app, ADMIN, "admin")).get_json()["data"]
    cac001 = next(lot for lot in admin_list if lot["id"] == "CAC001")
    assert cac001["economics"]["unit_cost_cop_kg"] == 20_000


def test_economics_change_is_audited_with_previous_and_new_values():
    app = create_app()
    client = app.test_client()
    admin = _headers(app, ADMIN, "admin")
    client.put(
        "/api/v1/lots/CAC001/economics",
        headers=admin,
        json={"total_cost_cop": 1_700_000, "sale_price_cop_kg": 26_000, "included_costs": "Mano de obra"},
    )
    audits = client.get("/api/v1/lots/CAC001", headers=admin).get_json()["lot"]["audits"]
    change = next(a for a in audits if a["action"] == "LOT_ECONOMICS_UPDATED")
    assert change["changes"]["previous"]["total_cost_cop"] == 1_600_000
    assert change["changes"]["new"]["total_cost_cop"] == 1_700_000
    assert change["actor_id"] == "admin"


def test_filters_by_origin_and_status():
    app = create_app()
    client = app.test_client()
    admin = _headers(app, ADMIN, "admin")
    _new_lot(client, _headers(app, OPERATOR), "JUR-ALG", 80, origin="Algeciras, Huila")
    by_origin = client.get("/api/v1/lots?origin=algeciras", headers=admin).get_json()["data"]
    assert [lot["id"] for lot in by_origin] == ["JUR-ALG"]
    pending = client.get("/api/v1/lots?status=pending", headers=admin).get_json()["data"]
    assert pending and all(lot["status"] == "PENDING" for lot in pending)
    assert client.get("/api/v1/lots?status=PERDIDO", headers=admin).status_code == 400


def test_csv_export_has_required_columns_and_no_formula_injection():
    app = create_app()
    client = app.test_client()
    admin = _headers(app, ADMIN, "admin")
    _new_lot(client, _headers(app, OPERATOR), "=HACK", 10, origin="=cmd|' /C calc'!A0")
    response = client.get("/api/v1/lots/export.csv", headers=admin)
    assert response.status_code == 200
    assert response.mimetype == "text/csv"
    text = response.get_data(as_text=True).lstrip("﻿")
    header = text.splitlines()[0]
    for column in ("lote", "origen", "recibido_kg", "disponible_kg", "estado", "costo_unitario_cop_kg", "margen_pct"):
        assert column in header
    assert "CAC001" in text
    assert "'=HACK" in text and "\n=HACK" not in text
