from __future__ import annotations

import json
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

MAX_RESPONSE_BYTES = 1 * 1024 * 1024


class _NoRedirectHandler(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


@dataclass(frozen=True)
class ExternalResponse:
    status_code: int
    payload: dict | list | str


class IntegrationClient:
    """Cliente HTTP sin secretos en logs y con timeout obligatorio."""

    def __init__(self, base_url: str, timeout_seconds: float = 10.0) -> None:
        parsed = urlsplit(base_url)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError("base_url must be an explicit HTTP(S) origin")
        if not 0 < timeout_seconds <= 30:
            raise ValueError("timeout_seconds must be between 0 and 30")
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds
        self._opener = build_opener(_NoRedirectHandler())

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
            with self._opener.open(request, timeout=self.timeout_seconds) as response:
                raw = response.read(MAX_RESPONSE_BYTES + 1)
                if len(raw) > MAX_RESPONSE_BYTES:
                    raise RuntimeError("Proveedor respondió un cuerpo demasiado grande")
                raw = raw.decode("utf-8", errors="replace")
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    parsed = raw
                return ExternalResponse(response.status, parsed)
        except HTTPError as exc:
            raise RuntimeError(f"Proveedor respondió HTTP {exc.code}") from exc
        except URLError as exc:
            raise RuntimeError("Proveedor no disponible") from exc
