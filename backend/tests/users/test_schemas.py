import pytest

from app.auth_tokens.passwords import hash_password
from app.users.schemas import validate_user_payload


def test_user_payload_normalizes_roles():
    data = validate_user_payload(
        {
            "full_name": "Demo",
            "email": "demo@test.co",
            "password_hash": hash_password("correct-password"),
            "roles": ["admin"],
        }
    )
    assert data["roles"] == ["ADMIN"]


def test_user_payload_rejects_invalid_email():
    with pytest.raises(ValueError, match="Email"):
        validate_user_payload(
            {
                "full_name": "Demo",
                "email": "invalid",
                "password_hash": hash_password("correct-password"),
            }
        )


def test_user_payload_accepts_persisted_accounting_and_viewer_roles():
    for role in ("accounting", "viewer"):
        data = validate_user_payload(
            {
                "full_name": "Demo",
                "email": f"{role}@test.co",
                "password_hash": hash_password("correct-password"),
                "roles": [role],
            }
        )
        assert data["roles"] == [role.upper()]
