#!/usr/bin/env python3
"""Provision bcrypt passwords for the synthetic hackathon accounts.

Passwords are supplied through environment variables and are never committed.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import bcrypt

# Allow direct execution from /app/scripts in the production image.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database.connection import transaction


USERS = {
    "operador@orivia.test": "ORIVIA_DEMO_OPERATOR_PASSWORD",
    "admin@orivia.test": "ORIVIA_DEMO_ADMIN_PASSWORD",
    "comprador@orivia.test": "ORIVIA_DEMO_BUYER_PASSWORD",
}


def main() -> None:
    missing = [variable for variable in USERS.values() if not os.getenv(variable)]
    if missing:
        raise SystemExit(
            "Faltan variables de contraseña demo: " + ", ".join(missing)
        )

    with transaction() as connection:
        for email, variable in USERS.items():
            password = os.environ[variable]
            if len(password.encode("utf-8")) > 72:
                raise SystemExit(f"La contraseña de {email} supera 72 bytes UTF-8")
            password_hash = bcrypt.hashpw(
                password.encode("utf-8"), bcrypt.gensalt()
            ).decode("ascii")
            updated = connection.execute(
                """
                UPDATE orivia.app_user
                SET password_hash=%s, account_status='ACTIVE'
                WHERE email=%s
                RETURNING email
                """,
                (password_hash, email),
            ).fetchone()
            if updated is None:
                raise SystemExit(f"No existe la cuenta sintética {email}")
            print(f"PROVISIONED {email}")


if __name__ == "__main__":
    main()
