from __future__ import annotations

from typing import Any

from flask import g

from .repository import OrderRecord


def _permissions() -> set[str]:
    principal: dict[str, Any] = getattr(g, "current_principal", {})
    raw_permissions = principal.get("permissions", [])
    return {permission for permission in raw_permissions if isinstance(permission, str)}


def _principal_id() -> str:
    principal: dict[str, Any] = getattr(g, "current_principal", {})
    return str(principal.get("sub", ""))


def can_read_order(
    order: OrderRecord, *, audit: bool = False, public: bool = False
) -> bool:
    """Apply object-level authorization after route-level permission checks."""
    permissions = _permissions()
    if "*" in permissions or "orders:read:all" in permissions:
        return True
    if audit and "audit:read" in permissions:
        return True
    if public and "orders:read:public" in permissions:
        return True
    return bool(_principal_id()) and order.created_by == _principal_id()


def can_update_order(order: OrderRecord) -> bool:
    permissions = _permissions()
    if "*" in permissions or "orders:update:all" in permissions:
        return True
    return bool(_principal_id()) and order.created_by == _principal_id()
