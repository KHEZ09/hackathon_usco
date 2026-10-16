# ORIVIA — Matriz de trabajo y auditoría del estado actual

**Fecha de corte:** 15 de octubre de 2026
**Repositorio:** `KHEZ09/hackathon_usco`
**Rama revisada:** `main`
**Commit revisado:** `e35f9f5` — `docs(orivia): record authentication deployment status`
**Modelo utilizado para la asistencia técnica:** GPT 5.6 Luna

## Propósito

Este documento consolida la revisión del repositorio y del servidor de ORIVIA. Su objetivo es que Sebas, Kevin, Ángel y Daniel trabajen sobre la misma referencia, sin duplicar tareas ni modificar accidentalmente el trabajo de otra persona.

La revisión compara:

- Las responsabilidades definidas para cada integrante.
- Lo que existe en GitHub.
- Lo que está desplegado en el servidor oficial.
- Los pendientes puramente backend.
- Los pendientes que requieren integración con frontend y UX.

## Regla operativa del equipo

El flujo de trabajo acordado es:

1. Hacer `git pull --ff-only origin main` antes de comenzar.
2. Trabajar únicamente en las carpetas asignadas.
3. Validar, probar, comprobar, rectificar, analizar errores, complementar y auditar.
4. Ejecutar nuevamente las pruebas después de cada corrección.
5. Hacer commit descriptivo.
6. Hacer `git pull --ff-only origin main` antes del push.
7. Hacer push a `main` únicamente cuando la validación local haya terminado.

## Estado de GitHub

El repositorio principal está en `main` y, durante esta auditoría, se encontraba sincronizado con `origin/main` en el commit `e35f9f5`.

Los archivos principales del proyecto están organizados en la raíz:

- `backend/`: aplicación Flask, pruebas y módulos de dominio.
- `infra/orivia-server/`: Docker Compose, despliegue, healthcheck y smoke tests.
- `ARQUITECTURA_ORIVIA_HACKATON.md`: arquitectura general.
- `ESTRUCTURA_BACKEND_ORIVIA.md`: estructura y responsabilidades del backend.
- `RUTA_BACKEND_ORIVIA.md`: ruta de implementación.
- `PLAN_HACKATON_ORIVIA.md`: plan general de la hackatón.
- `TEAM_STRUCTURE.md`: distribución del trabajo.

También existen archivos y una carpeta `hackathon_usco/` sin rastrear dentro del checkout. No forman parte de esta auditoría y no deben eliminarse ni incorporarse automáticamente sin revisar su origen.

## Estado del servidor oficial

El servidor oficial de ORIVIA utiliza:

```text
/opt/orivia/repo
```

El stack oficial identificado es:

| Servicio | Estado | Exposición |
|---|---|---|
| `orivia-server-api-1` | Activo | `127.0.0.1:8000 -> 8000/tcp` |
| `orivia-server-postgres-1` | Activo y saludable | Red privada del compose |

Las comprobaciones realizadas sobre el stack oficial fueron satisfactorias:

- Healthcheck de la API: correcto.
- Readiness de la base de datos: correcto.
- Smoke test de autenticación: correcto.
- Suite Docker: `38 passed`.
- Código del servidor alineado con `origin/main`.

## Stack adicional detectado

También se encontró este entorno independiente:

```text
/home/admin/backend
```

Características observadas:

| Elemento | Observación |
|---|---|
| Repositorio Git | No existe un `.git` comprobable |
| API | `backend-api-1` |
| Puerto | `0.0.0.0:8001 -> 8000/tcp` |
| PostgreSQL | `backend-postgres-1` |
| Datos | Volumen separado `backend_orivia_postgres_data` |
| Configuración | Compose propio y override de puertos |

Este stack **podría corresponder a un entorno de trabajo de Kevin o a una copia temporal**, pero no existe evidencia Git suficiente para atribuirlo directamente a él. Por seguridad, no se eliminó ni se detuvo durante esta auditoría.

