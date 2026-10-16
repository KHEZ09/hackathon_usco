# Componentes de frontend — Ángel y Daniel

Esta carpeta contiene el sistema de componentes visuales de ORIVIA. Los componentes deben ser reutilizables, responsive, accesibles y consumir contratos de API documentados.

Las vistas ejecutables actuales son la landing, los paneles por rol y la ficha pública. No hay subcarpetas `orders/`, `tracking/` o `dashboard/` independientes todavía.

También existen:

- `brand/`: isotipo y logotipo ORIVIA en SVG.
- `landing/`: página de inicio ambientada en cacao, hero *scroll world* basado en Canvas/cuadros, proceso agroindustrial continuo en Canvas, carrusel con perspectiva CSS, ramas y libélula animadas.
- `panels/`: paneles del operador (`/operador`) y administrador (`/admin`), componentes compartidos y pestaña de red del clúster. Pedidos, usuarios, auditoría, lotes y analítica llaman a la API; el estado local solo permanece como respaldo visual de demo para módulos aún no expuestos por el contrato HTTP.
- `ficha/`: ficha pública del comprador (`/ficha/[lote]`) y QR; lee el lote, la cadena de hashes, la integridad y el certificado blockchain desde `/public/lots/{id}` y el estado operativo desde `/public/live`.
- `evidence/`: modal de verificación. Cuando la API entrega evidencia, muestra los hashes y el certificado persistidos; la alteración es únicamente una simulación visual para demostrar detección.
- `auth/`: formularios de inicio de sesión y registro conectados a la API en modo normal; consulta de roles permitidos, normalización de roles e interfaz de demostración separada. El login presenta `VIEWER` como comprador/consulta. La lista del formulario de registro no coincide actualmente con los perfiles de autoservicio de la API; ver `docs/backend-integration.md`.
- `ui/`: piezas compartidas como los avisos (toasts).
- `../lib/orivia-api.ts`: cliente HTTP tipado. La URL productiva se define en `NEXT_PUBLIC_ORIVIA_API_URL`; nunca se incluyen claves de Ollama, JWT ni variables privadas en el bundle.

## Build y despliegue

```powershell
npm ci
npm run type-check
npm test
npm run build
```

El build estático queda en `out/`. Se publica en el hosting web de Hostinger
asociado a `orivia.tobaru.xyz`; la API continúa en
`https://oriviaurlapi.tobaru.xyz/api/v1`. El navegador se comunica con la API
por HTTPS y CORS; no se expone la base de datos, el RPC ni las credenciales de
Ollama.
