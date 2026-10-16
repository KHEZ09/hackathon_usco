from __future__ import annotations

from .models import ActorRecord, ConnectionRecord, NeedRecord, OfferRecord
from .trust import calculate_trust


def actor_public(actor: ActorRecord) -> dict[str, object]:
    assessment = calculate_trust(actor.trust_signals)
    return {
        "id": actor.actor_id,
        "name": actor.name,
        "type": actor.actor_type,
        "location": {
            "municipality": actor.municipality,
            "department": actor.department,
        },
        "description": actor.description,
        "trust": {
            "score": assessment.score,
            "level": assessment.level,
            "formula_version": assessment.formula_version,
        },
    }


def actor_shared(actor: ActorRecord) -> dict[str, object]:
    projection = actor_public(actor)
    projection["contact"] = {"email": actor.email, "phone": actor.phone}
    return projection


def actor_private(actor: ActorRecord) -> dict[str, object]:
    projection = actor_shared(actor)
    projection["internal_notes"] = actor.internal_notes
    projection["trust"]["signals"] = calculate_trust(actor.trust_signals).signals
    return projection


def need_public(need: NeedRecord) -> dict[str, object]:
    return {
        "id": need.need_id,
        "title": need.title,
        "description": need.description,
        "category": need.category,
        "quantity": need.quantity,
        "unit": need.unit,
        "status": need.status,
    }


def need_shared(need: NeedRecord) -> dict[str, object]:
    projection = need_public(need)
    projection.update(
        {"actor_id": need.actor_id, "visibility": need.visibility, "created_at": need.created_at}
    )
    return projection


def need_private(need: NeedRecord) -> dict[str, object]:
    return need_shared(need)


def offer_public(offer: OfferRecord) -> dict[str, object]:
    return {
        "id": offer.offer_id,
        "title": offer.title,
        "description": offer.description,
        "category": offer.category,
        "quantity": offer.quantity,
        "unit": offer.unit,
        "status": offer.status,
    }


def offer_shared(offer: OfferRecord) -> dict[str, object]:
    projection = offer_public(offer)
    projection.update({"actor_id": offer.actor_id, "created_at": offer.created_at})
    return projection


def connection_shared(connection: ConnectionRecord) -> dict[str, object]:
    return {
        "id": connection.connection_id,
        "requester_id": connection.requester_id,
        "target_actor_id": connection.target_actor_id,
        "need_id": connection.need_id,
        "message": connection.message,
        "status": connection.status,
        "created_at": connection.created_at,
    }
