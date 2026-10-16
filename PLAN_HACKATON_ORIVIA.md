# ORIVIA — Plan general de trabajo para la hackatón

## 1. Propósito

ORIVIA es una plataforma para registrar pedidos y operaciones agroindustriales, reconstruir su trazabilidad, verificar que los datos no hayan sido alterados y convertir la información técnica en explicaciones sencillas para los usuarios.

El objetivo de la hackatón es entregar un MVP demostrable, intuitivo y verificable. La experiencia visual y la innovación son prioritarias, pero deben apoyarse en un flujo funcional completo.

## 2. Flujo principal de la demo

```text
Iniciar sesión
    -> Registrar pedido u operación
    -> Asociar origen, producto y responsable
    -> Cambiar estado
    -> Registrar evento de trazabilidad
    -> Calcular alerta, costo o riesgo
    -> Verificar historial
    -> Consultar resumen generado por IA
    -> Mostrar evidencia blockchain
```

La aplicación debe mostrar la información de forma comprensible para tres perfiles:

- Operador: registra pedidos, eventos y cambios operativos.
- Administrador/contabilidad: revisa costos, estados, alertas y auditoría.
- Consulta/comprador: observa una ficha pública limitada y verificable.

## 3. Repositorio oficial

El trabajo de la hackatón se realiza en:

```text
C:\Users\sebas\Documents\GitHub\hackathon_usco\
```

Estructura principal:

```text
app/                    # Frontend Next.js existente
backend/                # API Flask de ORIVIA
ESTRUCTURA_BACKEND_ORIVIA.md
ARQUITECTURA_ORIVIA_HACKATON.md
RUTA_BACKEND_ORIVIA.md
PLAN_HACKATON_ORIVIA.md
```

No se debe desarrollar este backend dentro de `app/` ni mezclarlo con el repositorio de Tobaru.

## 3.1 Equipo y responsables

| Persona | Responsabilidad principal | Ubicación de trabajo |
|---|---|---|
| Sebas | Flask/Gunicorn, seguridad, JWT, pedidos, trazabilidad, blockchain e IA | `backend/app/security/`, `auth_tokens/`, `orders/`, `tracking/`, `audit/`, `blockchain/`, `ai/` |
| Kevin | Usuarios, PostgreSQL, modelos, migraciones, catálogo, contabilidad, reportes e integraciones externas | `backend/app/users/`, `database/`, `catalog/`, `accounting/`, `reports/`, `integrations/`, `backend/migrations/` |
| Ángel | UX, flujos, wireframes, arquitectura de información y pruebas de usabilidad | `hackathon_usco/design/`, `hackathon_usco/docs/ux/` |
| Daniel | Diseño visual, sistema de componentes, responsive, accesibilidad y frontend | `hackathon_usco/components/`, `hackathon_usco/app/`, `hackathon_usco/styles/` |

Ángel y Daniel coordinan juntos la experiencia y el diseño. No deben modificar la lógica crítica del backend sin acordarlo con Sebas y Kevin.

## 4. Infraestructura oficial del MVP

El backend se desarrollará, probará y preparará para desplegarse en la instancia recién creada:

```text
Nombre: orivia
Servicio: Amazon Lightsail
Región: us-east-1a
Sistema: Debian 13
Acceso administrativo: Tailscale
IP privada Tailscale: 100.104.169.58
Usuario: admin
SSH: ssh admin@orivia
```

Reglas operativas:

- SSH público `22/tcp`: cerrado.
- SSH administrativo: únicamente por Tailscale.
- PostgreSQL: privado, sin exposición pública.
- API/web: publicar solo mediante proxy HTTPS cuando el despliegue esté listo.
- Usar datos sintéticos durante la hackatón.
- No modificar producción de Tobaru.
- La EC2 anterior `tacao-staging` está terminada y no se usa.
- Configurar presupuesto y alertas AWS antes de añadir servicios facturables.

La Raspberry Pi 5 queda como nodo de resiliencia y operación local para una segunda fase o una demo offline. No debe bloquear el MVP en la nube.

