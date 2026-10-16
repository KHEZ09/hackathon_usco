# ORIVIA — Requerimientos de la landing para el clúster digital cacaotero

**Fecha de revisión:** 16 de octubre de 2026  
**Alcance:** propósito, contenido, interacciones públicas, datos y cambios requeridos en la landing para comunicar la propuesta central de ORIVIA como clúster digital cacaotero.  
**Límite:** este documento especifica la landing; no describe ni reemplaza los flujos de operación de los paneles internos.

Este documento complementa `PLAN_HACKATON_ORIVIA.md`, `ARQUITECTURA_ORIVIA_HACKATON.md`, `ESTRUCTURA_FRONTEND_ORIVIA.md` y `OPERACION_PRUEBA_FUEGO_ORIVIA.md`. No modifica esos documentos ni el código visual. Su propósito es mantener una única definición de producto para la siguiente actualización de la landing.

## 1. Propuesta central

ORIVIA es un **clúster digital del ecosistema cacaotero del Huila**. Conecta a productores, asociaciones, transformadores, compradores, agroemprendedores, transportadores, proveedores de servicios e instituciones para que puedan:

- conocer actores y capacidades disponibles;
- publicar y descubrir necesidades, ofertas y oportunidades;
- encontrar posibles aliados;
- solicitar conexiones entre organizaciones;
- registrar operaciones y lotes con su procedencia y evidencias;
- consultar información pública comprensible y señales de confianza explicables.

La formulación aprobada en el plan es:

> **ORIVIA conecta a quienes producen, transforman y comercializan cacao, creando una red accesible donde cada necesidad y cada lote pueden ser comprendidos y comprobados.**

La landing debe presentar la red como el valor principal del producto. La recepción, transformación e inventario son la operación que sostiene esa red y su trazabilidad; no deben hacer que el producto parezca únicamente un tablero de inventario, una tienda o una página de pedidos.

## 2. Objetivo de la landing

En los primeros segundos, la persona debe entender:

1. qué conecta ORIVIA;
2. quiénes participan;
3. qué puede descubrir o hacer cada actor;
4. cómo la trazabilidad y las evidencias ayudan a tomar decisiones;
5. cómo explorar una ficha pública o entrar al área correspondiente.

La landing es una superficie pública de descubrimiento. Presenta información autorizada y permite abrir fichas públicas. Las escrituras agroindustriales, el control de existencias, los costos internos, los cambios administrativos y la auditoría operativa permanecen en los paneles por rol descritos en la especificación [OPERACION_PRUEBA_FUEGO_ORIVIA.md](OPERACION_PRUEBA_FUEGO_ORIVIA.md).

## 3. Audiencias y necesidades que debe comunicar

| Actor | Qué busca en el clúster | Contenido público que puede aparecer |
|---|---|---|
| Productor | Compradores, insumos, asistencia técnica, financiación y logística. | Perfil público, municipio aproximado, capacidades u oferta publicada y necesidades que el actor autorizó publicar. |
| Asociación | Consolidar oferta, agrupar lotes, coordinar entregas y negociar. | Perfil organizacional, productos o capacidades, oportunidades y lotes liberados con ficha pública. |
| Transformador / agroemprendedor | Materia prima, aliados, proveedores y oportunidades de transformación. | Capacidades, oferta o necesidades autorizadas y ficha de proceso cuando sea pública. |
| Comprador / empresa | Oferta, origen, volumen disponible, condiciones y confianza. | Productos y lotes liberados, origen, proceso, estado y evidencia pública. |
| Transportador / proveedor | Servicios y solicitudes compatibles. | Servicios y cobertura aproximada autorizados por el proveedor. |
| Institución / facilitador | Estado general del ecosistema, necesidades y oportunidades. | Indicadores agregados y públicos, sin datos personales o comerciales privados. |

La landing no debe asumir que todos estos perfiles tienen un panel implementado en el MVP. El alcance operativo actual se mantiene en operador, administrador y comprador. Los demás son tipos de actor y audiencia del clúster, con expansión posterior según `PLAN_HACKATON_ORIVIA.md`.

