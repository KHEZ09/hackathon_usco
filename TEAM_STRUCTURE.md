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

- `hackathon_usco/design/README.md` — UX, flujos, wireframes y tokens.
- `hackathon_usco/docs/ux/README.md` — accesibilidad, pruebas y criterios visuales.
- `PLAN_HACKATON_ORIVIA.md` — flujo de demo y perfiles de usuario.
- `ARQUITECTURA_ORIVIA_HACKATON.md` — límites de UX frente a seguridad, datos e IA.

### Daniel

Además de los documentos generales, trabaja bajo:

- `hackathon_usco/components/README.md` — sistema de componentes.
- `hackathon_usco/styles/README.md` — estilos, responsive y accesibilidad.
- `hackathon_usco/design/README.md` — tokens y referencias visuales.
- `PLAN_HACKATON_ORIVIA.md` — flujo de demo y criterios de experiencia.

`ARQUITECTURA_DESARROLLO_APP_CACAO.md` es histórico: ninguna persona ni IA debe usarlo como plan vigente.

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

Su código vive en `../hackathon_usco/`:

```text
../hackathon_usco/app/                # páginas Next.js
../hackathon_usco/components/         # componentes compartidos
../hackathon_usco/components/orders/  # interfaz de pedidos
../hackathon_usco/components/tracking/# interfaz de trazabilidad
../hackathon_usco/components/dashboard/# paneles y analítica visual
../hackathon_usco/design/             # UX, flujos, wireframes y pantallas
../hackathon_usco/design/tokens/      # tokens visuales
../hackathon_usco/design/screens/     # referencias de pantallas
../hackathon_usco/styles/             # estilos y responsive
../hackathon_usco/docs/ux/            # accesibilidad y pruebas de usabilidad
```

## Reglas de coordinación

1. Sebas y Kevin acuerdan primero contratos de API, tablas, UUID, estados y errores.
2. Ángel y Daniel consumen contratos estables; no inventan respuestas distintas en el frontend.
3. Cada cambio se prueba en Docker sobre `orivia` antes del despliegue real.
4. Los secretos permanecen en `infra/orivia-server/.env` del servidor y nunca en Git.
