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
    (SELECT count(*)::int FROM orivia.app_user) AS users,
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
    UNION ALL
    SELECT 'users'::text AS source, 'USER_REGISTERED'::text AS event_type, created_at AS occurred_at
    FROM orivia.app_user
    UNION ALL
    SELECT 'blockchain'::text AS source, status::text AS event_type, COALESCE(anchored_at, created_at) AS occurred_at
    FROM orivia.blockchain_anchor
) AS public_events
ORDER BY occurred_at DESC
LIMIT 12
"""

_USERS_QUERY = """
SELECT u.user_id::text AS user_id, u.full_name, u.email,
       u.account_status::text AS account_status, u.created_at,
       COALESCE(
           array_agg(ur.role::text ORDER BY ur.role::text)
           FILTER (WHERE ur.role IS NOT NULL),
           ARRAY[]::text[]
       ) AS roles
FROM orivia.app_user u
LEFT JOIN orivia.app_user_role ur USING (user_id)
GROUP BY u.user_id
ORDER BY u.created_at DESC
"""

_USER_STATES_QUERY = """
SELECT account_status::text AS status, count(*)::int AS total
FROM orivia.app_user
GROUP BY account_status
ORDER BY account_status
"""

_ORDER_CHAINS_QUERY = """
SELECT o.order_id::text AS order_id, o.status::text AS status,
       count(e.event_id)::int AS event_count,
       max(e.occurred_at) AS last_event_at,
       COALESCE(
           json_agg(
               json_build_object(
                   'event_hash', e.event_hash,
                   'previous_event_hash', e.previous_hash,
                   'event_type', e.event_type,
                   'occurred_at', e.occurred_at
               ) ORDER BY e.occurred_at
           ) FILTER (WHERE e.event_id IS NOT NULL),
           '[]'::json
       ) AS events
FROM orivia.sales_order o
LEFT JOIN orivia.order_event e ON e.order_id = o.order_id
GROUP BY o.order_id, o.status
ORDER BY max(e.occurred_at) DESC NULLS LAST
LIMIT 100
"""

_BLOCKCHAIN_CERTIFICATES_QUERY = """
SELECT event_hash, status::text AS status, network, transaction_id,
       block_number, chain_id, contract_address, created_at, anchored_at
FROM orivia.blockchain_anchor
ORDER BY COALESCE(anchored_at, created_at) DESC
LIMIT 100
"""


def _iso(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def _state_counts(rows: list[dict[str, object]]) -> dict[str, int]:
    return {str(row["status"]): int(row["total"]) for row in rows}


def _public_user(row: dict[str, object]) -> dict[str, object]:
    """Return the demo profile fields without password hashes or tokens."""
    return {
        "user_id": str(row["user_id"]),
        "full_name": str(row["full_name"]),
        "email": str(row["email"]),
        "account_status": str(row["account_status"]),
        "roles": [str(role) for role in (row.get("roles") or [])],
        "created_at": _iso(row.get("created_at")),
    }


def _public_chain(row: dict[str, object]) -> dict[str, object]:
    order_id = str(row["order_id"])
    verified = False
    repository = current_app.extensions.get("orivia_order_repository")
    if repository is not None:
        try:
            verified = bool(repository.verify_timeline(order_id))
        except (KeyError, RuntimeError, TypeError, ValueError):
            verified = False
    events = []
    for event in row.get("events") or []:
        if not isinstance(event, dict):
            continue
        events.append(
            {
                "event_hash": str(event.get("event_hash") or ""),
                "previous_event_hash": (
                    str(event["previous_event_hash"])
                    if event.get("previous_event_hash")
                    else None
                ),
                "event_type": str(event.get("event_type") or ""),
                "occurred_at": _iso(event.get("occurred_at")),
            }
        )
    return {
        "order_id": order_id,
        "status": str(row["status"]),
        "event_count": int(row["event_count"]),
        "verified": verified,
        "last_event_at": _iso(row.get("last_event_at")),
        "events": events,
    }


def _public_certificate(row: dict[str, object]) -> dict[str, object]:
    return {
        "event_hash": str(row["event_hash"]),
        "status": str(row["status"]),
        "network": str(row.get("network") or "unknown"),
        "transaction_id": str(row["transaction_id"]) if row.get("transaction_id") else None,
        "block_number": row.get("block_number"),
        "chain_id": row.get("chain_id"),
        "contract_address": row.get("contract_address"),
        "created_at": _iso(row.get("created_at")),
        "anchored_at": _iso(row.get("anchored_at")),
    }


def _public_response(payload: dict[str, object], status: int = 200):
    response = jsonify(payload)
    response.status_code = status
    response.headers["Cache-Control"] = "no-store, max-age=0"
    response.headers["X-Content-Type-Options"] = "nosniff"
    return response


@public_live_bp.get("/live")
def live_snapshot():
    """Return the public observability snapshot.

    The demo mode is explicitly enabled on the hackathon server and includes
    synthetic user profiles, event chains and blockchain certificates. It never
    returns password hashes, tokens, API keys, database URLs or raw payloads.
    Production keeps the aggregate-only response by default.
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
                "users": int(metrics["users"]),
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
            "capabilities": {
                "blockchain": {
                    "backend": str(current_app.config.get("BLOCKCHAIN_BACKEND") or "unknown"),
                    "chain_id": current_app.config.get("BLOCKCHAIN_CHAIN_ID"),
                    "contract_configured": bool(current_app.config.get("BLOCKCHAIN_CONTRACT_ADDRESS")),
                },
                "ai": {
                    "provider": "ollama" if current_app.config.get("OLLAMA_BASE_URL") else "local-fallback",
                    "model": str(current_app.config.get("OLLAMA_MODEL") or "local-deterministic"),
                    "configured": bool(current_app.config.get("OLLAMA_BASE_URL")),
                },
            },
        }
        if current_app.config.get("PUBLIC_LIVE_INCLUDE_DEMO_DATA"):
            payload["user_states"] = _state_counts(fetch_all(_USER_STATES_QUERY))
            payload["users"] = [_public_user(row) for row in fetch_all(_USERS_QUERY)]
            payload["chains"] = [_public_chain(row) for row in fetch_all(_ORDER_CHAINS_QUERY)]
            payload["blockchain_certificates"] = [
                _public_certificate(row) for row in fetch_all(_BLOCKCHAIN_CERTIFICATES_QUERY)
            ]
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
