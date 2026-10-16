from uuid import uuid4

from flask import Flask, g, jsonify, request

from .ai.routes import ai_bp
from .audit.routes import audit_bp
from .auth_tokens.routes import auth_bp
from .blockchain.adapter import MemoryBlockchainAnchor
from .blockchain.routes import blockchain_bp
from .config import Settings
from .database.registration import register_kevin_modules
from .orders.repository import InMemoryOrderRepository
from .orders.routes import orders_bp
from .routes import health_bp


def create_app(settings: Settings | None = None) -> Flask:
    """Create and configure the ORIVIA Flask application."""
    settings = settings or Settings.from_env()

    app = Flask(__name__)
    app.config.from_mapping(
        ORIVIA_SETTINGS=settings,
        ENVIRONMENT=settings.environment,
        JWT_SECRET_KEY=settings.jwt_secret_key,
        JWT_ISSUER=settings.jwt_issuer,
        ACCESS_TOKEN_TTL_SECONDS=settings.access_token_ttl_seconds,
        REFRESH_TOKEN_TTL_SECONDS=settings.refresh_token_ttl_seconds,
        DATABASE_URL=settings.database_url,
        OLLAMA_BASE_URL=settings.ollama_base_url,
        OLLAMA_MODEL=settings.ollama_model,
        MAX_CONTENT_LENGTH=1 * 1024 * 1024,
    )

    @app.before_request
    def assign_request_id() -> None:
        incoming = request.headers.get("X-Request-ID", "").strip()
        valid = incoming and len(incoming) <= 80 and all(
            character.isalnum() or character in "-_" for character in incoming
        )
        g.request_id = incoming if valid else str(uuid4())

    @app.after_request
    def apply_security_headers(response):
        response.headers["X-Request-ID"] = getattr(g, "request_id", str(uuid4()))
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        return response

    @app.errorhandler(413)
    def payload_too_large(_error):
        return (
            jsonify(
                {
                    "error": "PAYLOAD_TOO_LARGE",
                    "message": "El cuerpo de la solicitud supera el límite permitido.",
                    "request_id": getattr(g, "request_id", None),
                }
            ),
            413,
        )
    app.extensions["orivia_order_repository"] = InMemoryOrderRepository()
    app.extensions["orivia_blockchain_anchor"] = MemoryBlockchainAnchor()
    app.extensions["orivia_anchor_receipts"] = {}

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(orders_bp, url_prefix="/api/v1/orders")
    app.register_blueprint(audit_bp, url_prefix="/api/v1/audit")
    app.register_blueprint(blockchain_bp, url_prefix="/api/v1/blockchain")
    app.register_blueprint(ai_bp, url_prefix="/api/v1/ai")
    register_kevin_modules(app)

    return app
