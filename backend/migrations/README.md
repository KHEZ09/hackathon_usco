# Migraciones de PostgreSQL

Las migraciones se ejecutan mediante `scripts/migrate.py`, que aplica los
archivos en orden y registra un checksum en `orivia.schema_migration`. No se
debe editar una migración que ya haya sido aplicada; se debe crear otra.

## Orden actual

```text
001_initial.sql
002_seed_synthetic.sql
003_seed_inventory.sql
004_orders_traceability_persistence.sql
```

`001_initial.sql` crea usuarios, roles, proveedores, clientes, productos,
lotes, inventario, costos, pedidos, eventos, auditoría, anclajes pendientes,
refresh tokens y bitácora de sincronizaciones.

`002_seed_synthetic.sql` agrega usuarios, productos y proveedor sintéticos sin
contraseñas reales.

`003_seed_inventory.sql` agrega finca, cliente, lote, recepción y costo de
demostración para validar inventario y trazabilidad.

`004_orders_traceability_persistence.sql` agrega el payload público del pedido
y el hash persistente del evento que necesita el adaptador PostgreSQL de
pedidos. No reemplaza las tablas de los módulos de Kevin.

## Aplicar migraciones

```bash
export ORIVIA_DATABASE_URL='postgresql://usuario:password@host:5432/orivia'
python scripts/migrate.py
```

El comando es idempotente: las migraciones aplicadas se muestran como `SKIP`.
Si el checksum de una migración cambió, el proceso se detiene para evitar una
alteración silenciosa del esquema.

El módulo no genera JWT. El hash de contraseña debe llegar desde el servicio de
autenticación compartido; la tabla solo almacena `password_hash`.

## Backup y restauración

```bash
pg_dump --format=custom --no-owner --file=orivia.backup "$ORIVIA_DATABASE_URL"
pg_restore --dbname="$ORIVIA_DATABASE_URL" --clean --if-exists orivia.backup
```

La restauración debe probarse primero sobre una base temporal. No se debe
exponer PostgreSQL públicamente. Los secretos se configuran mediante variables
de entorno y no se suben a Git.
