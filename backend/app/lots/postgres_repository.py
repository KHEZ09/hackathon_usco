from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from ..audit.service import AuditRecord, create_audit_record
from ..database.connection import fetch_all, fetch_one, transaction
from ..tracking.event_chain import TraceEvent
from .repository import (
    ALLOWED_TRANSITIONS,
    LOT_STATUSES,
    LotRecord,
    LotTransitionError,
)


def _iso(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC).isoformat().replace("+00:00", "Z")
    return str(value)


def _number(value: Any) -> float:
    return float(value or 0)


def _json_object(value: Any) -> dict[str, object]:
    if isinstance(value, dict):
        return value
    return json.loads(value)


def _event(row: dict[str, Any]) -> TraceEvent:
    return TraceEvent(
        event_id=str(row["event_id"]),
        order_id=str(row["lot_id"]),
        event_type=str(row["event_type"]),
        actor_id=str(row["actor_id"]),
        previous_status=row["previous_status"],
        new_status=str(row["new_status"]),
        occurred_at=_iso(row["occurred_at"]),
        payload_hash=str(row["payload_hash"]),
        previous_event_hash=row["previous_event_hash"],
        event_hash=str(row["event_hash"]),
    )


def _audit(row: dict[str, Any]) -> AuditRecord:
    return AuditRecord(
        audit_id=str(row["audit_id"]),
        actor_id=str(row["actor_id"]),
        action=str(row["action"]),
        entity_type=str(row["entity_type"]),
        entity_id=str(row["lot_id"]),
        changes=_json_object(row["changes"]),
    )


