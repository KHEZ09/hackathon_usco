from flask import Blueprint, jsonify

from ..security.middleware import require_access_token
from .queries import report_repo

reports_bp = Blueprint("reports", __name__)


@reports_bp.get("/reports/overview")
@require_access_token
def overview():
    return jsonify(data=report_repo.overview())
