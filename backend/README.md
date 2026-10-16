# ORIVIA Backend

Base inicial de la API de ORIVIA.

Este backend pertenece al repositorio de la hackatón USCO y se prepara para desplegarse en la instancia Lightsail `orivia` (Debian 13), accesible administrativamente mediante Tailscale.

## Responsables

- **Sebas:** Flask, Gunicorn, seguridad, tokens, pedidos, trazabilidad, blockchain e IA.
- **Kevin:** usuarios, PostgreSQL, modelos, migraciones, catálogo, contabilidad, reportes e integraciones.
- **Ángel y Daniel:** UX, diseño y frontend; trabajan en `../hackathon_usco/design/`, `../hackathon_usco/components/`, `../hackathon_usco/styles/` y `../hackathon_usco/docs/ux/`.

## Alcance de esta primera versión

- Aplicación Flask con factory pattern.
- Endpoints de salud `/health` y `/ready`.
- Base de autenticación JWT.
- Middleware para proteger rutas con `Authorization: Bearer <token>`.
- Configuración por variables de entorno.
- CORS explícito para el frontend, sin reflejar orígenes no autorizados.
- Protección contra intentos repetidos de login y respuestas JSON consistentes.
- Ejecución local con Flask.
- Ejecución de producción con Gunicorn.
- Docker Compose con PostgreSQL para desarrollo.
- Directorio de actores, necesidades y conexiones del clúster con permisos
  explícitos y proyecciones pública, compartida y privada.
- Confianza `trust-v1` explicable, basada en señales verificables y no en una
  puntuación opaca.
- Estados de lote `PENDING`, `LIBERATED` y `BLOCKED`, con cadena hash,
  auditoría e incidencia de regresión para `CAC001`.
- Registro EVM real opcional mediante el contrato `OriviaTraceRegistry`: cada
  evento comprometido puede quedar anclado con transacción, bloque, red y
  dirección del contrato; el hash encadenado y los datos operativos siguen en
  PostgreSQL.

La ruta de pedidos usa memoria en desarrollo y PostgreSQL en producción mediante
el mismo contrato `OrderRepository`. En producción se conservan los pedidos,
eventos de trazabilidad, auditorías y anclajes después de reiniciar el proceso.
La selección se controla con `ORIVIA_ORDER_REPOSITORY=memory|postgres`.

La selección de blockchain se controla con `ORIVIA_BLOCKCHAIN_BACKEND`:
`memory` para pruebas unitarias, `postgres` para compatibilidad local y `evm`
para una red EVM real. En modo `evm` son obligatorios el RPC, una clave privada
dedicada, el `chain_id` y la dirección del contrato desplegado. La clave nunca
se versiona.

Los endpoints de IA funcionan sin servicios externos mediante un resumen local
determinista. En el staging `orivia` usan Ollama Cloud con
`OLLAMA_BASE_URL=https://ollama.com` y `OLLAMA_MODEL=gpt-oss:120b`; la
`OLLAMA_API_KEY` se mantiene solo en el `.env` privado del servidor y nunca se
devuelve al cliente. Si Ollama no responde, se conserva el fallback local de
solo lectura. La IA no modifica estados ni escribe directamente en blockchain.

El clúster usa el adaptador de memoria en desarrollo y el repositorio PostgreSQL
de Kevin cuando `ORIVIA_ORDER_REPOSITORY=postgres`; el contrato HTTP y los
serializadores son la frontera común. Los lotes siguen el mismo selector y su
migración `007_lot_traceability.sql` conserva lotes, eventos y auditorías en
PostgreSQL.

La API permite CORS únicamente para los orígenes definidos en
`ORIVIA_CORS_ORIGINS`, separados por coma. En desarrollo se habilitan por
defecto `http://localhost:3000` y `http://127.0.0.1:3000`; en producción no se
asume ningún origen. Nunca se debe configurar `*`.

El login tiene un limitador local por IP y por identificador: después de cinco
fallos dentro de diez minutos bloquea quince minutos y devuelve `429` con
`Retry-After`. Es una defensa sin servicio externo, adecuada para el staging y
la demo; una producción distribuida debe duplicarla en el proxy o en un store
compartido.

Kevin integrará el módulo de usuarios y las migraciones. Este backend no crea una segunda base de usuarios.

## Ejecutar localmente

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements-dev.txt
Copy-Item .env.example .env
flask --app wsgi:create_app run --debug
```

Comprobar:

```powershell
Invoke-RestMethod http://127.0.0.1:5000/health
Invoke-RestMethod http://127.0.0.1:5000/ready
```

## Ejecutar con Docker

```bash
docker compose up --build
```

La API queda en `http://localhost:8000` y PostgreSQL únicamente dentro de la red del compose.

