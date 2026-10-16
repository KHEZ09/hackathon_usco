# E05 - Pruebas y evidencias

## Automatización ejecutada

En el último corte del repositorio: frontend `npm run type-check`, `npm run lint`
y `npm test` pasan; la suite frontend valida RF01, RF02, RF04, RF05, RF08,
RF09, RF10, RF11, RF12 y el clúster. Python compila sin errores. En el servidor
la suite backend reportó 118 pruebas exitosas y 1 advertencia.

## Casos mínimos

| Caso | Entrada | Resultado esperado | Resultado actual |
|---|---|---|---|
| T01 | CAC001 100 kg | Recepción válida e ID único | PASA |
| T02 | Cantidad 0 o negativa | Rechazo | PASA |
| T03 | 100 -> 80 kg | Merma 20% y alerta | PASA |
| T04 | Reenvío con misma clave | Sin duplicado | PASA |
| T05 | Consumo mayor al disponible | Rechazo | PASA |
| T06 | Bloqueo sin motivo | Rechazo | PASA |
| T07 | Bloqueo por admin | Estado y auditoría | PASA |
| T08 | Usuario sin permiso | 403 | PASA |
| T09 | Reinicio PostgreSQL | Datos conservados | PASA en servidor |
| T10 | Cadena alterada | Verificación negativa | PASA |
| T11 | Ficha pública | Oculta costos y privados | PASA |
| T12 | Exportación CSV | Columnas RF11 | PASA local |
| T13 | Costo 0 / salida 0 | Sin división por cero | PASA |
| T14 | Anclaje EVM financiado | TX confirmada | PENDIENTE: falta POL |
| T15 | 100 registros | Tiempo medido <= 3 s | PENDIENTE de captura formal |

## No declarar como final

La prueba EVM financiada y la medición de 100 registros deben ejecutarse y
adjuntarse antes de afirmar cumplimiento total. El fallback local es funcional y
auditable, pero no sustituye una evidencia EVM nueva.
