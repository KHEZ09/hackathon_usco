# Seguridad de ORIVIA

## Controles aplicados

- Los secretos de producción viven únicamente en `infra/orivia-server/.env`.
- El código no incluye una URL de base de datos funcional por defecto; el
  entorno debe proporcionarla explícitamente.
- La configuración de producción rechaza la clave JWT de desarrollo, la URL de
  PostgreSQL de desarrollo y orígenes CORS con credenciales, rutas o comodín.
- La API limita el tamaño de cuerpos, usa respuestas JSON genéricas para errores
  inesperados, headers de seguridad y no almacena tokens en logs.
- Las rutas sensibles exigen permisos de negocio además de autenticación.
- Los pedidos aplican autorización a nivel de objeto: operadores y compradores
  solo ven y modifican sus propios pedidos; contabilidad y administración usan
  permisos explícitos para acceder al conjunto completo.
- El backend se ejecuta sin root en la imagen de producción y PostgreSQL no se
  publica fuera de la red privada de Docker.
- Los clientes HTTP externos validan el origen, tienen timeout, bloquean
  redirecciones y limitan el tamaño de respuesta.
- Las dependencias de producción del frontend se auditan con:

  ```bash
  npm audit --omit=dev --audit-level=high
  ```

## Limitación conocida

La herramienta de auditoría de npm reporta actualmente un aviso alto en la
dependencia de desarrollo transitiva `braces`, usada por `eslint-config-next`.
La versión corregida todavía no está publicada y `npm audit fix --force`
propone degradar `eslint-config-next`, por lo que no se aplica automáticamente.
El paquete no entra en la instalación de producción (`npm audit --omit=dev`
queda sin vulnerabilidades); debe revisarse nuevamente cuando el upstream
publique una versión corregida.

## Verificación mínima antes de desplegar

```bash
cd backend
bash ../infra/orivia-server/scripts/test.sh
docker run --rm -v "$PWD":/workspace -w /workspace orivia-backend:test ruff check app tests
bash ../infra/orivia-server/scripts/deploy.sh
bash ../infra/orivia-server/scripts/healthcheck.sh
bash ../infra/orivia-server/scripts/smoke_test.sh
bash ../infra/orivia-server/scripts/persistence_test.sh
```

No se deben subir `.env`, credenciales, tokens, dumps de bases reales ni llaves
privadas. Los datos del reto son sintéticos.
