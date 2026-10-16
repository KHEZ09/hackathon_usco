# E07 - Despliegue, instalación y recuperación

## Entornos

- Desarrollo: Docker Compose con Flask y PostgreSQL.
- Staging: instancia ORIVIA con Docker, migraciones y healthcheck.
- Frontend: build Next.js para Hostinger, separado de la API.
- API: `https://oriviaurlapi.tobaru.xyz/api/v1` cuando el certificado y CORS
  estén activos.

## Operación

```bash
cd backend
docker compose up -d --build
python scripts/migrate.py
./scripts/backup.sh
./scripts/restore.sh <archivo>
./scripts/healthcheck.sh
```

Nunca se incluyen secretos, claves privadas, JWT ni API keys en el frontend ni
en commits. Antes de entrega se debe guardar el hash del commit final y probar
backup/restore con datos sintéticos.
