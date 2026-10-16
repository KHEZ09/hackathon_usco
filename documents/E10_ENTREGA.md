# E10 - Checklist de entrega

## Equipo

- Sebas: arquitectura, seguridad, API, trazabilidad, blockchain e IA.
- Kevin: usuarios, PostgreSQL, contabilidad, reportes e integraciones.
- Ángel y Daniel: UX, diseño y validación de interfaz.

## Enlaces

- Repositorio: `https://github.com/KHEZ09/hackathon_usco`
- Frontend: `https://orivia.tobaru.xyz`
- API: `https://oriviaurlapi.tobaru.xyz/api/v1`

## Matriz final

| Requisito | Componente | Prueba | Evidencia | Estado |
|---|---|---|---|---|
| RF01-RF04 | `backend/app/lots` | tests de lotes | E02/E05 | Implementado |
| RF05/RF12 | store/reportes | pruebas de costos | E02/E05 | Requiere captura final |
| RF06 | `public/lots`, QR | ficha pública | E04/E05 | Implementado |
| RF07/RF08 | PostgreSQL | persistencia/idempotencia | E04/E05 | Validado |
| RF09/RF10 | permisos/auditoría | bloqueo y verificación | E02/E05 | Validado |
| RF11 | exportación | CSV | E05 | Validado local |
| Clúster | `backend/app/cluster` + frontend | tests trust | E03/E05 | Implementado; UI remota a cerrar |
| IA | `backend/app/ai` | rutas IA | E08 | Configurada |
| Blockchain | contrato/EVM + anclaje durable | anchor/verify | E04/E05 | EVM nuevo pendiente de POL |

## Cierre

No congelar la entrega hasta adjuntar el reporte de 100 registros, una prueba de
backup/restore, la sesión de usabilidad y una escritura EVM financiada, o dejar
explícitamente esas dependencias como limitaciones de la presentación.
