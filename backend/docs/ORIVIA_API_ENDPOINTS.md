# ORIVIA — Catálogo completo de endpoints

Documento operativo para frontend, pruebas manuales y revisión del contrato entre
ORIVIA y sus clientes. La fuente de implementación son las rutas Flask de
backend/app/; si una ruta cambia, este catálogo debe actualizarse en el mismo
commit.

## Bases oficiales

| Entorno | URL |
| --- | --- |
| API pública | https://oriviaurlapi.tobaru.xyz/api/v1 |
| Desarrollo local | http://127.0.0.1:8000/api/v1 |
| Panel público | https://oriviahealth.tobaru.xyz |
| Frontend | https://orivia.tobaru.xyz |

La API pública está detrás de Caddy. PostgreSQL, el puerto interno 8000, las
claves EVM y OLLAMA_API_KEY no se exponen al navegador.

## Reglas comunes

### Headers

    Accept: application/json
    Content-Type: application/json
    Authorization: Bearer <access_token>
    X-Request-ID: <opcional>

Authorization solo se envía en rutas privadas. Todas las respuestas incluyen
X-Request-ID; el backend genera uno si el cliente no lo envía.

### Respuestas y errores

| Código | Significado |
| --- | --- |
| 200 | Consulta o transición completada |
| 201 | Recurso creado |
| 202 | Integración aceptada para sincronización |
| 204 | Preflight OPTIONS sin cuerpo |
| 400 | JSON o parámetros inválidos |
| 401 | Token ausente, inválido, expirado o refresh revocado |
| 403 | Usuario autenticado sin permiso |
| 404 | Recurso no encontrado o no visible |
| 409 | Transición, duplicado o integridad en conflicto |
| 413 | Payload superior a 1 MiB |
| 429 | Login limitado; respetar Retry-After |
| 503 | Dependencia temporal no disponible, como blockchain |

El cuerpo de error usa error, message y, cuando aplica, request_id. Nunca se
devuelven contraseñas, hashes de contraseña, tokens ni secretos.

## Salud y observabilidad pública

| Método | Ruta | Auth | Uso |
| --- | --- | --- | --- |
| GET | /health | Público | Liveness del proceso |
| GET | /api/v1/health | Público | Alias versionado de liveness |
| GET | /ready | Público | API y PostgreSQL disponibles |
| GET | /api/v1/ready | Público | Alias versionado de readiness |
| GET | /api/v1/public/live | Público | Health operativo y snapshot del tablero |

`/api/v1/public/live` siempre expone conteos, estados agregados, fechas de
revisión y eventos sin payload. En el modo de demo de la hackatón
(`ORIVIA_PUBLIC_LIVE_INCLUDE_DEMO_DATA=true`) también expone únicamente los
registros sintéticos necesarios para la demostración: usuarios demo, cadenas
de pedidos y certificados blockchain. Nunca expone contraseñas, hashes de
contraseña, tokens, llaves privadas, API keys, DSN, costos, contactos privados
ni payloads internos. En producción real se recomienda dejar esta variable en
`false` y conservar la vista agregada.

## Autenticación y sesión

| Método | Ruta | Auth | Uso |
| --- | --- | --- | --- |
| POST | /api/v1/auth/login | Público | Valida bcrypt y emite access/refresh |
| GET | /api/v1/auth/me | Bearer | Devuelve el principal de la sesión |
| POST | /api/v1/auth/refresh | Público + refresh | Rota el refresh y entrega access nuevo |

Login recibe un objeto con email o login y password. La respuesta contiene
access_token, refresh_token, token_type, expires_in y user.

El cliente debe reemplazar ambos tokens después de refresh. El refresh anterior
queda revocado. Las credenciales demo se entregan por canal privado y nunca se
suben al repositorio ni al frontend.

## Pedidos y trazabilidad

| Método | Ruta | Auth/permisos | Uso |
| --- | --- | --- | --- |
| POST | /api/v1/orders | orders:create | Crear pedido y primer evento |
| GET | /api/v1/orders | orders:read | Listar pedidos visibles |
| GET | /api/v1/orders/{order_id} | orders:read | Consultar pedido |
| PATCH | /api/v1/orders/{order_id}/status | orders:update | Avanzar estado |
| GET | /api/v1/orders/{order_id}/timeline | tracking:read | Consultar cadena de eventos |

