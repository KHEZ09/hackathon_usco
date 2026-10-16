# Componentes de frontend — Ángel y Daniel

Esta carpeta contiene el sistema de componentes visuales de ORIVIA. Los componentes deben ser reutilizables, responsive, accesibles y consumir contratos de API documentados.

Subcarpetas previstas: `orders/`, `tracking/` y `dashboard/`.

También existen:

- `brand/`: isotipo y logotipo ORIVIA en SVG.
- `landing/`: página de inicio ambientada en cacao: hero *scroll world* (cuadros en `public/media/hero/`), mazorca que se abre con el scroll (`public/media/mazorca/`), carruseles 3D, ramas de cacao con viento y libélula que acompaña el scroll.
- `panels/`: paneles del operador (`/operador`) y del administrador (`/admin`) con su contenedor común y piezas de formulario.
- `ficha/`: ficha pública del comprador (`/ficha/[lote]`) y código QR.
- `evidence/`: modal de verificación de la cadena SHA-256.
- `auth/`: panel de inicio de sesión con los roles operador, administrador y comprador (modo demostración).
- `ui/`: piezas compartidas como los avisos (toasts).
