# Arquitectura y plan general de desarrollo

## ORIVIA

Plataforma de trazabilidad agroindustrial, pedidos verificables y analítica asistida por IA para una asociación cacaotera del Huila.

## 1. Objetivo del producto

La aplicación debe convertir registros dispersos de lotes, transformaciones, inventario, costos y pedidos en una historia única, entendible y verificable.

El producto debe permitir que:

- El operador registre lotes, transformaciones e incidencias.
- El administrador controle inventario, costos, alertas, estados y auditoría.
- El comprador consulte el origen y la historia pública del producto.
- La organización registre pedidos y siga su ciclo comercial.
- La aplicación opere localmente cuando falle Internet.
- Blockchain demuestre que la cadena de trazabilidad y los estados de los pedidos no fueron alterados.
- Ollama convierta datos técnicos en explicaciones, resúmenes y análisis comprensibles.

## 2. Alcance funcional obligatorio

La aplicación debe cubrir RF01-RF12 del reto:

1. Recepción de lotes.
2. Registro de transformaciones.
3. Consulta de trazabilidad.
4. Alertas por merma, retrasos, costos o información incompleta.
5. Cálculo de costo unitario y margen.
6. Ficha comercial pública por enlace, código o QR.
7. Persistencia después de reiniciar.
8. Inventario recibido, consumido y disponible.
9. Estados pendiente, liberado y bloqueado.
10. Auditoría de quién, cuándo y qué cambió.
11. Filtros y exportación CSV.
12. Balance económico.

Extensiones diferenciadoras:

- Pedidos verificables.
- Cadena de evidencia con hashes.
- Anclaje blockchain.
- Operación offline-first.
- Grafo visual de procedencia.
- Auditoría y explicación asistida por IA.
- Panel ejecutivo de riesgos y decisiones.

## 3. Principios de arquitectura

### 3.1 La base de datos es la fuente operativa

La aplicación nunca debe depender de blockchain o IA para registrar una operación básica. Inventario, costos, permisos y estados se validan en el backend y se guardan en una base de datos transaccional.

### 3.2 Blockchain es una capa de evidencia

Blockchain guarda pruebas criptográficas de eventos y pedidos, no todos los datos privados de la asociación.

### 3.3 La IA explica; no decide sola

Los cálculos críticos los realiza el backend. Ollama recibe resultados estructurados, genera explicaciones y propone acciones, pero la liberación, el bloqueo y las correcciones requieren autorización del administrador.

### 3.4 El sistema funciona con conectividad limitada

La Raspberry Pi 5 debe poder recibir y consultar información localmente. La sincronización con AWS y blockchain puede quedar pendiente y reintentarse después.

### 3.5 La UX debe ocultar la complejidad

El comprador no debe conocer wallets, hashes, gas, colas o servicios AWS. La interfaz debe expresar conceptos simples: origen, estado, confianza, riesgo, pedido y verificación.

## 4. Arquitectura general

```text
                           AWS
  ┌──────────────────────────────────────────────────────────┐
  │ CloudFront + S3                                           │
  │ Frontend web / PWA                                        │
  │             │                                             │
  │             ▼                                             │
  │ ALB → ECS Fargate: API y servicios de negocio             │
  │             │              │              │               │
  │             ▼              ▼              ▼               │
  │       RDS PostgreSQL     SQS/EventBus   Blockchain RPC     │
  │             │              │              │               │
  │             ▼              ▼              ▼               │
  │       S3 backups       Sync workers    Smart contract      │
  │                                                          │
  │ EC2 GPU / servicio Ollama: gpt-oss-120b                  │
  │ CloudWatch + Secrets Manager + ECR + IAM                 │
  └──────────────────────────────────────────────────────────┘
                              ▲
                              │ sincronización segura
                              ▼
  ┌──────────────────────────────────────────────────────────┐
  │ Raspberry Pi 5                                            │
  │ Docker Compose                                             │
  │ Edge API + SQLite en SSD + outbox + sync agent            │
  │ Caché de frontend + exportaciones + respaldo local        │
  └──────────────────────────────────────────────────────────┘
```

## 5. Infraestructura AWS

### 5.1 Frontend

- S3 para los archivos compilados del frontend.
- CloudFront como CDN y punto de entrada HTTPS.
- Aplicación PWA responsive.
- Caché de la ficha pública y de los recursos estáticos.

