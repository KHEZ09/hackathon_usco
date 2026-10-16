# ORIVIA — operación del servidor

Configuración versionada para desplegar el backend de ORIVIA en la instancia Lightsail `orivia`.

## Responsables dentro del servidor

- **Sebas:** mantiene `backend/app/security/`, `auth_tokens/`, `orders/`, `tracking/`, `audit/`, `blockchain/`, `ai/`, `cluster/` y `lots/`.
- **Kevin:** mantiene `backend/app/users/`, `database/`, `catalog/`, `accounting/`, `reports/`, `integrations/` y `backend/migrations/`.
- **Ángel y Daniel:** mantienen la referencia visual y el frontend en `hackathon_usco/design/`, `components/`, `styles/` y `docs/ux/`.

Todo cambio sigue: `push` → `git pull` en `orivia` → prueba Docker → despliegue real.

## Estado

- El backend está en `../../backend/`.
- El checkout oficial fue validado en `83a8868`; repetir el flujo
  después de cada cambio publicado.
- Los secretos y el `.env` real nunca se suben a GitHub.
- El acceso previsto es `ssh admin@orivia` por Tailscale.
- CORS se configura con `ORIVIA_CORS_ORIGINS` usando orígenes explícitos; no se permite `*`.
- La configuración se separa en `infra/orivia-server/.env` (API/PostgreSQL) y
  `.env` en la raíz (blockchain EVM y Ollama). Los scripts oficiales cargan
  ambos archivos si el segundo existe; ninguno se versiona.
- El login tiene límite local por IP/identificador: 5 fallos en 10 minutos y bloqueo de 15 minutos.
- La API registra método, ruta, código y `X-Request-ID`, sin registrar tokens ni cuerpos de solicitud.
- El stack canónico es únicamente `/opt/orivia/repo` (`orivia-server`), con API
  local en `127.0.0.1:8000` y PostgreSQL privado en Docker.
- El stack legado `/home/admin/backend` estaba aislado en otra red, con otra
  base de datos y publicaba `8001`. Fue detenido durante la auditoría de
  correlación del 2026-10-16; su volumen `backend_orivia_postgres_data` se
  conserva sin borrar para una recuperación explícita. No debe reiniciarse ni
  usarse como segundo backend de ORIVIA.
- El clúster usa las migraciones y repositorios PostgreSQL compartidos de Kevin
  cuando el servidor corre con `ORIVIA_ORDER_REPOSITORY=postgres`; los lotes
  usan la migración propia `007_lot_traceability.sql`. La persistencia
  PostgreSQL de pedidos, lotes, eventos, auditorías y anclajes continúa siendo
  la prueba obligatoria. La migración `008_blockchain_registry.sql` conserva
  además la evidencia de red, transacción, bloque y contrato EVM.

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

Completa también el origen real del frontend cuando esté definido:

```dotenv
ORIVIA_CORS_ORIGINS=https://tu-frontend.example
ORIVIA_LOGIN_RATE_LIMIT_ENABLED=true
ORIVIA_LOGIN_RATE_LIMIT_MAX_FAILURES=5
ORIVIA_LOGIN_RATE_LIMIT_WINDOW_SECONDS=600
ORIVIA_LOGIN_RATE_LIMIT_BLOCK_SECONDS=900
```

No uses `*` en CORS y no copies el `.env` fuera del servidor.

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

Después de un despliegue, ejecutar también el smoke test, que no crea datos:

```bash
bash infra/orivia-server/scripts/smoke_test.sh
```

Para validar específicamente el clúster y la regresión de `CAC001` dentro del
contenedor:

```bash
docker compose --env-file infra/orivia-server/.env --env-file .env -f infra/orivia-server/docker-compose.yml \
  exec -T api python -m pytest tests/test_cluster.py tests/test_hour12_incident.py -q
```

`deploy.sh` aplica automáticamente las migraciones pendientes antes de validar
la API. Después del despliegue, comprobar la persistencia real con:

```bash
bash infra/orivia-server/scripts/persistence_test.sh
```

La prueba crea un pedido sintético, cambia su estado, verifica la cadena,
ancla el último evento, recrea la aplicación y confirma que todo sigue legible;
finalmente elimina únicamente los datos de prueba.

Para verificar autenticación real sin exponer tokens:

