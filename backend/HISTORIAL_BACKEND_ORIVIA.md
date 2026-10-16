# ORIVIA — Historial del backend

Historial técnico y operativo del desarrollo del backend de ORIVIA dentro del repositorio `hackathon_usco`.

> Este documento registra cambios realizados en el repositorio, decisiones de arquitectura, validaciones, arreglos y responsabilidades del equipo. No contiene secretos, credenciales ni información ajena al proyecto.

## Metadatos del proyecto

- **Proyecto:** ORIVIA.
- **Repositorio:** `https://github.com/KHEZ09/hackathon_usco`.
- **Rama de trabajo:** `main`.
- **Ruta del backend:** `backend/`.
- **Modelo utilizado por Sebas y Kevin durante el acompañamiento técnico:** **GPT 5.6 Luna**.
- **Servidor de staging/pruebas:** instancia AWS Lightsail `orivia` con Debian 13.
- **Última verificación técnica registrada:** `4653273`.

## 1. Objetivo del backend

El backend de ORIVIA proporciona una API segura y auditable para registrar pedidos, controlar sus estados, conservar la trazabilidad de cada cambio, verificar integridad mediante una cadena hash y exponer auditoría, anclaje blockchain e insights de IA.

El objetivo técnico es que la aplicación pueda demostrar no solo que un pedido existe, sino también:

1. quién lo creó o modificó;
2. qué transición ocurrió y cuándo;
3. que la secuencia de eventos no fue alterada;
4. que el estado actual puede verificarse;
5. que los datos pueden resumirse y explicarse de forma comprensible;
6. que el servicio puede validarse primero en Docker y después ejecutarse en el servidor.

## 2. Responsabilidades durante el desarrollo

### Sebas — dirección del proyecto y núcleo de plataforma

Sebas definió el alcance de ORIVIA, el flujo de trabajo del equipo y la estrategia de infraestructura. Sus decisiones y responsabilidades fueron:

- establecer el nombre, objetivo y alcance del backend;
- decidir que el desarrollo y la validación se realizaran sobre el repositorio `hackathon_usco`;
- definir el flujo obligatorio `pull → trabajar → validar → commit/push`;
- decidir que cada cambio se probara primero en Docker y luego se desplegara en el servidor `orivia`;
- escoger AWS Lightsail, Debian 13, Docker Compose y acceso administrativo por SSH protegido con Tailscale/UFW;
- dirigir la implementación de autenticación por tokens, roles y permisos;
- dirigir el flujo de pedidos y sus transiciones válidas;
- implementar la trazabilidad, la cadena hash de eventos, auditoría y verificación de integridad;
- implementar el adaptador inicial de blockchain y sus rutas;
- implementar la frontera de IA, el análisis local determinista y la integración opcional con Ollama;
- revisar errores, ordenar las pruebas y validar el despliegue real;
- mantener la separación entre datos sintéticos de staging y cualquier entorno real.

### Kevin — datos, usuarios e integraciones empresariales

Kevin se encargó de la capa de datos y de los módulos empresariales generales, también con acompañamiento de **GPT 5.6 Luna**. Sus responsabilidades y aportes registrados en el repositorio fueron:

- usuarios y operaciones relacionadas con datos;
- conexión y configuración de PostgreSQL;
- repositorios, modelos, migraciones y semillas sintéticas;
- catálogo e inventario;
- contabilidad y reportes;
- integraciones empresariales;
- scripts de bootstrap, migración, backup y restore;
- pruebas y documentación de sus módulos en `backend/docs/kevin/`;
- registro de sus módulos dentro de la factoría Flask;
- incorporación de comprobación de PostgreSQL en `/ready`;
- documentación del despliegue y de los módulos de datos.

La integración de Kevin proporcionó las tablas y conexiones compartidas. Sobre ese contrato se incorporó el adaptador persistente de pedidos de Sebas sin reemplazar los módulos generales de Kevin.

### GPT 5.6 Luna — acompañamiento técnico compartido

El modelo utilizado por Sebas y Kevin fue **GPT 5.6 Luna**. Su papel fue el de asistente de desarrollo, operando según el alcance y las decisiones de cada integrante:

- revisar el estado del repositorio, la estructura y el historial Git;
- proponer y ejecutar cambios de backend y documentación;
- implementar o completar la base Flask/Gunicorn, seguridad, pedidos, auditoría, blockchain e IA;
- ejecutar pruebas Docker, revisar errores y corregir regresiones;
- revisar los cambios de Kevin para evitar sobrescribir el núcleo de Sebas;
- sincronizar el repositorio con `git pull --ff-only` antes de trabajar;
- crear commits y hacer push de los cambios terminados;
- preparar y validar el despliegue en el servidor `orivia`;
- comprobar salud, readiness, autenticación y aislamiento de PostgreSQL;
- dejar documentadas las limitaciones pendientes sin presentarlas como funcionalidades terminadas.