Crear pedido acepta product, quantity, origin y destination. Cada creación o
transición conserva payload_hash, previous_event_hash y event_hash. El backend
verifica la cadena antes de anclarla.

## Auditoría, blockchain e IA

| Método | Ruta | Auth/permisos | Uso |
| --- | --- | --- | --- |
| GET | /api/v1/audit/orders/{order_id} | audit:read | Auditorías del pedido |
| GET | /api/v1/audit/orders/{order_id}/verify | audit:read | Verificar integridad |
| POST | /api/v1/blockchain/anchors | blockchain:anchor | Anclar último evento íntegro |
| GET | /api/v1/blockchain/anchors/{event_hash} | blockchain:read | Consultar y verificar anclaje |
| POST | /api/v1/ai/orders/{order_id}/summary | orders:read | Resumen explicable |
| POST | /api/v1/ai/orders/{order_id}/audit | audit:read | Auditoría asistida |
| POST | /api/v1/ai/analytics | orders:read | Analítica agregada |

Blockchain puede devolver network, transaction_id, block_number, chain_id,
contract_address y verified. Repetir un anclaje es idempotente. En IA, source
indica si respondió Ollama Cloud o el fallback local; la IA no modifica datos.

## Lotes y hora 12

| Método | Ruta | Auth/permisos | Uso |
| --- | --- | --- | --- |
| POST | /api/v1/lots | lots:create | RF01: registrar recepción de lote |
| POST | /api/v1/lots/{lot_id}/transformations | lots:transform | RF02/RF08: transformar, calcular merma y descontar inventario |
| GET | /api/v1/public/lots/{lot_id} | Público | Estado, cadena SHA y certificado blockchain público |
| GET | /api/v1/lots/{lot_id} | lots:read | Lote, auditoría e integridad |
| GET | /api/v1/lots/{lot_id}/timeline | lots:read | Eventos y auditorías |
| PATCH | /api/v1/lots/{lot_id}/status | lots:status | Cambiar estado |

Estados válidos: PENDING, LIBERATED y BLOCKED. El cambio exige reason y crea
evento, auditoría y anclaje. La incidencia de referencia es:

La recepción acepta `lot_id`, `product`, `producer`, `origin`, `received_kg` y
`received_at`; exige cantidad positiva y un identificador único. La respuesta
crea el evento `LOT_REGISTERED`, deja el lote en `PENDING`, registra auditoría
y ancla el hash. La transformación acepta `operation_code`, `stage`,
`responsible`, `input_kg`, `output_kg` e `incident`. Rechaza consumir más de lo
disponible, permite salida cero, calcula `merma_kg`/`merma_pct`, genera alerta
cuando la merma supera 15 %, actualiza inventario y ancla `LOT_TRANSFORMED`.
Repetir la misma `operation_code` devuelve el resultado sin duplicar consumo.

    POST /api/v1/lots
    Authorization: Bearer <operator-access-token>
    Content-Type: application/json

    {"lot_id":"CAC004","product":"Cacao seco","producer":"Finca Demo",
     "origin":"Rivera, Huila","received_kg":100,"received_at":"2026-10-16"}

    POST /api/v1/lots/CAC004/transformations
    Authorization: Bearer <operator-access-token>
    Content-Type: application/json

    {"operation_code":"OP-CAC004-001","stage":"Fermentación y secado",
     "responsible":"Operador de beneficio","input_kg":100,"output_kg":80,
     "incident":"Lluvias durante el secado."}

    PATCH /api/v1/lots/CAC001/status
    Authorization: Bearer <admin-access-token>
    Content-Type: application/json

    {"status":"BLOCKED","reason":"Incidencia informada durante la hora 12."}

El resultado esperado es `history_verified=true`, `available_for_order=false` y
una `timeline` sanitizada en la proyección pública. Cada evento puede incluir
`blockchain` con `network`, `chain_id`, `transaction_id`, `block_number`,
`contract_address`, `status` y `verified`; no se exponen actores, razones ni
payloads privados.

## Clúster cacaotero y confianza

