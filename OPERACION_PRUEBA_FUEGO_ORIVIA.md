# ORIVIA — Operación del software y prueba de fuego

**Fecha de revisión:** 16 de octubre de 2026  
**Alcance:** operación del producto durante una demostración evaluable.  
**No incluye:** cambios de identidad visual, landing, estilos, animaciones ni componentes de diseño.

Este documento convierte el reto oficial y los planes existentes en un guion operativo verificable. Distingue el comportamiento exigido, lo que ya funciona en el frontend local, las capacidades actuales del backend y las brechas de integración. Una función descrita como objetivo o prueba esperada no se considera implementada por aparecer aquí.

## 1. Resultado operativo que debe demostrar ORIVIA

Una persona debe poder recorrer el ciclo de un lote de cacao desde su recepción hasta su consulta comercial. El sistema debe conservar las cantidades y el origen, calcular pérdidas y costos con reglas visibles, impedir acciones no autorizadas y permitir reconstruir qué ocurrió.

```text
Operador registra recepción
    -> transforma un lote y registra incidencias
    -> el sistema actualiza existencias y trazabilidad
    -> calcula merma, costos y alertas
    -> administrador revisa, bloquea o libera con motivo
    -> auditoría conserva cada cambio
    -> comprador consulta la ficha pública y el estado
```

El alcance de evaluación es una asociación simulada, tres lotes y dos roles internos (operador y administrador). El comprador consulta información pública; no necesita permisos internos. Los datos del reto son sintéticos y no representan resultados de campo.

## 2. Roles y límites de operación

| Rol | Puede realizar | No puede realizar |
|---|---|---|
| Operador | Registrar lotes recibidos; registrar etapas de transformación, entradas, salidas, responsable e incidencias; consultar existencias y trazabilidad; consultar alertas operativas. | Liberar o bloquear productos; modificar permisos o costos administrativos; consultar información privada que no requiera para su labor. |
| Administrador | Consultar lotes, cantidades, procedencia, costos, márgenes y alertas; filtrar y exportar; bloquear o liberar indicando motivo; revisar auditoría y evidencias. | Borrar el historial para ocultar cambios; permitir que una recomendación de IA modifique por sí sola un dato crítico. |
| Comprador / consulta pública | Buscar el producto por enlace, código o QR; consultar origen, recorrido y estado; verificar la evidencia pública; solicitar un producto únicamente si está liberado. | Consultar costos, márgenes, credenciales, datos personales privados o modificar lotes y eventos. |

**Regla de seguridad:** ocultar controles en la interfaz no basta. La API y la capa que escribe o devuelve los datos deben comprobar el token, el rol/permisos y la visibilidad de cada campo. En el estado actual, la sesión del frontend es de demostración y no representa autorización real del servidor.

## 3. Datos de demostración oficiales

| Lote | Productor ficticio | Origen | Recepción inicial |
|---|---|---|---:|
| CAC001 | Productor A | Rivera | 100 kg de cacao seco |
| CAC002 | Productor B | Campoalegre | 150 kg de cacao seco |
| CAC003 | Productor C | Algeciras | 80 kg de cacao seco |

Escenario de cálculo obligatorio para CAC001:

- Entrada de etapa: **100 kg**; salida: **80 kg**.
- Merma: `(100 - 80) / 100 × 100 = 20 %`.
- Regla de alerta del ejercicio: merma **superior al 15 %**.
- Costo de etapa: **$1.600.000 COP**; salida vendible: **80 kg**.
- Costo unitario: `$1.600.000 / 80 = $20.000 COP/kg`.
- Precio hipotético: **$25.000 COP/kg**.
- Margen sobre venta: `($25.000 - $20.000) / $25.000 × 100 = 20 %`.

La pantalla o el informe debe identificar los supuestos y los conceptos incluidos en el costo total. El ejemplo no establece un estándar agronómico ni acredita costos reales.

## 4. Especificación operativa por requisito