### 5.2 Backend

- Docker image almacenada en Amazon ECR.
- ECS Fargate para ejecutar la API.
- Application Load Balancer para HTTPS y distribución de tráfico.
- API modular, con validación y permisos en servidor.
- Worker separado para sincronización, blockchain y tareas de IA.

### 5.3 Base de datos principal

- Amazon RDS PostgreSQL.
- Transacciones para inventario, transformaciones y pedidos.
- Migraciones versionadas.
- Índices para lote, producto, estado, origen, pedido y fecha.
- RDS Multi-AZ como objetivo productivo; Single-AZ para el MVP si el costo es una limitación.

### 5.4 Archivos y respaldos

- Amazon S3 para respaldos, exportaciones CSV y evidencias.
- Versionado activado en el bucket.
- Cifrado del bucket.
- Política de retención definida.
- Descarga de un respaldo recuperable para la evaluación.

### 5.5 Mensajería y sincronización

- Amazon SQS para eventos pendientes.
- Cola separada para:
  - Sincronización Pi → AWS.
  - Publicación blockchain.
  - Generación de reportes IA.
- Retries con backoff.
- Dead-letter queue para eventos fallidos.

### 5.6 Seguridad y operación

- IAM con mínimo privilegio.
- AWS Secrets Manager para credenciales.
- No guardar secretos en el repositorio.
- CloudWatch Logs para API, workers y sincronización.
- CloudWatch Alarms para errores de API, cola acumulada y fallos de sincronización.
- WAF frente al frontend/API si el despliegue se expone públicamente.

## 6. Raspberry Pi 5 como nodo resiliente

### 6.1 Rol

La Raspberry Pi funciona como un nodo edge local de la asociación. No es una réplica improvisada de AWS: es el punto de operación cuando no hay Internet.

### 6.2 Hardware recomendado

- Raspberry Pi 5 de 8 GB.
- SSD USB 3, preferiblemente con alimentación estable.
- Fuente oficial o fuente de calidad.
- Refrigeración activa.
- UPS o batería si está disponible.
- Red local Wi-Fi o Ethernet.

### 6.3 Servicios locales

```text
Nginx/Caddy
    ↓
Edge API
    ↓
SQLite en SSD con WAL
    ↓
Outbox de eventos + sync agent
```

La Raspberry Pi tendrá:

- Frontend local cacheado.
- API local.
- SQLite como almacenamiento operacional local.
- Tabla `sync_outbox` para operaciones todavía no enviadas.
- Exportación local de CSV.
- Respaldo automático en otro directorio del SSD.
- Endpoint de salud de sincronización.

### 6.4 Persistencia local

SQLite es suficiente para el alcance del reto si se usa correctamente:

- Modo WAL.
- Transacciones explícitas.
- Restricciones de claves foráneas.
- Índices.
- UUID para entidades.
- Idempotency key para operaciones repetibles.
- No borrar eventos de auditoría.

La Pi no debe depender de la disponibilidad de RDS para registrar un lote o consultar la trazabilidad local.

### 6.5 Sincronización

Cada operación local genera un evento:

```json
{
  "event_id": "uuid",
  "device_id": "pi-01",
  "entity_type": "transformation",
  "entity_id": "uuid",
  "operation": "created",
  "payload_hash": "sha256",
  "created_at": "timestamp",
  "status": "pending"
}
```

Cuando vuelve Internet:

1. El agente lee eventos pendientes.
2. Envía el evento a la API de AWS.
3. AWS valida permisos, versión e idempotencia.
4. Si es válido, lo aplica en RDS.
5. El evento pasa a `synced`.
6. Si falla, queda en `retry`.
7. Si supera el límite de intentos, va a `dead_letter`.

## 7. Blockchain y cadena de datos

### 7.1 Qué problema resuelve

Permite demostrar que el historial de un lote o pedido no fue modificado después de ser registrado.

No demuestra por sí sola que la información física sea verdadera. La verdad inicial depende del operador, del administrador y de los controles del sistema.

### 7.2 Cadena interna de evidencia

Cada evento se canoniza como JSON ordenado y se hashea:

```text
hash_n = SHA256(evento_n + hash_n-1)
```

El registro guarda:

