from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.parse import urlsplit


class ConfigurationError(ValueError):
    """Raised when the runtime configuration is unsafe or incomplete."""


@dataclass(frozen=True)
class Settings:
    environment: str
    host: str
    port: int
    jwt_secret_key: str
    jwt_issuer: str
    access_token_ttl_seconds: int
    refresh_token_ttl_seconds: int
    database_url: str
    order_repository_backend: str
    blockchain_backend: str
    blockchain_rpc_url: str | None
    blockchain_private_key: str | None
    blockchain_contract_address: str | None
    blockchain_chain_id: int | None
    blockchain_tx_timeout_seconds: int
    blockchain_gas_limit: int
    ollama_base_url: str | None
    ollama_api_key: str | None
    ollama_model: str
    cors_origins: tuple[str, ...]
    login_rate_limit_enabled: bool
    login_rate_limit_max_failures: int
    login_rate_limit_window_seconds: int
    login_rate_limit_block_seconds: int

    @classmethod
    def from_env(cls) -> Settings:
        environment = os.getenv("ORIVIA_ENV", "development")
        environment_is_development = environment.lower() == "development"
        origins_value = os.getenv(
            "ORIVIA_CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000"
            if environment_is_development
            else "",
        )
        cors_origins = tuple(
            origin.strip().rstrip("/")
            for origin in origins_value.split(",")
            if origin.strip()
        )
        settings = cls(
            environment=environment,
            host=os.getenv("ORIVIA_HOST", "127.0.0.1"),
            port=int(os.getenv("ORIVIA_PORT", "5000")),
            jwt_secret_key=os.getenv(
                "ORIVIA_JWT_SECRET_KEY", "local-development-secret-change-me-32"
            ),
            jwt_issuer=os.getenv("ORIVIA_JWT_ISSUER", "orivia-api"),
            access_token_ttl_seconds=int(
                os.getenv("ORIVIA_ACCESS_TOKEN_TTL_SECONDS", "3600")
            ),
            refresh_token_ttl_seconds=int(
                os.getenv("ORIVIA_REFRESH_TOKEN_TTL_SECONDS", "2592000")
            ),
            database_url=os.getenv(
                "ORIVIA_DATABASE_URL",
                "",
            ),
            order_repository_backend=os.getenv(
                "ORIVIA_ORDER_REPOSITORY",
                "postgres" if environment.lower() == "production" else "memory",
            ).strip().lower(),
            blockchain_backend=os.getenv(
                "ORIVIA_BLOCKCHAIN_BACKEND",
                "postgres" if environment.lower() == "production" else "memory",
            ).strip().lower(),
            blockchain_rpc_url=os.getenv("ORIVIA_BLOCKCHAIN_RPC_URL") or None,
            blockchain_private_key=os.getenv("ORIVIA_BLOCKCHAIN_PRIVATE_KEY") or None,
            blockchain_contract_address=os.getenv("ORIVIA_BLOCKCHAIN_CONTRACT_ADDRESS")
            or None,
            blockchain_chain_id=(
                int(os.environ["ORIVIA_BLOCKCHAIN_CHAIN_ID"])
                if os.getenv("ORIVIA_BLOCKCHAIN_CHAIN_ID")
                else None
            ),
            blockchain_tx_timeout_seconds=int(
                os.getenv("ORIVIA_BLOCKCHAIN_TX_TIMEOUT_SECONDS", "120")
            ),
            blockchain_gas_limit=int(
                os.getenv("ORIVIA_BLOCKCHAIN_GAS_LIMIT", "180000")
            ),
            ollama_base_url=os.getenv("OLLAMA_BASE_URL") or None,
            ollama_api_key=os.getenv("OLLAMA_API_KEY") or None,
            ollama_model=os.getenv("OLLAMA_MODEL", "gpt-oss:120b"),
            cors_origins=cors_origins,
            login_rate_limit_enabled=os.getenv(
                "ORIVIA_LOGIN_RATE_LIMIT_ENABLED", "true"
            ).lower()
            in {"1", "true", "yes", "on"},
            login_rate_limit_max_failures=int(
                os.getenv("ORIVIA_LOGIN_RATE_LIMIT_MAX_FAILURES", "5")
            ),
            login_rate_limit_window_seconds=int(
                os.getenv("ORIVIA_LOGIN_RATE_LIMIT_WINDOW_SECONDS", "600")
            ),
            login_rate_limit_block_seconds=int(
                os.getenv("ORIVIA_LOGIN_RATE_LIMIT_BLOCK_SECONDS", "900")
            ),
        )
        if settings.access_token_ttl_seconds <= 0:
            raise ConfigurationError("ORIVIA_ACCESS_TOKEN_TTL_SECONDS must be positive")
        if settings.refresh_token_ttl_seconds <= 0:
            raise ConfigurationError("ORIVIA_REFRESH_TOKEN_TTL_SECONDS must be positive")
        if settings.order_repository_backend not in {"memory", "postgres"}:
            raise ConfigurationError(
                "ORIVIA_ORDER_REPOSITORY must be either memory or postgres"
            )
        if settings.blockchain_backend not in {"memory", "postgres", "evm"}:
            raise ConfigurationError(
                "ORIVIA_BLOCKCHAIN_BACKEND must be memory, postgres or evm"
            )
        if any(
            value <= 0
            for value in (
                settings.blockchain_tx_timeout_seconds,
                settings.blockchain_gas_limit,
            )
        ):
            raise ConfigurationError("Blockchain transaction settings must be positive")
        if settings.blockchain_backend == "evm":
            if not all(
                (
                    settings.blockchain_rpc_url,
                    settings.blockchain_private_key,
                    settings.blockchain_contract_address,
                    settings.blockchain_chain_id,
                )
            ):
                raise ConfigurationError(
                    "EVM blockchain requires RPC URL, private key, contract address and chain id"
                )
            if settings.blockchain_chain_id <= 0:
                raise ConfigurationError("ORIVIA_BLOCKCHAIN_CHAIN_ID must be positive")

        if any(
            origin == "*"
            or not origin.startswith(("http://", "https://"))
            for origin in settings.cors_origins
        ):
            raise ConfigurationError(
                "ORIVIA_CORS_ORIGINS must contain explicit http(s) origins; '*' is not allowed"
            )
        if any(
            value <= 0
            for value in (
                settings.login_rate_limit_max_failures,
                settings.login_rate_limit_window_seconds,
                settings.login_rate_limit_block_seconds,
            )
        ):
            raise ConfigurationError("Login rate-limit settings must be positive")

        if settings.environment.lower() == "production":
            secret = settings.jwt_secret_key
            if (
                len(secret.encode("utf-8")) < 32
                or secret == "local-development-secret-change-me-32"
                or secret.startswith("replace-")
            ):
                raise ConfigurationError(
                    "Production requires a unique ORIVIA_JWT_SECRET_KEY of at least 32 bytes"
                )
            if (
                "orivia_dev_password" in settings.database_url
                or os.getenv("ORIVIA_DATABASE_URL") is None
            ):
                raise ConfigurationError(
                    "Production requires an explicit non-development ORIVIA_DATABASE_URL"
                )

        for origin in settings.cors_origins:
            parsed = urlsplit(origin)
            if (
                not parsed.hostname
                or parsed.username
                or parsed.password
                or parsed.path not in {"", "/"}
                or parsed.query
                or parsed.fragment
            ):
                raise ConfigurationError(
                    "ORIVIA_CORS_ORIGINS must contain valid origins without paths or credentials"
                )

        return settings
