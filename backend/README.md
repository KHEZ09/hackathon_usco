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

La ruta de pedidos usa memoria en desarrollo y PostgreSQL en producción mediante
el mismo contrato `OrderRepository`. En producción se conservan los pedidos,
eventos de trazabilidad, auditorías y anclajes después de reiniciar el proceso.
La selección se controla con `ORIVIA_ORDER_REPOSITORY=memory|postgres`.

Los endpoints de IA funcionan sin servicios externos mediante un resumen local
determinista. Ollama es opcional: al configurar `OLLAMA_BASE_URL`, se utiliza
el modelo indicado en `OLLAMA_MODEL` y, si no responde, se conserva el fallback
local de solo lectura.

El clúster usa el adaptador de memoria en desarrollo y el repositorio PostgreSQL
de Kevin cuando `ORIVIA_ORDER_REPOSITORY=postgres`; el contrato HTTP y los
serializadores son la frontera común. Los lotes usan por ahora un adaptador
determinista en memoria porque todavía no existe una migración de lotes.

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

El contrato operativo de nuestras rutas está en `API_CONTRACT_ORIVIA.md`.

## Pruebas

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
export ORIVIA_DATABASE_URL=postgresql://orivia:orivia_dev_password@localhost:5432/orivia
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
- `scripts/backup.sh`: genera un backup custom de PostgreSQL.
- `scripts/restore.sh`: restaura un backup previamente creado.

Los endpoints de Kevin incluyen usuarios, catálogo, proveedores, clientes, inventario, costos, márgenes, alertas, reportes e integraciones. Las credenciales y hashes de contraseña no se versionan.

## Integración completada

- Login real conectado al repositorio de usuarios de PostgreSQL.
- Hash y verificación de contraseñas con bcrypt.
- Access tokens JWT con roles y permisos derivados del usuario.
- Refresh tokens opacos persistidos, expirables, rotables y revocables.

## Responsabilidades pendientes de integración

- Completar la selección del proveedor blockchain público, si la hackatón lo exige.
- Integrar el frontend con los endpoints persistentes y sus credenciales demo.
- Mantener pruebas de integración y restauración sobre el servidor oficial.
