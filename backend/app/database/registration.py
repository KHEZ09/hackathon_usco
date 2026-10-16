from flask import Flask

from .connection import init_pool
from ..users.routes import users_bp
from ..catalog.routes import catalog_bp
from ..accounting.routes import accounting_bp
from ..reports.routes import reports_bp
from ..integrations.routes import integrations_bp


def register_kevin_modules(app: Flask) -> None:
    """Punto único de integración para app.create_app de Sebas."""
    settings = app.config['ORIVIA_SETTINGS']
    init_pool(settings.database_url)
    app.register_blueprint(users_bp, url_prefix='/api/v1')
    app.register_blueprint(catalog_bp, url_prefix='/api/v1')
    app.register_blueprint(accounting_bp, url_prefix='/api/v1')
    app.register_blueprint(reports_bp, url_prefix='/api/v1')
    app.register_blueprint(integrations_bp, url_prefix='/api/v1')
