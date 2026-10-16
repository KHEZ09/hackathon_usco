# Integración frontend-backend ORIVIA

El frontend consume el contrato de `backend/API_CONTRACT_ORIVIA.md` mediante
`lib/orivia-api.ts`. `NEXT_PUBLIC_ORIVIA_API_URL` permite configurar otra API.
En desarrollo, el valor predeterminado es `http://localhost:8000/api/v1`; en una
build de producción se usa `https://oriviaurlapi.tobaru.xyz/api/v1` cuando no se
define el override.

El dominio de producción solo funciona después de que Caddy valide su
certificado HTTPS. No se debe usar el puerto `8000` desde el navegador ni
conectar el frontend directamente a PostgreSQL.

## Componentes conectados

- **Inicio de sesión:** `POST /auth/login`. El cliente normaliza `ADMIN` y
  `ACCOUNTING` como administrador, `OPERATOR` como operador y los roles de
  lectura restantes como comprador.
- **Renovación:** ante `401`, intenta una única rotación con
  `POST /auth/refresh`; si falla, elimina los tokens y devuelve el error a la
  interfaz.
- **Registro:** `GET /auth/register/roles` consulta los roles permitidos y
  `POST /auth/register` crea la cuenta. El backend es la autoridad de permisos.
  De forma predeterminada, el `.env.example` permite `BUYER` y `VIEWER`; la
  variable `ORIVIA_SELF_REGISTRATION_ROLES` puede habilitar otros roles no
  privilegiados, y `ADMIN`/`ACCOUNTING` siempre se excluyen. El formulario actual
  presenta Operador, Administrador y Comprador, por lo que puede mostrar roles
  que la API no admite y omite `VIEWER`. En el inicio de sesión, `VIEWER` se
  presenta con la vista de comprador.
- **Panel de administrador:** `GET /reports/overview` y
  `GET /accounting/margins` muestran el resumen de inventario, alertas, pedidos y
  márgenes persistidos. `OperationalAuditCard` consulta usuarios y pedidos,
  verifica la cadena de eventos y muestra los certificados de anclaje cuando
  están disponibles.
- **Pedidos del operador:** la creación de pedidos, sus cambios de estado y su
  línea de tiempo usan la API. Los eventos pueden verificarse desde el panel de
  administración.
- **Integraciones:** el botón del panel ejecuta
  `POST /integrations/orivia-demo/sync`.
- **Ficha pública:** consulta `GET /catalog/traceability` sin token y muestra los
  campos públicos permitidos. La vista también conserva datos locales de
  demostración y la respuesta remota no reemplaza toda su línea de tiempo.

## Funciones disponibles y límites

`lib/orivia-api.ts` ofrece funciones para pedidos, lotes, línea de tiempo,
clúster, analítica/IA, anclajes blockchain, registro y catálogo. La existencia
de una función cliente no significa que toda la interfaz use ese endpoint.
Recepción, transformación, estado de lotes y parte de la auditoría operativa
siguen gestionándose en el store local (`localStorage`); no deben presentarse
como escritura persistida en PostgreSQL.

El cliente expone `getCurrentUser()` para `/auth/me`, pero la interfaz no lo usa
para reconstruir el perfil visual del servidor después de una recarga. El cierre
de sesión elimina los tokens del navegador, pero el flujo actual no solicita su
revocación al backend.

El registro normal usa la API. Si la solicitud falla por un error de red
(`status === 0`), el formulario muestra éxito y abre el inicio de sesión como si
la cuenta se hubiera creado, aunque no se haya guardado en el servidor ni en el
store local. El siguiente inicio de sesión sigue consultando la API salvo que se
active el modo de demostración; no usar esa ruta para validar el registro o la
persistencia.

## Manejo de credenciales

Las contraseñas nunca se guardan. El access token y el refresh token viven solo
en `sessionStorage` durante la pestaña actual, se eliminan al cerrar sesión y
no se imprimen en logs. La sesión visual de `localStorage` contiene únicamente
el resumen del usuario y no sustituye la autorización del backend.

## Ejecución local

1. Copia `.env.example` a `.env.local` y ajusta la URL del backend.
2. Arranca PostgreSQL y Flask según `backend/README.md`.
3. Ejecuta `npm run dev` dentro de `frontend/`.
4. Usa una cuenta sintética provisionada por el backend (`operador@orivia.test`,
   `admin@orivia.test` o `comprador@orivia.test`) y la contraseña entregada por
   el entorno; no se incluyen contraseñas en el repositorio.

`NEXT_PUBLIC_ORIVIA_DEMO_MODE=true` activa el modo de demostración local. No
debe usarse para validar autenticación, seguridad, permisos ni persistencia del
backend. Las cuentas de demostración y los perfiles de UI no otorgan permisos
reales.
