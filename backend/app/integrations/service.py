from __future__ import annotations

from uuid import uuid4

from ..database.repositories import IntegrationRepository
from .base_client import IntegrationClient
from .retry_policy import with_retries


class IntegrationService:
    def __init__(self, repository: IntegrationRepository | None = None) -> None:
        self.repository = repository or IntegrationRepository()

    def sync(self, provider: str, client: IntegrationClient | None = None) -> dict:
        key = f"{provider}-{uuid4()}"
        self.repository.start(provider, key)
        try:
            if client is None:
                payload, attempts = (
                    {
                        "mode": "demo",
                        "provider": provider,
                        "message": "Adaptador listo; proveedor no configurado",
                    },
                    1,
                )
            else:
                response, attempts = with_retries(
                    lambda: client.request("GET", "/health")
                )
                payload = {
                    "status_code": response.status_code,
                    "payload_type": type(response.payload).__name__,
                }
            return self.repository.finish(
                provider, key, "SUCCESS", payload, attempts=attempts
            )
        except Exception as exc:  # noqa: BLE001 - se registra el fallo del proveedor
            return self.repository.finish(
                provider, key, "FAILED", {}, error=str(exc), attempts=3
            )
