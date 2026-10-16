# ORIVIA — Registro de diseño y desarrollo del frontend

**Fecha de corte:** 15 de octubre de 2026  
**Alcance:** decisiones visuales, componentes, herramientas, aportes humanos y de IA, recursos gráficos y relación del frontend con el reto oficial.  
**Estado:** registro vivo; describe el código que se encontró en el repositorio y las decisiones confirmadas por el equipo en la conversación. No reemplaza los entregables oficiales E03, E06, E08 ni E10.

## 1. Resumen del producto visual

ORIVIA se presenta con la frase **«Del origen al mundo»** como una plataforma de trazabilidad agroindustrial para cacao del Huila. El frontend actual es una landing inmersiva y desplazable, con historias de origen, un recorrido de lotes, indicadores económicos, una explicación visual de IA y una demostración local de verificación de integridad.

La dirección visual combina fotografía de cultivos y montañas, tonos bosque y tierra, tipografía sans serif y caligráfica, elementos botánicos vectoriales y animación ligada al desplazamiento. La marca oficial del producto es **ORIVIA**.

El equipo había considerado una escena 3D con Spline. Se decidió no usarla por el requisito de pago asociado a esa herramienta. En el estado actual no hay Spline, `@splinetool/react-spline`, `@splinetool/runtime` ni otra librería 3D instalada. La experiencia se resuelve con CSS, SVG, Canvas, imágenes y Framer Motion.

## 2. Dirección y decisiones de diseño

- **Desarrollo code-first:** construir y ajustar la interfaz directamente en el código. No se registran entregables de Figma o Stitch para esta versión.
- **Marca:** ORIVIA, con el lema «Del origen al mundo». Referencias antiguas al nombre provisional «Cacao Passport» se sustituyeron por ORIVIA.
- **Idioma:** español (`lang="es"`).
- **Audiencias:** operador, administrador y comprador, según el caso oficial.
- **Identidad visual:** cacao y paisaje del Huila; bosque, crema, arena y tierra con acentos de ámbar y cereza.
- **Modo oscuro:** hay tokens y estilos que responden a la preferencia del sistema. La landing de marca declara `data-tema="claro"` y permanece en tema claro; no existe todavía un selector manual de tema.
- **Movimiento:** animación de entrada, desplazamiento, transiciones y elementos flotantes. El proyecto considera `prefers-reduced-motion` en CSS y `useReducedMotion` en componentes de movimiento.
- **Decisión 3D:** no se reemplazó Spline por otra tecnología 3D. El efecto principal del hero se implementa como secuencia de cuadros en Canvas y parallax.
- **Responsividad:** las secciones usan diseño adaptable y puntos de quiebre de Tailwind; navegación móvil y contenido que puede desplazarse horizontalmente están contemplados en la landing.

## 3. Stack y herramientas del frontend

Las versiones exactas son las resueltas en `package-lock.json` al momento de este registro.

| Herramienta | Versión registrada | Uso |
|---|---:|---|
| Next.js, App Router | 16.4.2 | Aplicación web, layout, metadatos y rutas. |
| React / React DOM | 19.3.0 | Componentes y estado de interfaz. |
| TypeScript | 5.9.3 | Tipado del frontend. |
| Tailwind CSS | 4.3.3 | Utilidades de estilo, responsive y temas. |
| `@tailwindcss/turbopack` | 4.3.3 | Integración de Tailwind con el desarrollo/build mediante Turbopack. |
| Framer Motion | 14.3.0 | Animaciones, transiciones, scroll y valores de movimiento. |
| Lucide React | 1.57.0 | Iconos de navegación, estados, pasos e indicadores. |
| `clsx` | 2.1.1 | Composición condicional de clases. |
| `tailwind-merge` | 3.7.0 | Resolución de clases Tailwind incompatibles o repetidas. |
| Montserrat, Allura y Geist Mono | `next/font/google` | Tipografía de marca, acento manuscrito y datos monoespaciados. |
| ESLint / `eslint-config-next` | 9.39.5 / 16.4.2 | Revisión estática del código. |

