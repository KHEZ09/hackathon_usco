from __future__ import annotations

from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar

from flask import current_app, g, jsonify, request

from ..auth_tokens.jwt_service import TokenError, TokenService

F = TypeVar("F", bound=Callable[..., Any])


def require_access_token(view: F) -> F:
    @wraps(view)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        authorization = request.headers.get("Authorization", "")
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer" or not token:
            return (
                jsonify(
                    {
                        "error": "AUTHENTICATION_REQUIRED",
                        "message": "Se requiere un Bearer token válido.",
                    }
                ),
                401,
            )

        try:
            service = TokenService(
                secret_key=current_app.config["JWT_SECRET_KEY"],
                issuer=current_app.config["JWT_ISSUER"],
                access_ttl_seconds=current_app.config["ACCESS_TOKEN_TTL_SECONDS"],
            )
            g.current_principal = service.decode_access_token(token)
        except TokenError:
            return (
                jsonify(
                    {
                        "error": "INVALID_ACCESS_TOKEN",
                        "message": "El token es inválido o expiró.",
                    }
                ),
                401,
            )

        return view(*args, **kwargs)

    return wrapped  # type: ignore[return-value]
