"""Registro público de cuentas ORIVIA.

Vive aparte de auth_tokens/security para no tocar login, tokens ni permisos: solo crea el
usuario con hash bcrypt y un rol de autoservicio permitido por el servidor. El cliente
inicia sesión después con el login existente.
"""

from __future__ import annotations

import os
import re
import unicodedata
from typing import Any

from flask import Blueprint, current_app, g, jsonify, request
from psycopg.errors import UniqueViolation

from ..auth_tokens.passwords import hash_password
from ..database.repositories import UserRepository
from ..security.middleware import require_access_token
from ..security.rate_limit import LoginRateLimiter
from .service import principal_has_role, public_user

registration_bp = Blueprint("registration", __name__)

# Roles que jamás quedan activos por autoservicio, aunque se configuren por entorno.
PRIVILEGED_ROLES = frozenset({"ADMIN", "ACCOUNTING"})
KNOWN_ROLES = frozenset({"OPERATOR", "ADMIN", "ACCOUNTING", "BUYER", "VIEWER"})
DEFAULT_SELF_ROLES = ("BUYER", "VIEWER")
# Roles que se pueden solicitar en el registro público, pero nacen pendientes (SUSPENDED)
# hasta que un administrador los apruebe: nadie se asigna permisos por sí mismo.
DEFAULT_APPROVAL_ROLES = ("OPERATOR", "ADMIN")
ROLE_LABELS = {"BUYER": "Comprador", "VIEWER": "Consulta", "OPERATOR": "Operador", "ADMIN": "Administrador", "ACCOUNTING": "Contabilidad"}

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$")
NAME_RE = re.compile(r"^[^\W\d_]+(?:[ '.-][^\W\d_]+)*$")
PASSWORD_MIN_LENGTH = 10
PASSWORD_MAX_BYTES = 72  # límite de bcrypt
COMMON_PASSWORDS = frozenset(
    {"password1!", "contraseña1", "qwerty1234", "1234567890", "orivia2024!", "orivia2026!", "cacao12345"}
)


class RegistrationError(Exception):
    def __init__(self, status: int, code: str, message: str, field: str | None = None):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.field = field


def self_registration_roles() -> tuple[str, ...]:
    """Roles de autoservicio: configurables, pero nunca administrativos."""
    raw = os.getenv("ORIVIA_SELF_REGISTRATION_ROLES")
    roles = [r.strip().upper() for r in raw.split(",")] if raw else list(DEFAULT_SELF_ROLES)
    allowed = tuple(dict.fromkeys(r for r in roles if r in KNOWN_ROLES and r not in PRIVILEGED_ROLES))
    return allowed or DEFAULT_SELF_ROLES


def approval_roles() -> tuple[str, ...]:
    """Roles que se piden en el registro y requieren aprobación de un administrador."""
    raw = os.getenv("ORIVIA_APPROVAL_REGISTRATION_ROLES")
    roles = [r.strip().upper() for r in raw.split(",")] if raw is not None else list(DEFAULT_APPROVAL_ROLES)
    self_roles = set(self_registration_roles())
    return tuple(dict.fromkeys(r for r in roles if r in KNOWN_ROLES and r not in self_roles))


def password_issues(password: str, email: str = "") -> list[str]:
    issues = []
    if len(password) < PASSWORD_MIN_LENGTH:
        issues.append(f"al menos {PASSWORD_MIN_LENGTH} caracteres")
    if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        issues.append(f"máximo {PASSWORD_MAX_BYTES} bytes")
    if not re.search(r"[a-záéíóúñ]", password):
        issues.append("una minúscula")
    if not re.search(r"[A-ZÁÉÍÓÚÑ]", password):
        issues.append("una mayúscula")
    if not re.search(r"\d", password):
        issues.append("un número")
    if not re.search(r"[^\w\s]|_", password):
        issues.append("un símbolo")
    local = email.split("@")[0].casefold()
    if password.casefold() in COMMON_PASSWORDS or (len(local) >= 4 and local in password.casefold()):
        issues.append("no ser una contraseña común ni contener tu correo")
    return issues


