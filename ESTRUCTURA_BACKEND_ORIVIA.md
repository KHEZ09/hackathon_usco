# ORIVIA — Estructura y división del backend

## Propósito

Este documento define cómo se organizará el backend de ORIVIA y quién es responsable de cada parte. La separación busca que el trabajo avance en paralelo sin pisar archivos, tablas ni decisiones técnicas.

La regla principal es:

> Tu pana es responsable de usuarios, PostgreSQL e integraciones externas. Nosotros somos responsables de seguridad avanzada, tokens, trazabilidad blockchain e inteligencia artificial.

## Ubicación física del backend

El código se trabaja dentro del repositorio existente, en esta ruta:

```text
C:\Users\sebas\Documents\GitHub\hackathon_usco\backend\
```

La estructura relativa del backend se interpreta desde esa carpeta. Por ejemplo:

```text
C:\Users\sebas\Documents\GitHub\hackathon_usco\backend\app\users\
C:\Users\sebas\Documents\GitHub\hackathon_usco\backend\app\database\
C:\Users\sebas\Documents\GitHub\hackathon_usco\backend\app\integrations\
C:\Users\sebas\Documents\GitHub\hackathon_usco\backend\migrations\
```

### Carpetas que debe usar tu pana

```text
backend/app/users/
backend/app/database/
backend/app/catalog/
backend/app/accounting/
backend/app/integrations/
backend/app/reports/
backend/migrations/
```

### Carpetas que manejamos nosotros

```text
backend/app/security/
backend/app/auth_tokens/
backend/app/orders/
backend/app/tracking/
backend/app/audit/
backend/app/blockchain/
backend/app/ai/
```

No se debe crear el backend Flask dentro de la raíz del repositorio ni mezclarlo con el frontend Next.js de `app/`. ORIVIA permanece aislado dentro de `backend/`.

## Servidor de desarrollo y staging

El backend de ORIVIA se debe ejecutar y probar sobre la instancia recién creada:

```text
Nombre AWS: orivia
Servicio: Amazon Lightsail
Región: us-east-1a
Sistema operativo: Debian 13
Red administrativa: Tailscale
IP Tailscale: 100.104.169.58
Usuario SSH: admin
Acceso: ssh admin@orivia
```

El puerto público SSH `22/tcp` permanece cerrado. El acceso administrativo se realiza únicamente por Tailscale. El backend se publicará detrás de un proxy HTTPS cuando esté listo; PostgreSQL no debe exponerse públicamente.

La instancia EC2 `tacao-staging` fue terminada y no forma parte de la arquitectura de ORIVIA. La infraestructura de producción de Tobaru tampoco debe modificarse.

## Arquitectura base

```text
Cliente web / móvil
        |
        | HTTPS + Bearer Token
        v
API Flask de ORIVIA
        |
        +--> Autenticación y autorización JWT        [Nosotros]
        +--> Pedidos y trazabilidad                 [Nosotros]
        +--> Auditoría y blockchain                 [Nosotros]
        +--> IA con Ollama                          [Nosotros]
        +--> Usuarios y PostgreSQL                   [Pana]
        +--> Conectores a APIs externas              [Pana]
        +--> Contabilidad y datos generales          [Pana]
```

PostgreSQL será la fuente principal de datos. Blockchain no almacenará pedidos completos ni datos sensibles: únicamente hashes, identificadores de evento y comprobantes de integridad.

## División de responsabilidades

### Nosotros: seguridad, operación, blockchain e IA

Responsables de:

- Crear la base del proyecto Python con Flask.
- Configurar la factory de Flask, extensiones y registro de blueprints.
- Configurar Gunicorn como servidor WSGI para producción.
- Mantener `Dockerfile`, `requirements.txt`, configuración de ejecución y endpoints base.
- Tokens JWT, expiración, refresh tokens y revocación.
- Middleware de autenticación y autorización.
- Roles y permisos aplicados a las rutas.
- Pedidos y su ciclo de estados.
- Historial de trazabilidad.
- Registro de auditoría.
- Hashes de eventos y anclaje blockchain.
- Integración con Ollama para resúmenes, analítica y auditoría asistida.
- Validación de entradas relacionadas con seguridad.
- Pruebas de acceso no autorizado.
- Protección contra replay, duplicados y modificaciones de eventos.

Módulos bajo nuestra responsabilidad:

```text
app/security/
app/auth_tokens/
app/orders/
app/tracking/
app/audit/
app/blockchain/
app/ai/
```

### Base de ejecución de la API