`hackathon_usco/lib/cn.ts` combina `clsx` con `tailwind-merge` en la función `cn()`. El proyecto no tiene instalada una biblioteca de componentes como shadcn/ui; las piezas visuales se implementan como componentes propios.

**Comandos del proyecto:** `npm run dev`, `npm run lint`, `npm run build` y `npm start`, ejecutados desde `hackathon_usco/`.

### Herramientas de colaboración y autoría

- **Claude Code:** el equipo informa que se utilizó para el desarrollo de la página. El repositorio no conserva un registro por prompt ni una atribución de archivos a sesiones concretas de Claude Code; por ello no se adjudican componentes específicos a esa herramienta.
- **Codex:** el plan general del proyecto indica que se preparó con apoyo de Codex. En esta colaboración se analizó el reto, se revisó el repositorio, se apoyaron decisiones de marca e idioma, se gestionó la instalación de `clsx` y `tailwind-merge`, y se procesaron por separado imágenes de logo solicitadas por el equipo.
- **Google Antigravity IDE:** fue mencionado inicialmente como entorno de desarrollo code-first. No hay evidencia en el repositorio que permita confirmar qué tareas se realizaron allí.
- **Git y GitHub:** repositorio y control de versiones del equipo, conforme a `TEAM_STRUCTURE.md`.
- **Plugins externos:** no se encontró ni se registró el uso de plugins de diseño, Figma, Spline u otros conectores. Las dependencias npm de la tabla son bibliotecas del proyecto, no plugins.

La documentación de equipo asigna UX, diseño visual y frontend a **Ángel y Daniel**. Esa asignación no permite deducir qué persona escribió cada archivo; la autoría de código debe confirmarse con el equipo o el historial de commits.

## 4. Componentes y composición implementados

La ruta principal `app/page.tsx` renderiza `components/landing/LandingPage.tsx`, que compone estas áreas:

1. **Navegación — `Navbar.tsx`:** logotipo ORIVIA, enlaces a secciones, menú para móvil y botón «Iniciar sesión» con menú de los tres roles y búsqueda de ficha por código de lote. Con sesión activa muestra el rol y el acceso «Mi panel».
2. **Hero — `HeroScrollWorld.tsx`:** portada de pantalla completa ambientada en un cacaotal, con una secuencia de 73 cuadros (20 fps) dibujada en Canvas: intro, vuelo suspendido de la libélula en reposo y control por scroll. El logotipo antiguo impreso en el video se difumina y se superpone el logotipo nuevo con aura. Incluye neblina, partículas, hojas y una mazorca de cacao en primer plano que se mecen con el viento del scroll.
3. **Acompañamiento de scroll — `ScrollCompanion.tsx`:** libélula que recorre los márgenes de las secciones, ramas de cacao laterales con viento y granos de cacao flotando en tres profundidades.
4. **Origen — `OriginSection.tsx`:** carrusel 3D tipo *coverflow* con arrastre, teclado y avance automático.
5. **Proceso — `PodSection.tsx` y `proceso/`:** recorrido *scroll-world* en cinco etapas, recreado a partir del video de referencia `gemini_generated_video_dc3571d6.mp4` sin incrustarlo:
   1. Cosecha: la mazorca en la rama se abre.
   2. Fermentación: los granos frescos caen al cajón con vapor.
   3. Secado: la cámara recorre la bandeja y un indicador muestra la humedad del 55% al 7%.
   4. Empaque: saco ORIVIA con SHA-256, granos cayendo, anillo orbital y destellos.
   5. QR verificable: tarjeta con sello «VERIFICADO», QR real hacia `/ficha/CAC001` y «Cada grano tiene una historia» escrito con el scroll.

   **Contenido editable:** textos, insignias, botones (`navigate`, `modal` o `scroll`), métricas y tramos de la secuencia de cada etapa están en `data/cacaoProcessData.ts` (`CACAO_STAGES`, `PROCESS_SEQUENCE`, interfaz `ProcessStage`). Los componentes de `components/landing/proceso/` solo los presentan:
   - `ProcessSequence.tsx`: el recorrido completo del video (mazorca → apertura → cajón → bandeja → saco) (mazorca → apertura → cajón → bandeja → saco → QR verificado) como una sola secuencia continua de 151 cuadros WebP en Canvas 2D; el video es solo el fondo y el stepper, textos, botones, métricas y barra de progreso se dibujan encima desde `data/cacaoProcessData.ts`. Cada etapa recorre su tramo (`sequenceRange`); el avance se suaviza con un resorte de Framer Motion y los cuadros se funden solo en el instante del cambio para evitar doble imagen. Carga por prioridad cerca del cuadro actual y se pausa fuera de pantalla.
   - `PodSection.tsx`: integra la secuencia con degradados y viñetas, partículas doradas, stepper, textos, métricas, flechas, progreso y la etapa final.
   - `AccionEtapa.tsx`: los modales «Registrar una etapa» y «Ver alertas» usan los datos reales del almacén local; «Verificar un producto» abre la verificación SHA-256 de CAC001.
   - `Caligrafia.tsx`: texto de la etapa del QR verificable. El QR y el sello «VERIFICADO» vienen del propio video, por eso ya no se superpone `EscenaQr.tsx` (queda sin uso).
