#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd -- "$SERVER_DIR/../.." && pwd)"
ENV_FILE="$SERVER_DIR/.env"
ROOT_ENV_FILE="$REPO_DIR/.env"
COMPOSE_FILE="$SERVER_DIR/docker-compose.yml"

cd "$REPO_DIR"
COMPOSE_ENV_FILES=(--env-file "$ENV_FILE")
if [[ -f "$ROOT_ENV_FILE" ]]; then
  COMPOSE_ENV_FILES+=(--env-file "$ROOT_ENV_FILE")
fi

docker compose "${COMPOSE_ENV_FILES[@]}" -f "$COMPOSE_FILE" exec -T api \
  env ORIVIA_BLOCKCHAIN_BACKEND=postgres python scripts/verify_lot_postgres_persistence.py

docker compose "${COMPOSE_ENV_FILES[@]}" -f "$COMPOSE_FILE" exec -T api \
  python scripts/verify_postgres_persistence.py
