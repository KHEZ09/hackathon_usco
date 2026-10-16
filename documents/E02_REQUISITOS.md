# E02 - Requisitos y criterios de aceptación

| ID | Historia / aceptación | Prioridad | Estado |
|---|---|---:|---|
| RF01 | Recibir lote con ID, productor, origen, fecha, cantidad positiva y unidad | Alta | Implementado/probado |
| RF02 | Registrar etapa, responsable, fecha, entradas, salidas e incidencia | Alta | Implementado/probado |
| RF03 | Consultar origen -> transformaciones -> producto final | Alta | Implementado/probado |
| RF04 | Alertar merma, demora, costo o inconsistencia con causa | Alta | Implementado/probado |
| RF05 | Calcular costo unitario o margen mostrando fórmula y supuestos | Alta | Implementado; falta evidencia final de recorrido |
| RF06 | Ficha comercial pública por enlace/código/QR sin costos privados | Alta | Implementado; falta recorrido final con frontend |
| RF07 | Conservar datos después de reinicio | Alta | Validado con PostgreSQL |
| RF08 | Inventario recibido/consumido/disponible, sin sobreconsumo e idempotente | Alta | Validado |
| RF09 | PENDING/LIBERATED/BLOCKED con permiso de administrador y motivo | Alta | Implementado/probado |
| RF10 | Auditoría de actor, fecha, cambios anterior/nuevo y sin borrar historia | Alta | Implementado/probado |
| RF11 | Filtrar y exportar CSV de lotes | Media | Implementado; falta evidencia final |
| RF12 | Balance económico sin división por cero y con costos explicados | Alta | Implementado; falta evidencia final |

## Criterio de hora 12

CAC001 se bloquea sin eliminar eventos, se identifica el origen y la cantidad
afectada, se registra la tarjeta de cambio y se repite la regresión. La prueba
correspondiente está en `backend/tests/test_hour12_incident.py` y
`backend/docs/change-cards/2026-10-16-hora12-cac001.md`.