- Hash actual.
- Hash anterior.
- Evento.
- Actor.
- Timestamp.
- Lote, producto o pedido relacionado.

### 7.3 Smart contract

El smart contract debe ser pequeño y estable. Funciones conceptuales:

```solidity
createTraceAnchor(
    bytes32 entityId,
    bytes32 dataHash,
    bytes32 previousHash
)

registerOrderHash(
    bytes32 orderId,
    bytes32 dataHash,
    uint8 status
)

updateOrderStatus(
    bytes32 orderId,
    bytes32 dataHash,
    uint8 status
)
```

Eventos:

```solidity
TraceAnchored(entityId, dataHash, previousHash, timestamp)
OrderRegistered(orderId, dataHash, status, timestamp)
OrderStatusChanged(orderId, oldStatus, newStatus, dataHash, timestamp)
```

### 7.4 Estados de publicación

```text
LOCAL_ONLY
PENDING_CHAIN
SUBMITTED
CONFIRMED
FAILED_RETRY
```

La aplicación continúa operando en `LOCAL_ONLY` o `PENDING_CHAIN`. Cuando vuelve la conectividad, el worker publica la evidencia.

### 7.5 Estrategia de demo

Para la hackathon se deben soportar dos modos:

1. Modo local: blockchain simulada o nodo local para demostrar sin Internet.
2. Modo testnet: publicación real cuando exista conectividad y credenciales configuradas.

El modo simulado debe declararse explícitamente como simulación. La evidencia real solo se presenta cuando existe una transacción confirmada.

## 8. Ollama y modelos de IA

### 8.1 Modelo principal

```env
OLLAMA_MODEL_PRIMARY=gpt-oss-120b
```

`gpt-oss-120b` debe ejecutarse en una máquina con GPU suficiente. No se debe intentar alojarlo directamente en la Raspberry Pi 5: la Pi se reserva para operación local, datos y sincronización.

Opciones de despliegue:

- EC2 GPU dedicado en AWS.
- Servidor GPU local.
- Proveedor compatible con Ollama, si se declara y se controla el costo.

### 8.2 Fallback

```env
OLLAMA_MODEL_FALLBACK=<modelo pequeño validado>
```

El fallback puede ejecutarse en una máquina más limitada, pero debe probarse previamente. Si no hay modelo disponible, el sistema usa auditoría determinística y plantillas de explicación.

### 8.3 API Gateway interno de IA

El frontend nunca llama directamente a Ollama.

```text
Frontend → API principal → AI Gateway → Ollama
```

El AI Gateway:

- Filtra información privada.
- Consulta datos autorizados.
- Construye contexto estructurado.
- Define prompts y políticas.
- Valida salida JSON.
- Registra modelo, versión y timestamp.
- Aplica timeout y reintentos.
- Devuelve respuesta entendible.

La protección debe hacerse con una API key interna o autenticación de servicio. No colocar ninguna clave en el navegador.

### 8.4 Casos de uso de IA

- Resumen diario de operación.
- Explicación de una alerta.
- Análisis de mermas.
- Explicación de costo y margen.
- Resumen de auditoría.
- Explicación de impacto al bloquear un lote.
- Generación de reporte para administrador.
- Resumen comercial para comprador.
- Consulta conversacional sobre trazabilidad.

### 8.5 Respuesta estructurada

La IA debe devolver una estructura como:

```json
{
  "summary": "CAC001 presenta una merma superior al umbral.",
  "severity": "high",
  "facts": [
    "Entrada: 100 kg",
    "Salida: 80 kg",
    "Merma: 20%",
    "Umbral: 15%"
  ],
  "recommendation": "Revisar la transformación y mantener el producto bloqueado.",
  "uncertainties": [
    "No se ha confirmado si el costo incluye empaque."
  ],
  "source_event_ids": ["uuid-1", "uuid-2"]
}
```

La interfaz debe mostrar los hechos separados de la interpretación.

## 9. Modelo de dominio

Entidades principales:

- `User`
- `Role`
- `Lot`
- `Producer`
- `Transformation`
- `TransformationInput`
- `TransformationOutput`
- `InventoryMovement`
- `Product`
- `Alert`
- `CostEntry`
- `Order`
- `OrderItem`
- `AuditEvent`
- `EvidenceAnchor`
- `SyncOutbox`
- `AIReport`

Relaciones esenciales:

