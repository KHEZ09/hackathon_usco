# ORIVIA - Entrega Hackathon USCO

La fuente de entregables E01-E10 está en `documents/`. Este archivo es la puerta
de entrada para el jurado: identifica el repositorio, los entornos, el flujo demo
y las evidencias que deben acompañar el commit final.

## Flujo demo

Login -> recepción de CAC001 (100 kg) -> transformación (80 kg) -> alerta 20% ->
auditoría -> bloqueo/liberación -> QR/ficha pública -> verificación de historial
y certificado blockchain.

## Comandos de validación

```bash
cd backend
python -m pytest -q
python scripts/verify_lot_postgres_persistence.py
cd ../frontend
npm ci
npm run type-check
npm run lint
npm test
```

## Estado honesto

El fallback durable de blockchain funciona y existe evidencia EVM previa. Una
nueva escritura EVM requiere POL de testnet; no se declara confirmada mientras
la wallet no tenga saldo suficiente. El paquete debe congelarse solo después de
completar o documentar esa evidencia, 100 registros, backup/restore y usabilidad.

## Equipo y responsabilidades

Sebas: seguridad, API, trazabilidad, blockchain e IA. Kevin: usuarios, base de
datos, contabilidad e integraciones. Ángel y Daniel: UX y diseño.
