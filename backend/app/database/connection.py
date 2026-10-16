from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg import connect

_dsn: str | None = None


def init_pool(dsn: str) -> None:
    global _dsn
    _dsn = dsn


def close_pool() -> None:
    return None


@contextmanager
def transaction() -> Iterator[Connection]:
    if _dsn is None:
        raise RuntimeError('Database pool is not initialized')
    with connect(_dsn, row_factory=dict_row) as connection:
        with connection.transaction():
            yield connection


def fetch_one(query: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    with transaction() as connection:
        return connection.execute(query, params).fetchone()


def fetch_all(query: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with transaction() as connection:
        return list(connection.execute(query, params).fetchall())


def database_is_ready() -> bool:
    try:
        return fetch_one('SELECT 1 AS ok') is not None
    except Exception:
        return False
