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

Las respuestas de rutas inexistentes o métodos no permitidos son JSON con los
códigos `NOT_FOUND` (`404`) y `METHOD_NOT_ALLOWED` (`405`). Las rutas de
autenticación envían `Cache-Control: no-store`.

## CORS y límites de login

El preflight `OPTIONS` no requiere token. CORS solo responde con los encabezados
permitidos cuando el origen coincide exactamente con uno de los valores de
`ORIVIA_CORS_ORIGINS`; el backend nunca refleja `*` ni orígenes desconocidos.

Después de cinco fallos de login desde la misma IP o para el mismo identificador
en una ventana de diez minutos, el backend responde:

```json
{
  "error": "LOGIN_RATE_LIMITED",
  "retry_after_seconds": 900
}
```

El cliente debe respetar el encabezado `Retry-After`. El limitador es local al
proceso de Gunicorn; para múltiples réplicas se debe añadir una regla
equivalente en el proxy o un almacenamiento compartido antes de producción.

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
si Ollama falla, conserva ese fallback. Un proveedor Ollama remoto puede usar
`OLLAMA_API_KEY` en el entorno privado del servidor; nunca se envía esa clave al
frontend ni se registra en logs. Los eventos se anclan automáticamente
cuando se crea o cambia un pedido o un lote. Repetir el anclaje del último
evento devuelve `200` con `idempotent=true`.

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

El backend ofrece tres modos: `memory` para pruebas, `postgres` para
compatibilidad local y `evm` para una red blockchain real. En modo `evm`, la
respuesta incluye `network`, `transaction_id`, `block_number`, `chain_id` y
`contract_address`; `verified` consulta el contrato `OriviaTraceRegistry` y no
solo PostgreSQL. Los datos sensibles nunca se escriben en cadena: únicamente
se anclan hashes y referencias no sensibles.

## Clúster de actores y necesidades

El clúster permite descubrir actores del ecosistema cacaotero, publicar
necesidades y solicitar conexiones. En desarrollo usa datos sintéticos en
memoria; con `ORIVIA_ORDER_REPOSITORY=postgres` utiliza las tablas y repositorios
compartidos de Kevin. En ambos casos debe conservarse este contrato.

| Método | Ruta | Permiso | Uso |
| --- | --- | --- | --- |
| GET | `/api/v1/public/cluster/actors` | No | Directorio público de productores, asociaciones y compradores |
| GET | `/api/v1/public/cluster/actors/{id}` | No | Perfil público de un actor |
| GET | `/api/v1/public/cluster/needs` | No | Necesidades publicadas por el clúster |
| GET | `/api/v1/cluster/actors` | `cluster:read` | Directorio autenticado con contacto compartido |
| GET | `/api/v1/cluster/actors/{id}` | `cluster:read` | Detalle compartido; `private` solo aparece para `*` |
| GET | `/api/v1/cluster/actors/{id}/trust` | `trust:read` | Confianza explicable y sus señales |
| GET | `/api/v1/cluster/needs` | `cluster:read` | Necesidades con propietario y fecha |
| POST | `/api/v1/cluster/needs` | `needs:create` | Crea una necesidad usando el `sub` del token |
| POST | `/api/v1/cluster/connections` | `connections:create` | Solicita contacto con otro actor |

Crear una necesidad:

```json
{
  "title": "Transporte de cacao",
  "description": "Necesitamos transporte para el lote de la semana.",
  "category": "logistica",
  "quantity": 2,
  "unit": "viajes"
}
```

El backend ignora cualquier `actor_id` enviado por el cliente y usa el sujeto
del JWT. Una conexión recibe `target_actor_id`, un `need_id` opcional y un
`message`; no se permiten conexiones duplicadas pendientes.

### Confianza explicable

`GET /api/v1/cluster/actors/{id}/trust` devuelve `score` de 0 a 100,
`level` (`BAJA`, `MEDIA`, `ALTA`), la versión de fórmula, señales y una lista
de explicaciones. La fórmula `trust-v1` suma perfil (20), evidencias (20),
eventos verificados (20), consistencia (25) e incidencias resueltas (15), y
resta hasta 50 puntos por incidencias abiertas. Es una señal orientativa, no
una prueba legal, financiera ni de identidad.

## Lotes, trazabilidad y hora 12

| Método | Ruta | Permiso | Uso |
| --- | --- | --- | --- |
| GET | `/api/v1/public/lots/{lot_id}` | No | Estado público y disponibilidad del lote |
| GET | `/api/v1/lots/{lot_id}` | `lots:read` | Lote, cantidades, auditorías e integridad |
| GET | `/api/v1/lots/{lot_id}/timeline` | `lots:read` | Cadena de eventos y auditorías |
| PATCH | `/api/v1/lots/{lot_id}/status` | `lots:status` | Cambiar estado con razón obligatoria |

Estados permitidos: `PENDING`, `LIBERATED` y `BLOCKED`. La transición no borra
eventos; cada cambio agrega un `TraceEvent` con `payload_hash`,
`previous_event_hash` y `event_hash`, además de una `AuditRecord`. La respuesta
privada incluye `history_verified` y `affected_quantities`; la respuesta
pública no expone razón, auditorías ni actores internos.

Regresión de la incidencia anunciada para la hora 12:

```http
PATCH /api/v1/lots/CAC001/status
Authorization: Bearer <admin-access-token>
Content-Type: application/json

{"status":"BLOCKED","reason":"Incidencia informada durante la hora 12."}
```

El resultado esperado es `BLOCKED`, `available_kg: 0`, la cantidad afectada
igual a la disponibilidad anterior y `history_verified: true`. El lote sigue
consultable y la ruta pública informa `available_for_order: false`.
