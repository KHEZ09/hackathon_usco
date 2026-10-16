# Catálogo y trazabilidad pública

Módulo ubicado en `backend/app/catalog/`. Permite consultar información comercial y la procedencia sintética de los lotes.

## Rutas públicas

| Método | Ruta | Filtros |
|---|---|---|
| GET | `/api/v1/catalog/products` | `q` para búsqueda textual. |
| GET | `/api/v1/catalog/traceability` | `q` y `municipality`. |

Estas rutas no exponen información privada y son aptas para el rol Comprador.

## Rutas protegidas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/v1/suppliers` | Lista proveedores. |
| GET | `/api/v1/customers` | Lista clientes. |

## Datos incluidos

La semilla sintética contiene productos de cacao, proveedor, finca, cliente y el lote `HUI-2026-0001` con sus movimientos de recepción.
