#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Ejecuta este script con sudo." >&2
  exit 1
fi

if ! ip link show tailscale0 >/dev/null 2>&1; then
  echo "No existe tailscale0. Conecta Tailscale antes de aplicar el firewall." >&2
  exit 1
fi

ufw default deny incoming
ufw default allow outgoing
ufw allow in on tailscale0 to any port 22 proto tcp comment 'ORIVIA SSH via Tailscale'
ufw --force enable
ufw status verbose