## 3. Arquitectura actual del backend

```text
Cliente web / consumidor de API
              |
              v
      Flask + Gunicorn
              |
   +----------+-----------+----------------+
   |                      |                |
   v                      v                v
Pedidos y estados   Auditoría/hash   Insights de IA
   |                      |                |
   v                      v                v
Repositorio de       Blockchain       Ollama opcional
pedidos              adapter           + fallback local
   |
   v
PostgreSQL 16 en red privada de Docker
```

### Capas principales

- `backend/app/`: aplicación Flask, configuración, factory, blueprints y servicios.
- `backend/app/core/`: seguridad, JWT, roles, permisos y manejo común de la API.
- `backend/app/orders/`: dominio de pedidos, transiciones, repositorio, eventos y timeline.
- `backend/app/audit/`: verificación de integridad y auditoría de pedidos.
- `backend/app/blockchain/`: contrato/adaptador inicial de anclaje y recibos.
- `backend/app/ai/`: análisis, resumen, analítica y proveedor local/fallback.
- `backend/app/data/` y módulos de Kevin: PostgreSQL, modelos, repositorios, catálogo, contabilidad e integraciones.
- `backend/tests/`: pruebas unitarias, de integración, de contrato y smoke tests.
- `backend/infra/orivia-server/`: Docker Compose, variables de entorno de ejemplo, scripts y documentación de operación.

### Rutas base implementadas

- `GET /health`: salud básica del proceso.
- `GET /ready`: readiness y comprobación de PostgreSQL.
- `POST /api/v1/auth/login`: login real con bcrypt contra usuarios de PostgreSQL.
- `GET /api/v1/auth/me`: identidad del usuario autenticado.
- `POST /api/v1/auth/refresh`: rota y revoca refresh tokens persistidos en PostgreSQL.
- `POST /api/v1/orders`: registrar pedido.
- `GET /api/v1/orders`: listar pedidos.
- `GET /api/v1/orders/<id>`: consultar pedido.
- `PATCH /api/v1/orders/<id>/status`: cambiar estado con transición validada.
- `GET /api/v1/orders/<id>/timeline`: consultar trazabilidad.
- `GET /api/v1/audit/orders/<id>` y `/verify`: auditar/verificar integridad.
- `POST /api/v1/blockchain/anchors`: crear o consultar anclaje idempotente.
- Rutas de IA para resumen, auditoría analítica e insights de solo lectura.

## 4. Infraestructura y operación

### Servidor de staging

- **Proveedor:** AWS Lightsail.
- **Instancia:** `orivia`.
- **Sistema operativo:** Debian 13.
- **Ejecución:** Docker Compose.
- **Acceso administrativo:** SSH mediante la red privada de Tailscale y el alias `ssh admin@orivia` cuando el cliente tiene DNS de Tailscale disponible.
- **Firewall del sistema:** UFW configurado para permitir administración por la interfaz de Tailscale; no se expone PostgreSQL públicamente.
- **Base de datos:** PostgreSQL 16 dentro de la red privada de Docker.
- **API:** escucha internamente en el contenedor y se publica localmente como `127.0.0.1:8000`.

### Contenedores y seguridad operativa

- API ejecutada con Gunicorn.
- PostgreSQL con healthcheck.
- Red privada de Docker entre API y base de datos.
- API con filesystem de solo lectura, `/tmp` en `tmpfs`, `no-new-privileges` y política `restart: unless-stopped`.
- Secretos ubicados en `infra/orivia-server/.env`; no deben subirse al repositorio.
- Datos de staging sintéticos; no se debe conectar este entorno a bases de datos reales.

### Flujo de despliegue

Desde el servidor `orivia`, el flujo documentado es:

```bash
git pull --ff-only origin main
bash infra/orivia-server/scripts/test.sh
bash infra/orivia-server/scripts/deploy.sh
bash infra/orivia-server/scripts/healthcheck.sh
bash infra/orivia-server/scripts/smoke_test.sh
```

La operación normal del equipo es:

