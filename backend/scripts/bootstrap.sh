#!/usr/bin/env bash
set -Eeuo pipefail
python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
echo 'Entorno listo. Activa con: source .venv/bin/activate'
