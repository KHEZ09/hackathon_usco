# Usuarios

Módulo ubicado en `backend/app/users/`. Administra perfiles, roles y estado de cuenta en PostgreSQL.

## Rutas

Todas requieren `Authorization: Bearer <access_token>`.

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/api/v1/users` | ADMIN | Lista usuarios; acepta filtro `status`. |
| GET | `/api/v1/users/{id}` | ADMIN o propio usuario | Consulta un usuario. |
| POST | `/api/v1/users` | ADMIN | Crea un usuario y sus roles. |
| PATCH | `/api/v1/users/{id}` | ADMIN o propio usuario | Actualiza perfil o estado permitido. |
| DELETE | `/api/v1/users/{id}` | ADMIN | Bloquea la cuenta sin borrar el registro. |

## Creación

El servicio recibe `full_name`, `email`, `password_hash`, `roles` y opcionalmente `phone` y `municipality`. La contraseña debe llegar ya convertida en hash por la capa de autenticación. Kevin no genera JWT ni verifica contraseñas.

## Estados

Los estados admitidos son `ACTIVE`, `BLOCKED` y `SUSPENDED`. El borrado lógico conserva la trazabilidad del usuario.

## Dependencia externa

El endpoint de login, la generación del hash, JWT, refresh tokens y permisos definitivos pertenecen a Sebas.