La base técnica del backend queda bajo nuestra responsabilidad:

```text
Flask (desarrollo de la API)
        |
        +--> Blueprints y servicios de ORIVIA
        +--> PostgreSQL mediante repositorios del pana
        +--> Gunicorn (ejecución en producción)
        +--> Nginx o proxy HTTPS cuando se publique
```

En desarrollo se podrá ejecutar con Flask y en el servidor se ejecutará con Gunicorn. Tu pana conectará sobre esta base sus modelos, migraciones, repositorios e integraciones sin crear otra aplicación Flask paralela.

### Tu pana: usuarios, base de datos e integraciones

Responsable de:

- Modelos y migraciones de PostgreSQL.
- Usuarios, perfiles y datos generales.
- Clientes, proveedores, productos y catálogos.
- Contabilidad y reportes generales.
- Seeds y datos sintéticos.
- Índices, restricciones y relaciones de base de datos.
- Conexión con APIs externas.
- Adaptadores para servicios de terceros.
- Normalización de respuestas externas.
- Reintentos, timeouts y manejo de errores de integraciones.
- Respaldos y restauración de PostgreSQL.

Módulos bajo su responsabilidad:

```text
app/users/
app/database/
app/catalog/
app/accounting/
app/integrations/
app/reports/
migrations/
```

## Login: responsabilidad compartida

El login no pertenece completamente a una sola persona. Se divide en dos capas:

### Tu pana administra la identidad

- Tabla de usuarios.
- Email o nombre de usuario.
- Estado de la cuenta: activa, bloqueada o suspendida.
- Hash de contraseña almacenado en PostgreSQL.
- Datos del perfil y roles asignados.
- Repositorio para consultar un usuario por su identificador de acceso.

### Nosotros administramos la autenticación

- Endpoint `POST /api/v1/auth/login`.
- Validación de entrada.
- Verificación segura de la contraseña usando Argon2id o bcrypt.
- Límite de intentos y protección contra ataques de fuerza bruta.
- Emisión de access token JWT.
- Emisión, rotación y revocación de refresh tokens.
- Middleware para validar el token en cada ruta protegida.
- Aplicación de roles y permisos.
- Logout y bloqueo de sesiones comprometidas.

Flujo del login:

```text
Cliente
  -> POST /api/v1/auth/login
  -> Servicio de autenticación [nosotros]
  -> Repositorio de usuarios [pana]
  -> Verificación de contraseña [nosotros]
  -> JWT + refresh token [nosotros]
  -> Cliente
```

El módulo de usuarios no genera JWT directamente y el módulo de seguridad no crea una segunda tabla de usuarios.

## Estructura de carpetas

```text
backend/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── extensions.py
│   ├── routes.py
│   │
│   ├── security/                 # Nosotros
│   │   ├── middleware.py
│   │   ├── permissions.py
│   │   ├── rate_limit.py
│   │   └── validators.py
│   │
│   ├── auth_tokens/              # Nosotros
│   │   ├── routes.py
│   │   ├── service.py
│   │   ├── jwt_service.py
│   │   └── schemas.py
│   │
│   ├── orders/                   # Nosotros
│   │   ├── routes.py
│   │   ├── service.py
│   │   ├── schemas.py
│   │   └── states.py
│   │
│   ├── tracking/                 # Nosotros
│   │   ├── routes.py
│   │   ├── service.py
│   │   └── event_chain.py
│   │
│   ├── audit/                    # Nosotros
│   │   ├── routes.py
│   │   ├── service.py
│   │   └── hash_service.py
│   │
│   ├── blockchain/               # Nosotros
│   │   ├── adapter.py
│   │   ├── anchor_service.py
│   │   └── schemas.py
│   │
│   ├── ai/                       # Nosotros
│   │   ├── routes.py
│   │   ├── ollama_client.py
│   │   ├── prompts.py
│   │   └── service.py
│   │
│   ├── users/                    # Pana
│   │   ├── models.py
│   │   ├── routes.py
│   │   ├── service.py
│   │   └── schemas.py
│   │
│   ├── database/                 # Pana
│   │   ├── connection.py
│   │   ├── models.py
│   │   ├── repositories.py
│   │   └── unit_of_work.py
│   │
│   ├── catalog/                  # Pana
│   │   ├── models.py
│   │   ├── routes.py
│   │   └── service.py
│   │
│   ├── accounting/               # Pana
│   │   ├── models.py
│   │   ├── routes.py
│   │   └── service.py
│   │
│   ├── integrations/             # Pana
│   │   ├── base_client.py
│   │   ├── clients/
│   │   ├── mappers/
│   │   └── retry_policy.py
│   │
│   └── reports/                  # Pana
│       ├── routes.py
│       └── queries.py
│
├── migrations/                   # Pana; único dueño de migraciones
├── tests/
│   ├── unit/
│   ├── integration/
│   └── security/
├── docs/
│   ├── api-contract.yaml
│   ├── database-contract.md
│   └── integration-contract.md
├── scripts/
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
├── .env.example
└── README.md
```

