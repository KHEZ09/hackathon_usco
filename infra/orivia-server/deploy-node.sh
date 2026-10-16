#!/usr/bin/env bash
set -euo pipefail

ROOT=/opt/orivia/repo
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
RELEASE=/tmp/orivia-node-release

rm -rf "$RELEASE"
mkdir -p "$RELEASE"
tar -xf /tmp/orivia-node-deploy.tar -C "$RELEASE"
test -f "$RELEASE/frontend/Dockerfile"
test -f "$RELEASE/infra/orivia-server/docker-compose.yml"

if [ -d "$ROOT/frontend" ]; then
  mv "$ROOT/frontend" "$ROOT/frontend.backup.$STAMP"
fi
cp -a "$RELEASE/frontend" "$ROOT/frontend"
cp "$RELEASE/infra/orivia-server/Caddyfile" "$ROOT/infra/orivia-server/Caddyfile"
cp "$RELEASE/infra/orivia-server/docker-compose.yml" "$ROOT/infra/orivia-server/docker-compose.yml"

cd "$ROOT/infra/orivia-server"
docker compose config >/tmp/orivia-compose-validated.yml
docker compose build frontend
docker compose up -d --force-recreate frontend web

for attempt in 1 2 3 4 5 6; do
  if curl --fail --silent --show-error http://127.0.0.1:3000/ > /tmp/orivia-node-check.html; then
    grep -q "ORIVIA" /tmp/orivia-node-check.html
    break
  fi
  sleep 5
done

docker compose ps
curl --fail --silent --show-error -I https://orivia.tobaru.xyz/ | head -n 12
