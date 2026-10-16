import pytest

from app.users.schemas import validate_user_payload


def test_user_payload_normalizes_roles():
    data = validate_user_payload(
        {
            "full_name": "Demo",
            "email": "demo@test.co",
            "password_hash": "x" * 60,
            "roles": ["admin"],
        }
    )
    assert data["roles"] == ["ADMIN"]


def test_user_payload_rejects_invalid_email():
    with pytest.raises(ValueError, match="Email"):
        validate_user_payload(
            {"full_name": "Demo", "email": "invalid", "password_hash": "x" * 60}
        )
