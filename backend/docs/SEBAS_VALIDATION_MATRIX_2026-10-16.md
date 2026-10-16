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
| Blockchain | Hash-chain de lotes y anclaje existente de pedidos | Verificación de eventos y pruebas de anclaje existentes | Listo para evidencia local | Proveedor público es decisión posterior |
| IA | Fallback local read-only, cliente Ollama y credencial opcional para proveedor remoto | 80 pruebas pasan; servidor confirma Ollama no configurado, sin instalar el modelo pesado | Código listo; runtime externo pendiente | Requiere URL/modelo/credencial y capacidad suficiente |
| Docker | Contratos y scripts de prueba documentados para `orivia` | Local: 80 tests, compileall y Ruff; remoto: health, ready, smoke y persistencia pasan | Listo en `orivia` con `b3bd044` | Repetir después de cada push |
| Handoff frontend | Contrato de rutas, sesión, permisos, visibilidad y errores | Revisión cruzada contra `API_CONTRACT_ORIVIA.md` y pruebas de autorización | Listo en `FRONTEND_HANDOFF_ORIVIA.md` | Ángel y Daniel deben conectar pantallas |
| Blockchain EVM público | Script de despliegue, artefacto Solidity y adaptador EVM preparados | Pruebas de contrato/artifact pasan; servidor no tiene RPC, wallet ni contrato | Preparado, no activado | Requiere credenciales y fondos de testnet |

## Evidencia local

```text
backend: 80 passed in 4.36s
ruff (app, tests y scripts): All checks passed
compileall app tests: OK
orivia Docker: servicio API y PostgreSQL saludables
orivia smoke: `/health`, `/ready` y frontera 401 aprobados
orivia persistence: pedido, evento, anclaje y recreación de aplicación aprobados
orivia runtime: `ORIVIA_ORDER_REPOSITORY=postgres`, `ORIVIA_BLOCKCHAIN_BACKEND=postgres`
orivia runtime: Ollama no instalado/configurado; UFW activo y SSH limitado a `tailscale0`
orivia deploy: commit `f5b8f72`, migraciones sin pendientes
```

## Faltantes reales, separados del bloque de Sebas

1. Frontend debe construir directorio, necesidades, conexión, confianza y
   timeline del lote.
2. Activar blockchain público requiere RPC, wallet dedicada financiada, contrato y
   `chain_id`; no se puede completar sin esas credenciales externas.
3. Activar Ollama real requiere un proveedor/modelo accesible; `gpt-oss:120b`
   no es viable para esta instancia de 1.9 GiB RAM sin un endpoint remoto.
4. Frontend debe consumir el contrato de `backend/API_CONTRACT_ORIVIA.md` y
   configurar su origen explícito en `ORIVIA_CORS_ORIGINS`.
