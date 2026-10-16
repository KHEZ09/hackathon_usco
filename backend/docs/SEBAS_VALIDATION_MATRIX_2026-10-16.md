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
| Persistencia | `OrderRepository`, clúster y lotes usan PostgreSQL en producción; readiness tiene timeout de 2 s | 80 pruebas locales; servidor con PostgreSQL saludable y prueba de persistencia remota aprobada | Listo en `orivia` | Ninguna del backend aislado |
| Auditoría | Reutilización de `AuditRecord` inmutable | Prueba de auditoría de CAC001 | Listo | Ninguna |
| Blockchain | Hash-chain de lotes, anclaje PostgreSQL y adaptador EVM real | Polygon Amoy, contrato desplegado, pedido sintético anclado, reintento idempotente y `verified=true` contra contrato | Listo en staging | Producción requiere política de custodia, red y rotación aprobada |
| IA | Fallback local read-only y cliente Ollama Cloud autenticado | Pedido sintético analizado por `gpt-oss:120b`; respuesta `source=ollama:gpt-oss:120b`; fallback conservado | Listo en staging | Frontend consume el contrato; producción requiere límites/costos del proveedor |
| Docker | Compose y scripts cargan configuración de API/PostgreSQL más blockchain/Ollama | Local: 80 tests, compileall y Ruff; remoto: health, ready, smoke, persistencia, EVM y Ollama pasan | Listo en `orivia` | Repetir después de cada push |
| Handoff frontend | Contrato de rutas, sesión, permisos, visibilidad y errores | Revisión cruzada contra `API_CONTRACT_ORIVIA.md` y pruebas de autorización | Listo en `FRONTEND_HANDOFF_ORIVIA.md` | Ángel y Daniel deben conectar pantallas |
| Blockchain EVM público | Script de despliegue, artefacto Solidity y adaptador EVM preparados | EVM local: contrato en bloque 1, anclaje en bloque 2, `isAnchored=true`; servidor no tiene RPC, wallet ni contrato | Código validado, red pública pendiente | Requiere RPC, wallet dedicada y fondos de testnet |

## Evidencia local

```text
backend: 80 passed in 4.36s
ruff (app, tests y scripts): All checks passed
compileall app tests: OK
orivia Docker: servicio API y PostgreSQL saludables
orivia smoke: `/health`, `/ready` y frontera 401 aprobados
orivia persistence: pedido, evento, anclaje y recreación de aplicación aprobados
orivia runtime: `ORIVIA_ORDER_REPOSITORY=postgres`, `ORIVIA_BLOCKCHAIN_BACKEND=evm`
orivia runtime: Polygon Amoy `chain_id=80002`, contrato EVM desplegado y verificado
orivia runtime: Ollama Cloud `gpt-oss:120b` respondió; fallback local conservado
orivia runtime: UFW activo y SSH limitado a `tailscale0`
orivia deploy: API/PostgreSQL saludables, migraciones sin pendientes y persistencia aprobada
```

## Faltantes reales, separados del bloque de Sebas

1. Frontend debe construir directorio, necesidades, conexión, confianza y
   timeline del lote.
2. Frontend debe consumir el contrato de `backend/API_CONTRACT_ORIVIA.md` y
   configurar su origen explícito en `ORIVIA_CORS_ORIGINS`.
3. Kevin debe cerrar la verificación de usuarios, roles persistidos, migraciones
   y módulos empresariales sin alterar las interfaces de Sebas.
4. Antes de producción: HTTPS, backups/restores, rotación de secretos y política
   de custodia para la cuenta blockchain.