## Despliegue objetivo

```bash
ssh admin@orivia
cd backend
docker compose up -d --build
curl http://127.0.0.1:8000/health
```

Los documentos generales del proyecto están en la raíz del repositorio: `PLAN_HACKATON_ORIVIA.md`, `ARQUITECTURA_ORIVIA_HACKATON.md`, `RUTA_BACKEND_ORIVIA.md` y `ESTRUCTURA_BACKEND_ORIVIA.md`.

El contrato operativo narrativo está en `API_CONTRACT_ORIVIA.md`; el catálogo
completo, pensado para frontend y pruebas manuales, está en
`docs/ORIVIA_API_ENDPOINTS.md`.

## Pruebas

Ejecuta los comandos desde `backend/`, no desde la raíz del repositorio, para
que Python resuelva el paquete `app` y no recoja copias de trabajo anidadas.

```powershell
pytest
```

La suite incluye la regresión de la hora 12:

```powershell
pytest tests/test_cluster.py tests/test_hour12_incident.py -q
```

## Datos, migraciones y respaldo

Los módulos de datos de Kevin se registran desde `app.database.registration`. Para aplicar migraciones con checksum:

```bash
export ORIVIA_DATABASE_URL=postgresql://orivia:replace-with-db-password@localhost:5432/orivia
python scripts/migrate.py
```

La migración `004_orders_traceability_persistence.sql` integra el contrato de
pedidos de Sebas con las tablas compartidas de Kevin. Para habilitar cuentas
demo sin subir contraseñas al repositorio:

```bash
export ORIVIA_DEMO_OPERATOR_PASSWORD='...'
export ORIVIA_DEMO_ADMIN_PASSWORD='...'
export ORIVIA_DEMO_BUYER_PASSWORD='...'
python scripts/provision_demo_users.py
```

Scripts disponibles:

- `scripts/bootstrap.sh`: crea el entorno virtual e instala dependencias.
- `scripts/migrate.py`: aplica `migrations/` en orden y detecta cambios de checksum.
- `scripts/verify_postgres_persistence.py`: prueba pedido, eventos, auditoría y anclaje después de recrear la app.
- `scripts/verify_auth_postgres.py`: prueba login, `/me`, rotación y revocación de refresh tokens.
- `scripts/provision_demo_users.py`: provisiona hashes bcrypt demo desde variables efímeras.
- `scripts/deploy_registry.py`: despliega `OriviaTraceRegistry` en la red EVM
  indicada por variables de entorno y devuelve contrato, transacción y bloque.
- `scripts/backup.sh`: genera un backup custom de PostgreSQL.
- `scripts/restore.sh`: restaura un backup previamente creado.

Los endpoints de Kevin incluyen usuarios, catálogo, proveedores, clientes, inventario, costos, márgenes, alertas, reportes e integraciones. Las credenciales y hashes de contraseña no se versionan.

## Integración completada

- Login real conectado al repositorio de usuarios de PostgreSQL.
- Hash y verificación de contraseñas con bcrypt.
- Access tokens JWT con roles y permisos derivados del usuario.
- Refresh tokens opacos persistidos, expirables, rotables y revocables.

## Estado de blockchain real

El contrato fuente está en `blockchain/OriviaTraceRegistry.sol` y su artefacto
verificado está incluido en `app/blockchain/contract_artifact.json`. El backend
ancla automáticamente los eventos de creación y cambio de pedidos, además de
los cambios de estado de lotes como `BLOCKED`. El endpoint manual de anclaje se
conserva como reintento idempotente.

En `orivia` ya está activado `ORIVIA_BLOCKCHAIN_BACKEND=evm` sobre Polygon Amoy
(`chain_id=80002`). El contrato desplegado es
`0xE38cB991af12f21EEb7de72B681c2a0CB9DdA85C` y la cuenta firmante dedicada es
`0x9021979d1a0992CDb0F17f2bdC34c928d2DfCDd2`. La cuenta y el contrato se usan
solo para staging/testnet; el RPC y la clave privada permanecen únicamente en
el `.env` privado del servidor y no se suben a GitHub.

La prueba remota creó un pedido sintético, produjo un anclaje EVM, repitió la
operación de forma idempotente y verificó `verified=true` contra el contrato.
La persistencia operativa sigue en PostgreSQL y el contrato solo registra el
hash/evidencia mínima de trazabilidad.

## Responsabilidades pendientes de integración

- Integrar el frontend con los endpoints persistentes y sus credenciales demo.
- Mantener pruebas de integración y restauración sobre el servidor oficial.
- Definir para producción la política de custodia, rotación y financiación de la
  cuenta blockchain; Polygon Amoy no debe tratarse como red productiva.
