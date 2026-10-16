from __future__ import annotations

ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "operator": frozenset({"orders:read", "orders:create", "tracking:write"}),
    "accounting": frozenset({"orders:read", "accounting:read", "reports:read"}),
    "admin": frozenset({"*"}),
    "viewer": frozenset({"orders:read", "tracking:read"}),
}


def permissions_for_role(role: str) -> frozenset[str]:
    """Return the server-owned baseline permissions for a role."""
    try:
        return ROLE_PERMISSIONS[role]
    except KeyError as exc:
        raise ValueError(f"unknown role: {role}") from exc
