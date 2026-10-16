from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from typing import Any

from psycopg import Connection, Error, connect
from psycopg.rows import dict_row

_dsn: str | None = None


def init_pool(dsn: str) -> None:
    global _dsn
    _dsn = dsn


def close_pool() -> None:
    return None


@contextmanager
def transaction() -> Iterator[Connection]:
    if _dsn is None:
        raise RuntimeError("Database pool is not initialized")
    with connect(_dsn, row_factory=dict_row) as connection, connection.transaction():
        yield connection


def fetch_one(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    with transaction() as connection:
        return connection.execute(query, params).fetchone()


def fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with transaction() as connection:
        return list(connection.execute(query, params).fetchall())


def database_is_ready() -> bool:
    if not _dsn:
        return False
    try:
        # Readiness must fail fast when PostgreSQL is down; a health probe must
        # never hang the whole test runner or the reverse proxy.
        with connect(_dsn, row_factory=dict_row, connect_timeout=2) as connection:
            return connection.execute("SELECT 1 AS ok").fetchone() is not None
    except Error:
        return False