def _clean_text(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    value = unicodedata.normalize("NFC", value)
    value = "".join(ch for ch in value if unicodedata.category(ch)[0] != "C")
    return re.sub(r"\s+", " ", value).strip()


def validate_registration(data: Any, allowed_roles: tuple[str, ...]) -> dict[str, Any]:
    if not isinstance(data, dict):
        raise RegistrationError(400, "VALIDATION_ERROR", "Se requiere un objeto JSON.")

    full_name = _clean_text(data.get("full_name"))
    if not 2 <= len(full_name) <= 120 or not NAME_RE.fullmatch(full_name):
        raise RegistrationError(400, "VALIDATION_ERROR", "Escribe un nombre válido (2 a 120 letras).", "full_name")

    email = _clean_text(data.get("email")).casefold()
    if len(email) > 254 or not EMAIL_RE.fullmatch(email):
        raise RegistrationError(400, "VALIDATION_ERROR", "Escribe un correo válido.", "email")

    password = data.get("password")
    confirm = data.get("password_confirmation")
    if not isinstance(password, str) or not isinstance(confirm, str) or not password:
        raise RegistrationError(400, "VALIDATION_ERROR", "La contraseña y su confirmación son obligatorias.", "password")
    if password != confirm:
        raise RegistrationError(400, "PASSWORD_MISMATCH", "Las contraseñas no coinciden.", "password_confirmation")
    issues = password_issues(password, email)
    if issues:
        raise RegistrationError(400, "WEAK_PASSWORD", "La contraseña debe tener " + ", ".join(issues) + ".", "password")

    role = data.get("role", allowed_roles[0])
    role = role.strip().upper() if isinstance(role, str) else ""
    if role not in allowed_roles:
        # Incluye intentos de autoasignarse ADMIN/ACCOUNTING u otros roles no habilitados.
        raise RegistrationError(403, "ROLE_NOT_ALLOWED", "Ese rol no está disponible para registro público.", "role")

    # Solo se devuelven campos conocidos: permisos, estado o roles extra del cliente se ignoran.
    return {"full_name": full_name, "email": email, "password": password, "role": role}


def _repository() -> UserRepository:
    repository = current_app.extensions.get("orivia_user_repository")
    return repository if repository is not None else UserRepository()


def _limiter() -> LoginRateLimiter:
    limiter = current_app.extensions.get("orivia_register_rate_limiter")
    if limiter is None:
        limiter = LoginRateLimiter(
            max_failures=int(os.getenv("ORIVIA_REGISTER_RATE_LIMIT_MAX_ATTEMPTS", "5")),
            window_seconds=int(os.getenv("ORIVIA_REGISTER_RATE_LIMIT_WINDOW_SECONDS", "3600")),
            block_seconds=int(os.getenv("ORIVIA_REGISTER_RATE_LIMIT_WINDOW_SECONDS", "3600")),
        )
        current_app.extensions["orivia_register_rate_limiter"] = limiter
    return limiter


def _rate_limited(retry_after: int):
    response = jsonify(
        error="REGISTER_RATE_LIMITED",
        message="Demasiados intentos de registro. Intenta nuevamente más tarde.",
        retry_after_seconds=retry_after,
    )
    response.headers["Retry-After"] = str(retry_after)
    return response, 429


def _error(exc: RegistrationError):
    body = {"error": exc.code, "message": exc.message}
    if exc.field:
        body["field"] = exc.field
    return jsonify(body), exc.status


@registration_bp.get("/auth/register/roles")
def registration_roles():
    roles = [{"role": r, "label": ROLE_LABELS.get(r, r.title()), "requires_approval": False} for r in self_registration_roles()]
    roles += [{"role": r, "label": ROLE_LABELS.get(r, r.title()), "requires_approval": True} for r in approval_roles()]
    return jsonify(data=roles)


@registration_bp.post("/auth/register")
def register():
    enabled = os.getenv("ORIVIA_REGISTER_RATE_LIMIT_ENABLED", "true").lower() != "false"
    key = f"register-ip:{request.remote_addr or 'unknown'}"
    if enabled:
        # Cada intento cuenta, exitoso o no: limita la creación masiva de cuentas por IP.
        limiter = _limiter()
        decision = limiter.check(key)
        if not decision.allowed:
            return _rate_limited(decision.retry_after_seconds)
        limiter.record_failure(key)

    try:
        data = validate_registration(request.get_json(silent=True), self_registration_roles() + approval_roles())
    except RegistrationError as exc:
        return _error(exc)

    pending = data["role"] not in self_registration_roles()
    repo = _repository()
    duplicate = RegistrationError(
        409, "EMAIL_UNAVAILABLE", "No es posible registrar ese correo. Si ya tienes cuenta, inicia sesión.", "email"
    )
    try:
        if repo.by_login(data["email"]):
            return _error(duplicate)
        row = repo.create(
            {
                "full_name": data["full_name"],
                "email": data["email"],
                "password_hash": hash_password(data["password"]),
                "account_status": "SUSPENDED" if pending else "ACTIVE",
            },
            [data["role"]],
        )
    except UniqueViolation:
        return _error(duplicate)
    except Exception:  # no se filtran detalles internos al cliente
        current_app.logger.exception("register_failed")
        return jsonify(error="REGISTER_FAILED", message="No se pudo crear la cuenta. Intenta más tarde."), 503

    user = public_user(row)
    user["roles"] = [data["role"]]
    user["requires_approval"] = pending
    return jsonify(data=user), 201


# ── Gestión de cuentas por el administrador ─────────────────────────────────


def _admin_only():
    if not principal_has_role(g.current_principal, "ADMIN"):
        return jsonify(error="FORBIDDEN", message="Solo un administrador puede gestionar cuentas."), 403
    return None


def _account_view(row: dict[str, Any]) -> dict[str, Any]:
    view = public_user(row)
    view["roles"] = list(row.get("roles") or [])
    view["pending_approval"] = row.get("account_status") == "SUSPENDED"
    return view


@registration_bp.get("/auth/accounts")
@require_access_token
def list_accounts():
    denied = _admin_only()
    if denied:
        return denied
    status = (request.args.get("status") or "").strip().upper() or None
    if status and status not in {"ACTIVE", "BLOCKED", "SUSPENDED"}:
        return jsonify(error="VALIDATION_ERROR", message="Estado inválido"), 400
    rows = _repository().list_accounts(status)
    return jsonify(data=[_account_view(row) for row in rows])


@registration_bp.post("/auth/accounts")
@require_access_token
def create_account():
    """El administrador crea cuentas activas de cualquier rol (operador, administrador, comprador...)."""
    denied = _admin_only()
    if denied:
        return denied
    try:
        data = validate_registration(request.get_json(silent=True), tuple(sorted(KNOWN_ROLES)))
    except RegistrationError as exc:
        return _error(exc)
    repo = _repository()
    duplicate = RegistrationError(409, "EMAIL_UNAVAILABLE", "Ya existe una cuenta con ese correo.", "email")
    try:
        if repo.by_login(data["email"]):
            return _error(duplicate)
        row = repo.create(
            {"full_name": data["full_name"], "email": data["email"], "password_hash": hash_password(data["password"]), "account_status": "ACTIVE"},
            [data["role"]],
        )
    except UniqueViolation:
        return _error(duplicate)
    except Exception:  # no se filtran detalles internos al cliente
        current_app.logger.exception("admin_create_account_failed")
        return jsonify(error="REGISTER_FAILED", message="No se pudo crear la cuenta. Intenta más tarde."), 503
    return jsonify(data=_account_view({**row, "roles": [data["role"]]})), 201


@registration_bp.patch("/auth/accounts/<user_id>/status")
@require_access_token
def set_account_status(user_id: str):
    """Aprobar (ACTIVE) o bloquear (BLOCKED) una cuenta; un administrador no puede bloquearse a sí mismo."""
    denied = _admin_only()
    if denied:
        return denied
    body = request.get_json(silent=True)
    status = body.get("status") if isinstance(body, dict) else None
    if status not in ("ACTIVE", "BLOCKED"):
        return jsonify(error="VALIDATION_ERROR", message="status debe ser ACTIVE o BLOCKED"), 400
    if status == "BLOCKED" and str(user_id) == str(g.current_principal.get("sub")):
        return jsonify(error="VALIDATION_ERROR", message="No puedes bloquear tu propia cuenta."), 400
    try:
        row = _repository().update(user_id, {"account_status": status})
    except Exception:
        current_app.logger.exception("account_status_failed")
        return jsonify(error="NOT_FOUND", message="Usuario no encontrado"), 404
    if not row:
        return jsonify(error="NOT_FOUND", message="Usuario no encontrado"), 404
    current_app.logger.info("account_status_changed user=%s status=%s by=%s", user_id, status, g.current_principal.get("sub"))
    return jsonify(data=public_user(row))
