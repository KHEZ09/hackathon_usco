# ORIVIA — Handoff de integración para frontend

Este documento es la frontera práctica entre el frontend y la API de ORIVIA.
La fuente de verdad de payloads completos sigue siendo
[`../../API_CONTRACT_ORIVIA.md`](../../API_CONTRACT_ORIVIA.md).

## Estado de la API

- Salud: `GET /health` y `GET /ready`.
- Desarrollo local: `http://127.0.0.1:8000`.
- Servidor `orivia`: la API escucha en `127.0.0.1:8000` detrás del servidor;
  todavía no debe asumirse una URL pública HTTPS hasta instalar y validar el
  proxy del dominio `oriviaurlapi.tobaru.xyz`.
- No usar PostgreSQL directamente desde el navegador.
- No enviar secretos de blockchain, Ollama, PostgreSQL o JWT al cliente.

## Flujo mínimo de sesión

1. `POST /api/v1/auth/login` con `email` y `password`.
2. Conservar el `access_token` únicamente para las solicitudes autenticadas.
3. Enviar `Authorization: Bearer <access_token>`.
4. Cuando expire, llamar `POST /api/v1/auth/refresh` con el refresh token.
5. Reemplazar el refresh token anterior; la API lo revoca al rotarlo.
6. Ante `401`, limpiar la sesión y volver a login. Ante `429`, respetar
   `Retry-After`.

Las credenciales demo se entregan por un canal privado. No deben quedar en el
repositorio, en capturas ni en código del frontend.

## Rutas para las pantallas

| Pantalla | Rutas principales | Resultado esperado |
| --- | --- | --- |
| Operador | `POST /api/v1/orders`, `PATCH /api/v1/orders/{id}/status`, `GET /api/v1/orders/{id}/timeline` | Crear pedido, avanzar estado y mostrar trazabilidad verificable. |
| Administrador | `GET /api/v1/audit/orders/{id}`, `GET /api/v1/audit/orders/{id}/verify`, `PATCH /api/v1/lots/{id}/status` | Mostrar auditoría, integridad y bloqueo/liberación con razón. |
| Ficha pública | `GET /api/v1/public/lots/{id}`, `GET /api/v1/public/cluster/actors/{id}` | Mostrar origen y proceso sin costos, notas privadas ni credenciales. |
| Clúster | `GET /api/v1/public/cluster/actors`, `GET /api/v1/cluster/needs`, `POST /api/v1/cluster/needs`, `POST /api/v1/cluster/connections` | Descubrir actores, publicar necesidades y solicitar conexiones. |
| Confianza | `GET /api/v1/cluster/actors/{id}/trust` | Mostrar score, nivel, señales y explicaciones de `trust-v1`; no presentarlo como verdad legal. |
| IA | `POST /api/v1/ai/orders/{id}/summary`, `/audit`, `/api/v1/ai/analytics` | Mostrar explicación de solo lectura y su campo `source`. |
| Blockchain | `GET /api/v1/blockchain/anchors/{event_hash}` | Mostrar estado, red, transacción y `verified` cuando exista anclaje. |

## Reglas de visibilidad

- La ficha pública nunca muestra costos, márgenes, notas internas, razones
  privadas ni datos de contacto no compartidos.
- El backend ignora `actor_id` recibido al crear una necesidad y usa el sujeto
  del JWT.
- `BLOCKED` implica `available_for_order: false` en la proyección pública.
- La IA explica datos autorizados; nunca cambia pedidos, lotes, contabilidad ni
  blockchain.
- Un anclaje `PENDING_ANCHOR` o `FAILED` se muestra como evidencia pendiente,
  nunca como verificación confirmada.

## Permisos de referencia

El frontend no debe fabricar permisos: vienen en el JWT y los decide el
servidor. Las rutas relevantes son:

| Acción | Permiso |
| --- | --- |
| Leer clúster | `cluster:read` |
| Crear necesidad | `needs:create` |
| Solicitar conexión | `connections:create` |
| Leer confianza | `trust:read` |
| Leer lotes | `lots:read` |
| Cambiar estado de lote | `lots:status` |
| Leer auditoría | `audit:read` |
| Leer blockchain | `blockchain:read` |

## Manejo de errores

El cliente debe leer siempre `error`, `message` y `request_id` cuando existan.
Casos importantes: `401` sesión inválida, `403` permiso insuficiente, `404`
recurso no visible o inexistente, `409` conflicto de transición/integridad,
`429` límite de login y `503` blockchain temporalmente no disponible.

## CORS y entrega

Ángel y Daniel deben comunicar el origen final del frontend para que se agregue
exactamente a `ORIVIA_CORS_ORIGINS` en el `.env` privado de `orivia`. Nunca se
debe usar `*`. La integración se prueba primero localmente y después contra el
servidor mediante HTTPS cuando el proxy quede habilitado.