class PostgresLotRepository:
    """Durable lot adapter preserving the same contract as the memory adapter."""

    def _ensure_seed(self, lot_id: str) -> None:
        with transaction() as connection:
            row = connection.execute(
                "SELECT * FROM orivia.trace_lot WHERE lot_id=%s", (lot_id,)
            ).fetchone()
            if row is None:
                return
            event_count = connection.execute(
                "SELECT count(*) AS total FROM orivia.trace_lot_event WHERE lot_id=%s",
                (lot_id,),
            ).fetchone()["total"]
            if event_count:
                return
            payload = {
                "lot_id": row["lot_id"],
                "product": row["product"],
                "origin": row["origin"],
                "producer": row["producer"],
                "received_kg": _number(row["received_kg"]),
                "available_kg": _number(row["available_kg"]),
            }
            event = TraceEvent.create(
                order_id=lot_id,
                event_type="LOT_REGISTERED",
                actor_id="system-seed",
                previous_status=None,
                new_status=str(row["status"]),
                payload=payload,
            )
            connection.execute(
                """
                INSERT INTO orivia.trace_lot_event(
                  event_id, lot_id, event_type, actor_id, previous_status,
                  new_status, occurred_at, payload, payload_hash,
                  previous_event_hash, event_hash
                ) VALUES(%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,%s)
                """,
                (
                    event.event_id,
                    lot_id,
                    event.event_type,
                    event.actor_id,
                    event.previous_status,
                    event.new_status,
                    event.occurred_at,
                    json.dumps(payload, ensure_ascii=False),
                    event.payload_hash,
                    event.previous_event_hash,
                    event.event_hash,
                ),
            )

    def _load(self, lot_id: str) -> LotRecord | None:
        row = fetch_one("SELECT * FROM orivia.trace_lot WHERE lot_id=%s", (lot_id,))
        if row is None:
            return None
        event_rows = fetch_all(
            """
            SELECT * FROM orivia.trace_lot_event
            WHERE lot_id=%s ORDER BY occurred_at, event_id
            """,
            (lot_id,),
        )
        audit_rows = fetch_all(
            """
            SELECT * FROM orivia.trace_lot_audit
            WHERE lot_id=%s ORDER BY created_at, audit_id
            """,
            (lot_id,),
        )
        events = [_event(item) for item in event_rows]
        return LotRecord(
            lot_id=str(row["lot_id"]),
            product=str(row["product"]),
            origin=str(row["origin"]),
            producer=str(row["producer"]),
            received_kg=_number(row["received_kg"]),
            available_kg=_number(row["available_kg"]),
            status=str(row["status"]),
            created_at=_iso(row["created_at"]),
            events=events,
            payloads={
                event.event_id: _json_object(row["payload"])
                for event, row in zip(events, event_rows, strict=True)
            },
            audits=[_audit(item) for item in audit_rows],
            affected_kg=_number(row["affected_kg"]),
            available_before_block_kg=(
                _number(row["available_before_block_kg"])
                if row["available_before_block_kg"] is not None
                else None
            ),
        )

    def get(self, lot_id: str) -> LotRecord | None:
        self._ensure_seed(lot_id)
        return self._load(lot_id)

    def timeline(self, lot_id: str) -> list[TraceEvent]:
        lot = self.get(lot_id)
        if lot is None:
            raise KeyError(lot_id)
        return list(lot.events)

    def verify_history(self, lot_id: str) -> bool:
        lot = self.get(lot_id)
        if lot is None or not lot.events:
            return False
        previous_hash: str | None = None
        for event in lot.events:
            if event.previous_event_hash != previous_hash:
                return False
            payload = lot.payloads.get(event.event_id)
            if payload is None or not event.verify(payload):
                return False
            previous_hash = event.event_hash
        return True

    def transition(
        self, *, lot_id: str, actor_id: str, status: str, reason: str
    ) -> LotRecord:
        self._ensure_seed(lot_id)
        status = status.strip().upper()
        reason = reason.strip()
        if status not in LOT_STATUSES:
            raise LotTransitionError("status must be PENDING, LIBERATED or BLOCKED")
        if not reason:
            raise LotTransitionError("reason is required for every status change")
        with transaction() as connection:
            row = connection.execute(
                "SELECT * FROM orivia.trace_lot WHERE lot_id=%s FOR UPDATE",
                (lot_id,),
            ).fetchone()
            if row is None:
                raise KeyError(lot_id)
            current_status = str(row["status"])
            if status not in ALLOWED_TRANSITIONS.get(current_status, frozenset()):
                raise LotTransitionError(f"cannot change {current_status} to {status}")
            previous_available = _number(row["available_kg"])
            available_before_block = row["available_before_block_kg"]
            affected_kg = _number(row["affected_kg"])
            if status == "BLOCKED":
                available_before_block = previous_available
                affected_kg = previous_available
                available_after = 0.0
            elif current_status == "BLOCKED":
                available_after = _number(available_before_block)
                affected_kg = 0.0
            else:
                available_after = previous_available
            event_rows = connection.execute(
                """
                SELECT event_hash FROM orivia.trace_lot_event
                WHERE lot_id=%s ORDER BY occurred_at DESC, event_id DESC LIMIT 1
                """,
                (lot_id,),
            ).fetchone()
            previous_hash = event_rows["event_hash"] if event_rows else None
            payload = {
                "lot_id": lot_id,
                "reason": reason,
                "origin": str(row["origin"]),
                "producer": str(row["producer"]),
                "received_kg": _number(row["received_kg"]),
                "available_before_change_kg": previous_available,
                "available_after_change_kg": available_after,
                "affected_kg": affected_kg,
            }
            event = TraceEvent.create(
                order_id=lot_id,
                event_type="LOT_STATUS_CHANGED",
                actor_id=actor_id,
                previous_status=current_status,
                new_status=status,
                payload=payload,
                previous_event_hash=previous_hash,
            )
            connection.execute(
                """
                UPDATE orivia.trace_lot
                SET available_kg=%s, affected_kg=%s,
                    available_before_block_kg=%s, status=%s, updated_at=now()
                WHERE lot_id=%s
                """,
                (
                    available_after,
                    affected_kg,
                    available_before_block,
                    status,
                    lot_id,
                ),
            )
            connection.execute(
                """
                INSERT INTO orivia.trace_lot_event(
                  event_id, lot_id, event_type, actor_id, previous_status,
                  new_status, occurred_at, payload, payload_hash,
                  previous_event_hash, event_hash
                ) VALUES(%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,%s)
                """,
                (
                    event.event_id,
                    lot_id,
                    event.event_type,
                    event.actor_id,
                    event.previous_status,
                    event.new_status,
                    event.occurred_at,
                    json.dumps(payload, ensure_ascii=False),
                    event.payload_hash,
                    event.previous_event_hash,
                    event.event_hash,
                ),
            )
            audit = create_audit_record(
                actor_id=actor_id,
                action="LOT_STATUS_CHANGED",
                entity_type="lot",
                entity_id=lot_id,
                changes={
                    "from": current_status,
                    "to": status,
                    "reason": reason,
                    "received_kg": _number(row["received_kg"]),
                    "available_before_change_kg": previous_available,
                    "available_after_change_kg": available_after,
                    "affected_kg": affected_kg,
                    "origin": str(row["origin"]),
                },
            )
            connection.execute(
                """
                INSERT INTO orivia.trace_lot_audit(
                  audit_id, lot_id, actor_id, action, entity_type, changes
                ) VALUES(%s,%s,%s,%s,%s,%s::jsonb)
                """,
                (
                    audit.audit_id,
                    lot_id,
                    audit.actor_id,
                    audit.action,
                    audit.entity_type,
                    json.dumps(audit.changes, ensure_ascii=False),
                ),
            )
        result = self._load(lot_id)
        if result is None:
            raise RuntimeError("lot disappeared after transition")
        return result
