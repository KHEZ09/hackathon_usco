# Integración frontend-backend ORIVIA

El frontend consume el contrato de `backend/API_CONTRACT_ORIVIA.md` mediante
`lib/orivia-api.ts`. La URL se configura con `NEXT_PUBLIC_ORIVIA_API_URL` y por
defecto apunta a `http://localhost:8000/api/v1`. Para producción debe apuntar a
`https://oriviaurlapi.tobaru.xyz/api/v1`.

El dominio de producción solo funciona después de que Caddy valide su
certificado HTTPS. No se debe usar el puerto `8000` desde el navegador ni
conectar el frontend directamente a PostgreSQL.

## Componentes conectados

- Inicio de sesión: `POST /auth/login`, con validación de rol contra la cuenta persistida.
- Renovación: ante `401`, el cliente intenta una sola rotación en `POST /auth/refresh`.
- Panel de administrador: `GET /reports/overview` y `GET /accounting/margins` muestran el inventario, alertas, pedidos y márgenes de PostgreSQL.
- Integraciones: el botón del panel ejecuta `POST /integrations/orivia-demo/sync`.
- Ficha pública: consulta `GET /catalog/traceability` sin token y muestra la coincidencia pública cuando existe.

## Manejo de credenciales

Las contraseñas nunca se guardan. El access token y el refresh token viven solo
en `sessionStorage` durante la pestaña actual, se eliminan al cerrar sesión y
no se imprimen en logs. La sesión visual de `localStorage` contiene únicamente
el resumen del usuario y no sustituye la autorización del backend.

## Ejecución local

1. Copia `.env.example` a `.env.local` y ajusta la URL del backend.
2. Arranca PostgreSQL y Flask según `backend/README.md`.
3. Ejecuta `npm run dev` dentro de `hackathon_usco`.
4. Usa una cuenta sintética provisionada por el backend (`operador@orivia.test`,
   `admin@orivia.test` o `comprador@orivia.test`) y la contraseña entregada por
   el entorno; no se incluyen contraseñas en el repositorio.

`NEXT_PUBLIC_ORIVIA_DEMO_MODE=true` queda como compatibilidad explícita para
maquetación sin backend. No debe usarse para validar seguridad, permisos ni
persistencia.
