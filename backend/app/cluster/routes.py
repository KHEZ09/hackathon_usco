from __future__ import annotations

from math import isfinite

from flask import Blueprint, current_app, g, jsonify, request

from ..security.middleware import require_access_token
from ..security.permissions import require_permissions
from .projections import (
    actor_private,
    actor_public,
    actor_shared,
    connection_shared,
    need_public,
    need_shared,
)
from .repository import ClusterValidationError, InMemoryClusterRepository

cluster_bp = Blueprint("cluster", __name__)
public_cluster_bp = Blueprint("public_cluster", __name__)


def _repository() -> InMemoryClusterRepository:
    return current_app.extensions["orivia_cluster_repository"]


def _body() -> dict[str, object] | None:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


def _required_text(data: dict[str, object], field: str) -> str:
    value = data.get(field)
    if not isinstance(value, str) or not value.strip():
        raise ClusterValidationError(f"{field} is required")
    return value.strip()


def _quantity(data: dict[str, object]) -> float:
    value = data.get("quantity")
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ClusterValidationError("quantity must be numeric")
    result = float(value)
    if not isfinite(result) or result <= 0:
        raise ClusterValidationError("quantity must be finite and greater than zero")
    return result


def _subject() -> str:
    return str(g.current_principal.get("sub", ""))


@cluster_bp.get("/actors")
@require_access_token
@require_permissions("cluster:read")
def list_actors():
    return jsonify(
        {
            "actors": [
                actor_shared(actor)
                for actor in _repository().list_actors(
                    request.args.get("q", ""), request.args.get("type", "")
                )
            ]
        }
    )


@cluster_bp.get("/actors/<actor_id>")
@require_access_token
@require_permissions("cluster:read")
def get_actor(actor_id: str):
    is_admin = "*" in set(g.current_principal.get("permissions", []))
    actor = (
        _repository().get_actor(actor_id)
        if is_admin
        else _repository().get_public_actor(actor_id)
    )
    if actor is None:
        return jsonify({"error": "ACTOR_NOT_FOUND"}), 404
    response = {"actor": actor_shared(actor)}
    if is_admin:
        response["private"] = actor_private(actor)
    return jsonify(response)


@cluster_bp.get("/needs")
@require_access_token
@require_permissions("cluster:read")
def list_needs():
    needs = _repository().list_needs(
        request.args.get("q", ""), request.args.get("status", "")
    )
    return jsonify({"needs": [need_shared(need) for need in needs]})


@cluster_bp.post("/needs")
@require_access_token
@require_permissions("needs:create")
def create_need():
    data = _body()
    if data is None:
        return jsonify({"error": "INVALID_JSON", "message": "Se requiere un objeto JSON."}), 400
    try:
        need = _repository().create_need(
            actor_id=_subject(),
            title=_required_text(data, "title"),
            description=_required_text(data, "description"),
            category=_required_text(data, "category"),
            quantity=_quantity(data),
            unit=str(data.get("unit", "unidad")),
        )
    except ClusterValidationError as exc:
        return jsonify({"error": "INVALID_NEED", "message": str(exc)}), 400
    return jsonify({"need": need_shared(need)}), 201


@cluster_bp.post("/connections")
@require_access_token
@require_permissions("connections:create")
def create_connection():
    data = _body()
    if data is None:
        return jsonify({"error": "INVALID_JSON", "message": "Se requiere un objeto JSON."}), 400
    target_actor_id = data.get("target_actor_id")
    need_id = data.get("need_id")
    try:
        connection = _repository().create_connection(
            requester_id=_subject(),
            target_actor_id=target_actor_id if isinstance(target_actor_id, str) else "",
            need_id=need_id if isinstance(need_id, str) else None,
            message=_required_text(data, "message"),
        )
    except KeyError as exc:
        entity = "NEED" if need_id else "ACTOR"
        return jsonify({"error": f"{entity}_NOT_FOUND", "id": str(exc.args[0])}), 404
    except ClusterValidationError as exc:
        return jsonify({"error": "INVALID_CONNECTION", "message": str(exc)}), 400
    return jsonify({"connection": connection_shared(connection)}), 201


@cluster_bp.get("/actors/<actor_id>/trust")
@require_access_token
@require_permissions("trust:read")
def actor_trust(actor_id: str):
    is_admin = "*" in set(g.current_principal.get("permissions", []))
    try:
        actor = (
            _repository().get_actor(actor_id)
            if is_admin
            else _repository().get_public_actor(actor_id)
        )
        if actor is None:
            raise KeyError(actor_id)
        assessment = _repository().trust_for_actor(
            actor_id, public_only=not is_admin
        )
    except KeyError:
        return jsonify({"error": "ACTOR_NOT_FOUND"}), 404
    return jsonify({"actor_id": actor_id, "trust": assessment.to_dict()})


@public_cluster_bp.get("/actors")
def public_list_actors():
    return jsonify(
        {
            "actors": [
                actor_public(actor)
                for actor in _repository().list_actors(
                    request.args.get("q", ""), request.args.get("type", "")
                )
            ]
        }
    )


@public_cluster_bp.get("/actors/<actor_id>")
def public_get_actor(actor_id: str):
    actor = _repository().get_public_actor(actor_id)
    if actor is None:
        return jsonify({"error": "ACTOR_NOT_FOUND"}), 404
    return jsonify({"actor": actor_public(actor)})


@public_cluster_bp.get("/needs")
def public_list_needs():
    needs = _repository().list_needs(
        request.args.get("q", ""), request.args.get("status", "")
    )
    return jsonify({"needs": [need_public(need) for need in needs]})
