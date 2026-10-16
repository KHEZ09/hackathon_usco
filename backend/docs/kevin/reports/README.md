# Reportes

Módulo ubicado en `backend/app/reports/`.

## Ruta

```text
GET /api/v1/reports/overview
```

Requiere `Authorization: Bearer <access_token>` y devuelve un resumen agregado de inventario, costos, lotes y alertas mediante la propiedad `data`.

El reporte consulta PostgreSQL y no modifica datos. Los filtros y reportes analíticos avanzados pueden ampliarse cuando estén definidos los contratos de pedidos y auditoría de Sebas.
