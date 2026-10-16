# Integraciones externas

Módulo ubicado en `backend/app/integrations/`. Centraliza clientes HTTP y evita que las rutas de negocio llamen directamente a APIs externas.

## Ruta

```text
POST /api/v1/integrations/{provider}/sync
```

Requiere token y devuelve HTTP 202 al registrar o iniciar una sincronización.

## Garantías del cliente

- URL base normalizada.
- Timeout configurable por cliente.
- Reintentos limitados.
- Validación y normalización de respuestas.
- Registro de inicio y finalización en `integration_sync_log`.
- Errores sin contraseñas, tokens ni secretos.

## Proveedores

El nombre del proveedor se valida como texto no vacío de máximo 80 caracteres. Los adaptadores concretos se agregan sin cambiar el contrato del servicio.

## Variables

Las URLs y credenciales deben configurarse mediante `.env` del entorno. Nunca deben versionarse.
