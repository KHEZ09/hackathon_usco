# Base de datos y repositorios

La conexión se implementa en `backend/app/database/connection.py` y los accesos de dominio en `repositories.py`.

## Características

- PostgreSQL como fuente de verdad.
- Esquema `orivia`.
- UUID como claves primarias.
- Consultas parametrizadas.
- Transacciones para operaciones de escritura.
- Adaptación segura de datos JSONB mediante `psycopg`.
- Comprobación de disponibilidad para `/ready`.

## Repositorios

- `UserRepository`: identidad, estado y roles.
- `CatalogRepository`: productos, proveedores, clientes y trazabilidad.
- `AccountingRepository`: inventario, costos, alertas y márgenes.
- `ReportRepository`: resumen operativo.
- `IntegrationRepository`: registro de sincronizaciones.

## Seguridad de datos

Las rutas no abren conexiones dispersas. Los filtros se ejecutan en SQL con parámetros y las restricciones, índices y triggers se aplican en las migraciones.

## Validación

La base contiene datos sintéticos de demostración. No se deben cargar datos personales o productivos reales durante el reto.
