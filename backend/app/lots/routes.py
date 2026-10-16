from __future__ import annotations

from math import isfinite

from flask import Blueprint, current_app, g, jsonify, request

from ..blockchain.evm import BlockchainUnavailable
from ..blockchain.routes import anchor_event, receipt_to_dict
from ..security.middleware import require_access_token
from ..security.permissions import require_permissions
from .projections import lot_private, lot_public
from .repository import InMemoryLotRepository, LotTransitionError, LotValidationError

lots_bp = Blueprint("lots", __name__)
public_lots_bp = Blueprint("public_lots", __name__)


def _repository() -> InMemoryLotRepository:
    return current_app.extensions["orivia_lot_repository"]


def _get(lot_id: str):
    lot = _repository().get(lot_id)
    if lot is None:
        return None, (jsonify({"error": "LOT_NOT_FOUND"}), 404)
    return lot, None


def _actor_id() -> str:
    return str(g.current_principal.get("sub", ""))


def _text(data: dict[str, object], field: str, *, required: bool = True) -> str:
    value = data.get(field, "")
    if not isinstance(value, str) or (required and not value.strip()):
        raise LotValidationError(f"{field} is required")
    return value.strip()


def _number(data: dict[str, object], field: str, *, allow_zero: bool = False) -> float:
    value = data.get(field)
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise LotValidationError(f"{field} must be numeric")
    result = float(value)
    if not isfinite(result) or (result < 0 if allow_zero else result <= 0):
        comparison = "non-negative" if allow_zero else "greater than zero"
        raise LotValidationError(f"{field} must be finite and {comparison}")
    return result


def _anchor_lot_event(lot):
    event = lot.events[-1]
    try:
        return anchor_event(
            event_hash=event.event_hash,
            entity_type="lot",
            entity_id=lot.lot_id,
            event_type=event.event_type,
            occurred_at=event.occurred_at,
        )
    except BlockchainUnavailable:
        raise


@lots_bp.post("")
@require_access_token
@require_permissions("lots:create")
def create_lot():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "INVALID_JSON", "message": "Se requiere un objeto JSON."}), 400
    try:
        lot = _repository().create(
            lot_id=_text(data, "lot_id"),
            product=_text(data, "product"),
            origin=_text(data, "origin"),
            producer=_text(data, "producer"),
            received_kg=_number(data, "received_kg"),
            actor_id=_actor_id(),
            received_at=_text(data, "received_at", required=False) or None,
        )
        receipt = _anchor_lot_event(lot)
    except LotValidationError as exc:
        return jsonify({"error": "INVALID_LOT", "message": str(exc)}), 409
    except BlockchainUnavailable as exc:
        return jsonify({"error": "BLOCKCHAIN_UNAVAILABLE", "message": str(exc)}), 503
    return jsonify({"lot": lot_private(lot, _repository()), "blockchain": receipt_to_dict(receipt)}), 201


@lots_bp.post("/<lot_id>/transformations")
@require_access_token
@require_permissions("lots:transform")
def transform_lot(lot_id: str):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "INVALID_JSON", "message": "Se requiere un objeto JSON."}), 400
    try:
        lot, created = _repository().transform(
            lot_id=lot_id,
            operation_code=_text(data, "operation_code"),
            stage=_text(data, "stage"),
            responsible=_text(data, "responsible"),
            input_kg=_number(data, "input_kg"),
            output_kg=_number(data, "output_kg", allow_zero=True),
            incident=_text(data, "incident", required=False),
            actor_id=_actor_id(),
        )
        receipt = _anchor_lot_event(lot)
    except KeyError:
        return jsonify({"error": "LOT_NOT_FOUND"}), 404
    except LotValidationError as exc:
        return jsonify({"error": "INVALID_TRANSFORMATION", "message": str(exc)}), 409
    except BlockchainUnavailable as exc:
        return jsonify({"error": "BLOCKCHAIN_UNAVAILABLE", "message": str(exc)}), 503
    status = 201 if created else 200
    return jsonify({"lot": lot_private(lot, _repository()), "blockchain": receipt_to_dict(receipt), "idempotent": not created}), status