| Requisito | Comportamiento que debe comprobarse | Evidencia de éxito |
|---|---|---|
| **RF01 Recepción** | Crear lote con identificador único, productor, origen, fecha, cantidad y unidad. Rechazar campos obligatorios vacíos, cantidad cero/negativa e identificadores duplicados. | El lote válido aparece una sola vez, con sus datos correctos; el intento inválido muestra una explicación y no deja registros parciales. |
| **RF02 Transformación** | Registrar lote de origen, etapa, responsable, fecha, entrada, salida e incidencia. Cada salida conserva el vínculo con el lote de origen. Una operación procesa un solo lote; si se mezclan, deben conservarse todos los orígenes. | La transformación queda en la historia del lote y conserva cantidades y responsable. Una salida mayor que la entrada requiere justificación. |
| **RF03 Trazabilidad** | Reconstruir desde la recepción hasta cada etapa y el producto disponible, en orden cronológico. | La línea de tiempo permite identificar origen, responsables, fechas, cantidades, estado e incidencias registradas. |
| **RF04 Alertas** | Calcular y explicar alertas por merma, datos incompletos, retraso o costo. Cada alerta debe señalar la regla aplicada y los datos que la activaron. | CAC001 con 20 % de merma genera alerta frente al umbral del 15 %. No se presenta una alerta fija sin recalcular con los valores de entrada. |
| **RF05 Indicador económico** | Mostrar costo unitario o margen con fórmula, unidades y supuestos editables o consultables. | En el escenario oficial aparecen $20.000 COP/kg y margen de 20 %, con la base de 80 kg vendibles. |
| **RF06 Ficha comercial** | Consultar por enlace, código o QR. La vista pública solo contiene campos autorizados y muestra el estado actual. | Se puede identificar origen y proceso; no aparecen costos o márgenes. Si está bloqueado, se indica que no está disponible. |
| **RF07 Persistencia** | Conservar y recuperar lotes, transformaciones, estados y auditoría después de cerrar/reiniciar la aplicación. Disponer de respaldo recuperable. | Reinicio y restauración dejan los registros íntegros, sin pérdida ni duplicación. Persistencia en `localStorage` sirve para el prototipo del navegador, no acredita persistencia del servidor. |
| **RF08 Inventario** | Controlar recibido, consumido y disponible por lote; rechazar consumo superior a la existencia y evitar doble consumo ante el reenvío de una misma operación. | Una solicitud de consumo excesivo es rechazada sin cambiar el saldo; reenviar la misma clave idempotente no vuelve a descontar inventario. |
| **RF09 Estado** | Manejar `PENDIENTE`, `LIBERADO` y `BLOQUEADO`. Solo administración puede liberar o bloquear; exigir motivo para el bloqueo y mostrar el estado en la ficha pública. | Operador recibe denegación al intentar liberar. CAC001 bloqueado queda fuera de la oferta pública y mantiene sus eventos. |
| **RF10 Auditoría** | Registrar quién, cuándo y qué cambió en cantidades, transformaciones y estado, con valor anterior/nuevo y motivo cuando aplique. No permitir borrar eventos para ocultar cambios. | Administrador reconstruye los cambios y el intento de modificación no autorizado no altera el historial. |
| **RF11 Consulta y exportación** | Administrador filtra lotes por origen o estado y exporta CSV con identificador, origen, cantidades, estado y costos. | Los filtros no alteran los registros; el CSV contiene los datos solicitados y no se ofrece a roles sin autorización. |
| **RF12 Balance económico** | Calcular costo unitario y margen sobre venta; manejar salida/precio cero sin división inválida; explicar qué costos se incluyeron. | Con los datos oficiales, resultado de $20.000 COP/kg y 20 %. Con denominador cero, respuesta controlada y comprensible, nunca `NaN` o infinito. |

### Reglas transversales

- Validar de nuevo en el servidor; los controles del formulario no sustituyen la validación del backend.
- Aplicar escrituras como transacciones: ante un error, conservar lo válido y no guardar una parte de la operación fallida.
- Usar una clave de idempotencia para registrar transformaciones; repetir la misma solicitud debe devolver el resultado previo o indicar duplicado, sin crear otro evento ni consumir otra vez.
- Mantener cantidades, unidades, fechas y procedencia coherentes entre lote, movimiento de inventario y evento de trazabilidad.
- No exponer información privada en la consulta pública.
- Las sugerencias de IA son de lectura y apoyo. Una persona autorizada confirma cualquier acción que cambie estado, costos o existencias.

