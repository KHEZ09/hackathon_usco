# ORIVIA — operación del servidor

Configuración versionada para desplegar el backend de ORIVIA en la instancia Lightsail `orivia`.

## Responsables dentro del servidor

- **Sebas:** mantiene `backend/app/security/`, `auth_tokens/`, `orders/`, `tracking/`, `audit/`, `blockchain/` y `ai/`.
- **Kevin:** mantiene `backend/app/users/`, `database/`, `catalog/`, `accounting/`, `reports/`, `integrations/` y `backend/migrations/`.
- **Ángel y Daniel:** mantienen la referencia visual y el frontend en `hackathon_usco/design/`, `components/`, `styles/` y `docs/ux/`.

Todo cambio sigue: `push` → `git pull` en `orivia` → prueba Docker → despliegue real.

## Estado

- El backend está en `../../backend/`.
- Este paquete todavía no afirma que el despliegue haya sido ejecutado en el servidor.
- Los secretos y el `.env` real nunca se suben a GitHub.
- El acceso previsto es `ssh admin@orivia` por Tailscale.

## Servidor objetivo

| Dato | Valor |
|---|---|
| Servicio | Amazon Lightsail |
| Nombre | `orivia` |
| Sistema | Debian 13 |
| Región | `us-east-1a` |
| Usuario | `admin` |
| SSH público | Cerrado |
| PostgreSQL | Solo red privada de Docker |

## Preparación y despliegue

En el servidor, instalar las dependencias base y Docker según la documentación oficial de Debian:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git ufw
docker --version
docker compose version
```

Clonar el repositorio en `/opt/orivia/repo`:

```bash
sudo mkdir -p /opt/orivia
sudo chown -R "$USER":"$USER" /opt/orivia
cd /opt/orivia
git clone https://github.com/KHEZ09/hackathon_usco.git repo
cd repo
```

Para una instalación existente:

```bash
cd /opt/orivia/repo
git pull --ff-only origin main
```

Crear y proteger los secretos del servidor:

```bash
cd /opt/orivia/repo
cp infra/orivia-server/.env.server.example infra/orivia-server/.env
chmod 600 infra/orivia-server/.env
nano infra/orivia-server/.env
openssl rand -hex 32
```

## Flujo obligatorio de cambios

Cada cambio del backend sigue esta secuencia:

1. Hacer commit y `push` al repositorio.
2. Entrar por `ssh admin@orivia` y hacer `git pull --ff-only origin main`.
3. Ejecutar la prueba aislada dentro de Docker:

```bash
cd /opt/orivia/repo
bash infra/orivia-server/scripts/test.sh
```

4. Si las pruebas pasan, ejecutar el despliegue real:

```bash
cd /opt/orivia/repo
bash infra/orivia-server/scripts/deploy.sh
bash infra/orivia-server/scripts/healthcheck.sh
```

No se debe desplegar un cambio que no haya pasado `test.sh`.

## Despliegue inicial

```bash
bash infra/orivia-server/scripts/deploy.sh
bash infra/orivia-server/scripts/healthcheck.sh
```

La API queda inicialmente en `127.0.0.1:8000`; PostgreSQL no se publica al exterior.

## Firewall

Ejecutar únicamente después de confirmar que Tailscale está conectado y manteniendo abierta la sesión SSH actual:

```bash
sudo bash infra/orivia-server/scripts/configure-ufw.sh
sudo ufw status verbose
tailscale status
```

La política del script deniega entradas por defecto y permite SSH únicamente sobre `tailscale0`. No abre PostgreSQL ni la API directamente a Internet.

## Parar y reanudar

```bash
docker compose --env-file infra/orivia-server/.env -f infra/orivia-server/docker-compose.yml down
docker compose --env-file infra/orivia-server/.env -f infra/orivia-server/docker-compose.yml up -d
```

No usar `down -v` salvo que se haya respaldado y aprobado explícitamente la eliminación del volumen de PostgreSQL.

## Pendientes antes de producción

- Integrar usuarios, migraciones y repositorios PostgreSQL.
- Hacer que `/ready` compruebe realmente la base de datos.
- Configurar HTTPS mediante un proxy y dominio aprobado.
- Añadir backups, restauración probada y alertas de presupuesto AWS.