## 4. Límites entre información pública, compartida y privada

La separación se aplica antes de renderizar y en la API; no se resuelve ocultando campos solo con CSS o componentes condicionales.

| Nivel | Ejemplos | Regla de la landing |
|---|---|---|
| **Pública** | Perfil básico, tipo de actor, municipio aproximado, oferta general, lote liberado, origen, estado público y ficha QR. | Puede mostrarse sin sesión, siempre que el actor haya autorizado la publicación. |
| **Compartida** | Contactos, necesidades específicas, condiciones detalladas y datos de una operación entre actores relacionados. | Se muestra solo tras autenticación, solicitud/aceptación de conexión y autorización correspondiente. |
| **Privada** | Costos internos, credenciales, información personal sensible, datos de contacto restringidos, secretos y documentación no publicada. | No se muestra en la landing ni en fichas públicas. |

Los lotes `PENDIENTE` o `BLOQUEADO` no deben presentarse como oferta disponible. La ficha informa su estado según la política pública definida para el producto. En particular, un lote bloqueado se identifica como no disponible.

## 5. Requisitos funcionales de la landing

### LND-01 — Explicar la propuesta de valor

El hero conserva la marca ORIVIA y «Del origen al mundo», y debe relacionar esa frase con la conexión entre los actores del ecosistema, no solo con la historia visual de un lote.

**Aceptación:** una persona puede describir en una frase que ORIVIA conecta a quienes producen, transforman y comercializan cacao y permite descubrir necesidades, ofertas y procedencia.

### LND-02 — Hacer visible cómo se conecta el ecosistema

Debe mostrarse el recorrido relacional entre productores, asociaciones, transformación, compradores, servicios e instituciones. Las conexiones tienen que explicar una capacidad o acción posible; no ser únicamente decoración.

**Aceptación:** se entiende quién ofrece, quién necesita y cómo puede surgir una relación, sin dar por aprobada una conexión que todavía requiere consentimiento.

### LND-03 — Explorar actores, ofertas y necesidades

La landing debe incorporar un punto de entrada para descubrir actores, productos/servicios y oportunidades. Cuando los datos reales del clúster estén disponibles, ofrecer búsqueda y filtros acordes al contrato: tipo de actor, producto/categoría, volumen, estado y municipio aproximado.

**Aceptación:** los resultados muestran el origen de los datos y su estado; los filtros no revelan información compartida o privada. Si se usan datos sintéticos, se identifican como demostración.

### LND-04 — Abrir fichas públicas

Desde un actor, oferta, producto o lote se debe poder abrir una ficha pública con campos autorizados y una llamada a la acción apropiada.

**Aceptación:** un lote muestra origen, proceso, responsables/evidencias permitidos y estado; nunca costos ni márgenes. Una oferta bloqueada no aparece como disponible.

### LND-05 — Explicar la confianza

La landing puede presentar una señal de confianza solo si explica su fundamento: perfil declarado, eventos trazables, evidencias, confirmaciones, consistencia de datos e incidencias.

**Aceptación:** no aparece una puntuación opaca ni se afirma que blockchain comprueba la verdad del dato inicial. Blockchain solo sustenta la integridad posterior del registro; la confianza depende también de responsables, evidencias y confirmaciones.

### LND-06 — Mostrar impacto de la red con honestidad

Se pueden mostrar conexiones, lotes trazados, oportunidades o productos disponibles como indicadores. Los indicadores deben proceder de una consulta agregada autorizada o estar rotulados como valores sintéticos de demo.

**Aceptación:** ningún gráfico o cifra fija se presenta como medición real, impacto de campo o actividad viva si su fuente no lo respalda.

### LND-07 — Conectar con la operación por rol

La landing ofrece accesos a operador, administrador y comprador según el MVP. El operador y el administrador ingresan a sus paneles. El comprador puede explorar la red y abrir una ficha pública; iniciar sesión como comprador no debe confundirse con una búsqueda o solicitud de conexión ya funcional.

