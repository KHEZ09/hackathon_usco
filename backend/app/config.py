from __future__ import annotations

import os
from dataclasses import dataclass


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
    ollama_base_url: str | None
    ollama_model: str

    @classmethod
    def from_env(cls) -> Settings:
        environment = os.getenv("ORIVIA_ENV", "development")
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
                "postgresql://orivia:orivia_dev_password@localhost:5432/orivia",
            ),
            order_repository_backend=os.getenv(
                "ORIVIA_ORDER_REPOSITORY",
                "postgres" if environment.lower() == "production" else "memory",
            ).strip().lower(),
            ollama_base_url=os.getenv("OLLAMA_BASE_URL") or None,
            ollama_model=os.getenv("OLLAMA_MODEL", "gpt-oss:120b"),
        )
        if settings.access_token_ttl_seconds <= 0:
            raise ConfigurationError("ORIVIA_ACCESS_TOKEN_TTL_SECONDS must be positive")
        if settings.refresh_token_ttl_seconds <= 0:
            raise ConfigurationError("ORIVIA_REFRESH_TOKEN_TTL_SECONDS must be positive")
        if settings.order_repository_backend not in {"memory", "postgres"}:
            raise ConfigurationError(
                "ORIVIA_ORDER_REPOSITORY must be either memory or postgres"
            )

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

        return settings
