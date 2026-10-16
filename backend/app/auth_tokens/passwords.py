from __future__ import annotations

import bcrypt


def hash_password(password: str) -> str:
    """Create a bcrypt hash for a user password."""
    if not isinstance(password, str) or not password:
        raise ValueError("password is required")
    encoded = password.encode("utf-8")
    if len(encoded) > 72:
        raise ValueError("password cannot exceed 72 UTF-8 bytes")
    return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password without exposing whether the user exists."""
    if not isinstance(password, str) or not isinstance(password_hash, str):
        return False
    encoded = password.encode("utf-8")
    if len(encoded) > 72:
        return False
    try:
        return bcrypt.checkpw(encoded, password_hash.encode("ascii"))
    except (UnicodeEncodeError, ValueError, TypeError):
        return False
