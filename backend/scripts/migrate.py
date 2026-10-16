#!/usr/bin/env python3
"""Aplica migraciones SQL ordenadas y registra checksum para no repetirlas."""
from __future__ import annotations

import hashlib
import os
from pathlib import Path

import psycopg

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / 'migrations'


def checksum(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    dsn = os.environ.get('ORIVIA_DATABASE_URL')
    if not dsn: raise SystemExit('ORIVIA_DATABASE_URL no está configurada')
    files = sorted(MIGRATIONS.glob('[0-9][0-9][0-9]_*.sql'))
    with psycopg.connect(dsn) as connection:
        connection.execute('CREATE SCHEMA IF NOT EXISTS orivia')
        connection.execute('''CREATE TABLE IF NOT EXISTS orivia.schema_migration (
            migration_name text PRIMARY KEY, checksum char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())''')
        connection.commit()
        for path in files:
            digest = checksum(path)
            existing = connection.execute('SELECT checksum FROM orivia.schema_migration WHERE migration_name=%s', (path.name,)).fetchone()
            if existing:
                if existing[0] != digest: raise SystemExit(f'Checksum cambiado: {path.name}')
                print(f'SKIP {path.name}')
                continue
            sql = path.read_text(encoding='utf-8').replace('BEGIN;', '', 1)
            if sql.rstrip().endswith('COMMIT;'): sql = sql.rstrip()[:-len('COMMIT;')]
            with connection.transaction(): connection.execute(sql)
            connection.execute('INSERT INTO orivia.schema_migration(migration_name,checksum) VALUES(%s,%s)', (path.name, digest))
            connection.commit()
            print(f'APPLIED {path.name}')


if __name__ == '__main__': main()
