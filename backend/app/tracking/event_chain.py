from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_payload(value: Any) -> str:
    digest = hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


@dataclass(frozen=True)
class TraceEvent:
    event_id: str
    order_id: str
    event_type: str
    actor_id: str
    previous_status: str | None
    new_status: str
    occurred_at: str
    payload_hash: str
    previous_event_hash: str | None
    event_hash: str

    @classmethod
    def create(
        cls,
        *,
        order_id: str,
        event_type: str,
        actor_id: str,
        previous_status: str | None,
        new_status: str,
        payload: dict[str, Any],
        previous_event_hash: str | None = None,
        occurred_at: str | None = None,
    ) -> TraceEvent:
        timestamp = occurred_at or datetime.now(UTC).isoformat().replace("+00:00", "Z")
        event_id = str(uuid4())
        payload_hash = sha256_payload(payload)
        event_body = {
            "event_id": event_id,
            "order_id": order_id,
            "event_type": event_type,
            "actor_id": actor_id,
            "previous_status": previous_status,
            "new_status": new_status,
            "occurred_at": timestamp,
            "payload_hash": payload_hash,
            "previous_event_hash": previous_event_hash,
        }
        return cls(
            **event_body,
            event_hash=sha256_payload(event_body),
        )

    def verify(self, payload: dict[str, Any]) -> bool:
        event_body = {
            "event_id": self.event_id,
            "order_id": self.order_id,
            "event_type": self.event_type,
            "actor_id": self.actor_id,
            "previous_status": self.previous_status,
            "new_status": self.new_status,
            "occurred_at": self.occurred_at,
            "payload_hash": self.payload_hash,
            "previous_event_hash": self.previous_event_hash,
        }
        return self.payload_hash == sha256_payload(payload) and self.event_hash == sha256_payload(
            event_body
        )
