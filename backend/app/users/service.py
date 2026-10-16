from typing import Any

from ..database.repositories import UserRepository
from ..security.roles import permissions_for_roles

repo = UserRepository()


def public_user(row: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in row.items() if key != "password_hash"}


def normalized_roles(row: dict[str, Any]) -> tuple[str, ...]:
    roles = row.get("roles") or []
    normalized = tuple(dict.fromkeys(str(role).upper() for role in roles if role))
    if not normalized:
        raise ValueError("user must have at least one role")
    return normalized


def primary_role(roles: tuple[str, ...]) -> str:
    priority = ("ADMIN", "OPERATOR", "ACCOUNTING", "BUYER", "VIEWER")
    return next((role for role in priority if role in roles), roles[0])


def principal_from_user(row: dict[str, Any]) -> dict[str, Any]:
    roles = normalized_roles(row)
    return {
        "sub": str(row["user_id"]),
        "role": primary_role(roles),
        "roles": list(roles),
        "permissions": sorted(permissions_for_roles(list(roles))),
    }


def principal_has_role(principal: dict[str, Any], *roles: str) -> bool:
    available = {str(principal.get("role", "")).upper()}
    available.update(str(role).upper() for role in principal.get("roles", []))
    return bool(available.intersection(role.upper() for role in roles))
