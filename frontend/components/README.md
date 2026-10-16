# Componentes de frontend — Ángel y Daniel

Esta carpeta contiene el sistema de componentes visuales de ORIVIA. Los componentes deben ser reutilizables, responsive, accesibles y consumir contratos de API documentados.

Las vistas ejecutables actuales son la landing, los paneles por rol y la ficha pública. No hay subcarpetas `orders/`, `tracking/` o `dashboard/` independientes todavía.

También existen:

- `brand/`: isotipo y logotipo ORIVIA en SVG.
- `landing/`: página de inicio ambientada en cacao, hero *scroll world* basado en Canvas/cuadros, proceso agroindustrial continuo en Canvas, carrusel con perspectiva CSS, ramas y libélula animadas.
- `panels/`: paneles del operador (`/operador`) y administrador (`/admin`), componentes compartidos y pestaña de red del clúster. Operaciones y clúster usan estado local de demostración; algunas consultas del panel de administración llaman a la API.
- `ficha/`: ficha pública del comprador (`/ficha/[lote]`) y QR; combina contenido de demo con una consulta complementaria de trazabilidad pública.
- `evidence/`: modal de verificación de la cadena SHA-256.
- `auth/`: formularios de inicio de sesión y registro conectados a la API en modo normal; consulta de roles permitidos, normalización de roles e interfaz de demostración separada. El login presenta `VIEWER` como comprador/consulta. La lista del formulario de registro no coincide actualmente con los perfiles de autoservicio de la API; ver `docs/backend-integration.md`.
- `ui/`: piezas compartidas como los avisos (toasts).
- `../lib/orivia-api.ts`: cliente HTTP tipado. No todas las funciones disponibles están conectadas a componentes; revisar `docs/backend-integration.md` antes de asumir integración.