```text
Producer 1 ─── N Lot
Lot 1 ─── N Transformation
Transformation 1 ─── N Output
Lot/Product 1 ─── N InventoryMovement
Product 1 ─── N OrderItem
Order 1 ─── N AuditEvent
AuditEvent 1 ─── 0..1 EvidenceAnchor
```

## 10. Reglas de negocio críticas

- Cantidades deben ser mayores que cero.
- El identificador de lote es único.
- Una transformación no puede consumir más inventario disponible.
- Una operación reenviada no puede consumir dos veces.
- Las entradas y salidas deben mantener relación con el lote de origen.
- Una salida mayor que la entrada requiere justificación.
- Solo el administrador puede liberar o bloquear.
- Un producto bloqueado no puede aparecer como disponible.
- Los costos internos no se exponen en la ficha pública.
- Los eventos de auditoría no se eliminan.
- Costo unitario debe evitar división entre cero.
- Toda modificación importante debe crear auditoría.
- Los pedidos solo pueden usar productos liberados y disponibles.

## 11. UX principal

### Panel del operador

- Registrar lote.
- Registrar transformación.
- Consultar inventario.
- Reportar incidencia.
- Ver alertas operativas.

### Panel del administrador

- Indicadores de operación.
- Riesgos y alertas.
- Costos y márgenes.
- Grafo de trazabilidad.
- Auditoría.
- Pedidos.
- Integridad blockchain.
- Informe generado por IA.

### Ficha pública

- Producto.
- Origen.
- Historia de transformación.
- Estado.
- QR.
- Pedido.
- Verificación de trazabilidad.

### Principio de diseño

Cada pantalla debe responder una pregunta:

- ¿Qué pasó?
- ¿Dónde pasó?
- ¿Qué cantidad queda?
- ¿Qué riesgo existe?
- ¿Qué debo hacer?
- ¿Puedo verificarlo?

## 12. Estructura sugerida del repositorio

```text
/app
  /frontend
  /backend
  /workers
  /ai-gateway
  /blockchain
    /contracts
    /scripts
  /edge-pi
    /docker
    /sync-agent
/packages
  /domain
  /schemas
  /ui
/infra
  /terraform
  /docker
/data
  /seed
  /backups
/tests
  /unit
  /integration
  /e2e
  /performance
/docs
  /architecture
  /decisions
  /runbooks
```

## 13. API mínima

### Lotes

```text
POST   /api/lots
GET    /api/lots
GET    /api/lots/:id
GET    /api/lots/:id/traceability
```

### Transformaciones

```text
POST   /api/transformations
GET    /api/transformations/:id
```

### Productos

```text
GET    /api/products/:id/public
POST   /api/products/:id/release
POST   /api/products/:id/block
```

### Pedidos

```text
POST   /api/orders
GET    /api/orders/:id
POST   /api/orders/:id/accept
POST   /api/orders/:id/dispatch
POST   /api/orders/:id/deliver
GET    /api/orders/:id/verify
```

### IA

```text
POST   /api/ai/explain-alert
POST   /api/ai/summarize-operation
POST   /api/ai/audit-lot
POST   /api/ai/explain-order
```

### Sincronización

```text
GET    /api/sync/health
POST   /api/sync/push
POST   /api/sync/pull
```

## 14. Fases de desarrollo

### Fase 1: Núcleo funcional

- Usuarios y roles.
- Lotes.
- Transformaciones.
- Inventario.
- Trazabilidad.
- Estados.
- Costos.
- Persistencia.

### Fase 2: Robustez

- Auditoría.
- Idempotencia.
- Validaciones.
- Bloqueo/liberación.
- CSV.
- Respaldo/restauración.
- Pruebas automatizadas.

### Fase 3: UX diferenciadora

- PWA.
- QR.
- Grafo de procedencia.
- Panel de riesgos.
- Ficha comercial.
- Flujo de pedidos.

### Fase 4: Resiliencia

- Raspberry Pi.
- SQLite local.
- Outbox.
- Sincronización.
- Modo sin conexión.

### Fase 5: Blockchain

- Canonicalización de eventos.
- Hash-chain.
- Smart contract.
- Worker de publicación.
- Verificación.
- Modo local y modo testnet.

### Fase 6: IA

