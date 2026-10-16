from __future__ import annotations

from datetime import UTC, datetime
from math import isfinite
from typing import Any
from uuid import UUID, uuid4

from psycopg.types.json import Jsonb

from ..audit.service import AuditRecord
from ..database.connection import fetch_all, fetch_one, transaction
from ..tracking.event_chain import TraceEvent
from .repository import OrderRecord, OrderRepository
from .service import create_transition


def _iso(value: datetime) -> str:
    return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _actor_uuid(actor_id: str) -> UUID:
    try:
        return UUID(str(actor_id))
    except (TypeError, ValueError) as exc:
        raise ValueError("actor_id must be an existing user UUID") from exc


def _validate_order_input(
    *,
    actor_id: str,
    product: str,
    quantity: float,
    origin: str,
    destination: str,
) -> UUID:
    actor_uuid = _actor_uuid(actor_id)
    if not isinstance(product, str) or not product.strip():
        raise ValueError("product is required")
    if isinstance(quantity, bool) or not isinstance(quantity, (int, float)):
        raise TypeError("quantity must be numeric")
    if not isfinite(float(quantity)) or float(quantity) <= 0:
        raise ValueError("quantity must be finite and greater than zero")
    if not isinstance(origin, str) or not isinstance(destination, str):
        raise TypeError("origin and destination must be strings")
    return actor_uuid


def _event_from_row(row: dict[str, Any]) -> TraceEvent:
    return TraceEvent(
        event_id=str(row["event_id"]),
        order_id=str(row["order_id"]),
        event_type=str(row["event_type"]),
        actor_id=str(row["actor_id"]),
        previous_status=row["previous_status"],
        new_status=str(row["new_status"]),
        occurred_at=_iso(row["occurred_at"]),
        payload_hash=str(row["payload_hash"]),
        previous_event_hash=row["previous_hash"],
        event_hash=str(row["event_hash"]),
    )


def _audit_from_row(row: dict[str, Any]) -> AuditRecord:
    changes = row.get("new_data") or row.get("old_data") or {}
    return AuditRecord(
        audit_id=str(row["audit_id"]),
        actor_id=str(row["actor_id"]),
        action=str(row["action"]),
        entity_type=str(row["table_name"]),
        entity_id=str(row["record_id"]),
        changes=changes if isinstance(changes, dict) else {"value": changes},
    )


