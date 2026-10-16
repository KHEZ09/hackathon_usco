from flask import Flask

from .ai.routes import ai_bp
from .audit.routes import audit_bp
from .auth_tokens.routes import auth_bp
from .blockchain.adapter import MemoryBlockchainAnchor
from .blockchain.routes import blockchain_bp
from .config import Settings
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
        DATABASE_URL=settings.database_url,
        OLLAMA_BASE_URL=settings.ollama_base_url,
        OLLAMA_MODEL=settings.ollama_model,
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

    return app