1. hacer `pull` antes de comenzar;
2. revisar `status`, diff y archivos no rastreados;
3. trabajar solamente en el alcance asignado;
4. probar en Docker;
5. corregir y repetir las pruebas;
6. hacer commit con mensaje explícito;
7. hacer push a `main` cuando el cambio esté validado;
8. actualizar el servidor con fast-forward;
9. desplegar solo si las pruebas pasan;
10. comprobar health, readiness y smoke test.

## 5. Historial cronológico de cambios

| Commit | Responsable | Cambio registrado | Resultado |
|---|---|---|---|
| `85a3645` | Sebas / GPT 5.6 Luna | Añadidas las bases del dominio ORIVIA para seguridad, pedidos, auditoría, blockchain e IA local. | Se creó la primera base técnica del backend. |
| `416baf6` | Sebas / GPT 5.6 Luna | Endurecimiento de las fundaciones del dominio. | Se redujeron inconsistencias iniciales y se estabilizaron contratos internos. |
| `4104e99` | Sebas / GPT 5.6 Luna | Flujo protegido de pedidos en memoria. | Se añadieron bearer tokens, permisos, estados y transiciones válidas. |
| `478e306` | Sebas / GPT 5.6 Luna | Rutas de auditoría, verificación y blockchain. | Se expuso la comprobación de integridad y el anclaje inicial. |
| `a8a222c` | Sebas / GPT 5.6 Luna | Insights de IA de solo lectura. | Se añadió el proveedor local/fallback sin hacer dependiente el backend de un servicio externo. |
| `2b1380a` | Sebas / GPT 5.6 Luna | Correcciones de IA y trazabilidad. | Se corrigieron validaciones, tipos de análisis y controles de integridad. |
| `521daca` | Kevin / GPT 5.6 Luna | Primera integración de modificaciones de datos y backend. | Se inició la separación de responsabilidades entre dominio y datos. |
| `40093c2` | Equipo | Integración de rama. | Se sincronizaron los avances del equipo. |
| `fe4d416` | Kevin / GPT 5.6 Luna | Operaciones de datos y tooling del servidor. | Se ampliaron módulos empresariales, repositorios y herramientas de operación. |
| `e41baa5` | Kevin / GPT 5.6 Luna | Migraciones, backups y herramientas contables. | Se añadió soporte operativo para PostgreSQL y contabilidad. |
| `8179ff4` | Kevin / GPT 5.6 Luna | Formateo y limpieza de módulos de datos e integraciones. | Se mejoró consistencia y mantenibilidad. |
| `1462b88` | Kevin / GPT 5.6 Luna | Corrección de filtros nullable del catálogo. | Se evitó un error de tipado en filtros opcionales. |
| `fbc7219` | Kevin / GPT 5.6 Luna | Seed sintético de inventario. | Se habilitaron datos reproducibles para staging y pruebas. |
| `3381835` | Kevin / GPT 5.6 Luna | Scripts de despliegue ejecutables. | Se corrigieron permisos de ejecución en los scripts. |
| `1b4ef7b` | Kevin / GPT 5.6 Luna | Normalización de finales de línea en la imagen. | Se evitó incompatibilidad de scripts dentro del contenedor. |
| `090e575` | Kevin / GPT 5.6 Luna | Formateo de pruebas de backend. | Se dejó el conjunto de pruebas consistente. |
| `a59ee09` | Sebas / GPT 5.6 Luna | Verificación final del núcleo Sebas y smoke checks. | Se completaron pruebas, correcciones de Docker y validación del despliegue. |
| `bd1cceb` | Kevin / GPT 5.6 Luna | Documentación de módulos de datos y despliegue. | Se actualizó la referencia documental de la capa de Kevin. |
| `2b126c6` | Sebas / GPT 5.6 Luna | Login real, bcrypt, JWT con roles/permisos y refresh tokens rotables. | Se conectó la autenticación al repositorio de usuarios y a la tabla persistente de refresh tokens. |

## 6. Correcciones importantes realizadas

### Seguridad y API

- Se protegieron las rutas de pedidos con tokens Bearer.
- Se definieron roles y permisos para separar lectura, escritura, administración y auditoría.
- Se añadieron `X-Content-Type-Options`, `X-Frame-Options` y `Referrer-Policy`.
- Se limitó el tamaño de payload a 1 MB.
- Se añadió respuesta controlada para payload JSON demasiado grande (`413`).
- Se documentó el contrato de la API.
- Se mantuvo PostgreSQL sin exposición pública directa.

### Pedidos y trazabilidad

- Se validan explícitamente las transiciones permitidas.
- Cada evento de pedido conserva hash previo y hash actual.
- La timeline permite revisar la secuencia de cambios.
- La verificación detecta alteraciones en la cadena.
- El anclaje blockchain inicial es idempotente: repetir el mismo anclaje no crea una segunda evidencia incorrecta.

