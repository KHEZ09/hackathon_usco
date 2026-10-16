from typing import Any

from ..database.repositories import UserRepository

repo = UserRepository()


def public_user(row: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in row.items() if key != "password_hash"}


def principal_has_role(principal: dict[str, Any], *roles: str) -> bool:
    return str(principal.get("role", "")).upper() in {role.upper() for role in roles}
