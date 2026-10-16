from __future__ import annotations

from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar

from flask import g, jsonify

F = TypeVar("F", bound=Callable[..., Any])


def require_permissions(*required_permissions: str) -> Callable[[F], F]:
    """Require all listed permissions from the principal loaded by JWT middleware."""
    if not required_permissions or any(not permission for permission in required_permissions):
        raise ValueError("at least one non-empty permission is required")

    def decorator(view: F) -> F:
        @wraps(view)
        def wrapped(*args: Any, **kwargs: Any) -> Any:
            principal = getattr(g, "current_principal", None)
            if not principal:
                return (
                    jsonify(
                        {
                            "error": "AUTHENTICATION_REQUIRED",
                            "message": "Se requiere autenticación para esta operación.",
                        }
                    ),
                    401,
                )

            permissions = set(principal.get("permissions", []))
            if "*" not in permissions and not set(required_permissions).issubset(
                permissions
            ):
                return (
                    jsonify(
                        {
                            "error": "FORBIDDEN",
                            "message": "El usuario no tiene permisos suficientes.",
                            "required_permissions": list(required_permissions),
                        }
                    ),
                    403,
                )

            return view(*args, **kwargs)

        return wrapped  # type: ignore[return-value]

    return decorator