6. **Trazabilidad — `TraceSection.tsx`:** selector de CAC001–CAC003, pasos de recepción, fermentación, secado y producto, cantidades, responsables, estados y alerta visual de merma.
7. **Analítica — `AnalyticsSection.tsx`:** gráficas de muestra, asistente visual para explicar una alerta y tarjeta con costo unitario, margen y supuestos.
8. **Historia de producto — `StoryBanner.tsx`:** frases de marca rotativas, gráfico de cosecha y bloque de verificación.
9. **Productos y verificación — `BlockchainSection.tsx`:** tarjetas con inclinación 3D (`TiltCard.tsx`), carrusel deslizable en móvil, modal de verificación y enlace a la ficha pública.
10. **Cierre — `SiteFooter.tsx`:** marca, enlaces de plataforma y contacto.

### Paneles por rol

| Ruta | Rol | Contenido |
|---|---|---|
| `/operador` | Operador (tema crema) | Recepción de lote (RF01) con validación de cantidad y lote único; transformación (RF02/RF08) que impide consumir más del disponible y rechaza reenvíos con la misma clave de idempotencia; inventario recibido/consumido/disponible con filtros; registro de transformaciones; indicador del nodo local Raspberry Pi y operaciones pendientes de sincronizar. |
| `/admin` | Administrador (tema carbón) | Alertas automáticas de merma y margen (RF04); KPIs de yield, merma, costo y margen; grafo 3D de procedencia en Canvas (rota, hover y clic); asistente de explicación con hechos separados de la interpretación; bloqueo/liberación con motivo y auditoría (RF09/RF10); balance económico con fórmulas y supuestos editables y auditados (RF05/RF12); tabla de lotes con filtros y exportación CSV (RF11). |
| `/ficha/[lote]` | Comprador (pública, móvil) | Origen, línea de tiempo del proceso y estado, sin costos ni márgenes (RF06); QR generado localmente; verificación de la cadena SHA-256 con simulación de alteración; solicitud de pedido solo para lotes liberados. |

### Red del clúster en los paneles internos

Siguiendo `REQUERIMIENTOS_LANDING_CLUSTER_ORIVIA.md`, la red del clúster se implementó **solo en los paneles de operador y administrador**, en la pestaña «Red del clúster» (`components/panels/PanelTabs.tsx` y `components/panels/cluster/`). La landing pública no cambió.

