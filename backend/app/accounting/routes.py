from decimal import Decimal, InvalidOperation
from uuid import UUID

from flask import Blueprint, jsonify, request

from ..security.middleware import require_access_token
from .service import accounting_repo

accounting_bp = Blueprint("accounting", __name__)


@accounting_bp.get("/accounting/inventory")
@require_access_token
def inventory():
    return jsonify(data=accounting_repo.inventory())


@accounting_bp.get("/accounting/costs")
@require_access_token
def costs():
    return jsonify(data=accounting_repo.costs())


@accounting_bp.get("/accounting/alerts")
@require_access_token
def alerts():
    return jsonify(data=accounting_repo.open_alerts())


@accounting_bp.get("/accounting/margins")
@require_access_token
def margins():
    return jsonify(data=accounting_repo.margins())


@accounting_bp.post("/accounting/lots/<uuid:lot_id>/cost")
@require_access_token
def set_cost(lot_id: UUID):
    data = request.get_json(silent=True) or {}
    try:
        total_cost = Decimal(str(data["total_cost"]))
        cost_per_kg = Decimal(str(data["cost_per_kg"]))
        if total_cost < 0 or cost_per_kg < 0:
            raise ValueError
    except (KeyError, InvalidOperation, ValueError):
        return jsonify(
            error="VALIDATION_ERROR",
            message="total_cost y cost_per_kg deben ser números no negativos",
        ), 400
    result = accounting_repo.set_lot_cost(lot_id, total_cost, cost_per_kg)
    if result is None:
        return jsonify(error="NOT_FOUND", message="Lote no encontrado"), 404
    return jsonify(data=result)
