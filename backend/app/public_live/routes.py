from __future__ import annotations

import hashlib
import json
from datetime import datetime

from flask import Blueprint, current_app, jsonify

from ..database.connection import fetch_all, fetch_one

public_live_bp = Blueprint("public_live", __name__)

_METRICS_QUERY = """
SELECT
    now() AS generated_at,
    (SELECT count(*)::int FROM orivia.trace_lot) AS lots,
    (SELECT count(*)::int FROM orivia.trace_lot_event) AS trace_events,
    (SELECT count(*)::int FROM orivia.sales_order) AS orders,
    (SELECT count(*)::int FROM orivia.order_event) AS order_events,
    (SELECT count(*)::int FROM orivia.blockchain_anchor) AS blockchain_anchors,
    (SELECT count(*)::int FROM orivia.actors) AS cluster_actors,
    (SELECT count(*)::int FROM orivia.actor_needs) AS cluster_needs,
    (SELECT count(*)::int FROM orivia.actor_connections) AS cluster_connections,
    GREATEST(
        COALESCE((SELECT max(changed_at) FROM orivia.audit_log), 'epoch'::timestamptz),
        COALESCE((SELECT max(occurred_at) FROM orivia.order_event), 'epoch'::timestamptz),
        COALESCE((SELECT max(occurred_at) FROM orivia.trace_lot_event), 'epoch'::timestamptz),
        COALESCE((SELECT max(created_at) FROM orivia.trace_lot_audit), 'epoch'::timestamptz),
        COALESCE((SELECT max(created_at) FROM orivia.blockchain_anchor), 'epoch'::timestamptz)
    ) AS last_change_at
"""

_LOT_STATES_QUERY = """
SELECT status::text AS status, count(*)::int AS total
FROM orivia.trace_lot
GROUP BY status
ORDER BY status
"""

_ORDER_STATES_QUERY = """
SELECT status::text AS status, count(*)::int AS total
FROM orivia.sales_order
GROUP BY status
ORDER BY status
"""

_BLOCKCHAIN_STATES_QUERY = """
SELECT status::text AS status, count(*)::int AS total
FROM orivia.blockchain_anchor
GROUP BY status
ORDER BY status
"""

_RECENT_CHANGES_QUERY = """
SELECT source, event_type, occurred_at
FROM (
    SELECT 'traceability'::text AS source, event_type, occurred_at
    FROM orivia.trace_lot_event
    UNION ALL
    SELECT 'orders'::text AS source, event_type, occurred_at
    FROM orivia.order_event
    UNION ALL
    SELECT 'audit'::text AS source, action::text AS event_type, changed_at AS occurred_at
    FROM orivia.audit_log
) AS public_events
ORDER BY occurred_at DESC
LIMIT 12
"""


def _iso(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _state_counts(rows: list[dict[str, object]]) -> dict[str, int]:
    return {str(row["status"]): int(row["total"]) for row in rows}


def _public_response(payload: dict[str, object], status: int = 200):
    response = jsonify(payload)
    response.status_code = status
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@public_live_bp.get("/live")
def live_snapshot():
    """Return an aggregate-only DB snapshot for the public observability page.

    This route intentionally never returns users, emails, tokens, credentials,
    costs, raw payloads, record ids or private actor contact information.
    """
    try:
        metrics = fetch_one(_METRICS_QUERY)
        if metrics is None:
            raise RuntimeError("empty live snapshot")

        payload: dict[str, object] = {
            "service": "orivia-public-live",
            "status": "ok",
            "generated_at": _iso(metrics["generated_at"]),
            "last_change_at": _iso(metrics["last_change_at"]),
            "refresh_after_ms": 5000,
            "metrics": {
                "lots": int(metrics["lots"]),
                "trace_events": int(metrics["trace_events"]),
                "orders": int(metrics["orders"]),
                "order_events": int(metrics["order_events"]),
                "blockchain_anchors": int(metrics["blockchain_anchors"]),
                "cluster_actors": int(metrics["cluster_actors"]),
                "cluster_needs": int(metrics["cluster_needs"]),
                "cluster_connections": int(metrics["cluster_connections"]),
            },
            "states": {
                "lots": _state_counts(fetch_all(_LOT_STATES_QUERY)),
                "orders": _state_counts(fetch_all(_ORDER_STATES_QUERY)),
                "blockchain": _state_counts(fetch_all(_BLOCKCHAIN_STATES_QUERY)),
            },
            "recent_changes": [
                {
                    "source": str(row["source"]),
                    "event_type": str(row["event_type"]),
                    "occurred_at": _iso(row["occurred_at"]),
                }
                for row in fetch_all(_RECENT_CHANGES_QUERY)
            ],
        }
        revision_data = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        payload["revision"] = hashlib.sha256(revision_data.encode()).hexdigest()[:16]
        return _public_response(payload)
    except Exception:
        current_app.logger.exception("public live snapshot failed")
        return _public_response(
            {
                "service": "orivia-public-live",
                "status": "unavailable",
                "message": "La vista pública no está disponible temporalmente.",
            },
            503,
        )
