from flask import Blueprint, jsonify

from ..security.middleware import require_access_token
from .service import IntegrationService

integrations_bp = Blueprint("integrations", __name__)


@integrations_bp.post("/integrations/<provider>/sync")
@require_access_token
def sync(provider: str):
    if not provider or len(provider) > 80:
        return jsonify(error="VALIDATION_ERROR", message="Proveedor inválido"), 400
    result = IntegrationService().sync(provider)
    return jsonify(data=result), 202
