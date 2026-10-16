#!/usr/bin/env python3
"""Exercise RF01/RF02 against PostgreSQL without spending public-chain gas."""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from uuid import UUID, uuid4

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


def _cleanup(lot_id: str) -> None:
    with transaction() as connection:
        connection.execute(
            "DELETE FROM orivia.blockchain_anchor WHERE entity_type='lot' AND entity_id=%s",
            (lot_id,),
        )
        connection.execute("DELETE FROM orivia.trace_lot_audit WHERE lot_id=%s", (lot_id,))
        connection.execute("DELETE FROM orivia.trace_lot_event WHERE lot_id=%s", (lot_id,))
        connection.execute("DELETE FROM orivia.trace_lot WHERE lot_id=%s", (lot_id,))


def main() -> int:
    if os.getenv("ORIVIA_BLOCKCHAIN_BACKEND") != "postgres":
        raise SystemExit("ORIVIA_BLOCKCHAIN_BACKEND=postgres es obligatorio para esta prueba")

    app = create_app()
    operator = fetch_one(
        "SELECT user_id FROM orivia.app_user WHERE email='operador@orivia.test' AND account_status='ACTIVE'"
    )
    if operator is None:
        raise SystemExit("No existe el usuario sintético operador@orivia.test")

    lot_id = f"QA-RF01-RF02-{uuid4().hex[:12]}"
    operation_code = f"OP-{uuid4().hex[:12]}"
    headers = {"Authorization": f"Bearer {_token(app, str(UUID(str(operator['user_id']))))}"}

    try:
        client = app.test_client()
        created = client.post(
            "/api/v1/lots",
            headers=headers,
            json={
                "lot_id": lot_id,
                "product": "Cacao QA persistente",
                "origin": "Pitalito, Huila",
                "producer": "Finca QA",
                "received_kg": 100,
                "received_at": "2026-10-16",
            },
        )
        _assert(created.status_code == 201, f"RF01 create: {created.status_code} {created.get_data(as_text=True)}")
        created_lot = created.get_json()["lot"]
        _assert(created_lot["status"] == "PENDING", "RF01 did not start as PENDING")
        _assert(created_lot["received_kg"] == 100.0, "RF01 quantity was not persisted")
        _assert(created.get_json()["blockchain"]["status"] == "ANCHORED", "RF01 anchor was not persisted")

        transformed = client.post(
            f"/api/v1/lots/{lot_id}/transformations",
            headers=headers,
            json={
                "operation_code": operation_code,
                "stage": "FERMENTATION",
                "responsible": "Finca QA",
                "input_kg": 100,
                "output_kg": 80,
                "incident": "Sin novedad",
            },
        )
        _assert(
            transformed.status_code == 201,
            f"RF02 transform: {transformed.status_code} {transformed.get_data(as_text=True)}",
        )
        transformed_lot = transformed.get_json()["lot"]
        _assert(transformed_lot["available_kg"] == 80.0, "RF02 inventory was not updated")
        _assert(transformed_lot["transformations"][0]["merma_pct"] == 20.0, "RF02 merma was not calculated")
        _assert(transformed_lot["transformations"][0]["alert"]["type"] == "MERMA", "RF04 alert was not generated")

        retry = client.post(
            f"/api/v1/lots/{lot_id}/transformations",
            headers=headers,
            json={
                "operation_code": operation_code,
                "stage": "FERMENTATION",
                "responsible": "Finca QA",
                "input_kg": 90,
                "output_kg": 70,
                "incident": "reintento",
            },
        )
        _assert(retry.status_code == 200 and retry.get_json()["idempotent"], "RF02 retry was not idempotent")
        _assert(retry.get_json()["lot"]["available_kg"] == 80.0, "RF02 retry double-consumed inventory")

        fresh_app = create_app()
        persisted = fresh_app.test_client().get(f"/api/v1/lots/{lot_id}", headers=headers)
        _assert(persisted.status_code == 200, "lot was not readable after app recreation")
        _assert(persisted.get_json()["lot"]["history_verified"], "lot hash history did not verify")

        print(json.dumps({"status": "ok", "lot_id": lot_id, "operation_code": operation_code}))
        return 0
    finally:
        _cleanup(lot_id)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"lot persistence verification failed: {exc}", file=sys.stderr)
        raise
