# Cinco casos automatizados de validación

La suite ejecutable está en
`backend/tests/security/test_five_validation_cases.py`. Estos casos son la
evidencia automatizada mínima; no sustituyen los 15 casos manuales o de
frontend.

| Caso | Regla comprobada | Resultado esperado |
|---|---|---|
| V01 | Un pedido no puede tener cantidad cero. | HTTP 400 `INVALID_ORDER`. |
| V02 | La contraseña no puede superar el límite aceptado por bcrypt. | HTTP 400 `INVALID_CREDENTIALS_PAYLOAD`. |
| V03 | El esquema de usuario rechaza un email inválido. | `ValueError`. |
| V04 | Un costo contable no puede ser negativo. | HTTP 400 `VALIDATION_ERROR`. |
| V05 | Un usuario no puede consultar el pedido de otro usuario. | HTTP 404 `ORDER_NOT_FOUND`. |

## Ejecución

Desde `backend/`:

```bash
pytest -q tests/security/test_five_validation_cases.py
```

En el servidor, la ejecución reproducible usa el contenedor de pruebas:

```bash
bash ../infra/orivia-server/scripts/test.sh
```

El resultado esperado para la suite completa es `85 passed` como mínimo,
incluyendo estos cinco casos.