## Contrato entre ambos módulos

### Usuario autenticado

El módulo de usuarios crea y administra los datos del usuario. El módulo de seguridad genera y valida tokens.

El token debe transportar únicamente identificadores y permisos necesarios:

```json
{
  "sub": "uuid-del-usuario",
  "role": "operador",
  "permissions": ["orders:read", "orders:create"],
  "iat": 1730000000,
  "exp": 1730003600,
  "jti": "uuid-del-token"
}
```

El módulo de usuarios no debe generar JWT directamente. Nosotros no debemos duplicar la tabla de usuarios ni crear otra fuente de verdad.

### Acceso a datos

Los módulos de negocio consumirán repositorios o servicios de base de datos, no conexiones directas dispersas por las rutas.

Reglas:

- PostgreSQL es la fuente de verdad.
- Todas las tablas nuevas requieren migración.
- Los nombres de tablas y columnas se documentan en `docs/database-contract.md`.
- Las operaciones críticas deben ejecutarse dentro de transacciones.
- Las claves primarias serán UUID.
- Los timestamps se guardarán en UTC.
- No se guardarán secretos, tokens completos ni claves privadas en PostgreSQL.

### Pedidos y eventos

Nosotros definimos el flujo del pedido y tu pana implementa las migraciones necesarias.

Estados iniciales:

```text
CREATED -> CONFIRMED -> IN_PREPARATION -> IN_TRANSIT -> DELIVERED
                                      \-> CANCELLED
```

Cada cambio de estado debe producir un evento inmutable con:

```json
{
  "order_id": "uuid",
  "event_type": "STATUS_CHANGED",
  "previous_status": "CREATED",
  "new_status": "CONFIRMED",
  "actor_id": "uuid",
  "occurred_at": "2026-10-15T20:00:00Z",
  "payload_hash": "sha256:..."
}
```

### Integraciones externas

Tu pana será dueño de los clientes HTTP y conectores externos. Nosotros consumiremos servicios internos estables, por ejemplo:

```text
IntegrationClient -> IntegrationService -> API externa
```

Todo conector debe tener:

- timeout;
- reintentos limitados;
- registro de errores sin secretos;
- validación de respuesta;
- idempotency key cuando el proveedor la soporte;
- pruebas con mocks;
- variables de entorno documentadas.

Nosotros no llamaremos directamente APIs externas desde las rutas de pedidos o blockchain.

## Endpoints iniciales

### Seguridad y tokens — nosotros

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
POST /api/v1/auth/revoke
GET  /api/v1/auth/me
```

### Usuarios — pana

```text
GET    /api/v1/users
GET    /api/v1/users/{id}
POST   /api/v1/users
PATCH  /api/v1/users/{id}
DELETE /api/v1/users/{id}
```

### Pedidos — nosotros

```text
POST  /api/v1/orders
GET   /api/v1/orders
GET   /api/v1/orders/{id}
PATCH /api/v1/orders/{id}/status
GET   /api/v1/orders/{id}/timeline
```

### Auditoría y blockchain — nosotros

```text
GET  /api/v1/audit/orders/{id}
GET  /api/v1/audit/orders/{id}/verify
POST /api/v1/blockchain/anchors
GET  /api/v1/blockchain/anchors/{id}
```

### IA — nosotros

```text
POST /api/v1/ai/orders/{id}/summary
POST /api/v1/ai/orders/{id}/audit
POST /api/v1/ai/analytics
```

### APIs externas y datos generales — pana

```text
GET  /api/v1/catalog/products
GET  /api/v1/customers
GET  /api/v1/suppliers
POST /api/v1/integrations/{provider}/sync
GET  /api/v1/reports/overview
```

## Seguridad mínima obligatoria

- HTTPS en producción.
- JWT de corta duración.
- Refresh tokens revocables y almacenados como hash.
- Contraseñas con Argon2id o bcrypt.
- No aceptar tokens en parámetros URL.
- Validar permisos en backend, no solo en Flutter/Web.
- Rate limiting en login y rutas sensibles.
- CORS restringido a los orígenes definidos.
- Logs sin contraseñas, tokens ni secretos.
- Variables sensibles solo mediante `.env` local o gestor de secretos.
- PostgreSQL sin exposición pública innecesaria.
- Validación de esquemas para cada request y response.

## Blockchain e IA

### Blockchain

Flujo:

```text
Pedido/evento
    -> normalización
    -> hash SHA-256
    -> registro en PostgreSQL
    -> anclaje blockchain
    -> comprobación de integridad
