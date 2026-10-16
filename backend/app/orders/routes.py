from __future__ import annotations

from math import isfinite

from flask import Blueprint, current_app, g, jsonify, request

from ..security.middleware import require_access_token
from ..security.permissions import require_permissions
from .repository import InMemoryOrderRepository, event_to_dict, order_to_dict
from .states import InvalidOrderTransition

orders_bp = Blueprint("orders", __name__)


def _repository() -> InMemoryOrderRepository:
    return current_app.extensions["orivia_order_repository"]


def _body() -> dict[str, object] | None:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def _principal_id() -> str:
    return str(g.current_principal.get("sub", ""))


def _text(data: dict[str, object], field: str, *, required: bool = False) -> str:
    value = data.get(field, "")
    if not isinstance(value, str) or (required and not value.strip()):
        raise ValueError(f"{field} must be a string")
    return value.strip()


def _quantity(data: dict[str, object]) -> float:
    value = data.get("quantity")
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TypeError("quantity must be numeric")
    quantity = float(value)
    if not isfinite(quantity) or quantity <= 0:
        raise ValueError("quantity must be finite and greater than zero")
    return quantity


@orders_bp.post("")
@require_access_token
@require_permissions("orders:create")
def create_order():
    data = _body()
    if data is None:
        return (
            jsonify(
                {
                    "error": "INVALID_JSON",
                    "message": "Se requiere un objeto JSON.",
                }
            ),
            400,
        )

    try:
        order = _repository().create(
            actor_id=_principal_id(),
            product=_text(data, "product", required=True),
            quantity=_quantity(data),
            origin=_text(data, "origin"),
            destination=_text(data, "destination"),
        )
    except (TypeError, ValueError) as exc:
        return jsonify({"error": "INVALID_ORDER", "message": str(exc)}), 400

    return jsonify({"order": order_to_dict(order)}), 201


@orders_bp.get("")
@require_access_token
@require_permissions("orders:read")
def list_orders():
    return jsonify({"orders": [order_to_dict(order) for order in _repository().list()]})


@orders_bp.get("/<order_id>")
@require_access_token
@require_permissions("orders:read")
def get_order(order_id: str):
    order = _repository().get(order_id)
    if order is None:
        return jsonify({"error": "ORDER_NOT_FOUND"}), 404
    return jsonify({"order": order_to_dict(order)}), 200


@orders_bp.patch("/<order_id>/status")
@require_access_token
@require_permissions("orders:update")
def update_order_status(order_id: str):
    data = _body()
    next_state = data.get("status") if data else None
    if not isinstance(next_state, str) or not next_state:
        return (
            jsonify(
                {
                    "error": "INVALID_STATUS",
                    "message": "status es obligatorio.",
                }
            ),
            400,
        )

    try:
        order = _repository().transition(
            order_id=order_id,
            actor_id=_principal_id(),
            next_state=next_state,
        )
    except KeyError:
        return jsonify({"error": "ORDER_NOT_FOUND"}), 404
    except InvalidOrderTransition as exc:
        return (
            jsonify({"error": "INVALID_ORDER_TRANSITION", "message": str(exc)}),
            409,
        )

    return jsonify({"order": order_to_dict(order)}), 200


@orders_bp.get("/<order_id>/timeline")
@require_access_token
@require_permissions("tracking:read")
def order_timeline(order_id: str):
    try:
        events = _repository().timeline(order_id)
    except KeyError:
        return jsonify({"error": "ORDER_NOT_FOUND"}), 404
    return jsonify({"events": [event_to_dict(event) for event in events]}), 200
