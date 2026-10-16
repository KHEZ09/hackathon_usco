from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import uuid4

import jwt


class TokenError(ValueError):
    """Raised when a JWT cannot be issued or validated."""


class TokenService:
    def __init__(self, secret_key: str, issuer: str, access_ttl_seconds: int) -> None:
        if not secret_key:
            raise TokenError("JWT secret key is required")
        if access_ttl_seconds <= 0:
            raise TokenError("JWT access token TTL must be positive")

        self._secret_key = secret_key
        self._issuer = issuer
        self._access_ttl_seconds = access_ttl_seconds

    def issue_access_token(
        self,
        *,
        subject: str,
        role: str,
        permissions: list[str] | None = None,
    ) -> str:
        if not subject or not role:
            raise TokenError("subject and role are required")

        now = datetime.now(UTC)
        payload: dict[str, Any] = {
            "sub": subject,
            "role": role,
            "permissions": permissions or [],
            "iat": now,
            "exp": now + timedelta(seconds=self._access_ttl_seconds),
            "iss": self._issuer,
            "jti": str(uuid4()),
            "type": "access",
        }
        return jwt.encode(payload, self._secret_key, algorithm="HS256")

    def decode_access_token(self, token: str) -> dict[str, Any]:
        if not token:
            raise TokenError("token is required")

        try:
            payload = jwt.decode(
                token,
                self._secret_key,
                algorithms=["HS256"],
                issuer=self._issuer,
                options={"require": ["sub", "role", "iat", "exp", "iss", "jti"]},
            )
        except jwt.PyJWTError as exc:
            raise TokenError("invalid or expired access token") from exc

        if payload.get("type") != "access":
            raise TokenError("token type is not allowed")
        return payload
