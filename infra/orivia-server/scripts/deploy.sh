#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd -- "$SERVER_DIR/../.." && pwd)"
ENV_FILE="$SERVER_DIR/.env"
COMPOSE_FILE="$SERVER_DIR/docker-compose.yml"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Falta $ENV_FILE. Copia .env.server.example y configura los secretos." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker no está disponible para el usuario actual." >&2
  exit 1
fi

cd "$REPO_DIR"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "Aplicando migraciones PostgreSQL..."
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T api python scripts/migrate.py

for attempt in $(seq 1 15); do
  if curl --fail --silent --show-error http://127.0.0.1:8000/health; then
    echo
    exit 0
  fi
  sleep 2
done

echo "La API no respondió a /health después de 30 segundos." >&2
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" logs --tail=80 api >&2
exit 1
