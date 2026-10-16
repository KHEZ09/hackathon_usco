import re


def validate_user_payload(data: dict, *, require_password_hash: bool = True) -> dict:
    if not isinstance(data, dict):
        raise TypeError("El cuerpo debe ser un objeto JSON")
    required = ("full_name", "email") + (
        ("password_hash",) if require_password_hash else ()
    )
    missing = [field for field in required if data.get(field) in (None, "")]
    if missing:
        raise ValueError(f"Campos requeridos: {', '.join(missing)}")
    full_name = data["full_name"]
    email = data["email"]
    if not isinstance(full_name, str) or not 2 <= len(full_name.strip()) <= 120:
        raise ValueError("full_name debe tener entre 2 y 120 caracteres")
    if not isinstance(email, str) or len(email.strip()) > 254:
        raise ValueError("Email inválido")
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email.strip()):
        raise ValueError("Email inválido")
    password_hash = data.get("password_hash")
    if require_password_hash and (
        not isinstance(password_hash, str)
        or not re.fullmatch(r"\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}", password_hash)
    ):
        raise ValueError("password_hash debe ser un hash bcrypt válido")
    raw_roles = data.get("roles", ["BUYER"])
    if not isinstance(raw_roles, (list, tuple)) or not raw_roles:
        raise ValueError("roles debe ser una lista no vacía")
    roles = [str(role).upper() for role in raw_roles]
    invalid = set(roles) - {"OPERATOR", "ADMIN", "ACCOUNTING", "BUYER", "VIEWER"}
    if invalid:
        raise ValueError(f"Roles inválidos: {', '.join(sorted(invalid))}")
    for field in ("phone", "municipality"):
        if field in data and data[field] is not None and not isinstance(data[field], str):
            raise ValueError(f"{field} debe ser texto")
    return {
        **data,
        "full_name": full_name.strip(),
        "email": email.strip().casefold(),
        "roles": list(dict.fromkeys(roles)),
    }
