# Contabilidad, costos e inventario

Módulo ubicado en `backend/app/accounting/`. Sus rutas requieren un access token válido.

## Rutas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/accounting/inventory` | Existencias por lote y producto. |
| GET | `/api/v1/accounting/costs` | Costos registrados por lote. |
| GET | `/api/v1/accounting/alerts` | Alertas económicas abiertas. |
| GET | `/api/v1/accounting/margins` | Márgenes calculados. |
| POST | `/api/v1/accounting/lots/{lot_id}/cost` | Registra costo total y costo por kilogramo. |

## Registro de costo

Payload:

```json
{
  "total_cost": 1200000,
  "cost_per_kg": 12000
}
```

Ambos valores deben ser numéricos no negativos. Las validaciones de inventario y consistencia se refuerzan en PostgreSQL mediante restricciones y triggers.

Si el UUID del lote no existe, la API responde HTTP 404 con `error=NOT_FOUND`;
no expone la excepción de clave foránea de PostgreSQL.

## Datos de demostración

La migración `003_seed_inventory.sql` crea un lote sintético de 100 kg y su costo inicial.
