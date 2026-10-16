# Registro de cuentas ORIVIA

Registro público con nombre, correo, contraseña, confirmación y tipo de cuenta. Crea el usuario en PostgreSQL (`orivia.app_user` + `orivia.app_user_role`) mediante el `UserRepository` existente; después el usuario entra con el login actual (`POST /api/v1/auth/login`). No modifica seguridad, tokens, pedidos, trazabilidad, auditoría ni blockchain.

## Endpoints

| Método | Ruta | Respuesta |
| --- | --- | --- |
| GET | `/api/v1/auth/register/roles` | `200 {"data":[{"role":"BUYER","label":"Comprador"}, …]}` |
| POST | `/api/v1/auth/register` | `201 {"data": usuario público}` (sin hash ni contraseña) |

Cuerpo del POST: `full_name`, `email`, `password`, `password_confirmation`, `role`. Cualquier otro campo (`roles`, `permissions`, `account_status`…) se ignora.

| Código | `error` | Causa |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Nombre, correo o cuerpo inválidos (`field` indica el campo) |
| 400 | `PASSWORD_MISMATCH` | La confirmación no coincide |
| 400 | `WEAK_PASSWORD` | Menos de 10 caracteres, sin mayúscula, minúscula, número o símbolo, más de 72 bytes, común o contiene el correo |
| 403 | `ROLE_NOT_ALLOWED` | Rol fuera de los de autoservicio (p. ej. ADMIN) |
| 409 | `EMAIL_UNAVAILABLE` | Correo ya registrado (también por el índice único `lower(email)`) |
| 429 | `REGISTER_RATE_LIMITED` | Demasiados intentos desde la misma IP (`Retry-After`) |
| 503 | `REGISTER_FAILED` | Error interno; el detalle solo va al log del servidor |

## Seguridad

- La contraseña se guarda solo como hash bcrypt (`auth_tokens/passwords.hash_password`); nunca se registra en logs ni se devuelve.
- Sanitización: normalización Unicode, sin caracteres de control, nombre solo con letras y separadores, correo en minúsculas.
- ADMIN y ACCOUNTING no pueden habilitarse para autoservicio ni por configuración. Los administradores siguen creando cuentas privilegiadas con `POST /api/v1/users`.
- Límite por IP en proceso (igual que el login); en producción conviene reforzarlo en el proxy.

## Variables de entorno

| Variable | Defecto | Uso |
| --- | --- | --- |
| `ORIVIA_SELF_REGISTRATION_ROLES` | `BUYER,VIEWER` | Roles elegibles al registrarse (OPERATOR solo si el equipo lo decide) |
| `ORIVIA_REGISTER_RATE_LIMIT_ENABLED` | `true` | Activa el límite de intentos |
| `ORIVIA_REGISTER_RATE_LIMIT_MAX_ATTEMPTS` | `5` | Intentos por IP dentro de la ventana |
| `ORIVIA_REGISTER_RATE_LIMIT_WINDOW_SECONDS` | `3600` | Ventana y bloqueo, en segundos |
| `NEXT_PUBLIC_ORIVIA_API_URL` (frontend) | `http://localhost:8000/api/v1` | Backend al que llama el formulario |

## Archivos

- Backend: `app/users/self_registration.py` (nuevo), `app/database/registration.py` (registra el blueprint), `tests/users/test_self_registration.py` (nuevo), `.env.example`, `API_CONTRACT_ORIVIA.md`.
- Frontend: `components/auth/RegisterModal.tsx` (nuevo), `lib/registro.ts` y `lib/registro.test.ts` (nuevos), `lib/orivia-api.ts` (`register`, `getRegistrationRoles`), `components/auth/LoginModal.tsx` (enlace «Crear cuenta» y correo precargado), `components/landing/LandingPage.tsx`, `package.json` (`npm test`).

## Pruebas

```bash
cd backend && pytest -q tests/users/test_self_registration.py
cd frontend && npm test
```

Casos: registro exitoso (hash bcrypt, sin contraseña en la respuesta, login posterior), correo duplicado (consulta previa y restricción única), contraseña débil, datos inválidos, rol no autorizado, campos de privilegio ignorados y límite de intentos.

Prueba manual: en la landing, «Iniciar sesión» → elegir un rol → «Crear cuenta». Completa el formulario; tras «Cuenta creada» se abre el login con el correo precargado. Repetir el mismo correo muestra el error en el campo correo.
