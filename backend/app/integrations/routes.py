import re

from flask import Blueprint, jsonify

from ..security.middleware import require_access_token
from ..security.permissions import require_permissions
from .service import IntegrationService

integrations_bp = Blueprint("integrations", __name__)


@integrations_bp.post("/integrations/<provider>/sync")
@require_access_token
@require_permissions("integrations:sync")
def sync(provider: str):
    if not re.fullmatch(r"[A-Za-z0-9_.-]{1,80}", provider):
        return jsonify(error="VALIDATION_ERROR", message="Proveedor inválido"), 400
    result = IntegrationService().sync(provider)
    return jsonify(data=result), 202
