from __future__ import annotations

from typing import Any

from flask import Blueprint, current_app, g, jsonify, request

from ..database.repositories import AuthRepository, UserRepository
from ..security.middleware import require_access_token
from ..users.service import normalized_roles, principal_from_user, public_user
from .jwt_service import TokenService
from .passwords import verify_password
from .refresh_tokens import hash_refresh_token, issue_refresh_token

auth_bp = Blueprint("auth", __name__)


def _token_service() -> TokenService:
    return TokenService(
        secret_key=current_app.config["JWT_SECRET_KEY"],
        issuer=current_app.config["JWT_ISSUER"],
        access_ttl_seconds=current_app.config["ACCESS_TOKEN_TTL_SECONDS"],
    )


def _user_repository() -> UserRepository:
    repository = current_app.extensions.get("orivia_user_repository")
    return repository if repository is not None else UserRepository()


def _auth_repository() -> AuthRepository:
    repository = current_app.extensions.get("orivia_auth_repository")
    return repository if repository is not None else AuthRepository()


def _login_rate_limit_keys(login: str | None) -> tuple[str, ...]:
    remote_address = request.remote_addr or "unknown"
    keys = [f"ip:{remote_address}"]
    if login:
        keys.append(f"login:{login.casefold()}")
    return tuple(keys)


def _rate_limit_response(retry_after: int):
    response = jsonify(
        {
            "error": "LOGIN_RATE_LIMITED",
            "message": "Demasiados intentos de acceso. Intenta nuevamente más tarde.",
            "retry_after_seconds": retry_after,
        }
    )
    response.headers["Retry-After"] = str(retry_after)
    return response, 429


def _credentials() -> tuple[str, str] | None:
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return None
    login = data.get("email") or data.get("login")
    password = data.get("password")
    if not isinstance(login, str) or not login.strip():
        return None
    if not isinstance(password, str) or not password:
        return None
    return login.strip(), password


def _tokens_for_user(row: dict[str, Any]) -> dict[str, Any]:
    try:
        principal = principal_from_user(row)
        access_token = _token_service().issue_access_token(
            subject=principal["sub"],
            role=principal["role"],
            roles=principal["roles"],
            permissions=principal["permissions"],
        )
    except ValueError:
        return (
            jsonify(
                {
                    "error": "ACCOUNT_ROLE_REQUIRED",
                    "message": "La cuenta no tiene un rol válido configurado.",
                }
            ),
            403,
        )
    refresh_token, refresh_hash = issue_refresh_token()
    _auth_repository().insert_refresh_token(
        row["user_id"],
        refresh_hash,
        current_app.config["REFRESH_TOKEN_TTL_SECONDS"],
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "Bearer",
        "expires_in": current_app.config["ACCESS_TOKEN_TTL_SECONDS"],
        "user": public_user(row),
    }


@auth_bp.post("/login")
def login():
    credentials = _credentials()
    if credentials is None:
        return (
            jsonify(
                {
                    "error": "INVALID_CREDENTIALS_PAYLOAD",
                    "message": "Se requieren email/login y password.",
                }
            ),
            400,
        )

    login_value, password = credentials
    limiter = current_app.extensions["orivia_login_rate_limiter"]
    rate_limit_keys = _login_rate_limit_keys(login_value)
    if current_app.config["LOGIN_RATE_LIMIT_ENABLED"]:
        for key in rate_limit_keys:
            decision = limiter.check(key)
            if not decision.allowed:
                return _rate_limit_response(decision.retry_after_seconds)

    row = _user_repository().by_login(login_value)
    if row is None or not verify_password(password, row.get("password_hash", "")):
        if current_app.config["LOGIN_RATE_LIMIT_ENABLED"]:
            decisions = [limiter.record_failure(key) for key in rate_limit_keys]
            blocked = [
                decision.retry_after_seconds
                for decision in decisions
                if not decision.allowed
            ]
            if blocked:
                return _rate_limit_response(max(blocked))
        return (
            jsonify(
                {
                    "error": "INVALID_CREDENTIALS",
                    "message": "Credenciales inválidas.",
                }
            ),
            401,
        )

    if current_app.config["LOGIN_RATE_LIMIT_ENABLED"]:
        for key in rate_limit_keys:
            limiter.clear(key)

    try:
        normalized_roles(row)
        payload = _tokens_for_user(row)
    except ValueError:
        return (
            jsonify(
                {
                    "error": "ACCOUNT_ROLE_REQUIRED",
                    "message": "La cuenta no tiene un rol válido configurado.",
                }
            ),
            403,
        )
    return jsonify(payload), 200


@auth_bp.get("/me")
@require_access_token
def me():
    return jsonify({"user": g.current_principal})


@auth_bp.post("/refresh")
def refresh():
    data = request.get_json(silent=True)
    token = data.get("refresh_token") if isinstance(data, dict) else None
    if not isinstance(token, str) or not token:
        return (
            jsonify(
                {
                    "error": "INVALID_REFRESH_TOKEN_PAYLOAD",
                    "message": "refresh_token es obligatorio.",
                }
            ),
            400,
        )

    replacement, replacement_hash = issue_refresh_token()
    row = _auth_repository().rotate_refresh_token(
        hash_refresh_token(token),
        replacement_hash,
        current_app.config["REFRESH_TOKEN_TTL_SECONDS"],
    )
    if row is None:
        return (
            jsonify(
                {
                    "error": "INVALID_REFRESH_TOKEN",
                    "message": "El refresh token es inválido, expiró o fue revocado.",
                }
            ),
            401,
        )

    principal = principal_from_user(row)
    access_token = _token_service().issue_access_token(
        subject=principal["sub"],
        role=principal["role"],
        roles=principal["roles"],
        permissions=principal["permissions"],
    )
    return (
        jsonify(
            {
                "access_token": access_token,
                "refresh_token": replacement,
                "token_type": "Bearer",
                "expires_in": current_app.config["ACCESS_TOKEN_TTL_SECONDS"],
                "user": public_user(row),
            }
        ),
        200,
    )
