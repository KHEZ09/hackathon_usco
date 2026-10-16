# ORIVIA — Ruta de implementación del backend

## Ubicación obligatoria

Todo el backend Flask debe crearse en:

```text
C:\Users\sebas\Documents\GitHub\hackathon_usco\backend\
```

El frontend Next.js existente está en `app/`. No se deben mezclar los dos proyectos.

El destino de despliegue del backend es la instancia Lightsail recién creada:

```text
orivia — Debian 13 — Tailscale — ssh admin@orivia
```

## Estado inicial ya creado

La carpeta `backend/` ya contiene:

- factory de Flask;
- configuración por entorno;
- `/health` y `/ready`;
- servicio JWT;
- middleware `Bearer Token`;
- endpoint protegido `/api/v1/auth/me`;
- Dockerfile;
- Docker Compose con PostgreSQL;
- Gunicorn;
- pruebas iniciales.

## Fase 1 — Base de API

Sebas mantiene:

```text
backend/app/__init__.py
backend/app/config.py
backend/app/routes.py
backend/app/security/
backend/app/auth_tokens/
backend/Dockerfile
backend/docker-compose.yml
backend/wsgi.py
```

La API debe iniciar localmente antes de integrar usuarios.

## Fase 2 — Usuarios y login

Kevin crea:

```text
backend/app/users/
backend/app/database/
backend/migrations/
```

Sebas conecta:

```text
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
```

El repositorio de usuarios debe entregar un usuario activo, su hash de contraseña y sus roles. El módulo de seguridad verifica la contraseña y genera los tokens.

## Fase 3 — Pedidos

Sebas implementa:

```text
backend/app/orders/
backend/app/tracking/
backend/app/audit/
```

Endpoints iniciales:

```text
POST  /api/v1/orders
GET   /api/v1/orders
GET   /api/v1/orders/{order_id}
PATCH /api/v1/orders/{order_id}/status
GET   /api/v1/orders/{order_id}/timeline
```

Cada cambio de estado genera un evento inmutable con actor, fecha, estado anterior, estado nuevo y hash.

## Fase 4 — Blockchain

Crear:

```text
backend/app/blockchain/
```

Orden:

1. Guardar el evento en PostgreSQL.
2. Calcular su hash.
3. Crear una cola o estado `PENDING_ANCHOR`.
4. Publicar una raíz/hash de lote.
5. Verificar desde la API si coincide.

La indisponibilidad temporal de blockchain no debe impedir crear pedidos.

## Fase 5 — IA con Ollama

Crear:

```text
backend/app/ai/
```

Endpoints iniciales:

```text
POST /api/v1/ai/orders/{order_id}/summary
POST /api/v1/ai/orders/{order_id}/audit
POST /api/v1/ai/analytics
```

La IA recibe datos filtrados y no puede modificar directamente pedidos, inventario o contabilidad.

## Fase 6 — Integraciones externas

Kevin crea:

```text
backend/app/integrations/
```

Cada integración debe tener timeout, reintentos limitados, logs sin secretos, validación de respuesta y mocks para pruebas.

## Fase 7 — Despliegue en orivia

En la instancia:

```bash
ssh admin@orivia
git clone <repositorio>
cd backend
cp .env.example .env
docker compose up -d --build
curl http://127.0.0.1:8000/health
```

Antes de exponer la API:

- configurar secretos reales fuera del repositorio;
- aplicar migraciones;
- confirmar que PostgreSQL no sea público;
- configurar proxy HTTPS;
- revisar UFW y firewall de Lightsail;
- probar desde un dispositivo autorizado por Tailscale;
- usar datos sintéticos.

## Criterios de terminado

- Pruebas unitarias y de integración.
- Login con usuario activo.
- Token inválido rechazado.
- Permisos por rol comprobados.
- Pedido persistente después de reiniciar.
- Historial verificable.
- Blockchain tolerante a fallos.
- IA sin permisos de escritura crítica.
- Despliegue reproducible en `orivia`.
