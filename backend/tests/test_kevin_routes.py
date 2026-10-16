from decimal import Decimal

import jwt

from app import create_app


def _token(app, *, role="admin", permissions=None):
    return jwt.encode(
        {
            "sub": "00000000-0000-0000-0000-000000000001",
            "role": role,
            "roles": [role.upper()],
            "permissions": permissions or ["*"],
            "iat": 1730000000,
            "exp": 4102444800,
            "iss": app.config["JWT_ISSUER"],
            "jti": "kevin-route-test",
            "type": "access",
        },
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )


def test_public_catalog_forwards_search_filter(monkeypatch):
    app = create_app()
    calls = {}

    def products(query, public_only):
        calls.update(query=query, public_only=public_only)
        return [{"sku": "CAC-001"}]

    monkeypatch.setattr("app.catalog.routes.catalog_repo.products", products)

    response = app.test_client().get("/api/v1/catalog/products?q=premium")

    assert response.status_code == 200
    assert response.get_json() == {"data": [{"sku": "CAC-001"}]}
    assert calls == {"query": "premium", "public_only": True}


def test_public_traceability_forwards_filters(monkeypatch):
    app = create_app()
    calls = {}

    def traceability(query, municipality):
        calls.update(query=query, municipality=municipality)
        return [{"lot_code": "HUI-2026-0001"}]

    monkeypatch.setattr("app.catalog.routes.catalog_repo.traceability", traceability)

    response = app.test_client().get(
        "/api/v1/catalog/traceability?q=HUI&municipality=Pitalito"
    )

    assert response.status_code == 200
    assert response.get_json()["data"][0]["lot_code"] == "HUI-2026-0001"
    assert calls == {"query": "HUI", "municipality": "Pitalito"}


def test_protected_accounting_rejects_missing_token():
    response = create_app().test_client().get("/api/v1/accounting/inventory")

    assert response.status_code == 401
    assert response.get_json()["error"] == "AUTHENTICATION_REQUIRED"


def test_accounting_data_requires_accounting_permission():
    app = create_app()
    headers = {"Authorization": f"Bearer {_token(app, role='buyer', permissions=['orders:read'])}"}

    response = app.test_client().get("/api/v1/accounting/costs", headers=headers)

    assert response.status_code == 403
    assert response.get_json()["error"] == "FORBIDDEN"


def test_accounting_cost_validates_non_negative_values(monkeypatch):
    app = create_app()
    headers = {"Authorization": f"Bearer {_token(app)}"}
    called = False

    def fail_if_called(*args):
        nonlocal called
        called = True

    monkeypatch.setattr(
        "app.accounting.routes.accounting_repo.set_lot_cost", fail_if_called
    )

    response = app.test_client().post(
        "/api/v1/accounting/lots/00000000-0000-0000-0000-000000000002/cost",
        headers=headers,
        json={"total_cost": -1, "cost_per_kg": 10},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "VALIDATION_ERROR"
    assert called is False


def test_accounting_cost_passes_decimal_values(monkeypatch):
    app = create_app()
    headers = {"Authorization": f"Bearer {_token(app)}"}
    captured = {}

    def set_lot_cost(lot_id, total_cost, cost_per_kg):
        captured.update(
            lot_id=str(lot_id),
            total_cost=total_cost,
            cost_per_kg=cost_per_kg,
        )
        return {"lot_id": str(lot_id)}

    monkeypatch.setattr(
        "app.accounting.routes.accounting_repo.set_lot_cost", set_lot_cost
    )

    response = app.test_client().post(
        "/api/v1/accounting/lots/00000000-0000-0000-0000-000000000002/cost",
        headers=headers,
        json={"total_cost": "1200000.50", "cost_per_kg": "12000.005"},
    )

    assert response.status_code == 200
    assert captured["total_cost"] == Decimal("1200000.50")
    assert captured["cost_per_kg"] == Decimal("12000.005")


def test_accounting_cost_returns_not_found_for_unknown_lot(monkeypatch):
    app = create_app()
    headers = {"Authorization": f"Bearer {_token(app)}"}
    monkeypatch.setattr(
        "app.accounting.routes.accounting_repo.set_lot_cost", lambda *args: None
    )

    response = app.test_client().post(
        "/api/v1/accounting/lots/00000000-0000-0000-0000-000000000002/cost",
        headers=headers,
        json={"total_cost": 100, "cost_per_kg": 10},
    )

    assert response.status_code == 404
    assert response.get_json()["error"] == "NOT_FOUND"


def test_report_overview_is_protected_and_returns_repository_data(monkeypatch):
    app = create_app()
    headers = {"Authorization": f"Bearer {_token(app)}"}
    expected = {"inventory": [], "alerts": [], "orders": {"order_count": 0}}
    monkeypatch.setattr("app.reports.routes.report_repo.overview", lambda: expected)

    response = app.test_client().get("/api/v1/reports/overview", headers=headers)

    assert response.status_code == 200
    assert response.get_json() == {"data": expected}


def test_report_overview_requires_reports_permission():
    app = create_app()
    headers = {"Authorization": f"Bearer {_token(app, role='buyer', permissions=['orders:read'])}"}

    response = app.test_client().get("/api/v1/reports/overview", headers=headers)

    assert response.status_code == 403


def test_integration_provider_is_validated_before_sync(monkeypatch):
    app = create_app()
    headers = {"Authorization": f"Bearer {_token(app)}"}
    called = False

    class UnexpectedService:
        def sync(self, provider):
            nonlocal called
            called = True
            return {}

    monkeypatch.setattr(
        "app.integrations.routes.IntegrationService", UnexpectedService
    )

    response = app.test_client().post(
        f"/api/v1/integrations/{'x' * 81}/sync", headers=headers
    )

    assert response.status_code == 400
    assert called is False


def test_users_route_requires_admin_role():
    app = create_app()
    token = _token(app, role="operator", permissions=["users:read"])
    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = app.test_client().get("/api/v1/users", headers=headers)

    assert response.status_code == 403
    assert response.get_json()["error"] == "FORBIDDEN"


def test_users_status_filter_rejects_unknown_enum(monkeypatch):
    app = create_app()
    headers = {"Authorization": f"Bearer {_token(app)}"}
    called = False

    def fail_if_called(status):
        nonlocal called
        called = True
        return []

    monkeypatch.setattr("app.users.routes.repo.list", fail_if_called)

    response = app.test_client().get(
        "/api/v1/users?status=unknown", headers=headers
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "VALIDATION_ERROR"
    assert called is False
