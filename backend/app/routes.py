from flask import Blueprint, current_app, jsonify

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
    """Readiness is intentionally degraded until the DB adapter is integrated."""
    return (
        jsonify(
            {
                "status": "degraded",
                "service": "orivia-backend",
                "dependencies": {"database": "pending-integration"},
            }
        ),
        503,
    )
