from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib import request


@dataclass(frozen=True)
class AiInsight:
    kind: str
    text: str
    source: str


def build_read_only_prompt(facts: dict[str, Any]) -> str:
    serialized = json.dumps(facts, ensure_ascii=False, sort_keys=True)
    return (
        "Resume y explica estos datos de ORIVIA. No cambies estados, no inventes "
        "datos y no ordenes acciones críticas. Si falta información, indícalo.\n\n"
        f"DATOS: {serialized}"
    )


class OllamaClient:
    """Minimal read-only client; it never writes business data."""

    def __init__(self, base_url: str, model: str, timeout_seconds: float = 10.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout_seconds = timeout_seconds

    def summarize(self, facts: dict[str, Any]) -> AiInsight:
        payload = json.dumps(
            {
                "model": self._model,
                "prompt": build_read_only_prompt(facts),
                "stream": False,
            }
        ).encode("utf-8")
        req = request.Request(
            f"{self._base_url}/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with request.urlopen(req, timeout=self._timeout_seconds) as response:
            result = json.loads(response.read().decode("utf-8"))
        if not isinstance(result, dict) or not isinstance(result.get("response"), str):
            raise TypeError("Ollama returned an invalid response")
        text = result["response"].strip()
        if not text:
            raise ValueError("Ollama returned an empty response")
        return AiInsight(
            kind="summary",
            text=text,
            source=f"ollama:{self._model}",
        )
