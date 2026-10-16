# Migraciones y respaldos

Las migraciones se encuentran en `backend/migrations/` y se aplican en orden mediante `backend/scripts/migrate.py`.

## Migraciones actuales

| Archivo | Contenido |
|---|---|
| `001_initial.sql` | Esquema, tablas, claves, índices, vistas, restricciones y triggers iniciales. |
| `002_seed_synthetic.sql` | Usuarios, roles, productos y proveedor sintéticos. |
| `003_seed_inventory.sql` | Finca, cliente, lote, movimiento de recepción y costo sintéticos. |

El runner registra checksums en `orivia.schema_migration`, evita duplicados y detiene cambios no autorizados sobre migraciones ya aplicadas.

## Comandos

```bash
python scripts/migrate.py
bash scripts/backup.sh
bash scripts/restore.sh /ruta/al/backup
```

La restauración debe probarse sobre una base temporal antes de afectar la base principal.