**Aceptación:** el acceso conduce a una ruta existente y comunica si se trata de una sesión demo o de autenticación real. No se promete un panel de productor, transportador o institución antes de implementarlo.

### LND-08 — Invitar a una conexión sin aprobarla automáticamente

La acción «solicitar contacto/conexión» requiere autenticación cuando implique datos compartidos. Debe crear una solicitud pendiente y la contraparte debe aceptarla o rechazarla antes de revelar la información protegida.

**Aceptación:** la landing nunca crea una relación aceptada, revela un contacto privado o confirma una operación únicamente porque se pulsó una CTA.

### LND-09 — Traducir tecnología a beneficio

Blockchain se explica como historial verificable y la IA como ayuda para comprender datos o encontrar coincidencias. Ninguna tecnología se presenta como sustituto de autorización, evidencia o decisión humana.

**Aceptación:** la landing identifica simulaciones, anclajes locales o respuestas predefinidas cuando no exista una integración real.

### LND-10 — Ser accesible y usable

La navegación debe funcionar en móvil y escritorio, con lenguaje claro, controles etiquetados, contraste legible, teclado y respeto por `prefers-reduced-motion`. Las fotos, animaciones y gráficos no deben impedir el acceso a la propuesta o a las fichas.

**Aceptación:** se puede recorrer navegación, búsqueda y CTAs por teclado; la versión móvil conserva acceso a los contenidos y acciones esenciales.

## 6. Especificación de contenido y secuencia

La secuencia siguiente describe la información que debe recibir el visitante. Puede mapearse a las secciones existentes o implementarse en futuras iteraciones; no prescribe un rediseño visual.

| Bloque de contenido | Información que debe entregar | CTA o siguiente paso | Relación con la landing actual |
|---|---|---|---|
| Hero / propuesta | ORIVIA como red cacaotera del Huila; actores conectados y valor de descubrir/validar. | Explorar la red / ver una ficha. | `HeroScrollWorld` ofrece contexto cacao y marca, pero su mensaje principal aún debe hacer explícito el clúster. |
| Cómo funciona la red | Actores, ofertas, necesidades, conexión consentida y operación trazable. | Conocer actores / publicar o solicitar según rol disponible. | No existe hoy una sección funcional de relaciones, necesidades y conexiones. |
| Explorar el clúster | Búsqueda o tarjetas de actores, ofertas y oportunidades, con estado y filtros aplicables. | Abrir ficha / iniciar sesión para una acción protegida. | No existe hoy una superficie de búsqueda del clúster; la búsqueda actual de Navbar abre ficha por código de lote. |
| Origen y transformación | Contexto de fincas y etapas del cacao, vinculados con actores responsables. | Recorrer el proceso / ver trazabilidad. | `OriginSection` y `PodSection` aportan narrativa de origen/proceso; deben presentarse como parte de la red, no como toda la propuesta. |
| Trazabilidad | Recorrido de un lote, cantidades, responsable, fecha, evidencia y estado. | Abrir ficha pública / verificar. | `TraceSection` y `BlockchainSection` ya muestran lotes sintéticos y verificación de demo. |
| Confianza e impacto | Explicación de evidencias y métricas agregadas con etiqueta de datos sintéticos cuando aplique. | Ver metodología / explorar oportunidad. | `AnalyticsSection` usa datos sintéticos; falta actividad real de red y método explicado para confianza del clúster. |
| Acceso y cierre | Roles disponibles, límites de acceso y siguiente acción clara. | Entrar al panel o consultar una ficha. | Navbar y footer ya ofrecen login y navegación; deben evitar prometer áreas o conexiones aún no construidas. |

## 7. Cambios de producto requeridos frente al estado encontrado

Los siguientes puntos son requerimientos de producto para una futura actualización. No se han aplicado al código como parte de esta documentación.

### Cambios de contenido y jerarquía

