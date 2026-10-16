from __future__ import annotations

from typing import Any

from psycopg import errors

from ..database.cluster_repositories import TrustSignalRepository
from ..database.connection import fetch_one
from .models import (
    ActorRecord,
    ConnectionRecord,
    NeedRecord,
    OfferRecord,
    TrustSignals,
    utc_now,
)
from .repository import ClusterValidationError

ACTOR_TYPE_ALIASES = {
    "producer": "PRODUCER",
    "association": "ASSOCIATION",
    "transformer": "TRANSFORMER",
    "buyer": "BUYER",
    "agroentrepreneur": "AGROENTREPRENEUR",
    "transporter": "TRANSPORTER",
    "service_provider": "SERVICE_PROVIDER",
    "institution": "INSTITUTION",
}
NEED_CATEGORY_ALIASES = {
    "infraestructura": "OTHER",
    "logistica": "LOGISTICS",
    "comercial": "MARKET",
    "asistencia-tecnica": "TECHNICAL_ASSISTANCE",
}


def _text(value: Any) -> str:
    return "" if value is None else str(value)


def _actor_type(value: Any) -> str:
    normalized = _text(value).upper()
    return normalized.casefold().replace("_", "-")


def _actor_from_row(row: dict[str, Any], signals: TrustSignals) -> ActorRecord:
    return ActorRecord(
        actor_id=_text(row["actor_id"]),
        name=_text(row.get("display_name")),
        actor_type=_actor_type(row.get("actor_type")),
        municipality=_text(row.get("municipality")),
        department=_text(row.get("department")),
        description=_text(row.get("description")),
        email=_text(row.get("public_contact")),
        phone="",
        internal_notes="",
        trust_signals=signals,
    )


def _need_from_row(row: dict[str, Any]) -> NeedRecord:
    return NeedRecord(
        need_id=_text(row["need_id"]),
        actor_id=_text(row["actor_id"]),
        title=_text(row.get("title")),
        description=_text(row.get("description")),
        category=_text(row.get("category")).casefold(),
        quantity=float(row.get("quantity") or 0),
        unit=_text(row.get("unit")),
        status=_text(row.get("status")),
        visibility=_text(row.get("visibility")),
        created_at=_text(row.get("created_at")),
    )


def _offer_from_row(row: dict[str, Any]) -> OfferRecord:
    return OfferRecord(
        offer_id=_text(row["offer_id"]),
        actor_id=_text(row["actor_id"]),
        title=_text(row.get("title")),
        description=_text(row.get("description")),
        category=_text(row.get("category")).casefold(),
        quantity=float(row.get("quantity") or 0),
        unit=_text(row.get("unit")),
        status=_text(row.get("status")),
        created_at=_text(row.get("created_at")),
    )


def _trust_signals(
    actor: dict[str, Any], repository: TrustSignalRepository
) -> TrustSignals:
    rows = repository.list_for_actor(actor["actor_id"], public_only=False)
    confirmed = [row for row in rows if _text(row.get("status")) == "CONFIRMED"]
    signal_types = {_text(row.get("signal_type")) for row in confirmed}
    return TrustSignals(
        profile_complete=all(
            bool(actor.get(field))
            for field in ("display_name", "actor_type", "municipality", "department")
        ),
        evidence_count=len(confirmed),
        verified_events=sum(
            signal_type in {"LOT_TRACEABILITY", "DOCUMENT_VERIFIED"}
            for signal_type in signal_types
        ),
        consistency_checks=sum(
            signal_type == "QUANTITY_CONSISTENCY" for signal_type in signal_types
        ),
        resolved_incidents=sum(
            signal_type == "INCIDENT_RESOLUTION" for signal_type in signal_types
        ),
        open_incidents=sum(
            _text(row.get("status")) == "DISPUTED" for row in rows
        ),
    )