## 5. Guion de la prueba de fuego

La ejecución debe realizarse en una versión identificada y con datos sintéticos reiniciables. El jurado puede cambiar cantidades; el producto debe recalcular, no limitarse a mostrar los resultados de este guion.

### Preparación

1. Iniciar la versión candidata y confirmar que la API y la base de datos están disponibles si se va a demostrar integración real.
2. Cargar el conjunto sintético identificado y anotar su versión. Separar claramente credenciales de prueba de las credenciales del repositorio.
3. Confirmar los roles operador y administrador. Abrir la ficha pública sin sesión interna.
4. Registrar el estado inicial de los tres lotes. Si el almacén se reinicia a una semilla que ya contiene transformaciones, declararlo: el seed actual de frontend no es un estado vacío.

### Recorrido integrado esperado

1. **Recepción — operador:** mostrar CAC001–CAC003 o registrar un nuevo lote de prueba. Intentar cantidad negativa y un identificador repetido; comprobar que el sistema informa el error y no crea registros.
2. **Transformación — operador:** registrar para CAC001 una operación de 100 kg a 80 kg con etapa, responsable y fecha. Dejar la incidencia descrita en el caso si aplica. Intentar consumir más de lo disponible y comprobar rechazo sin cambios.
3. **Idempotencia:** reenviar exactamente la operación anterior con la misma clave. Confirmar que no se duplica la transformación ni se descuenta inventario otra vez.
4. **Cálculos y alerta:** comprobar merma del 20 %, alerta sobre 15 %, costo unitario de $20.000 COP/kg y margen hipotético del 20 %. Mostrar fórmula, unidades y supuestos.
5. **Control — administrador:** revisar origen y cantidades afectadas. Bloquear CAC001 con motivo obligatorio. Intentar la misma acción como operador y comprobar denegación.
6. **Auditoría:** verificar usuario, hora, valores anterior/nuevo y motivo del bloqueo. Confirmar que los eventos anteriores siguen visibles.
7. **Ficha pública — comprador:** abrir el enlace/QR de CAC001. Confirmar origen, recorrido y estado bloqueado; comprobar que no aparecen costos y que el producto no se ofrece disponible.
8. **Recuperación:** reiniciar la aplicación o el servicio, recuperar el mismo conjunto de datos y verificar que recepción, transformación, alerta, estado e historial continúan coherentes.
9. **Consulta administrativa:** filtrar lotes por origen/estado y descargar CSV. Confirmar columnas, cantidades y costos requeridos.

### Incidencia anunciada para la hora 12

El comprador reporta un problema con CAC001. Administración debe bloquear el producto, identificar su origen y explicar las cantidades afectadas sin borrar el historial. Registrar el cambio como tarjeta de trabajo, ajustar un criterio de aceptación y ejecutar una prueba de regresión relacionada. Esta modificación se demuestra dentro de las 24 horas.

## 6. Casos mínimos para el informe de pruebas

El reto exige al menos **15 casos ejecutados** y **5 pruebas automatizadas relevantes**. La lista siguiente cubre los comportamientos operativos; se deben registrar resultado obtenido, evidencia y versión, sin declarar pruebas como aprobadas antes de ejecutarlas.

