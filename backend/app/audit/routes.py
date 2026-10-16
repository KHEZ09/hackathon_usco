from __future__ import annotations

from flask import Blueprint, current_app, jsonify

from ..orders.access import can_read_order
from ..orders.repository import OrderRepository, audit_to_dict
from ..security.middleware import require_access_token
from ..security.permissions import require_permissions

audit_bp = Blueprint("audit", __name__)


def _repository() -> OrderRepository:
    return current_app.extensions["orivia_order_repository"]


def _order_or_404(order_id: str):
    order = _repository().get(order_id)
    if order is None or not can_read_order(order, audit=True):
        return None, (jsonify({"error": "ORDER_NOT_FOUND"}), 404)
    return order, None


@audit_bp.get("/orders/<order_id>")
@require_access_token
@require_permissions("audit:read")
def order_audit(order_id: str):
    order, error = _order_or_404(order_id)
    if error:
        return error
    return jsonify(
        {
            "order_id": order.order_id,
            "verified": _repository().verify_timeline(order_id),
            "audits": [audit_to_dict(audit) for audit in _repository().audits(order_id)],
        }
    )


@audit_bp.get("/orders/<order_id>/verify")
@require_access_token
@require_permissions("audit:read")
def verify_order_audit(order_id: str):
    order, error = _order_or_404(order_id)
    if error:
        return error
    return jsonify(
        {
            "order_id": order.order_id,
            "verified": _repository().verify_timeline(order_id),
            "event_count": len(_repository().timeline(order_id)),
        }
    )
