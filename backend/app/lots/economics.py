"""RF04, RF05, RF11 y RF12 sobre los lotes trazables.

Costos y precio de venta por lote, con costo unitario y margen calculados en el servidor,
alertas explicadas y exportación CSV. Cada cambio de costos queda en la auditoría del lote
con el valor anterior y el nuevo (RF10).
"""

from __future__ import annotations

import csv
import io
import json
from dataclasses import dataclass
from math import isfinite
from threading import RLock
from typing import Any

from ..audit.service import create_audit_record
from ..database.connection import fetch_one, transaction
from .repository import MERMA_ALERT_THRESHOLD, LotRecord, LotValidationError

FORMULAS = {
    "costo_unitario": "costo total de la etapa (COP) ÷ kg vendibles",
    "margen": "(precio de venta por kg − costo unitario) ÷ precio de venta por kg × 100",
    "merma": "(entrada − salida) ÷ entrada × 100",
}


@dataclass(frozen=True)
class LotEconomics:
    lot_id: str
    total_cost_cop: float
    sale_price_cop_kg: float
    included_costs: str
    updated_by: str
    updated_at: str


def _positive_or_zero(value: Any, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise LotValidationError(f"{field} debe ser numérico")
    number = float(value)
    if not isfinite(number) or number < 0:
        raise LotValidationError(f"{field} debe ser un número finito mayor o igual a cero")
    return number


def validate_economics(data: Any) -> tuple[float, float, str]:
    if not isinstance(data, dict):
        raise LotValidationError("Se requiere un objeto JSON")
    total = _positive_or_zero(data.get("total_cost_cop"), "total_cost_cop")
    price = _positive_or_zero(data.get("sale_price_cop_kg"), "sale_price_cop_kg")
    included = data.get("included_costs", "")
    if not isinstance(included, str) or len(included.strip()) > 300:
        raise LotValidationError("included_costs debe ser texto de hasta 300 caracteres")
    if total > 0 and not included.strip():
        raise LotValidationError("Explica qué costos incluye el total (included_costs)")
    return total, price, included.strip()


def sellable_kg(lot: LotRecord) -> float:
    """Kg vendibles: la existencia actual; si está bloqueado, la que tenía antes del bloqueo."""
    if lot.status == "BLOCKED" and lot.available_before_block_kg is not None:
        return lot.available_before_block_kg
    return lot.available_kg


def _round(value: float | None, digits: int = 2) -> float | None:
    return None if value is None else round(value, digits)


def economics_summary(lot: LotRecord, record: LotEconomics | None) -> dict[str, object]:
    kg = sellable_kg(lot)
    base: dict[str, object] = {
        "sellable_kg": kg,
        "formulas": FORMULAS,
        "total_cost_cop": None,
        "sale_price_cop_kg": None,
        "included_costs": "",
        "unit_cost_cop_kg": None,
        "margin_pct": None,
        "notes": [],
        "updated_by": None,
        "updated_at": None,
    }
    if record is None:
        base["notes"] = ["Sin costos registrados para este lote."]
        return base
    notes: list[str] = []
    unit = record.total_cost_cop / kg if kg > 0 else None
    if unit is None:
        notes.append("No hay kg vendibles: el costo unitario no se calcula para evitar dividir entre cero.")
    margin = None
    if unit is not None and record.sale_price_cop_kg > 0:
        margin = (record.sale_price_cop_kg - unit) / record.sale_price_cop_kg * 100
    elif record.sale_price_cop_kg <= 0:
        notes.append("Sin precio de venta: el margen no se calcula para evitar dividir entre cero.")
    base.update(
        {
            "total_cost_cop": record.total_cost_cop,
            "sale_price_cop_kg": record.sale_price_cop_kg,
            "included_costs": record.included_costs,
            "unit_cost_cop_kg": _round(unit),
            "margin_pct": _round(margin),
            "notes": notes,
            "updated_by": record.updated_by,
            "updated_at": record.updated_at,
        }
    )
    return base


def lot_alerts(lot: LotRecord, economics: dict[str, object] | None) -> list[dict[str, object]]:
    """Alertas para decidir (RF04): regla aplicada y causa concreta."""
    alerts: list[dict[str, object]] = []
    for event in lot.events:
        payload = lot.payloads.get(event.event_id, {})
        if event.event_type == "LOT_TRANSFORMED" and payload.get("alert"):
            pct = float(payload.get("merma_pct") or 0)
            alerts.append(
                {
                    "type": "MERMA",
                    "rule": f"Merma mayor al {MERMA_ALERT_THRESHOLD:g}% en una etapa",
                    "cause": f"{payload.get('stage')}: {payload.get('input_kg')} kg → {payload.get('output_kg')} kg ({pct:.1f}%)",
                    "operation_code": payload.get("operation_code"),
                }
            )
    if economics is not None:
        margin = economics.get("margin_pct")
        if economics.get("total_cost_cop") is None:
            alerts.append(
                {
                    "type": "REGISTRO_INCOMPLETO",
                    "rule": "Todo lote debe tener costos registrados para calcular costo unitario y margen",
                    "cause": "El lote aún no tiene costo total ni precio de venta.",
                }
            )
        elif isinstance(margin, (int, float)) and margin < 0:
            alerts.append(
                {
                    "type": "COSTO",
                    "rule": "El precio de venta debe cubrir el costo unitario",
                    "cause": f"Costo unitario {economics.get('unit_cost_cop_kg')} COP/kg supera el precio {economics.get('sale_price_cop_kg')} COP/kg.",
                }
            )
    return alerts


def merma_total_pct(lot: LotRecord) -> float | None:
    entrada = salida = 0.0
    for event in lot.events:
        payload = lot.payloads.get(event.event_id, {})
        if event.event_type == "LOT_TRANSFORMED":
            entrada += float(payload.get("input_kg") or 0)
            salida += float(payload.get("output_kg") or 0)
    return round((entrada - salida) / entrada * 100, 2) if entrada > 0 else None


class InMemoryEconomicsStore:
    def __init__(self) -> None:
        self._lock = RLock()
        # Ejemplo base del reto para CAC001 (igual que la migración 011).
        self._records: dict[str, LotEconomics] = {
            "CAC001": LotEconomics("CAC001", 1_600_000, 25_000, "Mano de obra, energía y empaque de la etapa de transformación", "system-seed", "2026-10-16T00:00:00Z")
        }

    def get(self, lot_id: str) -> LotEconomics | None:
        return self._records.get(lot_id)

    def set(self, lot: LotRecord, *, total: float, price: float, included: str, actor_id: str) -> LotEconomics:
        from ..cluster.models import utc_now

        with self._lock:
            previous = self._records.get(lot.lot_id)
            record = LotEconomics(lot.lot_id, total, price, included, actor_id, utc_now())
            self._records[lot.lot_id] = record
            lot.audits.append(_audit(lot.lot_id, actor_id, previous, record))
            return record


class PostgresEconomicsStore:
    def get(self, lot_id: str) -> LotEconomics | None:
        row = fetch_one("SELECT * FROM orivia.trace_lot_economics WHERE lot_id=%s", (lot_id,))
        return _from_row(row) if row else None

    def set(self, lot: LotRecord, *, total: float, price: float, included: str, actor_id: str) -> LotEconomics:
        with transaction() as connection:
            row = connection.execute(
                "SELECT * FROM orivia.trace_lot_economics WHERE lot_id=%s FOR UPDATE", (lot.lot_id,)
            ).fetchone()
            previous = _from_row(row) if row else None
            saved = connection.execute(
                """
                INSERT INTO orivia.trace_lot_economics(lot_id, total_cost_cop, sale_price_cop_kg, included_costs, updated_by)
                VALUES(%s,%s,%s,%s,%s)
                ON CONFLICT (lot_id) DO UPDATE SET
                  total_cost_cop=EXCLUDED.total_cost_cop, sale_price_cop_kg=EXCLUDED.sale_price_cop_kg,
                  included_costs=EXCLUDED.included_costs, updated_by=EXCLUDED.updated_by, updated_at=now()
                RETURNING *
                """,
                (lot.lot_id, total, price, included, actor_id),
            ).fetchone()
            record = _from_row(saved)
            audit = _audit(lot.lot_id, actor_id, previous, record)
            connection.execute(
                """
                INSERT INTO orivia.trace_lot_audit(audit_id, lot_id, actor_id, action, entity_type, changes)
                VALUES(%s,%s,%s,%s,%s,%s::jsonb)
                """,
                (audit.audit_id, lot.lot_id, audit.actor_id, audit.action, audit.entity_type, json.dumps(audit.changes, ensure_ascii=False)),
            )
            return record


def _from_row(row: dict[str, Any]) -> LotEconomics:
    updated = row["updated_at"]
    return LotEconomics(
        lot_id=str(row["lot_id"]),
        total_cost_cop=float(row["total_cost_cop"]),
        sale_price_cop_kg=float(row["sale_price_cop_kg"]),
        included_costs=str(row["included_costs"] or ""),
        updated_by=str(row["updated_by"]),
        updated_at=updated.isoformat() if hasattr(updated, "isoformat") else str(updated),
    )


def _audit(lot_id: str, actor_id: str, previous: LotEconomics | None, record: LotEconomics):
    def view(item: LotEconomics | None):
        if item is None:
            return None
        return {"total_cost_cop": item.total_cost_cop, "sale_price_cop_kg": item.sale_price_cop_kg, "included_costs": item.included_costs}

    return create_audit_record(
        actor_id=actor_id,
        action="LOT_ECONOMICS_UPDATED",
        entity_type="lot",
        entity_id=lot_id,
        changes={"previous": view(previous), "new": view(record)},
    )


CSV_COLUMNS = [
    "lote", "producto", "origen", "productor", "estado", "recibido_kg", "disponible_kg", "merma_pct",
    "costo_total_cop", "costos_incluidos", "costo_unitario_cop_kg", "precio_venta_cop_kg", "margen_pct", "alertas",
]


def _cell(value: object) -> str:
    text = "" if value is None else str(value)
    # Evita inyección de fórmulas al abrir el CSV en una hoja de cálculo.
    return "'" + text if text[:1] in ("=", "+", "-", "@") else text


def to_csv(rows: list[dict[str, object]]) -> str:
    buffer = io.StringIO()
    writer = csv.writer(buffer, lineterminator="\n")
    writer.writerow(CSV_COLUMNS)
    for row in rows:
        writer.writerow([_cell(row.get(column)) for column in CSV_COLUMNS])
    return "﻿" + buffer.getvalue()
