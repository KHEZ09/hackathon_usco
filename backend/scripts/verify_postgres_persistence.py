#!/usr/bin/env python3
"""Exercise the durable order, traceability, audit and anchor flow."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from uuid import UUID, uuid4

# Running this file directly places /app/scripts first on sys.path. Add the
# application root explicitly so the same command works in the production image.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app
from app.auth_tokens.jwt_service import TokenService
from app.database.connection import fetch_one, transaction


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def _token(app, subject: str) -> str:
    return TokenService(
        secret_key=app.config["JWT_SECRET_KEY"],
        issuer=app.config["JWT_ISSUER"],
        access_ttl_seconds=app.config["ACCESS_TOKEN_TTL_SECONDS"],
    ).issue_access_token(
        subject=subject,
        role="admin",
        roles=["ADMIN"],
        permissions=["*"],
    )


def _cleanup(order_id: str) -> None:
    with transaction() as connection:
        connection.execute(
            """
            DELETE FROM orivia.blockchain_anchor
            WHERE event_id IN (SELECT event_id FROM orivia.order_event WHERE order_id=%s)
            """,
            (order_id,),
        )
        connection.execute(
            "DELETE FROM orivia.audit_log WHERE table_name='sales_order' AND record_id=%s",
            (order_id,),
        )
        connection.execute("DELETE FROM orivia.sales_order WHERE order_id=%s", (order_id,))


def main() -> int:
    if os.getenv("ORIVIA_ORDER_REPOSITORY") != "postgres":
        raise SystemExit("ORIVIA_ORDER_REPOSITORY=postgres es obligatorio")

    operator = fetch_one(
        "SELECT user_id FROM orivia.app_user WHERE email='operador@orivia.test' AND account_status='ACTIVE'"
    )
    if operator is None:
        raise SystemExit("No existe el usuario sintético operador@orivia.test")
    subject = str(UUID(str(operator["user_id"])))
    app = create_app()
    headers = {"Authorization": f"Bearer {_token(app, subject)}"}
    order_id: str | None = None

    try:
        client = app.test_client()
        created = client.post(
            "/api/v1/orders",
            headers=headers,
            json={
                "product": f"Verificación {uuid4().hex[:8]}",
                "quantity": 2.5,
                "origin": "Pitalito",
                "destination": "Neiva",
            },
        )
        _assert(created.status_code == 201, f"create order: {created.status_code} {created.get_data(as_text=True)}")
        order_id = created.get_json()["order"]["id"]

        changed = client.patch(
            f"/api/v1/orders/{order_id}/status",
            headers=headers,
            json={"status": "CONFIRMED"},
        )
        _assert(changed.status_code == 200, f"transition: {changed.status_code} {changed.get_data(as_text=True)}")

        timeline = client.get(f"/api/v1/orders/{order_id}/timeline", headers=headers)
        _assert(timeline.status_code == 200, "timeline endpoint failed")
        _assert(len(timeline.get_json()["events"]) == 2, "timeline did not persist two events")

        audit = client.get(f"/api/v1/audit/orders/{order_id}/verify", headers=headers)
        _assert(audit.status_code == 200 and audit.get_json()["verified"], "audit verification failed")

        anchored = client.post(
            "/api/v1/blockchain/anchors", headers=headers, json={"order_id": order_id}
        )
        _assert(anchored.status_code == 201, f"anchor: {anchored.status_code} {anchored.get_data(as_text=True)}")
        event_hash = anchored.get_json()["anchor"]["event_hash"]

        fresh_app = create_app()
        fresh_client = fresh_app.test_client()
        persisted = fresh_client.get(f"/api/v1/orders/{order_id}", headers=headers)
        _assert(persisted.status_code == 200, "order was not readable after app recreation")
        _assert(persisted.get_json()["order"]["status"] == "CONFIRMED", "status was not persisted")
        persisted_anchor = fresh_client.get(
            f"/api/v1/blockchain/anchors/{event_hash}", headers=headers
        )
        _assert(persisted_anchor.status_code == 200, "anchor was not readable after app recreation")
        _assert(persisted_anchor.get_json()["anchor"]["verified"], "persisted anchor did not verify")

        print(json.dumps({"status": "ok", "order_id": order_id, "event_hash": event_hash}))
        return 0
    finally:
        if order_id is not None:
            _cleanup(order_id)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"persistence verification failed: {exc}", file=sys.stderr)
        raise