### IA

- Se mantuvo una ruta de análisis de solo lectura.
- Se incorporó fallback local determinista cuando Ollama no está disponible.
- La integración con Ollama quedó opcional y separada del flujo crítico de pedidos.
- Se corrigió el tipo de análisis usado por el proveedor Ollama.

### Docker y pruebas

- Se corrigió `backend/Dockerfile.test` para copiar también `migrations/` y `scripts/`.
- La corrección resolvió el fallo causado por la prueba de migraciones tras integrar los módulos de Kevin.
- El conjunto de referencia anterior alcanzó `35 passed`.
- La nueva autenticación añadió pruebas específicas de login, permisos y rotación de refresh tokens.

## 7. Validaciones realizadas

### Validación local/Docker

- Pruebas unitarias y de integración del backend.
- Validación de rutas protegidas.
- Prueba de transiciones inválidas.
- Prueba de hash-chain y detección de alteraciones.
- Prueba de anclaje idempotente.
- Prueba de fallback de IA y contrato Ollama.
- Prueba de migraciones y datos sintéticos.
- Validación local del núcleo: `45 passed` con PostgreSQL aislado por timeout.
- Ruff y compilación Python sin errores.
- Suite Docker oficial posterior a la integración del equipo: `55 passed`.

### Validación en `orivia`

- El contenedor de API quedó activo con Gunicorn.
- PostgreSQL quedó activo y saludable.
- `healthcheck.sh` respondió correctamente con estado `ok`.
- `smoke_test.sh` validó:
  - health `200`;
  - readiness `200` con PostgreSQL `ok`;
  - petición no autenticada a pedidos rechazada con `401`.
- El servidor quedó sincronizado con `4653273`; el stack oficial fue reconstruido y
  validado después de los cambios.

## 8. Estado actual

### Completado

- Base Flask/Gunicorn y factory de aplicación.
- JWT, roles, permisos y middleware de seguridad base.
- Login real con bcrypt y repositorio de usuarios de PostgreSQL.
- Refresh tokens opacos persistidos, expirables, rotables y revocables.
- Flujo de pedidos y transiciones persistido en PostgreSQL en producción.
- Trazabilidad con cadena hash persistida y verificable después de reiniciar la aplicación.
- Auditoría persistida en `audit_log` y verificación de integridad.
- Anclaje durable local en `blockchain_anchor`, idempotente y verificable.
- IA local/fallback y frontera opcional con Ollama.
- Docker Compose para API y PostgreSQL.
- Scripts de prueba, despliegue, healthcheck y smoke test.
- CORS explícito, errores JSON, no-cache de autenticación y limitador de login.
- Módulos empresariales iniciales de Kevin.
- Integración de readiness con PostgreSQL.
- Documentación de responsabilidades y operación.

### Pendiente

- Definir el esquema final compartido entre pedidos, usuarios, inventario y contabilidad.
- Elegir el proveedor blockchain público definitivo, si la evaluación lo exige; el anclaje local ya funciona como respaldo durable.
- Instalar/configurar el modelo Ollama real `gpt-oss:120b` solo si la capacidad del servidor y el costo lo permiten.
- Completar observabilidad de producción, rotación de secretos, backups probados y recuperación ante fallos antes de producción.

## 9. Límites actuales y decisiones de seguridad

- El entorno de desarrollo conserva el repositorio en memoria para pruebas rápidas; producción usa PostgreSQL.
- El blockchain actual es un anclaje durable local y no equivale todavía a una red blockchain externa.
- Ollama no debe bloquear el registro ni la consulta de pedidos.
- No se deben subir `.env`, llaves privadas, tokens, dumps reales ni credenciales.
- El servidor `orivia` es staging/prueba; no debe conectarse a datos reales sin una autorización y un diseño de migración explícitos.
- Los despliegues deben hacerse después de que las pruebas Docker pasen y siempre mediante fast-forward.

## 10. Próximo orden de trabajo

1. Coordinar con Kevin el destino del stack adicional `/home/admin/backend` sin borrar su volumen.
2. Integrar frontend con login, pedidos, timeline, auditoría, blockchain e IA.
3. Confirmar el proveedor blockchain público si el alcance final lo requiere.
4. Probar Ollama de forma aislada, con timeout y fallback.
5. Reforzar observabilidad, backups, restore y HTTPS antes de producción.

## 11. Verificación final del flujo persistente — 2026-10-16