class PostgresClusterRepository:
    """Maps Kevin's durable repositories to Sebas's HTTP/domain contract."""

    def __init__(self, repositories: dict[str, object]) -> None:
        self._actors = repositories["actors"]
        self._needs = repositories["actor_needs"]
        self._offers = repositories["actor_offers"]
        self._connections = repositories["actor_connections"]
        self._trust = repositories["trust_signals"]

    def _trust_for_row(self, row: dict[str, Any]) -> TrustSignals:
        return _trust_signals(row, self._trust)

    def list_actors(self, query: str = "", actor_type: str = "") -> list[ActorRecord]:
        normalized_type = ACTOR_TYPE_ALIASES.get(actor_type.strip().casefold()) if actor_type else None
        rows = self._actors.list_public(query=query or None, actor_type=normalized_type)
        return [_actor_from_row(row, self._trust_for_row(row)) for row in rows]

    def get_actor(self, actor_id: str) -> ActorRecord | None:
        row = self._actors.get(actor_id)
        if row is None or _text(row.get("status")) != "ACTIVE":
            return None
        return _actor_from_row(row, self._trust_for_row(row))

    def get_public_actor(self, actor_id: str) -> ActorRecord | None:
        row = self._actors.get(actor_id)
        if (
            row is None
            or _text(row.get("status")) != "ACTIVE"
            or _text(row.get("visibility")) != "PUBLIC"
        ):
            return None
        return _actor_from_row(row, self._trust_for_row(row))

    def list_needs(self, query: str = "", status: str = "") -> list[NeedRecord]:
        rows = self._needs.list_public()
        query = query.strip().casefold()
        status = status.strip().casefold()
        return [
            need
            for need in map(_need_from_row, rows)
            if (not query or query in f"{need.title} {need.description} {need.category}".casefold())
            and (not status or need.status.casefold() == status)
        ]

    def get_need(self, need_id: str) -> NeedRecord | None:
        rows = self._needs.list_public()
        for row in rows:
            if _text(row.get("need_id")) == need_id:
                return _need_from_row(row)
        return None

    def _owned_actor_id(self, subject: str) -> str:
        row = fetch_one(
            """
            SELECT actor_id FROM orivia.actors
            WHERE owner_user_id=%s AND status='ACTIVE'
            ORDER BY created_at LIMIT 1
            """,
            (subject,),
        )
        if row is None:
            raise ClusterValidationError(
                "El usuario autenticado todavía no tiene un actor activo asociado."
            )
        return _text(row["actor_id"])

    def create_need(
        self,
        *,
        actor_id: str,
        title: str,
        description: str,
        category: str,
        quantity: float,
        unit: str,
    ) -> NeedRecord:
        category = NEED_CATEGORY_ALIASES.get(category.casefold(), category.upper())
        owner_actor_id = self._owned_actor_id(actor_id)
        try:
            row = self._needs.create(
                {
                    "actor_id": owner_actor_id,
                    "category": category,
                    "title": title,
                    "description": description,
                    "quantity": quantity,
                    "unit": unit,
                }
            )
        except (KeyError, ValueError) as exc:
            raise ClusterValidationError(str(exc)) from exc
        return _need_from_row(row)

    def create_connection(
        self,
        *,
        requester_id: str,
        target_actor_id: str,
        need_id: str | None,
        message: str,
    ) -> ConnectionRecord:
        requester_actor_id = self._owned_actor_id(requester_id)
        if self.get_actor(target_actor_id) is None:
            raise KeyError(target_actor_id)
        if need_id is not None and self.get_need(need_id) is None:
            raise KeyError(need_id)
        try:
            row = self._connections.create_request(
                {
                    "requester_actor_id": requester_actor_id,
                    "target_actor_id": target_actor_id,
                    "connection_type": "NEED_MATCH" if need_id else "DIRECT",
                    "need_id": need_id,
                    "message": message,
                    "requested_by": requester_id,
                }
            )
        except errors.UniqueViolation as exc:
            raise ClusterValidationError(
                "a pending connection already exists"
            ) from exc
        return ConnectionRecord(
            connection_id=_text(row["connection_id"]),
            requester_id=_text(row["requester_actor_id"]),
            target_actor_id=_text(row["target_actor_id"]),
            need_id=_text(row.get("need_id")) or None,
            message=_text(row.get("message")),
            status=_text(row.get("status")),
            created_at=_text(row.get("created_at")) or utc_now(),
        )

    def trust_for_actor(self, actor_id: str):
        actor = self.get_actor(actor_id)
        if actor is None:
            raise KeyError(actor_id)
        from .trust import calculate_trust

        return calculate_trust(actor.trust_signals)

    def list_offers(self) -> list[OfferRecord]:
        return [_offer_from_row(row) for row in self._offers.list_public()]
