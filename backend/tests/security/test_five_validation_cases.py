"""Five executable validation cases for the hackathon evidence package."""

import jwt
import pytest

from app import create_app
from app.users.schemas import validate_user_payload


def _token(app, *, subject: str, permissions: list[str]) -> str:
    return jwt.encode(
        {
            "sub": subject,
            "role": "admin",
            "permissions": permissions,
            "iat": 1730000000,
            "exp": 4102444800,
            "iss": app.config["JWT_ISSUER"],
            "jti": f"validation-{subject}",
            "type": "access",
        },
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )


def test_01_order_rejects_zero_quantity():
    app = create_app()
    headers = {
        "Authorization": f"Bearer {_token(app, subject='operator-1', permissions=['orders:create'])}"
    }

    response = app.test_client().post(
        "/api/v1/orders",
        headers=headers,
        json={"product": "Cacao seco", "quantity": 0},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "INVALID_ORDER"


def test_02_login_rejects_password_over_bcrypt_limit():
    app = create_app()

    response = app.test_client().post(
        "/api/v1/auth/login",
        json={"email": "demo@example.test", "password": "x" * 73},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "INVALID_CREDENTIALS_PAYLOAD"


def test_03_user_schema_rejects_invalid_email():
    with pytest.raises(ValueError, match="Email"):
        validate_user_payload(
            {
                "full_name": "Usuario Demo",
                "email": "correo-invalido",
                "password_hash": "$2b$12$C6UzMDM.H6dfI/f/IKcEe."
                "fK3e2K3e2K3e2K3e2K3e2K3e2K3e2K3e2K3e2",
            }
        )


def test_04_accounting_rejects_negative_cost():
    app = create_app()
    headers = {
        "Authorization": f"Bearer {_token(app, subject='accounting-1', permissions=['accounting:write'])}"
    }

    response = app.test_client().post(
        "/api/v1/accounting/lots/00000000-0000-0000-0000-000000000001/cost",
        headers=headers,
        json={"total_cost": -1, "cost_per_kg": 100},
    )

    assert response.status_code == 400
    assert response.get_json()["error"] == "VALIDATION_ERROR"


def test_05_order_access_rejects_another_users_order():
    app = create_app()
    client = app.test_client()
    owner_headers = {
        "Authorization": f"Bearer {_token(app, subject='owner-1', permissions=['orders:create', 'orders:read'])}"
    }
    other_headers = {
        "Authorization": f"Bearer {_token(app, subject='other-1', permissions=['orders:read'])}"
    }

    created = client.post(
        "/api/v1/orders",
        headers=owner_headers,
        json={"product": "Cacao", "quantity": 1},
    )
    order_id = created.get_json()["order"]["id"]

    response = client.get(f"/api/v1/orders/{order_id}", headers=other_headers)

    assert response.status_code == 404
    assert response.get_json()["error"] == "ORDER_NOT_FOUND"
