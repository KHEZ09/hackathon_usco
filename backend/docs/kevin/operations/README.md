# Operación y despliegue de los cambios de Kevin

## Servicios

Docker Compose ejecuta:

- `api`: Flask con Gunicorn.
- `postgres`: PostgreSQL 16 en una red privada.

PostgreSQL no se publica directamente hacia Internet.

## Configuración

El archivo `.env` existe únicamente en el servidor. Debe contener como mínimo `ORIVIA_ENV`, `ORIVIA_JWT_SECRET_KEY` y `ORIVIA_DATABASE_URL`. En producción la clave JWT debe ser única y tener al menos 32 bytes.

## Despliegue actual de staging

Servidor: `admin@100.104.169.58`, directorio `/home/admin/backend`.

La instancia de Orivia usa el puerto `8001` porque el puerto `8000` ya estaba ocupado por otro servicio existente. No se detuvo ni se modificó ese servicio.

Comprobaciones:

```bash
docker compose ps
curl http://127.0.0.1:8001/health
curl http://127.0.0.1:8001/ready
```

## Estado validado

- Contenedor de API activo.
- Contenedor PostgreSQL saludable.
- `/ready` confirma `database: ok`.
- Migraciones 001, 002 y 003 aplicadas.
- Backup PostgreSQL probado.

## Límites

El despliegue final detrás de HTTPS, proxy inverso, login y permisos definitivos dependen de la integración de Sebas.