@lots_bp.get("/<lot_id>")
@require_access_token
@require_permissions("lots:read")
def get_lot(lot_id: str):
    lot, error = _get(lot_id)
    if error:
        return error
    return jsonify({"lot": lot_private(lot, _repository())})


@lots_bp.get("/<lot_id>/timeline")
@require_access_token
@require_permissions("lots:read")
def lot_timeline(lot_id: str):
    lot, error = _get(lot_id)
    if error:
        return error
    return jsonify(
        {
            "lot_id": lot_id,
            "history_verified": _repository().verify_history(lot_id),
            "events": lot_private(lot, _repository())["timeline"],
            "audits": lot_private(lot, _repository())["audits"],
        }
    )


@lots_bp.patch("/<lot_id>/status")
@require_access_token
@require_permissions("lots:status")
def update_lot_status(lot_id: str):
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "INVALID_JSON", "message": "Se requiere un objeto JSON."}), 400
    status = data.get("status")
    reason = data.get("reason")
    if not isinstance(status, str) or not isinstance(reason, str):
        return jsonify({"error": "INVALID_STATUS", "message": "status y reason son obligatorios."}), 400
    try:
        lot = _repository().transition(
            lot_id=lot_id,
            actor_id=_actor_id(),
            status=status,
            reason=reason,
        )
    except KeyError:
        return jsonify({"error": "LOT_NOT_FOUND"}), 404
    except LotTransitionError as exc:
        return jsonify({"error": "INVALID_LOT_TRANSITION", "message": str(exc)}), 409
    event = lot.events[-1]
    try:
        receipt = anchor_event(
            event_hash=event.event_hash,
            entity_type="lot",
            entity_id=lot.lot_id,
            event_type=event.event_type,
            occurred_at=event.occurred_at,
        )
    except BlockchainUnavailable as exc:
        return (
            jsonify(
                {
                    "error": "BLOCKCHAIN_UNAVAILABLE",
                    "message": str(exc),
                    "lot": lot_private(lot, _repository()),
                }
            ),
            503,
        )
    return (
        jsonify(
            {
                "lot": lot_private(lot, _repository()),
                "blockchain": receipt_to_dict(receipt),
            }
        ),
        200,
    )


@public_lots_bp.get("/<lot_id>")
def public_get_lot(lot_id: str):
    lot, error = _get(lot_id)
    if error:
        return error
    public = lot_public(lot)
    anchor = current_app.extensions.get("orivia_blockchain_anchor")
    timeline = []
    for event in lot.events:
        certificate = None
        if anchor is not None:
            receipt = anchor.get(event.event_hash)
            if receipt is not None:
                certificate = {
                    **receipt_to_dict(receipt),
                    "verified": bool(anchor.verify(receipt)),
                }
        # Public evidence contains hashes and state transitions, never actor IDs,
        # payloads, reasons, or private audit fields.
        public_event = {
                "id": event.event_id,
                "type": event.event_type,
                "from": event.previous_status,
                "to": event.new_status,
                "occurred_at": event.occurred_at,
                "previous_event_hash": event.previous_event_hash,
                "event_hash": event.event_hash,
                "blockchain": certificate,
            }
        payload = lot.payloads.get(event.event_id, {})
        if event.event_type == "LOT_TRANSFORMED":
            public_event["transformation"] = {
                key: payload.get(key)
                for key in (
                    "operation_code",
                    "stage",
                    "input_kg",
                    "output_kg",
                    "merma_kg",
                    "merma_pct",
                    "alert",
                    "incident",
                    "available_before_kg",
                    "available_after_kg",
                )
            }
        timeline.append(public_event)
    public.update(
        {
            "history_verified": bool(_repository().verify_history(lot.lot_id)),
            "timeline": timeline,
        }
    )
    return jsonify({"lot": public})
