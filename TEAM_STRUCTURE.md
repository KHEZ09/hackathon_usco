# ORIVIA — mapa físico del trabajo

Este archivo es la referencia rápida de carpetas. Las rutas son relativas a `backend/`.

## Documentos obligatorios por persona e IA

Todos deben leer primero:

1. `README.md` — mapa general del repositorio.
2. `PLAN_HACKATON_ORIVIA.md` — objetivo, flujo de demo, equipo y reglas.
3. `ARQUITECTURA_ORIVIA_HACKATON.md` — arquitectura, seguridad y decisiones técnicas.
4. `TEAM_STRUCTURE.md` — esta matriz de carpetas y responsables.

### Sebas

Además de los documentos generales, trabaja bajo:

- `RUTA_BACKEND_ORIVIA.md` — fases, endpoints y secuencia de implementación del backend.
- `ESTRUCTURA_BACKEND_ORIVIA.md` — contrato de módulos, responsabilidades y límites.
- `backend/README.md` — ejecución local, pruebas y alcance actual de Flask.
- `infra/orivia-server/README.md` — Docker, despliegue, healthcheck y operación de `orivia`.

### Kevin

Además de los documentos generales, trabaja bajo:

- `ESTRUCTURA_BACKEND_ORIVIA.md` — usuarios, PostgreSQL, migraciones e integraciones.
- `RUTA_BACKEND_ORIVIA.md` — fases del backend y puntos de integración.
- `backend/README.md` — requisitos de integración con la API Flask.
- `TEAM_STRUCTURE.md` — sus carpetas y reglas de coordinación.

### Ángel

Además de los documentos generales, trabaja bajo:

- `frontend/design/README.md` — UX, flujos, wireframes y tokens.
- `frontend/docs/ux/README.md` — accesibilidad, pruebas y criterios visuales.
- `PLAN_HACKATON_ORIVIA.md` — flujo de demo y perfiles de usuario.
- `ARQUITECTURA_ORIVIA_HACKATON.md` — límites de UX frente a seguridad, datos e IA.

### Daniel

Además de los documentos generales, trabaja bajo:

- `frontend/components/README.md` — sistema de componentes.
- `frontend/styles/README.md` — estilos, responsive y accesibilidad.
- `frontend/design/README.md` — tokens y referencias visuales.
- `PLAN_HACKATON_ORIVIA.md` — flujo de demo y criterios de experiencia.

## Flujo Git obligatorio del equipo

### Al comenzar el trabajo

Con el árbol de trabajo limpio, cada persona debe sincronizar `main`:

```bash
git pull --ff-only origin main
```

Después debe trabajar únicamente en sus carpetas asignadas y evitar `git add .` sin revisar qué archivos entran.

### Al terminar el trabajo

1. Ejecutar las pruebas correspondientes.
2. Revisar `git status` y `git diff`.
3. Crear un commit pequeño y descriptivo.
4. Volver a sincronizar antes de subir:

```bash
git pull --rebase origin main
git push origin main
```

Si aparece un conflicto, se detiene el push y se resuelve manualmente; no se usa `--force`, `reset --hard` ni se sobrescribe el trabajo de otra persona.

### Después del push

En `orivia`, el flujo de despliegue es ejecutar `git pull --ff-only origin main`, luego `bash infra/orivia-server/scripts/test.sh` y, si pasa, `bash infra/orivia-server/scripts/deploy.sh`.

Trabajar en carpetas distintas evita la mayoría de conflictos, pero no protege los archivos compartidos ni reemplaza la sincronización antes del push.

## Sebas — plataforma y seguridad

```text
app/security/       # autenticación, autorización, rate limiting y validaciones
app/auth_tokens/    # login, JWT, refresh, logout y revocación
app/orders/         # pedidos y transiciones de estado
app/tracking/       # eventos y línea de tiempo de trazabilidad
app/audit/          # auditoría, hashes y evidencia
app/blockchain/     # anclaje y verificación de hashes
app/ai/             # Ollama, resúmenes, analítica y auditoría asistida
tests/security/
tests/orders/
tests/tracking/
tests/blockchain/
tests/ai/
```

## Kevin — datos e integraciones

```text
app/users/          # usuarios, perfiles, roles y estado de cuenta
app/database/       # conexión, modelos, repositorios y transacciones
app/catalog/        # productos, clientes, proveedores y catálogos
app/accounting/     # costos, movimientos y datos contables
app/reports/        # consultas y reportes generales
app/integrations/   # clientes HTTP, mapeos, reintentos y timeouts
migrations/         # migraciones de PostgreSQL; único dueño: Kevin
tests/users/
tests/database/
tests/integrations/
```

## Ángel y Daniel — UX, diseño y frontend

Su código vive en `../frontend/`:

```text
../frontend/app/                # páginas Next.js
../frontend/components/         # componentes compartidos
../frontend/components/orders/  # interfaz de pedidos
../frontend/components/tracking/# interfaz de trazabilidad
../frontend/components/dashboard/# paneles y analítica visual
../frontend/design/             # UX, flujos, wireframes y pantallas
../frontend/design/tokens/      # tokens visuales
../frontend/design/screens/     # referencias de pantallas
../frontend/styles/             # estilos y responsive
../frontend/docs/ux/            # accesibilidad y pruebas de usabilidad
```

## Reglas de coordinación

1. Sebas y Kevin acuerdan primero contratos de API, tablas, UUID, estados y errores.
2. Ángel y Daniel consumen contratos estables; no inventan respuestas distintas en el frontend.
3. Cada cambio se prueba en Docker sobre `orivia` antes del despliegue real.
4. Los secretos permanecen en `infra/orivia-server/.env` del servidor y nunca en Git.
