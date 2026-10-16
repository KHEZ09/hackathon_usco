#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd -- "$SERVER_DIR/../.." && pwd)"
ENV_FILE="$SERVER_DIR/.env"
COMPOSE_FILE="$SERVER_DIR/docker-compose.yml"

cd "$REPO_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api \
  python scripts/verify_postgres_persistence.py
