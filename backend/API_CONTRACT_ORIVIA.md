# ORIVIA — Contrato de API del MVP

Este documento describe el contrato que Sebas mantiene entre Flask, el frontend y
el adaptador de persistencia de Kevin. Los endpoints de negocio requieren un
`Authorization: Bearer <access-token>`.

## Salud y operación

| Método | Ruta | Uso | Auth |
| --- | --- | --- | --- |
| GET | `/health` | Liveness del proceso | No |
| GET | `/ready` | API y conexión PostgreSQL disponibles | No |

Todas las respuestas incluyen `X-Request-ID`. El cliente puede enviar ese valor
para correlacionar una operación; si no lo envía, la API lo genera.

## Autenticación

| Método | Ruta | Estado |
| --- | --- | --- |
| POST | `/api/v1/auth/login` | Pendiente de conectar el repositorio de usuarios |
| GET | `/api/v1/auth/me` | Disponible con access token |
| POST | `/api/v1/auth/refresh` | Pendiente de persistencia de refresh tokens |

El token debe contener `sub`, `role`, `permissions`, `iat`, `exp`, `iss`, `jti` y
`type=access`. La autorización se decide por los permisos del token.

## Pedidos y trazabilidad

```text
POST  /api/v1/orders
GET   /api/v1/orders
GET   /api/v1/orders/{order_id}
PATCH /api/v1/orders/{order_id}/status
GET   /api/v1/orders/{order_id}/timeline
```

Crear pedido:

```json
{
  "product": "Cacao",
  "quantity": 10,
  "origin": "Huila",
  "destination": "Bogotá"
}
```

Cada creación o transición produce un evento encadenado con `payload_hash`,
`previous_event_hash` y `event_hash`. El adaptador PostgreSQL debe conservar el
mismo contrato.

## Auditoría, blockchain e IA

```text
GET  /api/v1/audit/orders/{order_id}
GET  /api/v1/audit/orders/{order_id}/verify
POST /api/v1/blockchain/anchors
GET  /api/v1/blockchain/anchors/{event_hash}
POST /api/v1/ai/orders/{order_id}/summary
POST /api/v1/ai/orders/{order_id}/audit
POST /api/v1/ai/analytics
```

La IA solo recibe hechos filtrados y es de lectura. Sin Ollama usa reglas locales;
si Ollama falla, conserva ese fallback. El anclaje local es idempotente: repetir
el mismo pedido devuelve `200` con `idempotent=true`.

## Integración con PostgreSQL

El `OrderRepository` es el límite entre nuestras rutas y la persistencia. Kevin
puede reemplazar `InMemoryOrderRepository` sin cambiar las rutas, siempre que
conserve `create`, `list`, `get`, `transition`, `timeline`, `audits` y
`verify_timeline`.

La versión actual mantiene pedidos y anclajes en memoria para la demo. La
persistencia después de reiniciar requiere el adaptador PostgreSQL y sus
migraciones.
