from __future__ import annotations

from .repository import InMemoryLotRepository, LotRecord


def _transformation_payload(payload: dict[str, object]) -> dict[str, object]:
    return {
        "operation_code": payload.get("operation_code"),
        "stage": payload.get("stage"),
        "responsible": payload.get("responsible"),
        "input_kg": payload.get("input_kg"),
        "output_kg": payload.get("output_kg"),
        "merma_kg": payload.get("merma_kg"),
        "merma_pct": payload.get("merma_pct"),
        "alert": payload.get("alert"),
        "incident": payload.get("incident", ""),
        "available_before_kg": payload.get("available_before_kg"),
        "available_after_kg": payload.get("available_after_kg"),
    }


def lot_public(lot: LotRecord) -> dict[str, object]:
    registered = next(
        (
            lot.payloads.get(event.event_id, {})
            for event in lot.events
            if event.event_type == "LOT_REGISTERED"
        ),
        {},
    )
    return {
        "id": lot.lot_id,
        "product": lot.product,
        "origin": lot.origin,
        "producer": lot.producer,
        "received_kg": lot.received_kg,
        "available_kg": lot.available_kg,
        "status": lot.status,
        "available_for_order": lot.status != "BLOCKED" and lot.available_kg > 0,
        "received_at": registered.get("received_at") or lot.received_at or lot.created_at,
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
                    "payload": repository_payload,
                }
                for event in lot.events
                for repository_payload in [lot.payloads.get(event.event_id, {})]
            ],
            "transformations": [
                _transformation_payload(lot.payloads[event.event_id])
                for event in lot.events
                if event.event_type == "LOT_TRANSFORMED"
                and event.event_id in lot.payloads
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
