from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from math import isfinite
from threading import RLock
from typing import Any
from uuid import uuid4

from ..audit.service import AuditRecord, create_audit_record
from ..tracking.event_chain import TraceEvent
from .service import create_transition


@dataclass
class OrderRecord:
    order_id: str
    created_by: str
    product: str
    quantity: float
    origin: str
    destination: str
    status: str
    created_at: str
    events: list[TraceEvent] = field(default_factory=list)
    audits: list[AuditRecord] = field(default_factory=list)


class InMemoryOrderRepository:
    """Temporary process-local repository for the independent demo slice.

    Kevin's PostgreSQL repository will replace this adapter without changing
    the HTTP contract or order rules.
    """

    def __init__(self) -> None:
        self._orders: dict[str, OrderRecord] = {}
        self._lock = RLock()

    def create(
        self,
        *,
        actor_id: str,
        product: str,
        quantity: float,
        origin: str,
        destination: str,
    ) -> OrderRecord:
        if (
            not isinstance(actor_id, str)
            or not isinstance(product, str)
            or not actor_id.strip()
            or not product.strip()
        ):
            raise ValueError("actor_id and product are required")
        if not isinstance(quantity, (int, float)) or isinstance(quantity, bool):
            raise TypeError("quantity must be numeric")
        if not isfinite(quantity) or quantity <= 0:
            raise ValueError("quantity must be finite and greater than zero")
        if not isinstance(origin, str) or not isinstance(destination, str):
            raise TypeError("origin and destination must be strings")

        now = datetime.now(UTC).isoformat().replace("+00:00", "Z")
        order_id = str(uuid4())
        payload = {
            "product": product,
            "quantity": quantity,
            "origin": origin,
            "destination": destination,
        }
        event = TraceEvent.create(
            order_id=order_id,
            event_type="ORDER_CREATED",
            actor_id=actor_id,
            previous_status=None,
            new_status="CREATED",
            payload=payload,
            occurred_at=now,
        )
        order = OrderRecord(
            order_id=order_id,
            created_by=actor_id,
            product=product,
            quantity=quantity,
            origin=origin,
            destination=destination,
            status="CREATED",
            created_at=now,
            events=[event],
            audits=[
                create_audit_record(
                    actor_id=actor_id,
                    action="ORDER_CREATED",
                    entity_type="order",
                    entity_id=order_id,
                    changes={"status": "CREATED"},
                )
            ],
        )
        with self._lock:
            self._orders[order_id] = order
        return order

    def list(self) -> list[OrderRecord]:
        with self._lock:
            return list(self._orders.values())

    def get(self, order_id: str) -> OrderRecord | None:
        with self._lock:
            return self._orders.get(order_id)

    def transition(
        self, *, order_id: str, actor_id: str, next_state: str
    ) -> OrderRecord:
        with self._lock:
            order = self._orders.get(order_id)
            if order is None:
                raise KeyError(order_id)

            transition = create_transition(
                order_id=order.order_id,
                actor_id=actor_id,
                current_state=order.status,
                next_state=next_state,
            )
            event = TraceEvent.create(
                order_id=order.order_id,
                event_type="STATUS_CHANGED",
                actor_id=actor_id,
                previous_status=transition.previous_state,
                new_status=transition.next_state,
                payload={
                    "from": transition.previous_state,
                    "to": transition.next_state,
                },
                previous_event_hash=order.events[-1].event_hash,
                occurred_at=transition.occurred_at,
            )
            order.status = transition.next_state
            order.events.append(event)
            order.audits.append(
                create_audit_record(
                    actor_id=actor_id,
                    action="ORDER_STATUS_CHANGED",
                    entity_type="order",
                    entity_id=order_id,
                    changes={
                        "from": transition.previous_state,
                        "to": transition.next_state,
                    },
                )
            )
            return order

    def timeline(self, order_id: str) -> list[TraceEvent]:
        order = self.get(order_id)
        if order is None:
            raise KeyError(order_id)
        return list(order.events)


def order_to_dict(order: OrderRecord) -> dict[str, Any]:
    return {
        "id": order.order_id,
        "created_by": order.created_by,
        "product": order.product,
        "quantity": order.quantity,
        "origin": order.origin,
        "destination": order.destination,
        "status": order.status,
        "created_at": order.created_at,
    }


def event_to_dict(event: TraceEvent) -> dict[str, Any]:
    return {
        "id": event.event_id,
        "order_id": event.order_id,
        "type": event.event_type,
        "actor_id": event.actor_id,
        "previous_status": event.previous_status,
        "new_status": event.new_status,
        "occurred_at": event.occurred_at,
        "payload_hash": event.payload_hash,
        "previous_event_hash": event.previous_event_hash,
        "event_hash": event.event_hash,
    }
