# Contrato de persistencia de la red del clúster

Este contrato prepara la base de datos para la nueva propuesta de ORIVIA: una
red digital cacaotera. No crea rutas ni decide permisos; esas capas quedan a
cargo de Sebas.

## Entidades

| Tabla | Propósito | Clave |
|---|---|---|
| `orivia.actors` | Personas u organizaciones del clúster. | `actor_id` UUID |
| `orivia.actor_needs` | Necesidades publicadas por un actor. | `need_id` UUID |
| `orivia.actor_offers` | Productos, servicios o capacidades ofrecidas. | `offer_id` UUID |
| `orivia.actor_connections` | Solicitudes y relaciones entre actores. | `connection_id` UUID |
| `orivia.trust_signals` | Evidencias explicables de consistencia o confirmación. | `trust_signal_id` UUID |

## Tipos y estados

- Actor: `PRODUCER`, `ASSOCIATION`, `TRANSFORMER`, `BUYER`,
  `AGROENTREPRENEUR`, `TRANSPORTER`, `SERVICE_PROVIDER`, `INSTITUTION`.
- Estado de actor: `ACTIVE`, `PENDING`, `SUSPENDED`, `BLOCKED`, `INACTIVE`.
- Visibilidad: `PUBLIC`, `SHARED`, `PRIVATE`.
- Necesidad: categorías `RAW_MATERIAL`, `INPUTS`,
  `TECHNICAL_ASSISTANCE`, `FINANCING`, `LOGISTICS`, `MARKET`,
  `PROCESSING_CAPACITY`, `OTHER`; estados `OPEN`, `MATCHED`, `PAUSED`,
  `CLOSED`, `CANCELLED`.
- Oferta: categorías `CACAO`, `TRANSFORMATION`, `INPUTS`, `LOGISTICS`,
  `TECHNICAL_ASSISTANCE`, `FINANCING`, `OTHER`; estados `DRAFT`, `PUBLISHED`,
  `PAUSED`, `CLOSED`.
- Conexión: tipos `NEED_MATCH`, `OFFER_MATCH`, `DIRECT`; estados `REQUESTED`,
  `ACCEPTED`, `REJECTED`, `BLOCKED`, `CANCELLED`.
- Señal de confianza: tipos `PROFILE_COMPLETENESS`, `LOT_TRACEABILITY`,
  `COUNTERPARTY_CONFIRMATION`, `QUANTITY_CONSISTENCY`, `INCIDENT_RESOLUTION`,
  `DOCUMENT_VERIFIED`; estados `PENDING`, `CONFIRMED`, `DISPUTED`, `EXPIRED`,
  `REVOKED`.

## Visibilidad

- `PUBLIC`: puede aparecer en exploración, landing o ficha QR después de los
  filtros públicos del backend.
- `SHARED`: solo se entrega a actores autorizados por la capa de permisos o por
  una conexión aceptada.
- `PRIVATE`: nunca se incluye en consultas públicas.

Los repositorios exponen consultas `list_public` que aplican explícitamente
visibilidad y estado activo. Sebas decidirá el acceso a las consultas privadas
y compartidas.

La consulta pública de señales limita la respuesta a señales `PUBLIC` y
`CONFIRMED`, asociadas a un actor `ACTIVE` y `PUBLIC`. Las señales pendientes,
disputadas, revocadas o de actores no públicos quedan fuera de esa consulta;
la consulta interna puede solicitarse con la opción privada del repositorio y
debe seguir protegida por los permisos de Sebas.

Los repositorios también rechazan antes de abrir una transacción los estados,
categorías, cantidades, puntajes y contextos de conexión evidentemente
inválidos. La base de datos conserva la validación definitiva mediante enums,
checks, claves foráneas e índices únicos.

## Errores de dominio acordados

Las rutas futuras deben conservar estos códigos:

| Código | Uso |
|---|---|
| `VALIDATION_ERROR` | Tipo, estado, visibilidad o cantidad inválida. |
| `NOT_FOUND` | UUID inexistente o registro no visible para el actor. |
| `CONFLICT` | Slug duplicado, conexión repetida o transición incompatible. |
| `FORBIDDEN` | Permiso o consentimiento insuficiente. |
| `STATE_TRANSITION_INVALID` | Cambio de estado no permitido. |

## Reglas de integridad

- Las cantidades son positivas y se almacenan en `numeric(14,3)`.
- Las fechas se almacenan como `timestamptz` en UTC.
- Un actor no puede conectarse consigo mismo.
- Las señales son append-only a nivel de dominio; revocar una señal conserva
  el registro para auditoría.
- Los hashes, auditoría, blockchain y explicaciones definitivas los agrega la
  capa de Sebas sin duplicar estas tablas.

## Semillas sintéticas

`006_seed_cluster_synthetic.sql` crea productor, asociación, transformador y
comprador de demostración, junto con necesidades, ofertas, una conexión y
señales de confianza. No contiene contraseñas ni datos reales.
