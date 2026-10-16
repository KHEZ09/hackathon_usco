# E04 - Funcionamiento y demo

## Ejecución

```powershell
cd backend
docker compose up -d --build
python scripts/migrate.py
python scripts/provision_demo_users.py
cd ../frontend
npm ci
npm run dev
```

La URL de API se configura con `NEXT_PUBLIC_ORIVIA_API_URL`. En producción el
frontend no debe activar `NEXT_PUBLIC_ORIVIA_DEMO_MODE`; las operaciones sin JWT
se rechazan y no se guardan silenciosamente en localStorage.

## Datos sintéticos

Usuarios demo: operador, administrador y comprador provisionados por el backend.
CAC001 representa 100 kg recibidos, 80 kg disponibles tras una transformación y
20% de merma, lo que dispara la alerta del 15%.

## Integración real

El panel de operador consulta lotes y pedidos desde la API, crea recepciones y
transformaciones persistidas, y muestra historial y cantidad de anclajes. El
administrador usa los endpoints de reportes, estados, auditoría, IA y blockchain.
La ficha pública lee una proyección sin costos ni actores privados.

## Estado de blockchain

El contrato y el anclaje EVM están configurados para Polygon Amoy y existe una
prueba de anclaje verificable. Una nueva escritura EVM necesita saldo POL; si el
RPC no está financiado, la API devuelve `BLOCKCHAIN_UNAVAILABLE` y conserva la
cadena durable local, sin declarar un certificado EVM inexistente.
