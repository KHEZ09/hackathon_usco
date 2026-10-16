#!/usr/bin/env python3
"""Verify login, /me and refresh rotation against PostgreSQL-backed auth."""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    email = os.getenv("ORIVIA_TEST_LOGIN_EMAIL", "operador@orivia.test")
    password = os.getenv("ORIVIA_TEST_LOGIN_PASSWORD")
    if not password:
        raise SystemExit("ORIVIA_TEST_LOGIN_PASSWORD es obligatorio")

    client = create_app().test_client()
    login = client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    _assert(login.status_code == 200, f"login failed: {login.status_code}")
    body = login.get_json()
    access_token = body.get("access_token")
    refresh_token = body.get("refresh_token")
    _assert(isinstance(access_token, str) and access_token, "missing access token")
    _assert(isinstance(refresh_token, str) and refresh_token, "missing refresh token")

    headers = {"Authorization": f"Bearer {access_token}"}
    me = client.get("/api/v1/auth/me", headers=headers)
    _assert(me.status_code == 200, f"me failed: {me.status_code}")
    _assert(me.get_json()["user"]["email"] == email, "wrong authenticated user")

    refreshed = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
    )
    _assert(refreshed.status_code == 200, f"refresh failed: {refreshed.status_code}")
    replacement = refreshed.get_json().get("refresh_token")
    _assert(replacement and replacement != refresh_token, "refresh was not rotated")

    replay = client.post(
        "/api/v1/auth/refresh", json={"refresh_token": refresh_token}
    )
    _assert(replay.status_code == 401, "revoked refresh token was accepted")
    print("auth verification: ok")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