```

La aplicación debe poder funcionar si blockchain está temporalmente fuera de servicio. El evento queda en estado `PENDING_ANCHOR` y se reintenta posteriormente.

### Ollama

La IA será de solo lectura sobre datos autorizados. No podrá cambiar pedidos, contabilidad ni estados por sí sola.

Flujo:

```text
Usuario autorizado
    -> endpoint /ai
    -> consulta controlada
    -> sanitización de datos
    -> Ollama
    -> respuesta estructurada
    -> registro de auditoría
```

La API key o credencial del proveedor nunca debe llegar al frontend ni guardarse en el repositorio.

## Flujo Git de trabajo

Cada persona trabaja en ramas separadas:

```text
main
├── feat/security-tokens
├── feat/orders-tracking
├── feat/postgres-users
├── feat/accounting
└── feat/external-integrations
```

Antes de comenzar:

```bash
git pull --rebase origin main
git switch -c feat/nombre-del-modulo
```

Antes de abrir un Pull Request:

```bash
pytest
ruff check .
```

Cada Pull Request debe indicar:

- qué módulo modifica;
- qué endpoints agrega o cambia;
- si requiere migración;
- variables de entorno nuevas;
- pruebas ejecutadas;
- riesgos o pendientes.

## Orden de implementación

### Fase 1 — Base compartida

- Crear Flask y configuración por entorno.
- Crear Docker Compose con PostgreSQL.
- Crear `/health` y `/ready`.
- Definir `.env.example`.
- Publicar `api-contract.yaml`.
- Definir contrato inicial de base de datos.

### Fase 2 — Usuarios y seguridad

- El pana crea usuarios, roles y migraciones.
- Nosotros implementamos login, JWT, refresh y revocación.
- Probar acceso permitido y denegado.

### Fase 3 — Pedidos y trazabilidad

- Nosotros implementamos pedidos y transiciones.
- El pana crea las tablas y relaciones en PostgreSQL.
- Registrar todos los eventos de estado.

### Fase 4 — Integraciones

- El pana implementa clientes para APIs externas.
- Nosotros consumimos sus servicios internos.
- Agregar timeouts, reintentos y mocks.

### Fase 5 — Blockchain e IA

- Calcular hashes y verificar integridad.
- Implementar cola de anclaje blockchain.
- Conectar Ollama.
- Crear resúmenes y auditorías asistidas.

### Fase 6 — Preparación del piloto

- Pruebas integrales.
- Datos sintéticos.
- Logs y monitoreo.
- Backup y restauración.
- Despliegue en `orivia`.
- Revisión de costos y apagado posterior a la hackatón.

## Criterio de terminado

Un módulo se considera terminado cuando:

- tiene rutas documentadas;
- valida autenticación y permisos;
- tiene pruebas unitarias;
- tiene al menos una prueba de integración;
- maneja errores sin filtrar secretos;
- tiene migración si modifica la base de datos;
- funciona con datos sintéticos;
- puede ejecutarse mediante Docker Compose;
- fue probado desde el cliente web o una colección HTTP;
- tiene responsable y pendientes documentados.

## Primera división práctica

### Nosotros empezamos con

1. Contrato JWT y roles.
2. Middleware de autorización.
3. Estados y endpoints de pedidos.
4. Registro de eventos de trazabilidad.
5. Diseño del hash y auditoría.

### Tu pana empieza con

1. Docker Compose de PostgreSQL.
2. Modelos de usuarios y roles.
3. Migraciones iniciales.
4. Repositorios de acceso a datos.
5. Cliente base para APIs externas.

### Punto de integración

Antes de escribir funcionalidades grandes, ambos deben acordar:

- nombres de tablas;
- nombres de campos;
- formato de UUID;
- estados del pedido;
- códigos de error;
- formato de paginación;
- formato de respuesta de la API;
- variables de entorno.

Con este contrato, cada uno puede avanzar en su módulo sin bloquear al otro.