| Capacidad | Operador | Administrador |
|---|---|---|
| Ciclo de relación (descubrir → ficha → solicitar → aceptación humana → compartir) e indicadores | Sí | Sí |
| Mapa del ecosistema por tipo de actor con conexiones aceptadas, pendientes y rechazadas | Solo actores activos y no privados | Todos, incluidos en verificación |
| Explorar actores, necesidades y ofertas con búsqueda y filtros (tipo, municipio, categoría) | Sí | Sí |
| Ficha de actor con confianza `trust-v1` explicada | Contacto oculto hasta que se acepta una conexión | Contacto y notas internas (privado) |
| Coincidencias sugeridas por reglas (categoría, cobertura, confianza) | Consulta; la solicitud queda en manos del administrador | Puede solicitar la conexión |
| Publicar, pausar y cerrar necesidades de la asociación | Sí | Sí |
| Responder solicitudes (aceptar / rechazar con motivo), cancelar las enviadas y simular la respuesta de la contraparte (demo) | No | Sí |
| Moderar actores (activar, suspender, bloquear con motivo) y registrar señales de confianza append-only | No | Sí |

`lib/cluster.ts` replica el contrato del backend (`backend/app/cluster`, migraciones `005`/`006`): tipos, estados, visibilidad pública/compartida/privada y la fórmula `trust-v1`, con los mismos actores sintéticos de la semilla más productores vinculados a CAC001–CAC003. Los permisos siguen `backend/app/security/roles.py`: el operador no tiene `connections:create`. Las ofertas de cacao se derivan de los lotes `LIBERADO`; un lote pendiente o bloqueado nunca aparece como oferta. Cada cambio queda en la auditoría común. Los datos son sintéticos y se guardan en `localStorage` hasta integrar `/api/v1/cluster`; las pruebas están en `lib/cluster.test.ts` (`npm test`).

Los paneles comparten `components/panels/PanelShell.tsx` (cabecera, conectividad y control de acceso por rol) y `components/panels/ui.tsx`. El estado operativo vive en `lib/store.ts` y persiste en `localStorage` (RF07); la cadena de evidencia está en `lib/evidence.ts` y el generador QR en `lib/qr.ts` (adaptación del algoritmo de Project Nayuki, licencia MIT), verificado decodificando códigos de prueba con jsQR.

Componentes de apoyo:

- `components/brand/OriviaLogo.tsx`: isotipo nuevo (montaña sobre mazorca de cacao abierta con sus granos) y logotipo, dibujados en SVG con aura dorada pulsante.
- `components/landing/Botanica.tsx` y `Dragonfly.tsx`: hojas de cacao (incluidos brotes cobrizos), mazorcas, granos, rama con mazorcas cauliflóricas, hook de viento ligado a la velocidad del scroll y libélula vectorial.
- `components/landing/Reveal.tsx`: entradas progresivas de secciones.
- `components/auth/LoginModal.tsx` y `roles.ts`: modal de acceso de demostración con los perfiles operador, administrador y comprador.
- `components/ui/Toaster.tsx`: avisos de éxito, error e información.
- `lib/demo-data.ts`: lotes sintéticos, transformaciones, umbral de merma, balance y formato COP.
- `lib/cn.ts`: función compartida para combinar clases.

## 5. Sistema visual

### Paleta

Los tokens de `app/globals.css` definen, entre otros:

- Bosque: `#1b3d2e`, con tonos oscuros y claros derivados.
- Tierra: `#6b3f2a` y `#b88a6c`.
- Arena: `#d9c9b1`.
- Crema: `#f5efe6`.
- Carbón: `#1a1a1a`.
- Cereza: `#a3262a`.
- Ámbar: `#c98a2b`.

El tema también ofrece superficies, tarjetas, texto y bordes semánticos que se adaptan al esquema oscuro del sistema, salvo dentro del contenedor marcado como tema claro.

### Tipografía, iconos y movimiento

- **Montserrat:** texto de interfaz y títulos.
- **Allura:** frases editoriales y acentos narrativos.
- **Geist Mono:** códigos de lote, cifras, hashes y datos técnicos.
- **Lucide React:** iconos con etiquetas accesibles cuando son controles.
- **Framer Motion y CSS:** revelado de secciones, transición de carruseles y modales, menú móvil, progreso de trazabilidad, gráficos y animación asociada al scroll.
- **Accesibilidad de movimiento:** el CSS reduce animaciones y scroll suave cuando el sistema solicita movimiento reducido; algunos componentes consultan `useReducedMotion`.