La diferencia con el flujo acordado es que el entorno oficial debe operar desde `/opt/orivia/repo`, mientras que el stack adicional está fuera del repositorio, usa otra base de datos y publica el puerto `8001`.

### Corrección pendiente del stack adicional

Antes de borrar cualquier cosa se debe confirmar con Kevin si necesita conservar `/home/admin/backend` y su volumen. La acción segura propuesta es:

1. Confirmar propietario y propósito con Kevin.
2. Detener solamente el compose adicional si ya no se utiliza.
3. Verificar que `/opt/orivia/repo` continúe saludable.
4. Mantener el volumen adicional intacto inicialmente.
5. Eliminar archivos o volúmenes solo con autorización explícita y después de verificar que no contienen trabajo necesario.

## Responsabilidades acordadas

### Sebas

- Flask y Gunicorn.
- Seguridad de la API.
- JWT, roles, permisos y refresh tokens.
- Flujo y estados de pedidos.
- Trazabilidad y hash-chain.
- Auditoría.
- Adaptador y rutas blockchain.
- IA local, Ollama y analíticas.
- Docker, despliegue, validación y smoke tests.
- Coordinación técnica del backend.

### Kevin

- Usuarios y persistencia.
- PostgreSQL.
- Modelos, repositorios, migraciones y seeds.
- Catálogo.
- Contabilidad.
- Reportes.
- Integraciones externas.
- Backups, restore, bootstrap y migraciones operativas.
- Documentación de sus módulos de datos.

### Ángel y Daniel

- Frontend.
- UX.
- Diseño visual.
- Flujos de login, pedidos, trazabilidad, auditoría e IA.
- Integración visual con el contrato de la API.

## Matriz de trabajo actual

| Área | Responsable | Evidencia en GitHub | Evidencia en servidor | Estado | ¿Depende de frontend? |
|---|---|---|---|---|---|
| Arquitectura y documentación | Sebas | Documentos generales y de backend | Referencia usada para desplegar | Completo | No |
| Docker y despliegue | Sebas | Scripts en `infra/orivia-server` | Stack oficial activo | Completo | No |
| Flask/Gunicorn | Sebas | Aplicación y configuración | API oficial funcionando | Completo | No |
| SSH, Tailscale y firewall | Sebas | Documentación operativa | Servidor operativo, stack extra pendiente de reconciliar | Parcial | No |
| Login, JWT y refresh tokens | Sebas | `2b126c6` + verificador `433c0c0` | Login, `/me` y refresh rotation probados | Completo | Solo integración |
| Usuarios, roles y permisos | Kevin + Sebas | Repositorios y módulos de datos | PostgreSQL conectado | Parcial | Sí para pantallas |
| PostgreSQL y migraciones | Kevin | Migraciones, seeds y scripts | Base oficial saludable | Parcial | No |
| Catálogo y contabilidad | Kevin | Módulos y herramientas | Preparado para integración | Parcial | Sí para vistas |
| Pedidos | Sebas | Flujo protegido + `PostgresOrderRepository` | Persistencia validada después de recrear la app | Completo backend | Sí para formularios |
| Persistencia de pedidos | Sebas + Kevin | Migración `004` sobre tablas compartidas | Adaptador desplegado en producción | Completo backend | No |
| Eventos y trazabilidad | Sebas | Hash-chain y rutas | Eventos persistidos y verificados | Completo backend | Sí para timeline |
| Auditoría | Sebas + Kevin | Rutas y tablas | Registros persistidos en `audit_log` | Completo backend | Sí para consulta |
| Blockchain | Sebas | Adaptador local durable | Anclaje PostgreSQL idempotente y verificable | Completo MVP; proveedor público pendiente | Sí para evidencia |
| IA y Ollama | Sebas | Fallback local y rutas opcionales | Integración real opcional | MVP listo | Sí para mostrar resultados |
| Pruebas y smoke tests | Sebas + Kevin | Suites y verificadores | `55 passed`, persistencia y auth real correctas | Completo | No |
| CORS, errores y anti-abuso de login | Sebas | `backend/app/__init__.py`, `security/rate_limit.py` y pruebas | Activo en `4653273` | Completo backend | Solo configurar el origen real |
| Frontend y UX | Ángel + Daniel | Estructura y avances documentados | No aplica todavía | En curso | Sí |