| Método | Ruta | Auth/permisos | Uso |
| --- | --- | --- | --- |
| GET | /api/v1/public/cluster/actors | Público | Directorio público |
| GET | /api/v1/public/cluster/actors/{actor_id} | Público | Perfil público |
| GET | /api/v1/public/cluster/needs | Público | Necesidades publicadas |
| GET | /api/v1/cluster/actors | cluster:read | Directorio compartido |
| GET | /api/v1/cluster/actors/{actor_id} | cluster:read | Perfil compartido |
| GET | /api/v1/cluster/actors/{actor_id}/trust | trust:read | Score y señales |
| GET | /api/v1/cluster/needs | cluster:read | Necesidades autenticadas |
| POST | /api/v1/cluster/needs | needs:create | Crear necesidad |
| POST | /api/v1/cluster/connections | connections:create | Solicitar conexión |

Crear una necesidad acepta title, description, category, quantity y unit. El
servidor ignora actor_id enviado por el cliente y usa el sub del JWT. La
confianza trust-v1 es una señal orientativa, no una prueba legal, financiera ni
de identidad.

## Catálogo

| Método | Ruta | Auth/permisos | Uso |
| --- | --- | --- | --- |
| GET | /api/v1/catalog/products | Público | Productos; admite q |
| GET | /api/v1/catalog/traceability | Público | Trazabilidad; admite q y municipality |
| GET | /api/v1/suppliers | catalog:read | Proveedores |
| GET | /api/v1/customers | catalog:read | Clientes |

## Usuarios

| Método | Ruta | Auth/política | Uso |
| --- | --- | --- | --- |
| GET | /api/v1/users | ADMIN | Listar; filtro status opcional |
| GET | /api/v1/users/{user_id} | ADMIN o propio | Consultar perfil |
| POST | /api/v1/users | ADMIN | Crear usuario y roles |
| PATCH | /api/v1/users/{user_id} | ADMIN o propio | Actualizar perfil/estado |
| DELETE | /api/v1/users/{user_id} | ADMIN | Bloquear sin borrar historial |

Las respuestas de usuario nunca contienen password_hash.

## Contabilidad, reportes e integraciones

| Método | Ruta | Auth/permisos | Uso |
| --- | --- | --- | --- |
| GET | /api/v1/accounting/inventory | accounting:read | Existencias |
| GET | /api/v1/accounting/costs | accounting:read | Costos |
| GET | /api/v1/accounting/alerts | accounting:read | Alertas económicas |
| GET | /api/v1/accounting/margins | accounting:read | Márgenes |
| POST | /api/v1/accounting/lots/{lot_id}/cost | accounting:write | Registrar costo |
| GET | /api/v1/reports/overview | reports:read | Resumen operativo |
| POST | /api/v1/integrations/{provider}/sync | integrations:sync | Sincronizar proveedor |

## Permisos de referencia

El backend decide la autorización. El frontend solo debe ocultar acciones para
mejorar UX; nunca confiar en esa ocultación como seguridad.

| Rol | Capacidades principales |
| --- | --- |
| ADMIN | Todas (*) |
| OPERATOR | Pedidos, trazabilidad, clúster, necesidades, lotes y catálogo |
| ACCOUNTING | Contabilidad, reportes, auditoría, blockchain, catálogo e integraciones |
| BUYER | Lecturas, creación de pedidos, clúster, conexiones y lotes |
| VIEWER | Lecturas de pedidos, trazabilidad, blockchain, clúster y lotes |

## Checklist para Kevin/frontend

1. Configurar NEXT_PUBLIC_ORIVIA_API_URL con la Base URL oficial.
2. Enviar Authorization Bearer solo a rutas autenticadas.
3. Implementar login, refresh, logout local y manejo de 401, 403, 409, 429 y
   503.
4. Mostrar source en IA y verified/status en blockchain sin inventar
   confirmaciones.
5. Probar primero contra Docker y luego contra AWS por HTTPS.
6. No subir credenciales demo, API keys, JWT ni variables privadas.

## Archivos fuente y pruebas

- Contrato narrativo: backend/API_CONTRACT_ORIVIA.md.
- Handoff visual: backend/docs/FRONTEND_HANDOFF_ORIVIA.md.
- Prueba de humo: infra/orivia-server/scripts/smoke_test.sh.
- Pruebas de rutas: backend/tests/.

