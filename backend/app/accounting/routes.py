from flask import Blueprint, jsonify
from ..security.middleware import require_access_token
from .service import accounting_repo

accounting_bp = Blueprint('accounting', __name__)


@accounting_bp.get('/accounting/inventory')
@require_access_token
def inventory(): return jsonify(data=accounting_repo.inventory())


@accounting_bp.get('/accounting/costs')
@require_access_token
def costs(): return jsonify(data=accounting_repo.costs())


@accounting_bp.get('/accounting/alerts')
@require_access_token
def alerts(): return jsonify(data=accounting_repo.open_alerts())
