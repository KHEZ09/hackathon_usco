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
| POST | `/api/v1/auth/login` | Disponible; valida bcrypt, emite access y refresh token |
| GET | `/api/v1/auth/me` | Disponible con access token |
| POST | `/api/v1/auth/refresh` | Disponible; rota y revoca el refresh token anterior |

Login recibe `email` (o `login`) y `password`:

```json
{
  "email": "operador@orivia.test",
  "password": "la-contraseña-del-usuario"
}
```

La respuesta contiene `access_token`, `refresh_token`, `token_type`, `expires_in`
y un resumen público del usuario. Las contraseñas se verifican contra hashes
bcrypt; nunca se devuelven al cliente.

El access token debe contener `sub`, `role`, `roles`, `permissions`, `iat`, `exp`,
`iss`, `jti` y `type=access`. La autorización se decide por los permisos del
token. El refresh token es opaco, se almacena únicamente como SHA-256 en
PostgreSQL, tiene expiración y se revoca al rotarlo.

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

El `OrderRepository` es el límite entre nuestras rutas y la persistencia. La
aplicación usa `InMemoryOrderRepository` en desarrollo y
`PostgresOrderRepository` cuando `ORIVIA_ORDER_REPOSITORY=postgres` (valor
predeterminado del entorno de producción). Ambos conservan `create`, `list`,
`get`, `transition`, `timeline`, `audits` y `verify_timeline`.

La migración `004_orders_traceability_persistence.sql` agrega el payload público
del pedido y el hash completo del evento sin reemplazar las tablas de Kevin.
Los pedidos, eventos, auditorías y anclajes sobreviven al reinicio del proceso
cuando se usa PostgreSQL.

El anclaje PostgreSQL se identifica como `postgres://orivia/blockchain_anchor/<id>`.
Es evidencia durable local para la hackatón; no se presenta como una transacción
de una red blockchain pública. La interfaz `BlockchainAnchor` permite conectar
posteriormente un proveedor real sin modificar las rutas del frontend.
