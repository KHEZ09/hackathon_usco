#!/usr/bin/env bash
set -Eeuo pipefail

API_URL="${ORIVIA_API_URL:-http://127.0.0.1:8000}"
READY_FILE="$(mktemp)"
trap 'rm -f "$READY_FILE"' EXIT

echo "[1/3] health"
curl --fail --silent --show-error "$API_URL/health"
echo

echo "[2/3] readiness"
ready_status="$(curl --silent --show-error --output "$READY_FILE" --write-out '%{http_code}' "$API_URL/ready")"
cat "$READY_FILE"
echo
if [[ "$ready_status" != "200" ]]; then
  echo "Readiness falló con HTTP $ready_status." >&2
  exit 1
fi

echo "[3/3] authentication boundary"
unauth_status="$(curl --silent --output /dev/null --write-out '%{http_code}' "$API_URL/api/v1/orders")"
if [[ "$unauth_status" != "401" ]]; then
  echo "La ruta protegida respondió HTTP $unauth_status en vez de 401." >&2
  exit 1
fi

echo "[4/4] public live snapshot"
live_status="$(curl --silent --output /dev/null --write-out '%{http_code}' "$API_URL/api/v1/public/live")"
if [[ "$live_status" != "200" ]]; then
  echo "La vista pública en vivo respondió HTTP $live_status." >&2
  exit 1
fi

echo "Smoke test completado correctamente."
