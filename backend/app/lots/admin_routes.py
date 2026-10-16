"""Consulta, costos, alertas y exportación de lotes trazables (RF04, RF05, RF11, RF12).

Complementa a routes.py (recepción, transformación y estados). Los costos solo los ven
quienes tienen accounting:read; el comprador nunca los recibe (la ficha pública no usa
estas rutas).
"""

from __future__ import annotations

from flask import Blueprint, Response, current_app, g, jsonify, request

from ..security.middleware import require_access_token
from ..security.permissions import require_permissions
from .economics import (
    economics_summary,
    lot_alerts,
    merma_total_pct,
    to_csv,
    validate_economics,
)
from .projections import lot_private
from .repository import LOT_STATUSES, LotValidationError

lot_admin_bp = Blueprint("lot_admin", __name__)


def _repository():
    return current_app.extensions["orivia_lot_repository"]


def _economics():
    return current_app.extensions["orivia_lot_economics"]


def _can_see_costs() -> bool:
    permissions = set(g.current_principal.get("permissions", []))
    return "*" in permissions or "accounting:read" in permissions


def _filters():
    origin = (request.args.get("origin") or "").strip() or None
    status = (request.args.get("status") or "").strip().upper() or None
    if origin and len(origin) > 120:
        raise LotValidationError("origin es demasiado largo")
    if status and status not in LOT_STATUSES:
        raise LotValidationError("status debe ser PENDING, LIBERATED o BLOCKED")
    return origin, status


def _view(lot, *, with_costs: bool) -> dict[str, object]:
    record = _economics().get(lot.lot_id)
    economics = economics_summary(lot, record)
    data = lot_private(lot, _repository())
    data["merma_pct"] = merma_total_pct(lot)
    data["alerts"] = lot_alerts(lot, economics if with_costs else None)
    if with_costs:
        data["economics"] = economics
    return data


@lot_admin_bp.get("")
@require_access_token
@require_permissions("lots:read")
def list_lots():
    try:
        origin, status = _filters()
    except LotValidationError as exc:
        return jsonify({"error": "INVALID_FILTER", "message": str(exc)}), 400
    with_costs = _can_see_costs()
    lots = [_view(lot, with_costs=with_costs) for lot in _repository().list(origin=origin, status=status)]
    return jsonify({"data": lots, "filters": {"origin": origin, "status": status}, "count": len(lots)})


@lot_admin_bp.get("/export.csv")
@require_access_token
@require_permissions("accounting:read")
def export_lots_csv():
    try:
        origin, status = _filters()
    except LotValidationError as exc:
        return jsonify({"error": "INVALID_FILTER", "message": str(exc)}), 400
    rows = []
    for lot in _repository().list(origin=origin, status=status):
        view = _view(lot, with_costs=True)
        economics = view["economics"]
        rows.append(
            {
                "lote": lot.lot_id,
                "producto": lot.product,
                "origen": lot.origin,
                "productor": lot.producer,
                "estado": lot.status,
                "recibido_kg": lot.received_kg,
                "disponible_kg": lot.available_kg,
                "merma_pct": view["merma_pct"],
                "costo_total_cop": economics["total_cost_cop"],
                "costos_incluidos": economics["included_costs"],
                "costo_unitario_cop_kg": economics["unit_cost_cop_kg"],
                "precio_venta_cop_kg": economics["sale_price_cop_kg"],
                "margen_pct": economics["margin_pct"],
                "alertas": " | ".join(f"{a['type']}: {a['cause']}" for a in view["alerts"]),
            }
        )
    return Response(
        to_csv(rows),
        mimetype="text/csv",
        headers={"Content-Disposition": 'attachment; filename="orivia-lotes.csv"', "Cache-Control": "no-store"},
    )


@lot_admin_bp.get("/<lot_id>/economics")
@require_access_token
@require_permissions("accounting:read")
def get_lot_economics(lot_id: str):
    lot = _repository().get(lot_id)
    if lot is None:
        return jsonify({"error": "LOT_NOT_FOUND"}), 404
    return jsonify({"lot_id": lot_id, "economics": economics_summary(lot, _economics().get(lot_id))})


@lot_admin_bp.put("/<lot_id>/economics")
@require_access_token
@require_permissions("accounting:write")
def put_lot_economics(lot_id: str):
    lot = _repository().get(lot_id)
    if lot is None:
        return jsonify({"error": "LOT_NOT_FOUND"}), 404
    try:
        total, price, included = validate_economics(request.get_json(silent=True))
    except LotValidationError as exc:
        return jsonify({"error": "INVALID_ECONOMICS", "message": str(exc)}), 400
    actor = str(g.current_principal.get("sub", ""))
    _economics().set(lot, total=total, price=price, included=included, actor_id=actor)
    return jsonify({"lot": _view(_repository().get(lot_id), with_costs=True)}), 200
