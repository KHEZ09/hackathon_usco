#!/usr/bin/env bash
set -Eeuo pipefail
: "${ORIVIA_DATABASE_URL:?Define ORIVIA_DATABASE_URL}"
BACKUP="${1:?Uso: restore.sh archivo.backup}"
test -f "$BACKUP" || { echo "No existe: $BACKUP" >&2; exit 1; }
pg_restore --clean --if-exists --no-owner --dbname="$ORIVIA_DATABASE_URL" "$BACKUP"
echo "Restauración completada: $BACKUP"
