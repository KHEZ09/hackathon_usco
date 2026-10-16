# Casos manuales de validación de Kevin

Estos casos cubren la capa de datos e integraciones sin depender de una
interfaz concreta. Deben ejecutarse contra el backend desplegado y usando solo
cuentas y datos sintéticos.

## Preparación

1. Aplicar las migraciones.
2. Provisionar las tres cuentas demo mediante `scripts/provision_demo_users.py`.
3. Confirmar `/health` y `/ready`.
4. Obtener tokens mediante `POST /api/v1/auth/login`.

## Casos

| ID | Acción | Resultado esperado |
|---|---|---|
| M01 | Consultar `/api/v1/catalog/products`. | HTTP 200 y productos públicos. |
| M02 | Consultar productos con `?q=cacao`. | Solo resultados coincidentes. |
| M03 | Consultar `/api/v1/catalog/traceability`. | Lotes públicos con origen y producto. |
| M04 | Filtrar trazabilidad por `municipality`. | Solo lotes del municipio indicado. |
| M05 | Consultar inventario sin token. | HTTP 401. |
| M06 | Consultar inventario con token válido. | HTTP 200 y existencias sintéticas. |
| M07 | Consultar costos y márgenes. | HTTP 200 y valores numéricos. |
| M08 | Registrar costo negativo. | HTTP 400; no se escribe en la base. |
| M09 | Registrar costo válido para un lote. | HTTP 200 y costo persistido. |
| M10 | Consultar alertas económicas. | HTTP 200 y alertas abiertas. |
| M11 | Consultar `/api/v1/reports/overview`. | HTTP 200 con inventario, alertas y pedidos. |
| M12 | Consultar `/api/v1/users` como operador. | HTTP 403. |
| M13 | Consultar `/api/v1/users` como administrador. | HTTP 200 y lista sin contraseñas. |
| M14 | Ejecutar la misma migración dos veces. | Segunda ejecución usa `SKIP` y no duplica datos. |
| M15 | Ejecutar backup y restaurar en una base temporal. | El lote y el costo sintéticos vuelven a estar disponibles. |
| M16 | Ejecutar sincronización con proveedor inválido. | HTTP 400 y sin registro de operación. |
| M17 | Ejecutar sincronización con proveedor válido. | HTTP 202 y registro en `integration_sync_log`. |
| M18 | Crear un pedido, cambiarlo a `CONFIRMED` y reiniciar la API. | Pedido, evento y estado sobreviven. |
| M19 | Consultar la auditoría del pedido persistido. | La cadena hash se verifica como válida. |
| M20 | Anclar el último evento dos veces. | La segunda operación es idempotente y no duplica el anclaje. |

## Evidencia mínima

Para cada caso registrar fecha, entorno, usuario sintético, solicitud, código
HTTP, respuesta resumida y resultado. No guardar tokens, contraseñas ni dumps
con datos reales.
