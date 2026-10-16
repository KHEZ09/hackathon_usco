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
