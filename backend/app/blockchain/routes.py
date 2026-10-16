from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from ..orders.repository import OrderRepository
from ..security.middleware import require_access_token
from ..security.permissions import require_permissions

blockchain_bp = Blueprint("blockchain", __name__)


def _repository() -> OrderRepository:
    return current_app.extensions["orivia_order_repository"]


@blockchain_bp.post("/anchors")
@require_access_token
@require_permissions("blockchain:anchor")
def create_anchor():
    data = request.get_json(silent=True)
    order_id = data.get("order_id") if isinstance(data, dict) else None
    if not isinstance(order_id, str) or not order_id:
        return (
            jsonify(
                {
                    "error": "INVALID_ORDER_ID",
                    "message": "order_id es obligatorio.",
                }
            ),
            400,
        )

    order = _repository().get(order_id)
    if order is None:
        return jsonify({"error": "ORDER_NOT_FOUND"}), 404
    if not _repository().verify_timeline(order_id):
        return (
            jsonify(
                {
                    "error": "INTEGRITY_CHECK_FAILED",
                    "message": "La cadena de eventos no puede anclarse.",
                }
            ),
            409,
        )

    event_hash = _repository().timeline(order_id)[-1].event_hash
    anchor = current_app.extensions["orivia_blockchain_anchor"]
    existing = anchor.get(event_hash)
    if existing is not None:
        return (
            jsonify(
                {
                    "anchor": {
                        "event_hash": existing.event_hash,
                        "status": existing.status,
                        "reference": existing.reference,
                    },
                    "idempotent": True,
                }
            ),
            200,
        )

    receipt = anchor.anchor(event_hash)
    current_app.extensions["orivia_anchor_receipts"][event_hash] = receipt
    return (
        jsonify(
            {
                "anchor": {
                    "event_hash": receipt.event_hash,
                    "status": receipt.status,
                    "reference": receipt.reference,
                }
            }
        ),
        201,
    )


@blockchain_bp.get("/anchors/<path:event_hash>")
@require_access_token
@require_permissions("blockchain:read")
def get_anchor(event_hash: str):
    anchor = current_app.extensions["orivia_blockchain_anchor"]
    receipt = anchor.get(event_hash)
    if receipt is None:
        return jsonify({"error": "ANCHOR_NOT_FOUND"}), 404
    return jsonify(
        {
            "anchor": {
                "event_hash": receipt.event_hash,
                "status": receipt.status,
                "reference": receipt.reference,
                "verified": anchor.verify(receipt),
            }
        }
    )