class PostgresOrderRepository(OrderRepository):
    """PostgreSQL adapter that preserves the existing HTTP/domain contract."""

    def _events(self, order_id: str) -> list[TraceEvent]:
        rows = fetch_all(
            """
            SELECT event_id, order_id, event_type, actor_id, previous_status,
                   new_status, occurred_at, payload_hash, previous_hash, event_hash
            FROM orivia.order_event
            WHERE order_id=%s
            ORDER BY occurred_at, event_id
            """,
            (order_id,),
        )
        return [_event_from_row(row) for row in rows]

    def _audits(self, order_id: str) -> list[AuditRecord]:
        rows = fetch_all(
            """
            SELECT audit_id, table_name, record_id, action, actor_id, old_data,
                   new_data
            FROM orivia.audit_log
            WHERE table_name='sales_order' AND record_id=%s
            ORDER BY changed_at, audit_id
            """,
            (order_id,),
        )
        return [_audit_from_row(row) for row in rows]

    def _record_from_row(self, row: dict[str, Any]) -> OrderRecord:
        payload = row.get("order_payload") or {}
        if not isinstance(payload, dict):
            raise TypeError("order_payload must be a JSON object")
        events = self._events(str(row["order_id"]))
        return OrderRecord(
            order_id=str(row["order_id"]),
            created_by=str(row["created_by"]),
            product=str(payload.get("product", "")),
            quantity=float(payload.get("quantity", 0)),
            origin=str(payload.get("origin", "")),
            destination=str(payload.get("destination", "")),
            status=str(row["status"]),
            created_at=_iso(row["ordered_at"]),
            events=events,
            audits=self._audits(str(row["order_id"])),
            payloads={
                str(event_row["event_id"]): event_row["payload"]
                for event_row in fetch_all(
                    """
                    SELECT event_id, payload FROM orivia.order_event
                    WHERE order_id=%s ORDER BY occurred_at, event_id
                    """,
                    (str(row["order_id"]),),
                )
            },
        )

    @staticmethod
    def _select_order(order_id: str, *, for_update: bool = False) -> dict[str, Any] | None:
        suffix = " FOR UPDATE" if for_update else ""
        return fetch_one(
            f"""
            SELECT order_id, created_by, status, ordered_at, order_payload
            FROM orivia.sales_order WHERE order_id=%s{suffix}
            """,
            (order_id,),
        )

    def create(
        self,
        *,
        actor_id: str,
        product: str,
        quantity: float,
        origin: str,
        destination: str,
    ) -> OrderRecord:
        actor_uuid = _validate_order_input(
            actor_id=actor_id,
            product=product,
            quantity=quantity,
            origin=origin,
            destination=destination,
        )
        order_id = uuid4()
        order_code = f"ORI-{order_id.hex[:12].upper()}"
        now = datetime.now(UTC)
        occurred_at = _iso(now)
        payload = {
            "product": product.strip(),
            "quantity": float(quantity),
            "origin": origin.strip(),
            "destination": destination.strip(),
        }
        event = TraceEvent.create(
            order_id=str(order_id),
            event_type="ORDER_CREATED",
            actor_id=str(actor_uuid),
            previous_status=None,
            new_status="CREATED",
            payload=payload,
            occurred_at=occurred_at,
        )
        with transaction() as connection:
            user = connection.execute(
                "SELECT full_name, email FROM orivia.app_user WHERE user_id=%s AND account_status='ACTIVE'",
                (actor_uuid,),
            ).fetchone()
            if user is None:
                raise ValueError("actor_id must belong to an active user")
            connection.execute(
                """
                INSERT INTO orivia.sales_order(
                    order_id, order_code, buyer_name, buyer_email, status,
                    total_amount, created_by, order_payload
                ) VALUES(%s,%s,%s,%s,'CREATED',0,%s,%s)
                """,
                (
                    order_id,
                    order_code,
                    user["full_name"],
                    user["email"],
                    actor_uuid,
                    Jsonb(payload),
                ),
            )
            connection.execute(
                """
                INSERT INTO orivia.order_event(
                    event_id, order_id, event_type, previous_status, new_status,
                    actor_id, occurred_at, payload, payload_hash, previous_hash,
                    event_hash
                ) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    event.event_id,
                    order_id,
                    event.event_type,
                    event.previous_status,
                    event.new_status,
                    actor_uuid,
                    now,
                    Jsonb(payload),
                    event.payload_hash,
                    event.previous_event_hash,
                    event.event_hash,
                ),
            )
            connection.execute(
                """
                INSERT INTO orivia.audit_log(
                    table_name, record_id, action, actor_id, new_data
                ) VALUES('sales_order',%s,'INSERT',%s,%s)
                """,
                (str(order_id), actor_uuid, Jsonb({"status": "CREATED", **payload})),
            )
        return self.get(str(order_id))  # type: ignore[return-value]

    def list(self) -> list[OrderRecord]:
        rows = fetch_all(
            """
            SELECT order_id, created_by, status, ordered_at, order_payload
            FROM orivia.sales_order ORDER BY ordered_at, order_id
            """
        )
        return [self._record_from_row(row) for row in rows]

    def get(self, order_id: str) -> OrderRecord | None:
        row = self._select_order(order_id)
        return self._record_from_row(row) if row else None

    def transition(
        self, *, order_id: str, actor_id: str, next_state: str
    ) -> OrderRecord:
        actor_uuid = _actor_uuid(actor_id)
        with transaction() as connection:
            row = connection.execute(
                """
                SELECT order_id, created_by, status, ordered_at, order_payload
                FROM orivia.sales_order WHERE order_id=%s FOR UPDATE
                """,
                (order_id,),
            ).fetchone()
            if row is None:
                raise KeyError(order_id)
            transition = create_transition(
                order_id=order_id,
                actor_id=str(actor_uuid),
                current_state=str(row["status"]),
                next_state=next_state,
            )
            last = connection.execute(
                """
                SELECT event_hash FROM orivia.order_event
                WHERE order_id=%s ORDER BY occurred_at DESC, event_id DESC LIMIT 1
                """,
                (order_id,),
            ).fetchone()
            payload = {
                "from": transition.previous_state,
                "to": transition.next_state,
            }
            event = TraceEvent.create(
                order_id=order_id,
                event_type="STATUS_CHANGED",
                actor_id=str(actor_uuid),
                previous_status=transition.previous_state,
                new_status=transition.next_state,
                payload=payload,
                previous_event_hash=last["event_hash"] if last else None,
                occurred_at=transition.occurred_at,
            )
            connection.execute(
                "UPDATE orivia.sales_order SET status=%s::orivia.order_status WHERE order_id=%s",
                (transition.next_state, order_id),
            )
            connection.execute(
                """
                INSERT INTO orivia.order_event(
                    event_id, order_id, event_type, previous_status, new_status,
                    actor_id, occurred_at, payload, payload_hash, previous_hash,
                    event_hash
                ) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    event.event_id,
                    order_id,
                    event.event_type,
                    event.previous_status,
                    event.new_status,
                    actor_uuid,
                    datetime.fromisoformat(transition.occurred_at),
                    Jsonb(payload),
                    event.payload_hash,
                    event.previous_event_hash,
                    event.event_hash,
                ),
            )
            connection.execute(
                """
                INSERT INTO orivia.audit_log(
                    table_name, record_id, action, actor_id, old_data, new_data
                ) VALUES('sales_order',%s,'UPDATE',%s,%s,%s)
                """,
                (
                    order_id,
                    actor_uuid,
                    Jsonb({"status": transition.previous_state}),
                    Jsonb({"status": transition.next_state}),
                ),
            )
        return self.get(order_id)  # type: ignore[return-value]

    def timeline(self, order_id: str) -> list[TraceEvent]:
        if self.get(order_id) is None:
            raise KeyError(order_id)
        return self._events(order_id)

    def audits(self, order_id: str) -> list[AuditRecord]:
        if self.get(order_id) is None:
            raise KeyError(order_id)
        return self._audits(order_id)

    def verify_timeline(self, order_id: str) -> bool:
        order = self.get(order_id)
        if order is None:
            raise KeyError(order_id)
        previous_event_hash: str | None = None
        for index, event in enumerate(order.events):
            payload = order.payloads.get(event.event_id)
            if (
                payload is None
                or event.previous_event_hash != previous_event_hash
                or not event.verify(payload)
            ):
                return False
            if index == 0:
                if (
                    event.event_type != "ORDER_CREATED"
                    or event.previous_status is not None
                    or event.new_status != "CREATED"
                ):
                    return False
            elif event.event_type != "STATUS_CHANGED":
                return False
            previous_event_hash = event.event_hash
        return bool(order.events) and order.status == order.events[-1].new_status
