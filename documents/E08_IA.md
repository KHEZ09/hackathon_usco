# E08 - Declaración de uso de IA

## Herramienta y finalidad

ORIVIA usa Ollama/OSS para resumir datos de trazabilidad, apoyar auditorías y
explicar analíticas. El modelo no decide bloquear o liberar: las reglas y los
permisos del backend son determinísticos.

## Control humano

La respuesta se muestra como apoyo, con datos de entrada, incertidumbre y
recomendación. Un administrador valida cualquier decisión operativa. Si Ollama
no responde, la plataforma conserva las reglas, la auditoría y el flujo base.

## Dependencias y costos

La disponibilidad del proveedor/modelo es una dependencia externa. No se
incluyen claves en el bundle, y la demo debe poder recorrer recepción,
transformación, alerta, bloqueo y ficha pública sin IA.

## Evidencia

Las rutas están cubiertas por `backend/tests/test_ai_routes.py`; falta adjuntar
una captura final de una respuesta real del proveedor en el paquete de entrega.
