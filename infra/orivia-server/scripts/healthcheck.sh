#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$SERVER_DIR/.env"
COMPOSE_FILE="$SERVER_DIR/docker-compose.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Falta $ENV_FILE." >&2
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

for attempt in $(seq 1 5); do
  if curl --fail --silent --show-error http://127.0.0.1:8000/health; then
    echo
    exit 0
  fi
  sleep 2
done

echo "La API no respondió a /health." >&2
exit 1
