from __future__ import annotations

from typing import Any

from flask import Blueprint, current_app, jsonify

from ..orders.repository import InMemoryOrderRepository
from ..security.middleware import require_access_token
from ..security.permissions import require_permissions
from .service import AiInsight, OllamaClient, build_local_insight

ai_bp = Blueprint("ai", __name__)


def _repository() -> InMemoryOrderRepository:
    return current_app.extensions["orivia_order_repository"]


def _order_facts(order_id: str) -> tuple[dict[str, Any] | None, tuple[Any, int] | None]:
    order = _repository().get(order_id)
    if order is None:
        return None, (jsonify({"error": "ORDER_NOT_FOUND"}), 404)
    return (
        {
            "order_id": order.order_id,
            "product": order.product,
            "quantity": order.quantity,
            "origin": order.origin,
            "destination": order.destination,
            "status": order.status,
            "event_count": len(order.events),
            "integrity_verified": _repository().verify_timeline(order_id),
        },
        None,
    )


def _insight(facts: dict[str, Any], kind: str) -> AiInsight:
    base_url = current_app.config.get("OLLAMA_BASE_URL")
    if base_url:
        try:
            result = OllamaClient(
                base_url=base_url,
                model=current_app.config["OLLAMA_MODEL"],
            ).summarize({**facts, "analysis_kind": kind})
            return AiInsight(kind=kind, text=result.text, source=result.source)
        except (OSError, TimeoutError, TypeError, ValueError):
            pass
    return build_local_insight(facts, kind)


def _response(insight: AiInsight, facts: dict[str, Any]) -> tuple[Any, int]:
    return (
        jsonify(
            {
                "insight": {
                    "kind": insight.kind,
                    "text": insight.text,
                    "source": insight.source,
                },
                "order_id": facts.get("order_id"),
            }
        ),
        200,
    )


@ai_bp.post("/orders/<order_id>/summary")
@require_access_token
@require_permissions("orders:read")
def order_summary(order_id: str):
    facts, error = _order_facts(order_id)
    if error:
        return error
    return _response(_insight(facts, "summary"), facts)


@ai_bp.post("/orders/<order_id>/audit")
@require_access_token
@require_permissions("audit:read")
def order_audit_insight(order_id: str):
    facts, error = _order_facts(order_id)
    if error:
        return error
    return _response(_insight(facts, "audit"), facts)


@ai_bp.post("/analytics")
@require_access_token
@require_permissions("orders:read")
def analytics():
    orders = _repository().list()
    facts = {
        "order_count": len(orders),
        "statuses": sorted({order.status for order in orders}),
        "integrity_verified": all(
            _repository().verify_timeline(order.order_id) for order in orders
        ),
        "event_count": sum(len(order.events) for order in orders),
    }
    return _response(_insight(facts, "analytics"), facts)
