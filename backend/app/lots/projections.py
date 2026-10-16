from __future__ import annotations

from .repository import InMemoryLotRepository, LotRecord


def lot_public(lot: LotRecord) -> dict[str, object]:
    return {
        "id": lot.lot_id,
        "product": lot.product,
        "origin": lot.origin,
        "producer": lot.producer,
        "received_kg": lot.received_kg,
        "available_kg": lot.available_kg,
        "status": lot.status,
        "available_for_order": lot.status != "BLOCKED" and lot.available_kg > 0,
    }


def lot_private(lot: LotRecord, repository: InMemoryLotRepository) -> dict[str, object]:
    result = lot_public(lot)
    result.update(
        {
            "created_at": lot.created_at,
            "affected_quantities": {
                "received_kg": lot.received_kg,
                "available_kg": lot.available_kg,
                "affected_kg": lot.affected_kg,
            },
            "history_verified": repository.verify_history(lot.lot_id),
            "timeline": [
                {
                    "id": event.event_id,
                    "type": event.event_type,
                    "actor_id": event.actor_id,
                    "from": event.previous_status,
                    "to": event.new_status,
                    "occurred_at": event.occurred_at,
                    "payload_hash": event.payload_hash,
                    "previous_event_hash": event.previous_event_hash,
                    "event_hash": event.event_hash,
                }
                for event in lot.events
            ],
            "audits": [
                {
                    "id": audit.audit_id,
                    "actor_id": audit.actor_id,
                    "action": audit.action,
                    "changes": audit.changes,
                }
                for audit in lot.audits
            ],
        }
    )
    return result
