from __future__ import annotations

import json
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class ExternalResponse:
    status_code: int
    payload: dict | list | str


class IntegrationClient:
    """Cliente HTTP sin secretos en logs y con timeout obligatorio."""

    def __init__(self, base_url: str, timeout_seconds: float = 10.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    def request(
        self,
        method: str,
        path: str,
        payload: dict | None = None,
        headers: dict[str, str] | None = None,
    ) -> ExternalResponse:
        body = json.dumps(payload).encode() if payload is not None else None
        request = Request(
            self.base_url + "/" + path.lstrip("/"),
            data=body,
            method=method.upper(),
            headers={"Content-Type": "application/json", **(headers or {})},
        )
        try:
            with urlopen(request, timeout=self.timeout_seconds) as response:
                raw = response.read().decode()
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    parsed = raw
                return ExternalResponse(response.status, parsed)
        except HTTPError as exc:
            raise RuntimeError(f"Proveedor respondió HTTP {exc.code}") from exc
        except URLError as exc:
            raise RuntimeError("Proveedor no disponible") from exc
