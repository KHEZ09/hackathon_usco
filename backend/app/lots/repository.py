from __future__ import annotations

from dataclasses import dataclass, field
from threading import RLock

from ..audit.service import AuditRecord, create_audit_record
from ..tracking.event_chain import TraceEvent

LOT_STATUSES = frozenset({"PENDING", "LIBERATED", "BLOCKED"})
ALLOWED_TRANSITIONS = {
    "PENDING": frozenset({"LIBERATED", "BLOCKED"}),
    "LIBERATED": frozenset({"BLOCKED"}),
    "BLOCKED": frozenset({"LIBERATED"}),
}


class LotTransitionError(ValueError):
    """The proposed lot status is invalid or lacks an explanation."""


@dataclass
class LotRecord:
    lot_id: str
    product: str
    origin: str
    producer: str
    received_kg: float
    available_kg: float
    status: str
    created_at: str
    events: list[TraceEvent] = field(default_factory=list)
    payloads: dict[str, dict[str, object]] = field(default_factory=dict)
    audits: list[AuditRecord] = field(default_factory=list)
    affected_kg: float = 0
    available_before_block_kg: float | None = None


class InMemoryLotRepository:
    """Hash-chained lot adapter until lot persistence is merged with PostgreSQL."""

    def __init__(self) -> None:
        self._lock = RLock()
        self._lots: dict[str, LotRecord] = {}
        self._seed()

    def _seed(self) -> None:
        self._register(
            lot_id="CAC001",
            product="Cacao fermentado premium",
            origin="Pitalito, Huila",
            producer="Finca El Porvenir",
            received_kg=100,
            available_kg=80,
            status="LIBERATED",
            actor_id="system-seed",
        )
        self._register(
            lot_id="CAC002",
            product="Cacao seco estándar",
            origin="Garzón, Huila",
            producer="Asociación Cacao Huila",
            received_kg=60,
            available_kg=60,
            status="LIBERATED",
            actor_id="system-seed",
        )
        self._register(
            lot_id="CAC003",
            product="Cacao en revisión",
            origin="Acevedo, Huila",
            producer="Productor comunitario",
            received_kg=40,
            available_kg=40,
            status="PENDING",
            actor_id="system-seed",
        )

    def _register(
        self,
        *,
        lot_id: str,
        product: str,
        origin: str,
        producer: str,
        received_kg: float,
        available_kg: float,
        status: str,
        actor_id: str,
    ) -> LotRecord:
        from ..cluster.models import utc_now

        lot = LotRecord(
            lot_id=lot_id,
            product=product,
            origin=origin,
            producer=producer,
            received_kg=received_kg,
            available_kg=available_kg,
            status=status,
            created_at=utc_now(),
        )
        payload = {
            "lot_id": lot_id,
            "product": product,
            "origin": origin,
            "producer": producer,
            "received_kg": received_kg,
            "available_kg": available_kg,
        }
        event = TraceEvent.create(
            order_id=lot_id,
            event_type="LOT_REGISTERED",
            actor_id=actor_id,
            previous_status=None,
            new_status=status,
            payload=payload,
        )
        lot.events.append(event)
        lot.payloads[event.event_id] = payload
        self._lots[lot_id] = lot
        return lot

    def get(self, lot_id: str) -> LotRecord | None:
        return self._lots.get(lot_id)

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

    def transition(self, *, lot_id: str, actor_id: str, status: str, reason: str) -> LotRecord:
        lot = self.get(lot_id)
        if lot is None:
            raise KeyError(lot_id)
        status = status.strip().upper()
        reason = reason.strip()
        if status not in LOT_STATUSES:
            raise LotTransitionError("status must be PENDING, LIBERATED or BLOCKED")
        if not reason:
            raise LotTransitionError("reason is required for every status change")
        if status not in ALLOWED_TRANSITIONS.get(lot.status, frozenset()):
            raise LotTransitionError(f"cannot change {lot.status} to {status}")

        previous_status = lot.status
        previous_available = lot.available_kg
        if status == "BLOCKED":
            lot.available_before_block_kg = lot.available_kg
            lot.affected_kg = lot.available_kg
            lot.available_kg = 0
        elif previous_status == "BLOCKED":
            lot.available_kg = lot.available_before_block_kg or 0
            lot.affected_kg = 0
        lot.status = status
        payload = {
            "lot_id": lot.lot_id,
            "reason": reason,
            "origin": lot.origin,
            "producer": lot.producer,
            "received_kg": lot.received_kg,
            "available_before_change_kg": previous_available,
            "available_after_change_kg": lot.available_kg,
            "affected_kg": lot.affected_kg,
        }
        previous_hash = lot.events[-1].event_hash if lot.events else None
        event = TraceEvent.create(
            order_id=lot.lot_id,
            event_type="LOT_STATUS_CHANGED",
            actor_id=actor_id,
            previous_status=previous_status,
            new_status=status,
            payload=payload,
            previous_event_hash=previous_hash,
        )
        lot.events.append(event)
        lot.payloads[event.event_id] = payload
        lot.audits.append(
            create_audit_record(
                actor_id=actor_id,
                action="LOT_STATUS_CHANGED",
                entity_type="lot",
                entity_id=lot.lot_id,
                changes={
                    "from": previous_status,
                    "to": status,
                    "reason": reason,
                    "received_kg": lot.received_kg,
                    "available_before_change_kg": previous_available,
                    "available_after_change_kg": lot.available_kg,
                    "affected_kg": lot.affected_kg,
                    "origin": lot.origin,
                },
            )
        )
        return lot
