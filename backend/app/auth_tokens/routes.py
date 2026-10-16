from flask import Blueprint, current_app, g, jsonify

from ..security.middleware import require_access_token
from .jwt_service import TokenService

auth_bp = Blueprint("auth", __name__)


def _token_service() -> TokenService:
    return TokenService(
        secret_key=current_app.config["JWT_SECRET_KEY"],
        issuer=current_app.config["JWT_ISSUER"],
        access_ttl_seconds=current_app.config["ACCESS_TOKEN_TTL_SECONDS"],
    )


@auth_bp.post("/login")
def login():
    """Login contract; user repository integration is owned by the DB module."""
    return (
        jsonify(
            {
                "error": "AUTH_USER_REPOSITORY_PENDING",
                "message": "El repositorio de usuarios aún no está conectado.",
            }
        ),
        501,
    )


@auth_bp.get("/me")
@require_access_token
def me():
    return jsonify({"user": g.current_principal})


@auth_bp.post("/refresh")
def refresh():
    return (
        jsonify(
            {
                "error": "AUTH_REFRESH_REPOSITORY_PENDING",
                "message": "El almacenamiento de refresh tokens aún no está conectado.",
            }
        ),
        501,
    )
