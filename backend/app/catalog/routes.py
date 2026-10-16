from flask import Blueprint, jsonify, request

from ..security.middleware import require_access_token
from ..security.permissions import require_permissions
from .service import catalog_repo

catalog_bp = Blueprint("catalog", __name__)


@catalog_bp.get("/catalog/products")
def products():
    return jsonify(data=catalog_repo.products(request.args.get("q"), public_only=True))


@catalog_bp.get("/catalog/traceability")
def traceability():
    return jsonify(
        data=catalog_repo.traceability(
            request.args.get("q"), request.args.get("municipality")
        )
    )


@catalog_bp.get("/suppliers")
@require_access_token
@require_permissions("catalog:read")
def suppliers():
    return jsonify(data=catalog_repo.suppliers())


@catalog_bp.get("/customers")
@require_access_token
@require_permissions("catalog:read")
def customers():
    return jsonify(data=catalog_repo.customers())
