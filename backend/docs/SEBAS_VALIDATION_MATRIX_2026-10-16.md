# Matriz de trabajo y validación de Sebas — 2026-10-16

Esta matriz registra el bloque ejecutado sin depender de Kevin ni del frontend.
Cada punto sigue el ciclo acordado: desarrollar, validar, probar, comprobar,
rectificar, analizar errores, complementar, auditar y comprobar nuevamente.

| Punto | Desarrollo | Validación y prueba | Resultado | Dependencia |
| --- | --- | --- | --- | --- |
| Permisos del clúster | `cluster:read`, `needs:create`, `connections:create`, `trust:read` y `lots:read` en roles server-owned | Pruebas de roles, acceso permitido y `403` | Listo | Ninguna para integrar; Kevin debe mapear roles persistidos |
| Confianza explicable | Fórmula `trust-v1`, niveles, señales, explicaciones y limitaciones | Score 100, penalización por incidencias y contrato JSON | Listo | Datos reales de actores cuando Kevin conecte PostgreSQL |
| Serializadores | Proyecciones pública, compartida y privada para actores, necesidades y ofertas | Se comprueba que público no expone contacto/notas y admin es el único privado | Listo | Frontend solo debe consumir el contrato |
| Contratos de clúster | Rutas públicas/autenticadas para actores, necesidades, conexiones y confianza sobre memoria/PostgreSQL | Pruebas de payload, sujeto JWT, duplicados y permisos | Listo | Frontend para UI; Kevin ya entregó tablas/repositorios |
| Hora 12 / CAC001 | Estados de lote, transición a bloqueado, cantidades, auditoría y hash-chain | Regresión automática en `test_hour12_incident.py` | Listo | Ninguna para demo; persistencia futura requiere migración coordinada |
| RF01–RF07 | Pedidos, actores, trazabilidad, estados y conexión con lo existente | Suite existente + endpoints de clúster | Cubierto en backend | Frontend pendiente para experiencia |
| RF08–RF09 | Estado de lote y disponibilidad pública/privada | CAC001 cambia a `BLOCKED` y no queda disponible | Cubierto | Frontend para visualización |
| RF10 | Auditoría de cambio de estado y verificación de cadena | Auditoría y `history_verified` | Cubierto en adaptador | PostgreSQL para durable |
| RF11–RF12 | Exportación y balance existentes permanecen en módulos de Kevin | No se modifican ni se rompen; suite completa pasa | Sin regresión detectada | Kevin / frontend según ruta |
| Persistencia | `OrderRepository`, clúster y lotes usan PostgreSQL en producción; readiness tiene timeout de 2 s | 68 pruebas pasan; migración `007` ordenada y selección memory/postgres no rompe la factory | Pedidos, clúster y lotes listos | Ninguna en backend; falta ejercitar un reinicio real con CAC001 |
| Auditoría | Reutilización de `AuditRecord` inmutable | Prueba de auditoría de CAC001 | Listo | Ninguna |
| Blockchain | Hash-chain de lotes y anclaje existente de pedidos | Verificación de eventos y pruebas de anclaje existentes | Listo para evidencia local | Proveedor público es decisión posterior |
| IA | No se altera el límite read-only ni el fallback local | Suite IA existente pasa | Sin regresión | Ollama es opcional |
| Docker | Contratos y scripts de prueba documentados para `orivia` | Local: pytest, compileall y Ruff pasan | Código listo para prueba Docker remota | Requiere ejecutar en `orivia` tras push |

## Evidencia local

```text
backend: 68 passed in 6.94s
ruff (app/cluster, app/lots y pruebas nuevas): All checks passed
compileall app tests: OK
```

## Faltantes reales, separados del bloque de Sebas

1. Frontend debe construir directorio, necesidades, conexión, confianza y
   timeline del lote.
2. El equipo debe hacer prueba Docker y smoke test en `orivia` después del push.
3. La selección de blockchain público y HTTPS quedan fuera de esta entrega.
