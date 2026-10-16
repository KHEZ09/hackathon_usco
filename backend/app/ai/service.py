from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib import request
from urllib.parse import urlsplit


@dataclass(frozen=True)
class AiInsight:
    kind: str
    text: str
    source: str


class _NoRedirectHandler(request.HTTPRedirectHandler):
    def redirect_request(self, *args: object, **kwargs: object):
        return None


def build_local_insight(facts: dict[str, Any], kind: str) -> AiInsight:
    """Provide a deterministic explanation when no local model is available."""
    if kind == "analytics":
        text = (
            f"Se analizaron {facts['order_count']} pedidos. "
            f"Estados observados: {', '.join(facts['statuses']) or 'ninguno'}."
        )
    elif kind == "audit":
        integrity = "verificada" if facts["integrity_verified"] else "no verificada"
        text = (
            f"La integridad de la trazabilidad está {integrity}. "
            f"Se encontraron {facts['event_count']} eventos registrados."
        )
    else:
        text = (
            f"El pedido está en estado {facts['status']} y tiene "
            f"{facts['event_count']} eventos de trazabilidad."
        )
    return AiInsight(kind=kind, text=text, source="local-rules")


def build_read_only_prompt(facts: dict[str, Any]) -> str:
    serialized = json.dumps(facts, ensure_ascii=False, sort_keys=True)
    return (
        "Resume y explica estos datos de ORIVIA. No cambies estados, no inventes "
        "datos y no ordenes acciones críticas. Si falta información, indícalo.\n\n"
        f"DATOS: {serialized}"
    )


class OllamaClient:
    """Minimal read-only client; it never writes business data."""

    def __init__(
        self,
        base_url: str,
        model: str,
        api_key: str | None = None,
        timeout_seconds: float = 10.0,
    ) -> None:
        parsed = urlsplit(base_url)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise ValueError("OLLAMA_BASE_URL must be an explicit HTTP(S) origin")
        if not 0 < timeout_seconds <= 30:
            raise ValueError("timeout_seconds must be between 0 and 30")
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._api_key = api_key.strip() if api_key and api_key.strip() else None
        self._timeout_seconds = timeout_seconds

    def summarize(self, facts: dict[str, Any], *, kind: str = "summary") -> AiInsight:
        if not kind:
            raise ValueError("analysis kind is required")
        payload = json.dumps(
            {
                "model": self._model,
                "prompt": build_read_only_prompt(facts),
                "stream": False,
            }
        ).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}"
        req = request.Request(
            f"{self._base_url}/api/generate",
            data=payload,
            headers=headers,
            method="POST",
        )
        opener = request.build_opener(_NoRedirectHandler())
        with opener.open(req, timeout=self._timeout_seconds) as response:
            raw = response.read(1_048_577)
            if len(raw) > 1_048_576:
                raise ValueError("Ollama response is too large")
            result = json.loads(raw.decode("utf-8"))
        if not isinstance(result, dict) or not isinstance(result.get("response"), str):
            raise TypeError("Ollama returned an invalid response")
        text = result["response"].strip()
        if not text:
            raise ValueError("Ollama returned an empty response")
        return AiInsight(
            kind=kind,
            text=text,
            source=f"ollama:{self._model}",
        )
