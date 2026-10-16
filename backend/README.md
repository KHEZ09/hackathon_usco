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
- Ejecución local con Flask.
- Ejecución de producción con Gunicorn.
- Docker Compose con PostgreSQL para desarrollo.

La ruta de pedidos actualmente usa un repositorio en memoria para permitir el
trabajo independiente de Sebas y las pruebas del MVP. No es persistencia de
producción: Kevin lo reemplazará por PostgreSQL mediante el mismo contrato.
Los registros de auditoría y comprobantes blockchain de esta fase también son
temporales y se pierden al reiniciar el proceso.

Los endpoints de IA funcionan sin servicios externos mediante un resumen local
determinista. Ollama es opcional: al configurar `OLLAMA_BASE_URL`, se utiliza
el modelo indicado en `OLLAMA_MODEL` y, si no responde, se conserva el fallback
local de solo lectura.

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

## Pruebas

```powershell
pytest
```

## Responsabilidades pendientes de integración

- Conectar el repositorio de usuarios de PostgreSQL.
- Implementar `POST /api/v1/auth/login` usando ese repositorio.
- Implementar refresh token persistido y revocable.
- Añadir modelos y migraciones del módulo de usuarios.
- Conectar los fundamentos de pedidos, auditoría, blockchain e IA a rutas Flask y persistencia.
- Añadir pruebas integrales del flujo pedido → trazabilidad → verificación → resumen.
