# Migraciones de Kevin

Ejecutar en orden dentro de la base PostgreSQL privada:

```bash
psql "$ORIVIA_DATABASE_URL" -f migrations/001_initial.sql
psql "$ORIVIA_DATABASE_URL" -f migrations/002_seed_synthetic.sql
```

`001_initial.sql` crea usuarios, roles, proveedores, clientes, productos, lotes, inventario, costos, pedidos, eventos, auditoría, anclajes pendientes, refresh tokens y bitácora de sincronizaciones. `002_seed_synthetic.sql` agrega datos sintéticos sin contraseñas reales.

El módulo no genera JWT. El hash de contraseña debe llegar desde el servicio de autenticación compartido; la tabla solo almacena `password_hash`.

Para respaldo y restauración:

```bash
pg_dump --format=custom --file=orivia.backup "$ORIVIA_DATABASE_URL"
pg_restore --dbname="$ORIVIA_DATABASE_URL" --clean --if-exists orivia.backup
```

No exponer PostgreSQL públicamente. Los secretos se configuran mediante variables de entorno.
