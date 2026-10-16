# ORIVIA — Arquitectura para la hackatón

## Responsables de la arquitectura

- **Sebas:** API Flask, seguridad, JWT, pedidos, trazabilidad, blockchain e IA.
- **Kevin:** PostgreSQL, usuarios, modelos, migraciones, contabilidad, reportes e integraciones.
- **Ángel y Daniel:** UX, diseño visual, componentes y frontend.

Los contratos de API y datos se acuerdan entre Sebas y Kevin antes de que Ángel y Daniel conecten nuevas pantallas.

## Arquitectura de alto nivel

```text
Frontend Next.js
        |
        | HTTPS + Bearer JWT
        v
API Flask + Gunicorn
        |
        +--> PostgreSQL privado
        +--> Auditoría y trazabilidad
        +--> Blockchain: hashes/evidencias
        +--> Ollama: explicación y analítica
        +--> APIs externas mediante conectores
```

## Red del clúster y necesidades

El dominio principal ya no es únicamente el pedido: es la relación verificable entre actores, necesidades, ofertas, operaciones y lotes.

```text
Actor / organización
    ├── perfil y capacidades
    ├── necesidades publicadas
    ├── ofertas y oportunidades
    ├── conexiones aceptadas
    └── operaciones y lotes verificables
            └── eventos + evidencias + confirmaciones
```

Entidades mínimas del clúster:

- `actors`: persona u organización, tipo de actor, estado y datos públicos.
- `needs`: necesidad publicada, categoría, volumen, ubicación aproximada, fecha límite y estado.
- `offers`: producto, servicio, capacidad, condiciones y disponibilidad.
- `connections`: solicitud, aceptación, rechazo y relación entre actores.
- `lots`: lote, origen, productor, responsable y estado público.
- `traceability_events`: evento operacional, actor, fecha, cantidad y evidencia.
- `evidence`: documento, fotografía o confirmación con hash y visibilidad.
- `trust_signals`: señales explicables de consistencia, confirmación e incidencias.

La red debe separar tres capas de información:

1. **Pública:** perfil básico, oferta general, origen, estado y ficha QR.
2. **Compartida:** necesidades, contactos y datos de una operación después de autorización.
3. **Privada:** costos internos, credenciales, datos personales sensibles y secretos.

El nivel de confianza no es una verdad absoluta ni una calificación social arbitraria. Es un resumen explicable de los datos y confirmaciones disponibles. Blockchain protege la integridad posterior del registro; la veracidad inicial requiere responsables, evidencias y validación entre actores.

## Frontera entre landing, paneles y API

La landing permite descubrir el valor de la red y consultar fichas públicas. Los paneles operativos ejecutan acciones según rol:

| Superficie | Función | Backend requerido |
|---|---|---|
| Landing pública | Presentar el clúster, explorar actores, necesidades y métricas sintéticas. | Consultas públicas filtradas y sin datos sensibles. |
| Ficha pública / QR | Mostrar historia de un lote y verificar evidencias. | Endpoint público de lectura y endpoint de verificación. |
| Panel operador | Recepción, transformación, inventario, incidencias y sincronización. | Escrituras autenticadas, idempotencia y permisos operativos. |
| Panel administrador | Red, actores, alertas, costos, auditoría y estados. | Consultas agregadas, acciones críticas auditadas y reportes. |
| Panel comprador | Buscar oferta, revisar confianza y solicitar conexión o pedido. | Búsqueda autorizada, solicitudes y visibilidad por consentimiento. |

Los contratos de estas superficies deben definir nombres de campos, estados, errores, paginación y visibilidad antes de conectar datos reales al frontend.

## Despliegue del MVP

```text
Amazon Lightsail: orivia (Debian 13)
├── Reverse proxy HTTPS
├── Backend Flask ejecutado con Gunicorn
├── PostgreSQL privado para staging
├── Worker de auditoría/blockchain
└── Worker de IA e integraciones
```

La instancia `orivia` es el servidor oficial de desarrollo y staging del backend. Se accede administrativamente mediante Tailscale con el usuario `admin`; el SSH público permanece cerrado.

## Base de datos

PostgreSQL guarda la información operacional completa:

- usuarios y roles;
- pedidos y productos;
- estados y eventos;
- inventario;
- costos y movimientos contables;
- auditoría;
- estado de sincronización.

Blockchain no reemplaza a PostgreSQL. Si blockchain está fuera de servicio, el pedido se registra y queda pendiente de anclaje.

## Trazabilidad verificable

```text
Evento operacional
    -> normalización
    -> hash del payload
    -> hash del evento anterior
    -> registro en PostgreSQL
    -> anclaje de raíz/hash en blockchain
    -> endpoint de verificación
```

No se guardan contraseñas, tokens, datos privados ni pedidos completos en una red pública.

## Inteligencia artificial

Ollama consume únicamente datos autorizados y estructurados. Sus funciones iniciales son:

- resumir un pedido o una trazabilidad;
- explicar alertas y costos;
- detectar inconsistencias;
- generar analítica para el administrador;
- producir una auditoría asistida.

La IA no puede cambiar estados, liberar productos, modificar contabilidad ni aprobar operaciones sin una acción explícita y autorizada del usuario.

## Resiliencia con Raspberry Pi 5

La Raspberry Pi 5 será una extensión offline-first posterior o complementaria:

```text
Frontend local
    -> Edge API
    -> SQLite en SSD con WAL
    -> Outbox de eventos
    -> Sincronización hacia orivia
```

El MVP cloud no debe depender de la Raspberry para demostrar el flujo principal. La Pi agrega resiliencia cuando no hay Internet.

## Seguridad

- JWT de corta duración.
- Refresh tokens rotativos y revocables.
- Contraseñas con Argon2id o bcrypt.
- Validación de roles y permisos en el backend.
- PostgreSQL sin puerto público.
- SSH solo por Tailscale.
- CORS restringido.
- Rate limiting para autenticación.
- Logs sin secretos.
- `.env` fuera del repositorio.
- Backups y prueba de restauración.

## Variables y secretos

Los secretos se configuran en el entorno del servidor o mediante un gestor de secretos. El repositorio solo contiene `.env.example`.

Variables esperadas:

```text
ORIVIA_ENV
ORIVIA_DATABASE_URL
ORIVIA_JWT_SECRET_KEY
ORIVIA_JWT_ISSUER
ORIVIA_ACCESS_TOKEN_TTL_SECONDS
ORIVIA_REFRESH_TOKEN_TTL_SECONDS
OLLAMA_BASE_URL
OLLAMA_MODEL
BLOCKCHAIN_RPC_URL
BLOCKCHAIN_PRIVATE_KEY
```

Las dos últimas no deben almacenarse en el código ni en el frontend.