## Trabajo realizado

### Backend de Sebas

- Base Flask/Gunicorn.
- Docker-first y despliegue controlado.
- Endpoints de salud y readiness.
- Autenticación con bcrypt.
- JWT con roles y permisos.
- Refresh tokens opacos, rotación y revocación.
- Flujo protegido de pedidos.
- Hash-chain para trazabilidad.
- Adaptador PostgreSQL para pedidos y transiciones.
- Migración incremental `004_orders_traceability_persistence.sql`.
- Persistencia de eventos, auditorías y anclajes.
- Rutas de auditoría.
- Anclaje PostgreSQL durable e idempotente.
- IA local con fallback y conexión opcional a Ollama.
- Pruebas unitarias, de integración y smoke tests.
- Verificación real de persistencia después de recrear la aplicación.
- Provisionamiento bcrypt de cuentas demo fuera de GitHub.
- Despliegue y validación en el servidor oficial.
- CORS explícito y preflight controlado.
- Respuestas JSON uniformes para `404` y `405`.
- `Cache-Control: no-store` en autenticación.
- Logging de método, ruta, estado y request ID sin datos sensibles.
- Limitador de intentos de login con `429` y `Retry-After`.

### Backend de Kevin

- PostgreSQL.
- Migraciones iniciales.
- Seeds sintéticos.
- Repositorios de usuarios y datos.
- Catálogo.
- Contabilidad.
- Reportes.
- Integraciones.
- Scripts de backup, restore, bootstrap y migración.
- Documentación de módulos de datos.

### Frontend y UX

- Estructura inicial de frontend.
- Documentación de UX.
- Base de landing y login.
- Preparación de los flujos que consumirán la API.

## Pendientes puramente backend

1. Confirmar con Kevin el propietario y propósito de `/home/admin/backend`.
2. Detener el stack adicional si Kevin confirma que ya no lo necesita, sin borrar inicialmente su volumen.
3. Definir el proveedor blockchain público definitivo si la evaluación lo exige.
4. Probar Ollama real si la capacidad y el tiempo lo permiten.
5. Verificar backups y restauración en un entorno aislado.
6. Configurar HTTPS mediante dominio/proxy aprobado y completar la observabilidad operativa.

## Pendientes que requieren frontend

1. Pantalla de login.
2. Almacenamiento seguro del token.
3. Renovación automática mediante refresh token.
4. Gestión visual de roles y permisos.
5. Creación y consulta de pedidos.
6. Visualización de estados y timeline de trazabilidad.
7. Consulta de auditorías.
8. Evidencia visual del anclaje blockchain.
9. Resúmenes, analíticas y explicaciones de IA.
10. Manejo de errores, expiración de sesión y permisos.

## Trabajo compartido que puede avanzar en paralelo

- Congelar el contrato de endpoints.
- Definir esquemas JSON de usuarios, pedidos, eventos y auditorías.
- Acordar códigos de error.
- Definir la URL base de la API.
- Crear credenciales sintéticas de demostración.
- Preparar datos de prueba para frontend.
- Probar CORS y autenticación desde el frontend.
- Documentar ejemplos de solicitudes y respuestas.

## Conclusión

El backend oficial de ORIVIA está saludable, alineado con GitHub y validado con
PostgreSQL real. La mayor inconsistencia restante es el stack adicional de
`/home/admin/backend`, que no está bajo Git, usa otra base y expone el puerto
`8001`. Puede ser de Kevin, pero no se debe afirmarlo sin confirmación ni
detenerlo unilateralmente.

La integración frontend ya puede comenzar sobre pedidos persistentes,
trazabilidad, auditoría, blockchain local, IA y autenticación real. El único
pendiente de coordinación del backend es decidir el destino seguro del stack
adicional y completar las mejoras de operación antes de producción.
