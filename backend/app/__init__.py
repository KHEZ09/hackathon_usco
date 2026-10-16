from flask import Flask

from .auth_tokens.routes import auth_bp
from .config import Settings
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
    )

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")

    return app
