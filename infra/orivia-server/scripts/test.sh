#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd -- "$SERVER_DIR/../.." && pwd)"
ENV_FILE="$SERVER_DIR/.env"
ROOT_ENV_FILE="$REPO_DIR/.env"
COMPOSE_FILE="$SERVER_DIR/docker-compose.yml"
TEST_IMAGE="orivia-backend:test"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Falta $ENV_FILE. Copia .env.server.example y configura los secretos." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker no está disponible para el usuario actual." >&2
  exit 1
fi

cd "$REPO_DIR"
COMPOSE_ENV_FILES=(--env-file "$ENV_FILE")
if [[ -f "$ROOT_ENV_FILE" ]]; then
  COMPOSE_ENV_FILES+=(--env-file "$ROOT_ENV_FILE")
fi

echo "[1/3] Validando Compose..."
docker compose "${COMPOSE_ENV_FILES[@]}" -f "$COMPOSE_FILE" config >/dev/null

echo "[2/3] Construyendo imagen de pruebas..."
docker build --tag "$TEST_IMAGE" --file backend/Dockerfile.test backend

echo "[3/3] Ejecutando pruebas dentro de Docker..."
docker run --rm "$TEST_IMAGE"

echo "Prueba Docker completada correctamente."
