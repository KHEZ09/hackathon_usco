# Operación y despliegue de los cambios de Kevin

## Servicios

Docker Compose ejecuta:

- `api`: Flask con Gunicorn.
- `postgres`: PostgreSQL 16 en una red privada.

PostgreSQL no se publica directamente hacia Internet.

## Configuración

El archivo `.env` existe únicamente en el servidor. Debe contener como mínimo `ORIVIA_ENV`, `ORIVIA_JWT_SECRET_KEY` y `ORIVIA_DATABASE_URL`. En producción la clave JWT debe ser única y tener al menos 32 bytes.

La imagen de producción se ejecuta con un usuario sin privilegios de root, la
API queda enlazada a `127.0.0.1:8000`, PostgreSQL solo se expone dentro de la
red privada de Docker y el Compose local exige configurar el archivo `.env` en
lugar de incluir contraseñas fijas. Las rutas de pedidos también aplican
autorización a nivel de objeto para impedir que un usuario consulte o cambie
pedidos ajenos aunque conozca su UUID.

## Despliegue actual de staging

El entorno oficial documentado es `admin@orivia`, directorio
`/opt/orivia/repo`. Existe además una copia adicional histórica en
`/home/admin/backend`; no debe borrarse ni detenerse sin confirmar su
propietario y propósito.

El entorno adicional de `/home/admin/backend` usa el puerto `8001` porque el
puerto `8000` estaba ocupado por el servicio oficial. El servicio oficial usa
`127.0.0.1:8000` según `infra/orivia-server/docker-compose.yml`.

Comprobaciones:

```bash
docker compose ps
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8001/ready
```

## Estado validado

- El procedimiento esperado valida contenedor de API activo.
- El procedimiento esperado valida PostgreSQL saludable.
- `/ready` debe confirmar `database: ok`.
- Las migraciones 001, 002, 003 y 004 deben aparecer aplicadas o como `SKIP`.
- El backup debe restaurarse sobre una base temporal antes de considerarse
  comprobado.
- `ruff check app tests` debe finalizar sin hallazgos.
- El frontend debe pasar `npm run lint`, `npm run test`, `npm run build` y
  `npm audit --omit=dev --audit-level=high`.

## Límites

El despliegue final detrás de HTTPS, proxy inverso, login y permisos definitivos dependen de la integración de Sebas.