- AI Gateway.
- Conexión con Ollama.
- Prompt de auditoría.
- Respuestas estructuradas.
- Resumen de operación.
- Explicación de alertas.
- Manejo de incertidumbre.

### Fase 7: Entrega

- Prueba con 100 registros.
- 15 casos documentados.
- 5 pruebas automatizadas.
- Prueba de restauración.
- Prueba de desconexión.
- Prueba blockchain.
- Prueba de IA.
- Pitch.

## 15. Pruebas indispensables

- Crear lote válido.
- Rechazar cantidad negativa.
- Rechazar lote duplicado.
- Transformar 100 kg a 80 kg.
- Generar alerta de merma del 20%.
- Evitar consumo superior al inventario.
- Evitar doble consumo por reenvío.
- Calcular costo unitario de $20.000 COP/kg.
- Calcular margen del 20%.
- Impedir liberación por operador.
- Bloquear CAC001.
- Encontrar pedidos afectados por CAC001.
- Ocultar costos en ficha pública.
- Reiniciar y recuperar datos.
- Exportar CSV.
- Sincronizar una operación creada sin Internet.
- Reintentar publicación blockchain fallida.
- Detectar hash alterado.
- Explicar una alerta con IA.
- Funcionar sin IA usando auditoría determinística.

## 16. Seguridad y privacidad

- Nunca almacenar secretos en Git.
- No enviar datos privados a la IA sin filtrado.
- No guardar datos personales en blockchain.
- Separar datos públicos e internos.
- Validar permisos en backend.
- Registrar acciones administrativas.
- Aplicar límites de tamaño y frecuencia a la IA.
- Usar TLS en AWS.
- Cifrar respaldos.
- Rotar claves y tokens.
- Revocar dispositivos Pi comprometidos.

## 17. Criterio de éxito

La demo debe demostrar una historia completa:

```text
Registrar lote
  → transformar
  → detectar merma
  → calcular costos
  → liberar/bloquear
  → consultar QR
  → crear pedido
  → anclar evidencia
  → explicar con IA
  → verificar historial
```

La solución no se presenta como “una app con blockchain y un chatbot”. Se presenta como:

> Un sistema de operación y comercialización del cacao que conserva la operación aun sin Internet, demuestra la integridad de su trazabilidad y convierte los datos en decisiones comprensibles.

## 18. Decisiones técnicas iniciales

| Decisión | Elección inicial | Razón |
|---|---|---|
| Nube | AWS | Infraestructura completa y demostrable |
| Operación local | Raspberry Pi 5 + SSD | Resiliencia ante pérdida de conexión |
| Base AWS | PostgreSQL | Integridad, relaciones y transacciones |
| Base local | SQLite WAL | Simplicidad, persistencia y operación edge |
| Frontend | PWA responsive | Móvil, escritorio y modo offline |
| Backend | API modular en contenedor | Reglas centralizadas y despliegue reproducible |
| Blockchain | Hash-chain + smart contract | Evidencia verificable sin exponer datos privados |
| IA | Ollama + gpt-oss-120b | Análisis bajo infraestructura controlada |
| Fallback IA | Modelo local pequeño o reglas determinísticas | La operación no depende de la IA |
| Sincronización | Outbox + SQS | Reintentos, idempotencia y resiliencia |

## 19. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| gpt-oss-120b no cabe en la infraestructura | Ejecutarlo en GPU AWS y mantener fallback |
| Falla de Internet | Raspberry Pi, SQLite y cola local |
| Blockchain no disponible | Publicación pendiente y modo local declarado |
| IA alucina | Datos estructurados, hechos separados e intervención humana |
| Doble sincronización | Idempotency keys y eventos únicos |
| Alteración de datos | Hash-chain, auditoría y verificación |
| Complejidad excesiva | Construir primero RF01-RF12 y luego las extensiones |
| Costos AWS inesperados | Presupuestos, apagado de recursos GPU y logs controlados |

## 20. Regla de priorización

Si el tiempo se reduce, conservar en este orden:

1. RF01-RF12.
2. Permisos e inventario.
3. Auditoría.
4. Respaldo y restauración.
5. UX y ficha pública.
6. Raspberry Pi y sincronización.
7. Blockchain.
8. IA avanzada.

El producto debe ser demostrable sin blockchain ni IA. Blockchain e IA son multiplicadores de innovación, no dependencias del núcleo.