| ID | Prueba | Resultado esperado |
|---|---|---|
| OP-01 | Registrar un lote válido | Identificador único y registro recuperable. |
| OP-02 | Cantidad negativa o cero | Mensaje claro, sin guardar. |
| OP-03 | Campo obligatorio vacío | Mensaje claro, sin guardar datos parciales. |
| OP-04 | Identificador duplicado | Conflicto controlado, saldo sin cambios. |
| OP-05 | Transformación 100 kg a 80 kg | Evento enlazado al lote y merma de 20 %. |
| OP-06 | Entrada superior al saldo disponible | Operación rechazada, saldo previo conservado. |
| OP-07 | Reenvío con la misma clave de idempotencia | No crea doble evento ni doble consumo. |
| OP-08 | Merma superior al 15 % | Alerta explica causa, cálculo y umbral. |
| OP-09 | Costo y margen del caso oficial | $20.000 COP/kg y 20 %, con fórmulas/supuestos. |
| OP-10 | Salida vendible o precio cero | Sin división inválida; error o resultado definido. |
| OP-11 | Consulta pública de lote liberado | Origen, proceso y estado visibles; datos privados ocultos. |
| OP-12 | Consulta pública de lote bloqueado | Estado no disponible, sin costos ni margen. |
| OP-13 | Operador intenta bloquear o liberar | Acción denegada en la capa de datos/API. |
| OP-14 | Administrador bloquea CAC001 con motivo | Estado actualizado y evento auditado. |
| OP-15 | Auditoría tras varios cambios | Usuario, fecha, acción y valores anterior/nuevo conservados. |
| OP-16 | Filtro y exportación CSV | Filtro por origen/estado; columnas RF11 presentes. |
| OP-17 | Reinicio y restauración de respaldo | Datos preservados y sin duplicaciones. |
| OP-18 | Consulta con 100 registros sintéticos | Medición reportada con método, equipo y tiempo; objetivo del ejercicio: hasta 3 s tras cargar la app. |
| OP-19 | Regresión del bloqueo de CAC001 | No se ofrece como disponible; origen e historial siguen consultables. |

Las cinco pruebas automatizadas deben cubrir lógica significativa, por ejemplo: cálculo de merma, validación de cantidad, consumo/idempotencia, permisos de estado y privacidad de la ficha. Registrar comando y resultado reales en el informe de pruebas.

## 7. Estado encontrado en el repositorio

Esta fotografía se actualizó el 16 de octubre de 2026 contra `main` en `1e3a866`. Describe lo que el frontend implementa en ese commit; no certifica por sí sola el estado del servidor ni reemplaza las evidencias ejecutadas de E05.

### Frontend

- `/operador` tiene formularios de recepción y transformación, búsqueda/filtro de inventario y registro de operaciones. Implementa validaciones del navegador, alertas de merma, revisión de saldo, justificación de salida mayor que entrada y rechazo de reenvíos con la misma clave.
- `/admin` tiene alertas, balance económico, bloqueo/liberación con motivo, auditoría, filtros y exportación CSV.
- `/ficha/[lote]` funciona como ficha pública: oculta costos y márgenes, consulta `GET /catalog/traceability` sin token y muestra algunos campos remotos si hay coincidencia. El recorrido operativo y parte del contenido siguen procediendo de la tienda de demostración local.
- Recepción, transformación, inventario, estado de lote, auditoría operativa, costos y CSV se manejan en `frontend/lib/store.ts` mediante `localStorage`. La persistencia sobrevive a recargas del mismo navegador, pero no equivale a escritura durable en PostgreSQL ni a respaldo recuperable del servidor.
- En modo normal, el inicio de sesión usa `POST /auth/login`, guarda tokens en `sessionStorage` y reintenta una vez con `POST /auth/refresh` ante `401`. El registro consulta `GET /auth/register/roles` y usa `POST /auth/register`. Hay una discrepancia vigente: el formulario ofrece Operador/Administrador/Comprador; el backend permite por defecto Comprador/Consulta (`VIEWER`), excluye siempre Administrador y deja configurable Operador mediante `ORIVIA_SELF_REGISTRATION_ROLES`. Comprador permanece en la landing tras el acceso. No usar el rol visual del cliente como frontera de seguridad.
- Hay un fallback importante por documentar en la demo: si `POST /auth/register` falla por error de red, el frontend muestra éxito y abre el login como si la cuenta estuviera creada, pero no guarda usuario en el backend ni en el store local. El login real no tiene el mismo fallback salvo que se active `NEXT_PUBLIC_ORIVIA_DEMO_MODE=true`.
- El panel de administrador lee el resumen de inventario, alertas y pedidos y la lista de márgenes desde la API mientras haya sesión, y el botón de sincronización ejecuta una llamada a integración. Estos datos de lectura no convierten las escrituras de lotes del panel en transacciones del servidor.
- La pestaña de clúster presenta actores, necesidades, ofertas y conexiones sintéticas; se persiste en `localStorage` y aún no consume la API de clúster desde sus componentes.
- El indicador offline y la acción que marca operaciones como sincronizadas simulan el outbox; no realizan una sincronización real con Raspberry Pi ni con la nube.