## 6. Recursos gráficos y procedencia

En `hackathon_usco/public/media/` se encuentran:

- `hero/f000.jpg`–`hero/f072.jpg`: 73 cuadros (0–3,6 s, 20 fps) del video de referencia del cacaotal con la libélula.
- `proceso/viaje/v000.webp`–`v150.webp`: recorrido continuo del video de fondo «WhatsApp Video 2026-10-16 at 07.31.39.mp4» (10 s, 1280×720, 15 fps), que no trae interfaz impresa. Tramos por etapa: cosecha 0–36, fermentación 36–67, secado 67–95, empaque 95–127 y QR verificable 127–150. Los `.jpg` de la misma carpeta son el respaldo mientras carga.
- `proceso/cosecha.jpg`, `apertura.jpg`, `fermentacion.jpg`, `secado.jpg` y `empaque.jpg`: cinco recortes fijos de `gemini_generated_video_dc3571d6.mp4`, también proporcionado por el equipo. Se limpiaron el cursor y la interfaz impresos en el video; el video no se incluye en el repositorio. Los 35 cuadros anteriores de la mazorca (`mazorca/`) se eliminaron.
- `hero-poster.jpg`, `cacaotal.jpg`, `cosecha-mano.jpg`, `mazorcas-arbol.jpg`, `paisaje-cacao.jpg` y `mazorca-abierta.jpg`: recortes fijos del mismo video.

Los cuadros y recortes se extrajeron en el navegador con Canvas a partir del archivo `gemini_generated_video_61935365.mp4`, proporcionado por el equipo como referencia visual generada con Google Gemini. El video original no se incluye en el repositorio. Las imágenes de la primera versión (ambientada por error en café) se eliminaron.

**Pendiente de E08:** el equipo debe confirmar y declarar las condiciones de uso del video generado con Gemini y su autoría dentro del inventario de material externo.

En una conversación anterior se procesaron dos imágenes de logo proporcionadas por el usuario: una versión ampliada 4× y una versión PNG con transparencia. Se guardaron como salidas locales de Codex y **no aparecen integradas en `public/`** en el estado del repositorio revisado. El frontend actual utiliza el logotipo SVG de `components/brand/OriviaLogo.tsx`.

## 7. Datos de demostración e integraciones simuladas

La interfaz incluye interacciones, pero varias no representan todavía una integración real. Deben describirse como demostración:

- **Lotes y trazabilidad:** los tres lotes están definidos en `lib/demo-data.ts`; cambiar de lote o etapa recorre registros locales. No es una consulta a la base de datos desde esta landing.
- **Merma:** se calcula con los datos locales y el umbral del 15 %. El ejemplo de CAC001 presenta 100 kg recibidos y 80 kg finales (20 % de merma).
- **Costos:** costo total de `$1.600.000 COP`, 80 kg vendibles y precio supuesto de `$25.000 COP/kg`; la interfaz calcula `$20.000 COP/kg` y margen sobre venta del 20 %.
- **Gráficas:** rendimiento y kilos por semana usan arreglos definidos en `AnalyticsSection.tsx`; no son métricas de campo.
- **Asistente IA:** el botón presenta una respuesta predefinida para CAC001. El componente menciona Ollama, pero esta sección no realiza una solicitud a Ollama ni a una API.
- **Blockchain:** el navegador calcula SHA-256 y permite simular que se alteraron datos. El propio modal identifica el anclaje como local simulado; no demuestra publicación en una red blockchain.
- **Inicio de sesión:** el modal valida usuarios de demostración en el cliente, conserva una sesión de muestra en `localStorage` y redirige al panel del rol. No reemplaza autenticación ni autorización del backend; el login con JWT y refresh tokens ya existe en el backend (`2b126c6`) y queda pendiente conectarlo.
- **Paneles operativos:** recepción, transformación, inventario, estados, auditoría, costos y CSV funcionan con reglas de negocio reales sobre un almacén local en `localStorage` (`lib/store.ts`). No escriben todavía en PostgreSQL ni en la API.
- **Conectividad:** el indicador del nodo Raspberry Pi refleja `navigator.onLine`; las transformaciones creadas sin conexión quedan pendientes y se marcan como sincronizadas desde el indicador. Es una simulación del outbox, no una sincronización real.
- **Asistente IA del administrador:** produce una auditoría determinística calculada con los datos del lote (hechos, severidad, recomendación, incertidumbres) y lo declara en pantalla. No consulta Ollama.

