from flask import Blueprint, current_app, jsonify

from .database.connection import database_is_ready

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
@health_bp.get("/api/v1/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "service": "orivia-backend",
            "environment": current_app.config["ENVIRONMENT"],
        }
    )


@health_bp.get("/ready")
@health_bp.get("/api/v1/ready")
def ready():
    """Readiness real de la API y PostgreSQL."""
    database_status = "ok" if database_is_ready() else "unavailable"
    return (
        jsonify(
            {
                "status": "ready" if database_status == "ok" else "degraded",
                "service": "orivia-backend",
                "dependencies": {"database": database_status},
            }
        ),
        200 if database_status == "ok" else 503,
    )