```bash
docker compose --env-file infra/orivia-server/.env --env-file .env -f infra/orivia-server/docker-compose.yml exec -T \
  -e ORIVIA_TEST_LOGIN_EMAIL=operador@orivia.test \
  -e ORIVIA_TEST_LOGIN_PASSWORD='password-demo-no-versionada' api \
  python scripts/verify_auth_postgres.py
```

Las cuentas demo se provisionan con `scripts/provision_demo_users.py`; sus
contraseñas deben entregarse por un canal seguro y nunca versionarse.

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
docker compose --env-file infra/orivia-server/.env --env-file .env -f infra/orivia-server/docker-compose.yml down
docker compose --env-file infra/orivia-server/.env --env-file .env -f infra/orivia-server/docker-compose.yml up -d
```

No usar `down -v` salvo que se haya respaldado y aprobado explícitamente la eliminación del volumen de PostgreSQL.

## Estado blockchain EVM real — activado en staging

La integración EVM real ya está activa en la instancia `orivia` para la demo.
Los pedidos y eventos operativos siguen persistiendo en PostgreSQL; el backend
ancla el hash del evento en el contrato y guarda la evidencia de red,
transacción, bloque y contrato en `blockchain_anchor`.

- Red: Polygon Amoy (`chain_id=80002`).
- Contrato: `0xE38cB991af12f21EEb7de72B681c2a0CB9DdA85C`.
- Cuenta firmante dedicada: `0x9021979d1a0992CDb0F17f2bdC34c928d2DfCDd2`.
- Evidencia de despliegue: [PolygonScan Amoy](https://amoy.polygonscan.com/address/0xE38cB991af12f21EEb7de72B681c2a0CB9DdA85C).
- Evidencia funcional: el servidor creó un pedido sintético, lo ancló, repitió
  el anclaje de forma idempotente y verificó `verified=true` contra el contrato.

Las variables privadas viven únicamente en el `.env` raíz del servidor, con
permisos `600`. El contrato y la cuenta se usan solo para testnet/staging; no
se deben reutilizar fondos, claves ni RPC de prueba en producción.

Configuración objetivo para Polygon Amoy:

```dotenv
ORIVIA_BLOCKCHAIN_BACKEND=evm
ORIVIA_BLOCKCHAIN_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/<API_KEY>
ORIVIA_BLOCKCHAIN_PRIVATE_KEY=<CLAVE_DE_LA_CUENTA_DEDICADA>
ORIVIA_BLOCKCHAIN_CONTRACT_ADDRESS=<DIRECCION_DEVUELTA_POR_DEPLOY>
ORIVIA_BLOCKCHAIN_CHAIN_ID=80002
```

La clave privada se escribe directamente en el `.env` privado del servidor y
no se comparte por chat, commits, capturas ni logs. Para reconstruir el API
con la configuración real se deben cargar ambos archivos:

```bash
docker compose --env-file infra/orivia-server/.env --env-file .env \
  -f infra/orivia-server/docker-compose.yml up -d --force-recreate api
```

## Ollama Cloud — activo en staging

La instancia no descarga `gpt-oss:120b`: el API usa Ollama Cloud para no agotar
la RAM de Lightsail. La configuración no secreta es:

```dotenv
OLLAMA_BASE_URL=https://ollama.com
OLLAMA_MODEL=gpt-oss:120b
```

`OLLAMA_API_KEY` queda solo en el `.env` raíz del servidor. La API mantiene el
fallback local de solo lectura si Ollama no responde, no expone la clave y no
permite que la IA cambie pedidos ni escriba directamente en blockchain. La
prueba real del servidor respondió desde `ollama:gpt-oss:120b`.

Referencia operativa: [Ollama Cloud](https://docs.ollama.com/cloud).

## Pendientes antes de producción

- Configurar HTTPS mediante un proxy y dominio aprobado.
- Ejecutar backup y restauración en un entorno aislado; no restaurar sobre producción sin aprobación.
- Rotar secretos y definir retención/alertas de backups.
- Si se despliega más de un worker o réplica, mover el límite de login a un proxy o store compartido.
- Para producción, sustituir Polygon Amoy y la cuenta de prueba por una política
  de red, custodia y rotación aprobada; el staging no es producción.
