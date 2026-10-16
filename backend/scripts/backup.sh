#!/usr/bin/env bash
set -Eeuo pipefail
: "${ORIVIA_DATABASE_URL:?Define ORIVIA_DATABASE_URL}"
OUT="${1:-orivia-$(date -u +%Y%m%dT%H%M%SZ).backup}"
pg_dump --format=custom --no-owner --file="$OUT" "$ORIVIA_DATABASE_URL"
echo "Backup creado: $OUT"
