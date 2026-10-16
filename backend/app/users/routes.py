from uuid import UUID

from flask import Blueprint, g, jsonify, request
from psycopg.errors import UniqueViolation

from ..security.middleware import require_access_token
from .schemas import validate_user_payload
from .service import principal_has_role, public_user, repo

users_bp = Blueprint("users", __name__)


def _admin_only():
    return principal_has_role(g.current_principal, "ADMIN")


@users_bp.get("/users")
@require_access_token
def list_users():
    if not _admin_only():
        return jsonify(error="FORBIDDEN", message="Se requiere rol ADMIN"), 403
    status = request.args.get("status")
    if status is not None:
        status = status.upper()
        if status not in {"ACTIVE", "BLOCKED", "SUSPENDED"}:
            return jsonify(error="VALIDATION_ERROR", message="Estado inválido"), 400
    return jsonify({"data": [public_user(row) for row in repo.list(status)]})


@users_bp.get("/users/<uuid:user_id>")
@require_access_token
def get_user(user_id: UUID):
    if not _admin_only() and str(user_id) != g.current_principal.get("sub"):
        return jsonify(
            error="FORBIDDEN", message="No puede consultar este usuario"
        ), 403
    row = repo.by_id(user_id)
    return (
        (jsonify(data=public_user(row)), 200)
        if row
        else (jsonify(error="NOT_FOUND", message="Usuario no encontrado"), 404)
    )


@users_bp.post("/users")
@require_access_token
def create_user():
    if not _admin_only():
        return jsonify(error="FORBIDDEN", message="Se requiere rol ADMIN"), 403
    try:
        data = validate_user_payload(request.get_json(silent=True) or {})
    except ValueError as exc:
        return jsonify(error="VALIDATION_ERROR", message=str(exc)), 400
    try:
        return jsonify(data=public_user(repo.create(data, data["roles"]))), 201
    except UniqueViolation:
        return jsonify(
            error="CONFLICT", message="Email ya registrado o datos inválidos"
        ), 409


@users_bp.patch("/users/<uuid:user_id>")
@require_access_token
def update_user(user_id: UUID):
    if not _admin_only() and str(user_id) != g.current_principal.get("sub"):
        return jsonify(error="FORBIDDEN", message="No puede editar este usuario"), 403
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify(error="VALIDATION_ERROR", message="Se requiere un objeto JSON"), 400
    editable_fields = (
        ("full_name", "phone", "municipality")
        if not _admin_only()
        else ("full_name", "account_status", "phone", "municipality")
    )
    allowed = {key: data[key] for key in editable_fields if key in data}
    if not allowed:
        return jsonify(error="VALIDATION_ERROR", message="No hay campos editables"), 400
    for field in ("full_name", "phone", "municipality"):
        value = allowed.get(field)
        if value is not None and (
            not isinstance(value, str)
            or not value.strip()
            or len(value.strip()) > {"full_name": 120, "phone": 30, "municipality": 80}[field]
        ):
            return jsonify(error="VALIDATION_ERROR", message=f"{field} inválido"), 400
        if isinstance(value, str):
            allowed[field] = value.strip()
    if "account_status" in allowed and allowed["account_status"] not in (
        "ACTIVE",
        "BLOCKED",
        "SUSPENDED",
    ):
        return jsonify(error="VALIDATION_ERROR", message="Estado inválido"), 400
    row = repo.update(user_id, allowed)
    return (
        (jsonify(data=public_user(row)), 200)
        if row
        else (jsonify(error="NOT_FOUND", message="Usuario no encontrado"), 404)
    )


@users_bp.delete("/users/<uuid:user_id>")
@require_access_token
def disable_user(user_id: UUID):
    if not _admin_only():
        return jsonify(error="FORBIDDEN", message="Se requiere rol ADMIN"), 403
    row = repo.update(user_id, {"account_status": "BLOCKED"})
    return (
        (jsonify(data={"disabled": True, "user_id": str(row["user_id"])}), 200)
        if row
        else (jsonify(error="NOT_FOUND", message="Usuario no encontrado"), 404)
    )
