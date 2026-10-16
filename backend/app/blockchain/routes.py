from __future__ import annotations

from flask import Blueprint, current_app, jsonify, request

from ..orders.repository import OrderRepository
from ..security.middleware import require_access_token
from ..security.permissions import require_permissions
from .adapter import AnchorReceipt
from .evm import BlockchainUnavailable

blockchain_bp = Blueprint("blockchain", __name__)


def _repository() -> OrderRepository:
    return current_app.extensions["orivia_order_repository"]


def receipt_to_dict(receipt: AnchorReceipt) -> dict[str, object]:
    return {
        "event_hash": receipt.event_hash,
        "status": receipt.status,
        "reference": receipt.reference,
        "network": receipt.network,
        "transaction_id": receipt.transaction_id,
        "block_number": receipt.block_number,
        "chain_id": receipt.chain_id,
        "contract_address": receipt.contract_address,
    }


def anchor_event(
    *,
    event_hash: str,
    entity_type: str,
    entity_id: str,
    event_type: str,
    occurred_at: str,
) -> AnchorReceipt:
    """Anchor a committed domain event in the configured chain."""
    return current_app.extensions["orivia_blockchain_anchor"].anchor(
        event_hash,
        entity_type=entity_type,
        entity_id=entity_id,
        event_type=event_type,
        occurred_at=occurred_at,
    )


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

    event = _repository().timeline(order_id)[-1]
    anchor = current_app.extensions["orivia_blockchain_anchor"]
    existing = anchor.get(event.event_hash)
    if existing is not None and existing.status == "ANCHORED":
        return jsonify({"anchor": receipt_to_dict(existing), "idempotent": True}), 200

    try:
        receipt = anchor_event(
            event_hash=event.event_hash,
            entity_type="order",
            entity_id=order_id,
            event_type=event.event_type,
            occurred_at=event.occurred_at,
        )
    except BlockchainUnavailable as exc:
        return jsonify({"error": "BLOCKCHAIN_UNAVAILABLE", "message": str(exc)}), 503
    current_app.extensions["orivia_anchor_receipts"][event.event_hash] = receipt
    return jsonify({"anchor": receipt_to_dict(receipt)}), 201


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
                **receipt_to_dict(receipt),
                "verified": anchor.verify(receipt),
            }
        }
    )