Los datos del reto son simulados. No deben presentarse como mediciones de productores, visitas de campo ni validación agroindustrial real.

## 8. Relación con el reto oficial

El reto exige funcionamiento en móvil y computador, lenguaje claro, ficha pública sin costos internos, validación, permisos, persistencia y comportamientos reales. La landing aporta una **representación de UX y un prototipo interactivo**, pero no sustituye al MVP ejecutable.

| Requisito relacionado | Representación en el frontend actual | Límite del estado actual |
|---|---|---|
| RF03 Trazabilidad | Selector de lotes y línea de etapas en `TraceSection.tsx`. | Datos locales de demostración; falta acreditar recorrido contra registros persistidos. |
| RF04 Alertas | Indicador visual de merma calculada y umbral del 15 %. | No cubre alertas reales por datos incompletos, retraso o costo desde backend. |
| RF05 / RF12 Economía | Costo unitario, margen, fórmulas y supuestos desplegables. | Usa constantes sintéticas; no es un cálculo conectado a costos reales. |
| RF06 Ficha pública | `/ficha/[lote]` con origen, proceso, estado y QR; oculta costos y márgenes. | Lee el almacén local; falta la consulta pública a la API. |
| RF01 / RF02 Recepción y transformación | Formularios de `/operador` con validaciones (cantidad > 0, lote único, inventario disponible, justificación si la salida supera la entrada, idempotencia). | Persisten en `localStorage`, no en PostgreSQL. |
| RF07 / RF08 Persistencia e inventario | Los datos sobreviven a recargas; inventario recibido/consumido/disponible por lote. | Persistencia local del navegador; la transaccional depende del backend. |
| RF09 / RF10 Estados y auditoría | Bloqueo/liberación en `/admin` con motivo obligatorio para bloquear; auditoría de quién, cuándo, valor anterior y nuevo, sin borrado. | Auditoría local; falta conectarla a las rutas de auditoría del backend. |
| RF11 Exportación | Filtros por origen, estado y texto; exportación CSV de lotes con cantidades, estados y costos. | Exporta los datos locales. |
| E03 Diseño | Arquitectura visual por perfiles y secciones, más componentes reutilizables. | Este registro no contiene por sí solo todos los diagramas, modelo de datos y decisiones exigidos en E03. |
| E06 Usabilidad | Hay navegación adaptable y controles con etiquetas; algunas interacciones admiten teclado. | No se halló registro de las dos tareas observadas, tiempos, éxito, mejora antes/después ni revisión formal de contraste. |
| E08 IA y fuentes | Este documento registra herramientas y distingue simulaciones. | Falta completar el detalle de sesiones de Claude Code, revisión humana por módulo y licencias/origen de medios. |

La prueba oficial de usabilidad pide que una persona ajena al equipo registre un lote y encuentre su trazabilidad sin guía paso a paso; se deben registrar perfil general, tiempo, éxito, dificultades y una mejora demostrable. Esas mediciones no se inventan ni se sustituyen con esta descripción.

## 9. Registro de aportes humanos y de IA

Este registro resume lo que puede sostenerse con las instrucciones del equipo, los Markdown existentes y la inspección del código. No atribuye cada línea a una herramienta sin historial verificable.