### Backend

El backend ya ofrece autenticación real con JWT/refresh, pedidos con transiciones, timeline, auditoría de pedidos, anclaje local durable e insights de IA de solo lectura. También existen rutas de catálogo/trazabilidad y consultas de inventario, costos, alertas, márgenes y reportes. La documentación de integración está en `backend/API_CONTRACT_ORIVIA.md`.

En el estado inspeccionado no encontré un flujo de API completo integrado al frontend para crear recepción de lote, registrar transformaciones y sus movimientos de inventario, bloquear/liberar lote con permisos y motivo, y producir la ficha comercial desde esos mismos registros. El frontend sí integra autenticación/registro, lecturas administrativas resumidas, sincronización de integración y una consulta pública complementaria. Las consultas existentes de inventario/costos no reemplazan el flujo transaccional de lote.

### Brechas que afectan una demostración funcional integrada

1. **Integración frontend/API:** login y registro están conectados; el resumen administrativo y la sincronización de integración también llaman a la API. Las escrituras operativas del panel siguen usando datos locales. La ficha pública consulta la API pero mantiene la línea de tiempo local como fuente de su vista.
2. **Recepción y transformación en servidor:** falta completar o confirmar los endpoints y transacciones de lote, etapas, incidencias y movimientos.
3. **Autorización:** las acciones críticas deben validarse por rol en la API; no basta el control de acceso visual en `/admin`.
4. **Estado y auditoría de lotes:** el backend de pedidos no es automáticamente el historial agroindustrial de lote; sus entidades y estados necesitan un contrato explícito.
5. **Respaldo y recuperación:** la persistencia del navegador no satisface el requisito de respaldo recuperable del sistema.
6. **Alertas y economía:** hay consultas y fórmulas parciales; se debe asegurar que la API recalcule sobre datos de operación y documente costos incluidos.
7. **Pruebas/evidencias:** la lista de aceptación de este documento es un plan. Falta entregar resultados ejecutados, cinco pruebas automatizadas vinculadas al flujo y la medición de 100 registros.

### Saldo de etapas: ajuste local implementado y pendiente de reflejo en servidor

El almacén local calcula ahora `disponible = recibido - consumido + producido`, redondeado a una cifra decimal. Esto permite que una secuencia como `100 kg -> 80 kg -> 70 kg` consuma en la etapa siguiente la salida de la etapa anterior. La corrección está en `frontend/lib/store.ts` y se cubre en las pruebas del store; debe reflejarse en la lógica transaccional del servidor para que la regla sea confiable fuera del navegador.

Al integrar el flujo, el contrato operativo debe definir movimientos por etapa (entrada descontada, salida acreditada, unidad/estado del material y vínculo de origen), mantener el balance por lote y evitar consumos concurrentes o duplicados. La corrección cliente no sustituye una transacción ni la validación del lado servidor.

## 8. Mapa de integración: existente frente a pendiente

