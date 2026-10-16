from uuid import uuid4

from flask import Flask, g, jsonify, request

from .ai.routes import ai_bp
from .audit.routes import audit_bp
from .auth_tokens.routes import auth_bp
from .blockchain.adapter import MemoryBlockchainAnchor
from .blockchain.evm import EvmBlockchainAnchor
from .blockchain.postgres_anchor import PostgresBlockchainAnchor
from .blockchain.routes import blockchain_bp
from .cluster.postgres_repository import PostgresClusterRepository
from .cluster.repository import InMemoryClusterRepository
from .cluster.routes import cluster_bp, public_cluster_bp
from .config import Settings
from .database.registration import register_kevin_modules
from .lots.postgres_repository import PostgresLotRepository
from .lots.repository import InMemoryLotRepository
from .lots.routes import lots_bp, public_lots_bp
from .orders.postgres_repository import PostgresOrderRepository
from .orders.repository import InMemoryOrderRepository
from .orders.routes import orders_bp
from .public_live.routes import public_live_bp
from .routes import health_bp
from .security.rate_limit import LoginRateLimiter


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
        ORDER_REPOSITORY_BACKEND=settings.order_repository_backend,
        BLOCKCHAIN_BACKEND=settings.blockchain_backend,
        BLOCKCHAIN_RPC_URL=settings.blockchain_rpc_url,
        BLOCKCHAIN_CHAIN_ID=settings.blockchain_chain_id,
        BLOCKCHAIN_CONTRACT_ADDRESS=settings.blockchain_contract_address,
        BLOCKCHAIN_TX_TIMEOUT_SECONDS=settings.blockchain_tx_timeout_seconds,
        BLOCKCHAIN_GAS_LIMIT=settings.blockchain_gas_limit,
        OLLAMA_BASE_URL=settings.ollama_base_url,
        OLLAMA_API_KEY=settings.ollama_api_key,
        OLLAMA_MODEL=settings.ollama_model,
        CORS_ORIGINS=settings.cors_origins,
        LOGIN_RATE_LIMIT_ENABLED=settings.login_rate_limit_enabled,
        LOGIN_RATE_LIMIT_MAX_FAILURES=settings.login_rate_limit_max_failures,
        LOGIN_RATE_LIMIT_WINDOW_SECONDS=settings.login_rate_limit_window_seconds,
        LOGIN_RATE_LIMIT_BLOCK_SECONDS=settings.login_rate_limit_block_seconds,
        MAX_CONTENT_LENGTH=1 * 1024 * 1024,
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=settings.environment.lower() == "production",
        SESSION_COOKIE_SAMESITE="Lax",
    )

    app.extensions["orivia_login_rate_limiter"] = LoginRateLimiter(
        max_failures=settings.login_rate_limit_max_failures,
        window_seconds=settings.login_rate_limit_window_seconds,
        block_seconds=settings.login_rate_limit_block_seconds,
    )

    @app.before_request
    def assign_request_id() -> None:
        incoming = request.headers.get("X-Request-ID", "").strip()
        valid = incoming and len(incoming) <= 80 and all(
            character.isalnum() or character in "-_" for character in incoming
        )
        g.request_id = incoming if valid else str(uuid4())
        if request.method == "OPTIONS":
            return ("", 204)

    @app.after_request
    def apply_security_headers(response):
        response.headers["X-Request-ID"] = getattr(g, "request_id", str(uuid4()))
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Content-Security-Policy"] = (
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
        )
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        origin = request.headers.get("Origin")
        if origin and origin in app.config["CORS_ORIGINS"]:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers[
                "Access-Control-Allow-Headers"
            ] = "Authorization, Content-Type, X-Request-ID"
            response.headers[
                "Access-Control-Allow-Methods"
            ] = "GET, POST, PATCH, DELETE, OPTIONS"
            response.headers["Access-Control-Max-Age"] = "600"
            response.headers.add("Vary", "Origin")
        if request.path.startswith("/api/v1/auth/") or "Authorization" in request.headers:
            response.headers["Cache-Control"] = "no-store"
        app.logger.info(
            "request method=%s path=%s status=%s request_id=%s",
            request.method,
            request.path,
            response.status_code,
            getattr(g, "request_id", "-"),
        )
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

    @app.errorhandler(404)
    def not_found(_error):
        return (
            jsonify(
                {
                    "error": "NOT_FOUND",
                    "message": "La ruta solicitada no existe.",
                    "request_id": getattr(g, "request_id", None),
                }
            ),
            404,
        )

    @app.errorhandler(405)
    def method_not_allowed(_error):
        return (
            jsonify(
                {
                    "error": "METHOD_NOT_ALLOWED",
                    "message": "El método HTTP no está permitido para esta ruta.",
                    "request_id": getattr(g, "request_id", None),
                }
            ),
            405,
        )

    @app.errorhandler(Exception)
    def internal_server_error(_error):
        app.logger.exception("unhandled request error")
        return (
            jsonify(
                {
                    "error": "INTERNAL_SERVER_ERROR",
                    "message": "Ocurrió un error interno. Intenta nuevamente.",
                    "request_id": getattr(g, "request_id", None),
                }
            ),
            500,
        )
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(orders_bp, url_prefix="/api/v1/orders")
    app.register_blueprint(audit_bp, url_prefix="/api/v1/audit")
    app.register_blueprint(blockchain_bp, url_prefix="/api/v1/blockchain")
    app.register_blueprint(ai_bp, url_prefix="/api/v1/ai")
    app.register_blueprint(cluster_bp, url_prefix="/api/v1/cluster")
    app.register_blueprint(public_cluster_bp, url_prefix="/api/v1/public/cluster")
    app.register_blueprint(lots_bp, url_prefix="/api/v1/lots")
    app.register_blueprint(public_lots_bp, url_prefix="/api/v1/public/lots")
    app.register_blueprint(public_live_bp, url_prefix="/api/v1/public")
    register_kevin_modules(app)

    if settings.order_repository_backend == "postgres":
        app.extensions["orivia_order_repository"] = PostgresOrderRepository()
    else:
        app.extensions["orivia_order_repository"] = InMemoryOrderRepository()
    if settings.blockchain_backend == "evm":
        app.extensions["orivia_blockchain_anchor"] = EvmBlockchainAnchor(
            rpc_url=settings.blockchain_rpc_url or "",
            private_key=settings.blockchain_private_key or "",
            contract_address=settings.blockchain_contract_address or "",
            expected_chain_id=settings.blockchain_chain_id,
            tx_timeout_seconds=settings.blockchain_tx_timeout_seconds,
            gas_limit=settings.blockchain_gas_limit,
        )
    elif settings.blockchain_backend == "postgres":
        app.extensions["orivia_blockchain_anchor"] = PostgresBlockchainAnchor()
    else:
        app.extensions["orivia_blockchain_anchor"] = MemoryBlockchainAnchor()
    app.extensions["orivia_anchor_receipts"] = {}
    if settings.order_repository_backend == "postgres":
        app.extensions["orivia_cluster_repository"] = PostgresClusterRepository(
            app.extensions["orivia_cluster_repositories"]
        )
    else:
        app.extensions["orivia_cluster_repository"] = InMemoryClusterRepository()
    if settings.order_repository_backend == "postgres":
        app.extensions["orivia_lot_repository"] = PostgresLotRepository()
    else:
        app.extensions["orivia_lot_repository"] = InMemoryLotRepository()

    return app
