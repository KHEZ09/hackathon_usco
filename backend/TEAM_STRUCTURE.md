# ORIVIA — mapa físico del trabajo

Este archivo es la referencia rápida de carpetas. Las rutas son relativas a `backend/`.

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