1. Dar a la conexión del ecosistema el primer lugar en la explicación de producto.
2. Presentar productores, asociaciones, transformadores, compradores y proveedores como participantes relacionados por necesidades y ofertas.
3. Explicar el ciclo de relación: descubrir → revisar ficha → solicitar conexión → aceptación humana → compartir la información autorizada.
4. Reubicar las historias visuales de origen, proceso, lote y cacao como prueba del funcionamiento de la red, no como sustituto de su directorio o capacidades de descubrimiento.
5. Explicar confianza por evidencias y consistencia, sin ranking social absoluto ni afirmaciones no demostradas sobre blockchain.
6. Rotular todos los números, gráficos, fichas y perfiles de prueba como datos sintéticos si no proceden del servicio real.

### Cambios funcionales requeridos

1. Añadir un mecanismo de exploración pública de actores, ofertas y necesidades publicables.
2. Añadir fichas de actor y necesidad con los campos mínimos acordados en el plan.
3. Incorporar CTA de solicitud de contacto/conexión protegida por autenticación y consentimiento.
4. Conectar actores, fichas de lote y estado público al servicio autorizado cuando exista contrato estable.
5. Obtener indicadores públicos de una API agregada o mantenerlos marcados explícitamente como demo.
6. Enlazar únicamente a rutas disponibles para los roles implementados; no simular paneles faltantes.

## 8. Compatibilidad con arquitectura, operación y API

### Frontera landing / operación

- **Landing:** descubrimiento público, información general del clúster, búsqueda autorizada, indicadores públicos y fichas sin datos sensibles.
- **Ficha pública / QR:** lectura limitada de lote y verificación; no modifica operaciones.
- **Panel operador:** recepción, transformación, incidencias, inventario y seguimiento de sincronización.
- **Panel administrador:** alertas, costos, cambios de estado, auditoría, reportes y administración de red.
- **Área de comprador:** descubrimiento, ficha, solicitud de contacto/pedido; hoy el acceso de comprador redirige a una ficha de demostración, no a un directorio del clúster.

### Compatibilidad de datos y contratos

La arquitectura propone las entidades `actors`, `needs`, `offers`, `connections`, `lots`, `traceability_events`, `evidence` y `trust_signals`, separando visibilidad pública, compartida y privada. Las APIs actuales documentan autenticación, pedidos/trazabilidad, auditoría, anclajes e IA; también existen consultas de catálogo y trazabilidad pública. En el código de backend revisado no se encontró todavía un contrato de API de clúster para crear/listar necesidades, ofertas y conexiones.

Por tanto:

- La landing no debe inventar contratos ni consumir directamente tablas.
- Sebas y Kevin deben acordar entidades, campos públicos, permisos, filtros, paginación, estados y errores antes de conectar las vistas.
- Solicitar una conexión no equivale a aceptarla; la aceptación y el alcance de datos compartidos se validan en servidor.
- Las consultas públicas solo devuelven una lista permitida de campos; no reutilizan la vista administrativa.
- La ficha comercial del lote debe reflejar el estado operativo y seguir las reglas de `OPERACION_PRUEBA_FUEGO_ORIVIA.md`.
- La landing no muestra costos internos ni datos de contacto privados, aunque estén disponibles en la sesión del administrador.

## 9. Estado real de la landing al corte

| Área | Encontrado en código | Estado respecto a la propuesta de clúster |
|---|---|---|
| Marca y cacao Huila | Hero, origen, proceso, paisaje, lotes y narrativa ORIVIA. | Base visual y narrativa ya representa cacao y procedencia. |
| Proceso agroindustrial | Secciones de recepción/fermentación/secado/empaque y trazabilidad de tres lotes. | Parcial: explica el recorrido del producto, pero no desarrolla el mapa de actores y relaciones. |
| Exploración | Navbar busca un lote por código; hay tarjetas de producto y enlaces a ficha/QR. | Parcial: permite descubrir productos demo; no ofrece directorio de actores, necesidades u oportunidades con filtros. |
| Fichas públicas | `/ficha/[lote]` muestra origen, pasos y estado sin costos, usando datos locales. | Parcial: ficha funcional de demo, aún no basada en consulta integrada al clúster/API. |
| Confianza/verificación | SHA-256 y diálogo que simula una verificación local. | Parcial: no equivale a una conexión real con blockchain ni a una señal de confianza construida desde confirmaciones. |
| Analítica/impacto | Gráficos y valores predefinidos de demo. | Parcial: no deben presentarse como métricas actuales de la red ni como datos de campo. |
| Conexiones/consentimiento | No se encontró flujo de solicitud y aceptación de conexión desde la landing. | Pendiente de producto y contrato API. |
| Tipos de actor | Contenido cacaotero centrado en productores/lotes; no se encontró exploración de todos los actores del clúster. | Pendiente de ampliar contenidos y fuente de datos. |
| Sesión/roles | El login de frontend es local/demo; el comprador va a `/ficha/CAC002`. | Parcial: el backend tiene login real, aún pendiente de integración al frontend. |

