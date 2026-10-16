from flask import Flask

from ..accounting.routes import accounting_bp
from ..catalog.routes import catalog_bp
from ..integrations.routes import integrations_bp
from ..reports.routes import reports_bp
from ..users.routes import users_bp
from .cluster_repositories import (
    ActorConnectionRepository,
    ActorNeedRepository,
    ActorOfferRepository,
    ActorRepository,
    TrustSignalRepository,
)
from .connection import init_pool
from .repositories import AuthRepository, UserRepository


def register_kevin_modules(app: Flask) -> None:
    """Punto único de integración para app.create_app de Sebas."""
    settings = app.config["ORIVIA_SETTINGS"]
    init_pool(settings.database_url)
    app.extensions["orivia_user_repository"] = UserRepository()
    app.extensions["orivia_auth_repository"] = AuthRepository()
    app.extensions["orivia_cluster_repositories"] = {
        "actors": ActorRepository(),
        "actor_needs": ActorNeedRepository(),
        "actor_offers": ActorOfferRepository(),
        "actor_connections": ActorConnectionRepository(),
        "trust_signals": TrustSignalRepository(),
    }
    app.register_blueprint(users_bp, url_prefix="/api/v1")
    app.register_blueprint(catalog_bp, url_prefix="/api/v1")
    app.register_blueprint(accounting_bp, url_prefix="/api/v1")
    app.register_blueprint(reports_bp, url_prefix="/api/v1")
    app.register_blueprint(integrations_bp, url_prefix="/api/v1")