| Necesidad del frontend operativo | Capacidad encontrada | Estado para la prueba de fuego |
|---|---|---|
| Login, refresh y perfil | `/api/v1/auth/login`, `/api/v1/auth/refresh`; existe helper para `/api/v1/auth/me` | Login y refresh ya se llaman desde el cliente. La carga del usuario actual con `/me` y la revocación server-side al cerrar sesión no están conectadas. Mantener autorización en servidor. |
| Registro de cuenta | `/api/v1/auth/register/roles`, `/api/v1/auth/register`; roles configurables por `ORIVIA_SELF_REGISTRATION_ROLES` | Conectado, pero corregir discrepancia de perfiles: el frontend ofrece ADMIN, que el autoservicio siempre excluye, y omite VIEWER; Operador solo podrá registrarse si el entorno lo permite. Verificar el manejo de red y no presentar el fallback local como cuenta creada en servidor. |
| Registrar recepción | No se encontró ruta de escritura de recepción de lote | Definir contrato y persistencia, con validación y transacción. |
| Registrar transformación/incidencia | Existe flujo de pedidos/eventos, no el registro industrial de transformación | Definir endpoint de dominio, inventario, idempotencia y auditoría de lote. |
| Resumen de inventario/alertas/pedidos y márgenes | `GET /api/v1/reports/overview`, `GET /api/v1/accounting/margins` | El panel administrativo muestra el resumen remoto. No sustituye las listas y operaciones locales de lotes; verificar resultados y permisos para la evidencia E05. |
| Cambiar estado de producto | Hay estados/transiciones de pedidos, no se debe asumir que equivalen al estado de lote | Definir estados de producto y permiso solo ADMIN para bloquear/liberar con motivo. |
| Trazabilidad pública | `GET /api/v1/catalog/traceability` sin token más ficha frontend de demostración | La ficha consulta y presenta coincidencias remotas, pero la línea de tiempo local sigue siendo su base; conectar la ficha completa a los mismos lotes persistidos cuando exista el flujo. |
| Auditoría | Existen rutas de auditoría para pedidos | Extender/confirmar auditoría de lotes, transformación y cambio de estado. |
| CSV de lotes | El frontend exporta su almacén local | Sustentar exportación con datos/políticas del servidor para administrador cuando se integre el dominio de lotes. |
| Clúster: actores, necesidades y conexiones | Hay endpoints de clúster en el contrato; la UI interna usa un store local | Integrar componentes del clúster a la API; no presentar la red sintética como directorio vivo. |
| Respaldo y restore | El repositorio documenta herramientas de PostgreSQL | Ejecutar restauración de un respaldo de demo y documentar evidencia. |

Los nombres y payloads de endpoints pendientes deben acordarse con las personas responsables del backend antes de conectar pantallas. Este documento no inventa rutas ni sustituye `backend/API_CONTRACT_ORIVIA.md`.

## 9. Responsabilidades para cerrar la operación

- **Daniel:** presentar el comportamiento operativo en el frontend, formularios, estados, mensajes de error y vistas de cada rol, trabajando dentro de `frontend/app/` y `frontend/components/`. Esta asignación no le atribuye cambios de backend.
- **Ángel:** coordinar flujos UX, criterios de aceptación y observación de uso con Daniel.
- **Sebas y Kevin:** acordar contratos, autorización, transacciones, persistencia y esquema compartido para lotes, transformaciones, inventario, costos y auditoría.
- **Equipo:** ejecutar los casos, registrar resultados honestos, preparar respaldo recuperable, identificar la versión evaluada y declarar qué sigue simulado.

Consultar `TEAM_STRUCTURE.md`, `PLAN_HACKATON_ORIVIA.md`, `ARQUITECTURA_ORIVIA_HACKATON.md` y `ESTRUCTURA_FRONTEND_ORIVIA.md` para el reparto y contexto completos.

## 10. Fuentes de aceptación

- `Reto_Oficial_Devurity_Agroindustria.pdf`: RF01–RF12, datos y pruebas comunes, entregables E01–E10, evaluación, bloqueo de CAC001 y pitch.
- `PLAN_HACKATON_ORIVIA.md`: alcance por rol, guion de demo y responsabilidades internas.
- `ARQUITECTURA_ORIVIA_HACKATON.md`: fronteras entre landing, paneles, API, seguridad y trazabilidad.
- `ESTRUCTURA_FRONTEND_ORIVIA.md`: pantallas encontradas, simulaciones locales y diferencias frente al reto.
- `backend/API_CONTRACT_ORIVIA.md` y `backend/HISTORIAL_BACKEND_ORIVIA.md`: rutas y estado documentado del backend.
- Código consultado: `frontend/lib/store.ts`, `frontend/components/panels/operador/OperatorPanel.tsx`, `frontend/components/panels/admin/AdminPanel.tsx` y `frontend/components/ficha/FichaPublica.tsx`.
