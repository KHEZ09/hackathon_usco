from __future__ import annotations

import hashlib
import secrets


def hash_refresh_token(token: str) -> str:
    if not isinstance(token, str) or not token:
        raise ValueError("refresh token is required")
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def issue_refresh_token() -> tuple[str, str]:
    token = secrets.token_urlsafe(48)
    return token, hash_refresh_token(token)
