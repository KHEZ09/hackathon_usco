from __future__ import annotations

from flask import Blueprint, current_app, g, jsonify, request

from ..blockchain.evm import BlockchainUnavailable
from ..blockchain.routes import anchor_event, receipt_to_dict
from ..security.middleware import require_access_token
from ..security.permissions import require_permissions
from .projections import lot_private, lot_public
from .repository import InMemoryLotRepository, LotTransitionError

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
        timeline.append(
            {
                "id": event.event_id,
                "type": event.event_type,
                "from": event.previous_status,
                "to": event.new_status,
                "occurred_at": event.occurred_at,
                "previous_event_hash": event.previous_event_hash,
                "event_hash": event.event_hash,
                "blockchain": certificate,
            }
        )
    public.update(
        {
            "history_verified": bool(_repository().verify_history(lot.lot_id)),
            "timeline": timeline,
        }
    )
    return jsonify({"lot": public})