**Conclusión de estado:** la landing es una base cacaotera sólida para origen, proceso, lotes y verificación de demostración. La propuesta central de clúster ya está definida en los documentos, pero **aún no está plenamente representada como experiencia de descubrimiento de actores, necesidades, ofertas y conexiones**. Esas capacidades no deben declararse construidas hasta que existan datos y flujos integrados.

## 10. Criterios de aceptación para la próxima actualización

1. Una persona que no conoce ORIVIA identifica en menos de diez segundos que es una red que conecta actores cacaoteros, no solo una página de producto.
2. La página muestra cómo conviven necesidades, ofertas, actores y lotes trazables.
3. El visitante puede abrir una ficha pública desde una entrada disponible en la landing.
4. La interfaz diferencia claramente funciones públicas de las acciones que exigen sesión y consentimiento.
5. No se muestra un contacto o dato compartido antes de la autorización requerida.
6. Los lotes bloqueados no aparecen como disponibles.
7. Toda cifra sintética está identificada como dato de demostración.
8. La confianza se explica con evidencias y límites; no se presenta como una verdad infalible.
9. Acceso, búsqueda y CTAs funcionan en móvil, teclado y con movimiento reducido.
10. El contenido de la landing no contradice la matriz operativa: administración controla costos/estados; operador registra procesos; comprador consulta campos públicos.

## 11. Responsabilidades y secuencia de coordinación

- **Daniel:** implementación frontend de los componentes y páginas asignadas, una vez aceptados los flujos, el contenido y los contratos.
- **Ángel:** UX, arquitectura de información, definición del recorrido y criterios de usabilidad.
- **Sebas y Kevin:** fuente de datos, API pública, seguridad de campos, contratos de actores/necesidades/ofertas/conexiones y permisos.
- **Equipo:** confirmar qué datos son de demo, validar contenido cacaotero, revisar la matriz requisito → sección/acción → fuente de datos → prueba.

Orden recomendado antes de implementar funcionalidades nuevas:

1. Confirmar el alcance MVP de actores, necesidades y ofertas que realmente se demostrará.
2. Aprobar campos públicos y reglas de consentimiento/visibilidad.
3. Definir el contrato API o declarar por escrito que una vista es demo local.
4. Mapear cada requisito a una sección y ruta existente, sin duplicar operación de los paneles.
5. Implementar e integrar la experiencia.
6. Verificar datos, permisos, navegación móvil/accesible y coherencia de las fichas.

Esta secuencia evita diseñar CTAs hacia funciones o roles sin destino implementado y evita que la landing presente datos internos.

## 12. Documentos relacionados

- `PLAN_HACKATON_ORIVIA.md`: propuesta central del clúster, audiencias, landing y paneles por rol.
- `ARQUITECTURA_ORIVIA_HACKATON.md`: separación público/compartido/privado y fronteras entre landing, paneles y API.
- `ESTRUCTURA_FRONTEND_ORIVIA.md`: stack, componentes existentes y simulaciones del frontend.
- `OPERACION_PRUEBA_FUEGO_ORIVIA.md`: acciones y límites operativos por rol.
- `TEAM_STRUCTURE.md`: responsables y orden de coordinación.
- `backend/API_CONTRACT_ORIVIA.md`: rutas actualmente documentadas para auth, pedidos, trazabilidad, auditoría, blockchain e IA.
- `README.md`: índice del repositorio.