Se aplicó y validó la migración `004_orders_traceability_persistence.sql`, que
agrega `sales_order.order_payload` y `order_event.event_hash` sin reemplazar
las tablas compartidas de Kevin.

El entorno de producción selecciona automáticamente PostgreSQL cuando
`ORIVIA_ENV=production`. El flujo validado fue:

1. Crear un pedido autenticado.
2. Cambiarlo de `CREATED` a `CONFIRMED`.
3. Leer dos eventos encadenados.
4. Verificar la integridad de la cadena.
5. Consultar la auditoría persistida.
6. Crear y consultar un anclaje durable en PostgreSQL.
7. Recrear la aplicación y comprobar que el pedido y el anclaje siguen disponibles.
8. Limpiar únicamente los datos sintéticos de la prueba.

Resultado anterior: `40 passed`, health correcto, readiness con PostgreSQL `ok`,
smoke test correcto y verificación de persistencia correcta.

También se provisionaron las tres cuentas sintéticas con bcrypt directamente
en el servidor. Las contraseñas no se guardaron en GitHub.

La prueba de autenticación real confirmó login, `/auth/me`, rotación del refresh
token y rechazo del refresh token anterior.

Después del endurecimiento autónomo, el servidor volvió a validarse con la
suite Docker completa (`55 passed`), despliegue sin migraciones pendientes,
health/readiness, smoke test, persistencia y autenticación real correctos.

## 12. Endurecimiento autónomo de Sebas — 2026-10-16

Después de validar el flujo persistente se revisó el trabajo que podía cerrarse
sin depender de Kevin, Ángel ni Daniel. Se incorporaron únicamente cambios en
la factoría Flask, configuración, autenticación, seguridad y pruebas propias:

- CORS exacto y configurable por `ORIVIA_CORS_ORIGINS`; no se admite `*`.
- Preflight `OPTIONS` sin autenticación, con métodos y encabezados explícitos.
- Respuestas JSON uniformes para `404` y `405`.
- `Cache-Control: no-store` en login y refresh.
- Logging operativo de método, ruta, estado y request ID sin tokens ni cuerpos.
- Limitador local por IP e identificador para fallos de login, con `429` y
  `Retry-After`.
- Pruebas específicas para CORS, orígenes no confiables, errores JSON,
  anti-abuso y no-cache de credenciales.

El limitador no requiere otro servicio y es suficiente para el staging de la
hackatón. Como límite documentado, es local a cada proceso Gunicorn; si ORIVIA
crece a múltiples réplicas, el mismo control debe trasladarse al proxy o a un
almacenamiento compartido.

## 13. Estado de cierre del alcance Sebas

El MVP de backend que pertenece a Sebas queda validado para integración:
autenticación, pedidos persistentes, trazabilidad, auditoría, anclaje durable
local, IA con fallback, Docker, CORS, errores, anti-abuso y pruebas de salud.
No se marca como producción definitiva lo que requiere una decisión externa:
dominio/HTTPS, proveedor blockchain público, despliegue real de Ollama 120B,
retención de backups, rotación operativa de secretos y reconciliación del stack
independiente `/home/admin/backend`.

## 14. Validación de integración y preparación externa — 2026-10-16

Se repitió el ciclo de validación después del último `pull`/`push`:

- `80 passed` desde `backend/`.
- Ruff y `compileall` sin errores.
- En `orivia`, Docker y PostgreSQL quedaron saludables.
- `/health`, `/ready`, la frontera `401`, smoke test y persistencia remota
  pasaron correctamente.
- Se confirmó que producción usa `ORIVIA_ORDER_REPOSITORY=postgres` y que el
  anclaje activo del servidor continúa en `ORIVIA_BLOCKCHAIN_BACKEND=postgres`.
- Se añadió soporte opcional para `OLLAMA_API_KEY` sin registrar ni devolver la
  credencial; el fallback local permanece operativo.
- Se entregó el contrato de integración para frontend en
  `backend/docs/FRONTEND_HANDOFF_ORIVIA.md`.

La activación de blockchain EVM público queda preparada en código, pero no se
ejecuta sin RPC, wallet dedicada financiada, contrato y `chain_id`. Ollama real
tampoco se instala en la instancia de 1.9 GiB RAM para `gpt-oss:120b`; requiere
un proveedor remoto o una máquina con capacidad suficiente.

La prueba EVM local posterior confirmó despliegue del contrato en el bloque 1,
anclaje de un evento en el bloque 2 y verificación `isAnchored=true`. Esta
prueba usa un nodo efímero y no se presenta como una transacción pública.

