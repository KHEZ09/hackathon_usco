from __future__ import annotations

ROLE_PERMISSIONS: dict[str, frozenset[str]] = {
    "operator": frozenset(
        {
            "orders:read",
            "orders:create",
            "orders:update",
            "tracking:read",
            "tracking:write",
            "cluster:read",
            "needs:create",
            "trust:read",
            "lots:read",
            "catalog:read",
        }
    ),
    "accounting": frozenset(
        {
            "orders:read",
            "orders:read:all",
            "accounting:read",
            "reports:read",
            "audit:read",
            "blockchain:read",
            "cluster:read",
            "trust:read",
            "lots:read",
            "catalog:read",
            "accounting:write",
            "integrations:sync",
        }
    ),
    "admin": frozenset({"*"}),
    "viewer": frozenset(
        {
            "orders:read",
            "tracking:read",
            "blockchain:read",
            "cluster:read",
            "trust:read",
            "lots:read",
        }
    ),
    "buyer": frozenset(
        {
            "orders:read",
            "orders:create",
            "tracking:read",
            "cluster:read",
            "connections:create",
            "trust:read",
            "lots:read",
        }
    ),
}


def permissions_for_role(role: str) -> frozenset[str]:
    """Return the server-owned baseline permissions for a role."""
    role = role.strip().lower()
    try:
        return ROLE_PERMISSIONS[role]
    except KeyError as exc:
        raise ValueError(f"unknown role: {role}") from exc


def permissions_for_roles(roles: list[str] | tuple[str, ...]) -> frozenset[str]:
    permissions: set[str] = set()
    for role in roles:
        permissions.update(permissions_for_role(role))
    return frozenset(permissions)
