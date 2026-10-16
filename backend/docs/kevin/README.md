# Documentación de los cambios de Kevin

Esta carpeta documenta los módulos de datos e integraciones implementados para ORIVIA. Se mantiene separada de `backend/README.md`, que se actualizará al cierre del reto.

## Documentos

- [Usuarios](users/README.md)
- [Base de datos](database/README.md)
- [Catálogo y trazabilidad pública](catalog/README.md)
- [Contabilidad e inventario](accounting/README.md)
- [Reportes](reports/README.md)
- [Integraciones externas](integrations/README.md)
- [Migraciones](migrations/README.md)
- [Operación y despliegue](operations/README.md)
- [Casos manuales de validación](manual-test-cases.md)
- [Red digital del clúster](cluster-network/README.md)

## Alcance

Los módulos de esta carpeta administran datos persistentes, consultas y conectores externos. Las rutas protegidas reutilizan el middleware de autenticación existente; la emisión, renovación y revocación de tokens pertenece a Sebas.

## Convenciones

- Prefijo de API: `/api/v1`.
- Identificadores: UUID.
- Fechas: UTC.
- Base de datos: PostgreSQL, esquema `orivia`.
- Respuestas exitosas: objeto con propiedad `data`.
- Errores de validación: `error=VALIDATION_ERROR` y HTTP 400.
- No se documentan secretos ni credenciales reales.

El contrato general de Flask, autenticación, pedidos, trazabilidad, auditoría
e IA está en [`backend/API_CONTRACT_ORIVIA.md`](../../API_CONTRACT_ORIVIA.md).

## Pendientes de integración

- Conectar el login de Sebas al repositorio de usuarios.
- Confirmar permisos definitivos para cada rol.
- Integrar pedidos, auditoría, blockchain e IA con las tablas persistentes.