| Responsable/fuente | Aporte registrado | Alcance o límite de atribución |
|---|---|---|
| Equipo humano | Definió el reto de cacao Huila, las audiencias y la dirección de interfaz; confirmó ORIVIA como marca; pidió español y desarrollo code-first; decidió descartar Spline por su costo. | `TEAM_STRUCTURE.md` asigna UX, diseño y frontend a Ángel y Daniel; la asignación de autoría por archivo debe verificarse con commits. |
| Equipo humano | Proporcionó imágenes de logo para solicitudes separadas de mejora y transparencia. | Las salidas producidas en esa conversación no están incorporadas a este repositorio. |
| Claude Code | Herramienta que el equipo declara haber usado para desarrollar la página. | No se proporcionó historial de prompts o cambios por archivo. El código actual no incluye marcas que permitan identificar qué componente generó Claude. |
| Codex | El plan existente documenta apoyo de Codex. En esta colaboración se analizó el reto, se revisó el código, se apoyó la normalización de carpeta/idioma/marca, se instalaron `clsx` y `tailwind-merge`, y se procesaron los dos archivos de logo solicitados. | La ayuda no sustituye revisión y comprensión por el equipo. No se registra aquí un modelo exacto porque debe verificarse en la sesión correspondiente. |
| Plugins | No se identificó uso de plugins o conectores de diseño. | Claude Code y Codex son asistentes/herramientas de desarrollo; no se cuentan como plugins. Las librerías npm se declaran por separado. |

Para la declaración E08 del reto, el equipo debe conservar esta distinción y completar, cuando pueda verificarse, herramienta, tarea, módulos, revisión humana y correcciones. No hace falta transcribir todas las conversaciones; sí declarar los aportes relevantes y los componentes externos.

## 10. Secuencia de decisiones conocida

1. Se planteó una web para la hackatón con Next.js, React, TypeScript, Tailwind, animación y una experiencia visual dinámica.
2. El equipo optó por trabajar directamente en código y usar ORIVIA como nombre único del producto.
3. Spline se consideró inicialmente para 3D; se descartó por el costo de acceso. El proyecto no incorpora otro motor 3D.
4. Se actualizaron la carpeta interior de la app para que coincidiera con `hackathon_usco`, el atributo de idioma a `es` y las referencias de marca a ORIVIA.
5. Se agregaron `clsx` y `tailwind-merge` al manifiesto y lockfile; existe el helper `cn()`.
6. La interfaz evolucionó a una landing con hero de cuadros por scroll, relato de origen, trazabilidad, analítica, story banner, tarjetas de producto y modales de demostración.
7. El documento actual consolida el estado visual y registra los límites de demo frente a la rúbrica.
8. En atención a `OPERACION_PRUEBA_FUEGO_ORIVIA.md`, se resolvió la fórmula de disponibilidad de inventario para soportar procesos multietapa, se blindó la autorización de cambio de estado a nivel de tienda y se incorporó la suite de pruebas automatizadas ejecutables con `npm test` (`lib/store.test.ts`), cubriendo los casos OP-01 a OP-19.

## 11. Fuentes del repositorio y referencias del reto

Este registro complementa, y no reemplaza, los siguientes materiales:

- `README.md`: mapa del repositorio y responsables generales.
- `TEAM_STRUCTURE.md`: organización del trabajo y áreas de Ángel y Daniel.
- `PLAN_HACKATON_ORIVIA.md`: flujo de demo, prioridades y criterios internos.
- `ARQUITECTURA_ORIVIA_HACKATON.md`: arquitectura, seguridad e integraciones previstas.
- `hackathon_usco/components/README.md`: sistema de componentes de frontend.
- `hackathon_usco/styles/README.md`: estilos, responsive y accesibilidad.
- `hackathon_usco/design/README.md`: flujos, tokens y referencias visuales.
- `hackathon_usco/docs/ux/README.md`: decisiones UX, accesibilidad y pruebas.

**Reto oficial:** `Reto_Oficial_Devurity_Agroindustria.pdf`, especialmente alcance RF01–RF12 (págs. 3–5), entregables E01–E10 y E03/E06/E08 (págs. 6–10), reglas de IA y licencias (pág. 11), rúbrica (pág. 12) y demostración/pitch (pág. 16).