## 5. División del trabajo

### Sebas: plataforma y seguridad

Trabajamos en `backend/app/` sobre:

```text
security/
auth_tokens/
orders/
tracking/
audit/
blockchain/
ai/
```

Responsabilidades:

- Base Flask y factory de aplicación.
- Gunicorn, Dockerfile y ejecución del servicio.
- JWT, refresh tokens, revocación y middleware.
- Roles y permisos aplicados a cada endpoint.
- Pedidos y transiciones de estado.
- Trazabilidad y auditoría.
- Hashes encadenados y evidencia blockchain.
- Ollama/IA para resumen, analítica y auditoría asistida.
- Pruebas de seguridad y acceso no autorizado.

### Kevin: usuarios, datos e integraciones

Trabaja en:

```text
backend/app/users/
backend/app/database/
backend/app/catalog/
backend/app/accounting/
backend/app/integrations/
backend/app/reports/
backend/migrations/
```

Responsabilidades:

- Usuarios, perfiles y estados de cuenta.
- PostgreSQL, modelos y migraciones.
- Clientes, proveedores, productos y catálogos.
- Contabilidad, costos y reportes generales.
- Datos sintéticos del reto.
- Repositorios de datos.
- Conectores con APIs externas.
- Reintentos, timeouts y normalización de respuestas externas.

## 6. Login y contrato de integración

El login es compartido:

1. Kevin administra la tabla y repositorio de usuarios.
2. Sebas implementa `POST /api/v1/auth/login`.
3. Sebas verifica la contraseña y emite JWT.
4. El middleware valida tokens, estado de cuenta, rol y permisos.
5. Los refresh tokens deben ser rotativos, revocables y almacenados como hash.

Ningún módulo crea una segunda tabla de usuarios ni genera tokens por fuera del módulo de seguridad.

## 7. Orden de implementación

### Fase 1 — Base técnica

- Flask, factory y configuración por ambiente.
- `/health` y `/ready`.
- Dockerfile y Docker Compose.
- PostgreSQL local.
- Contrato inicial de API.

### Fase 2 — Usuarios y seguridad

- Tablas de usuarios y roles.
- Login y JWT.
- Refresh, logout y revocación.
- Pruebas de permisos.

### Fase 3 — Pedidos y trazabilidad

- Crear y consultar pedidos.
- Estados válidos.
- Historial de eventos.
- Auditoría de actor, fecha y cambio.

### Fase 4 — Datos, contabilidad e integraciones

- Catálogos y entidades generales.
- Costos, margen y reportes.
- Conectores externos con mocks y reintentos.

### Fase 5 — Innovación demostrable

- Hash encadenado.
- Verificación de integridad.
- Anclaje blockchain pequeño y explicable.
- Resumen y auditoría con Ollama.

### Fase 6 — Demo y despliegue

- Datos sintéticos reproducibles.
- Pruebas integrales.
- Despliegue en `orivia`.
- Revisión de firewall y HTTPS.
- Ensayo completo del flujo principal.

## 8. Criterios de evaluación interna

- El flujo principal funciona con datos nuevos.
- El usuario entiende qué pasó sin conocer blockchain.
- Un operador no puede ejecutar acciones administrativas.
- El historial revela cambios y responsables.
- La evidencia puede verificarse.
- La IA explica, pero no modifica datos críticos.
- El sistema sobrevive a un reinicio.
- La interfaz es clara en computador y móvil.
- La demo tiene una historia corta, visual y convincente.

## 9. Estado y documentación

Cada cambio debe incluir:

- módulo y responsable;
- endpoint o tabla afectada;
- variables de entorno nuevas;
- pruebas ejecutadas;
- datos sintéticos necesarios;
- riesgos o pendientes.

### Nota sobre el asistente de desarrollo

Este plan fue preparado con apoyo de Codex. Perfil solicitado por el equipo: **GPT-5.6 Luna — razonamiento muy alto**. El nombre y nivel exactos del modelo activo deben verificarse en la configuración de la sesión; no se debe presentar una versión concreta no confirmada como hecho técnico del proyecto.
