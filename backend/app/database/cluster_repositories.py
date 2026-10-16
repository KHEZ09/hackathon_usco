from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from .connection import fetch_all, fetch_one, transaction

ACTOR_TYPES = {
    "PRODUCER",
    "ASSOCIATION",
    "TRANSFORMER",
    "BUYER",
    "AGROENTREPRENEUR",
    "TRANSPORTER",
    "SERVICE_PROVIDER",
    "INSTITUTION",
}
ACTOR_STATUSES = {"ACTIVE", "PENDING", "SUSPENDED", "BLOCKED", "INACTIVE"}
NEED_STATUSES = {"OPEN", "MATCHED", "PAUSED", "CLOSED", "CANCELLED"}
NEED_CATEGORIES = {
    "RAW_MATERIAL",
    "INPUTS",
    "TECHNICAL_ASSISTANCE",
    "FINANCING",
    "LOGISTICS",
    "MARKET",
    "PROCESSING_CAPACITY",
    "OTHER",
}
OFFER_CATEGORIES = {
    "CACAO",
    "TRANSFORMATION",
    "INPUTS",
    "LOGISTICS",
    "TECHNICAL_ASSISTANCE",
    "FINANCING",
    "OTHER",
}
OFFER_STATUSES = {"DRAFT", "PUBLISHED", "PAUSED", "CLOSED"}
VISIBILITIES = {"PUBLIC", "SHARED", "PRIVATE"}
CONNECTION_TYPES = {"NEED_MATCH", "OFFER_MATCH", "DIRECT"}
CONNECTION_STATUSES = {"REQUESTED", "ACCEPTED", "REJECTED", "BLOCKED", "CANCELLED"}
TRUST_SIGNAL_TYPES = {
    "PROFILE_COMPLETENESS",
    "LOT_TRACEABILITY",
    "COUNTERPARTY_CONFIRMATION",
    "QUANTITY_CONSISTENCY",
    "INCIDENT_RESOLUTION",
    "DOCUMENT_VERIFIED",
}
TRUST_SIGNAL_SOURCES = {"SYSTEM", "ACTOR_CONFIRMATION", "DOCUMENT", "AUDIT"}
TRUST_SIGNAL_STATUSES = {"PENDING", "CONFIRMED", "DISPUTED", "EXPIRED", "REVOKED"}


def _enum(value: str, allowed: set[str], field: str) -> str:
    normalized = str(value).upper()
    if normalized not in allowed:
        raise ValueError(f"{field} inválido")
    return normalized


def _positive_quantity(quantity: Any) -> Any:
    if quantity is not None:
        try:
            if Decimal(str(quantity)) <= 0:
                raise ValueError("quantity debe ser positivo")
        except (InvalidOperation, TypeError) as exc:
            raise ValueError("quantity debe ser numérico") from exc
    return quantity


class ActorRepository:
    def list_public(
        self,
        query: str | None = None,
        actor_type: str | None = None,
        municipality: str | None = None,
    ) -> list[dict[str, Any]]:
        actor_type = _enum(actor_type, ACTOR_TYPES, "actor_type") if actor_type else None
        return fetch_all(
            """
            SELECT actor_id, actor_type, status, visibility, slug, display_name,
                   description, municipality, department, public_contact, created_at
            FROM orivia.actors
            WHERE status='ACTIVE' AND visibility='PUBLIC'
              AND (%s::text IS NULL OR display_name ILIKE '%%'||%s::text||'%%'
                   OR description ILIKE '%%'||%s::text||'%%')
              AND (%s::orivia.actor_type IS NULL OR actor_type=%s::orivia.actor_type)
              AND (%s::text IS NULL OR municipality=%s::text)
            ORDER BY display_name
            """,
            (query, query, query, actor_type, actor_type, municipality, municipality),
        )

    def get(self, actor_id: UUID | str) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT actor_id, actor_type, status, visibility, slug, display_name,
                   description, municipality, department, public_contact,
                   owner_user_id, created_at, updated_at
            FROM orivia.actors WHERE actor_id=%s
            """,
            (actor_id,),
        )

    def create(self, data: dict[str, Any]) -> dict[str, Any]:
        actor_type = _enum(data["actor_type"], ACTOR_TYPES, "actor_type")
        visibility = _enum(data.get("visibility", "PUBLIC"), VISIBILITIES, "visibility")
        status = _enum(data.get("status", "PENDING"), ACTOR_STATUSES, "status")
        with transaction() as connection:
            return connection.execute(
                """
                INSERT INTO orivia.actors(
                  actor_type, status, visibility, slug, display_name, description,
                  municipality, department, public_contact, owner_user_id
                ) VALUES(%s::orivia.actor_type,%s::orivia.actor_status,
                         %s::orivia.cluster_visibility,%s,%s,%s,%s,%s,%s,%s)
                RETURNING actor_id, actor_type, status, visibility, slug,
                          display_name, description, municipality, department,
                          public_contact, owner_user_id, created_at, updated_at
                """,
                (
                    actor_type,
                    status,
                    visibility,
                    data["slug"],
                    data["display_name"],
                    data.get("description"),
                    data.get("municipality"),
                    data.get("department", "Huila"),
                    data.get("public_contact"),
                    data.get("owner_user_id"),
                ),
            ).fetchone()


class ActorNeedRepository:
    def list_public(
        self,
        actor_id: UUID | str | None = None,
        category: str | None = None,
    ) -> list[dict[str, Any]]:
        category = _enum(category, NEED_CATEGORIES, "category") if category else None
        return fetch_all(
            """
            SELECT n.need_id, n.actor_id, a.display_name actor_name, n.category,
                   n.status, n.visibility, n.title, n.description, n.quantity,
                   n.unit, n.municipality, n.department, n.due_date, n.created_at
            FROM orivia.actor_needs n JOIN orivia.actors a USING(actor_id)
            WHERE n.visibility='PUBLIC' AND n.status IN ('OPEN','MATCHED')
              AND a.status='ACTIVE' AND a.visibility='PUBLIC'
              AND (%s::uuid IS NULL OR n.actor_id=%s::uuid)
              AND (%s::orivia.need_category IS NULL OR n.category=%s::orivia.need_category)
            ORDER BY n.due_date NULLS LAST, n.created_at DESC
            """,
            (actor_id, actor_id, category, category),
        )

    def create(self, data: dict[str, Any]) -> dict[str, Any]:
        category = _enum(data["category"], NEED_CATEGORIES, "category")
        status = _enum(data.get("status", "OPEN"), NEED_STATUSES, "status")
        visibility = _enum(data.get("visibility", "PUBLIC"), VISIBILITIES, "visibility")
        with transaction() as connection:
            return connection.execute(
                """
                INSERT INTO orivia.actor_needs(
                  actor_id, category, status, visibility, title, description,
                  quantity, unit, municipality, department, due_date
                ) VALUES(%s,%s::orivia.need_category,%s::orivia.need_status,
                         %s::orivia.cluster_visibility,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
                """,
                (
                    data["actor_id"], category, status, visibility, data["title"],
                    data.get("description"), _positive_quantity(data.get("quantity")),
                    data.get("unit"), data.get("municipality"),
                    data.get("department", "Huila"), data.get("due_date"),
                ),
            ).fetchone()


class ActorOfferRepository:
    def list_public(
        self,
        actor_id: UUID | str | None = None,
        category: str | None = None,
    ) -> list[dict[str, Any]]:
        category = _enum(category, OFFER_CATEGORIES, "category") if category else None
        return fetch_all(
            """
            SELECT o.offer_id, o.actor_id, a.display_name actor_name, o.category,
                   o.status, o.visibility, o.title, o.description, o.quantity,
                   o.unit, o.municipality, o.department, o.available_from,
                   o.available_until, o.created_at
            FROM orivia.actor_offers o JOIN orivia.actors a USING(actor_id)
            WHERE o.visibility='PUBLIC' AND o.status='PUBLISHED'
              AND a.status='ACTIVE' AND a.visibility='PUBLIC'
              AND (%s::uuid IS NULL OR o.actor_id=%s::uuid)
              AND (%s::orivia.offer_category IS NULL OR o.category=%s::orivia.offer_category)
            ORDER BY o.available_until NULLS LAST, o.created_at DESC
            """,
            (actor_id, actor_id, category, category),
        )

    def create(self, data: dict[str, Any]) -> dict[str, Any]:
        category = _enum(data["category"], OFFER_CATEGORIES, "category")
        status = _enum(data.get("status", "DRAFT"), OFFER_STATUSES, "status")
        visibility = _enum(data.get("visibility", "PUBLIC"), VISIBILITIES, "visibility")
        with transaction() as connection:
            return connection.execute(
                """
                INSERT INTO orivia.actor_offers(
                  actor_id, category, status, visibility, title, description,
                  quantity, unit, municipality, department, available_from,
                  available_until
                ) VALUES(%s,%s::orivia.offer_category,%s::orivia.offer_status,
                         %s::orivia.cluster_visibility,%s,%s,%s,%s,%s,%s,%s,%s)
                RETURNING *
                """,
                (
                    data["actor_id"], category, status, visibility, data["title"],
                    data.get("description"), _positive_quantity(data.get("quantity")),
                    data.get("unit"), data.get("municipality"),
                    data.get("department", "Huila"), data.get("available_from"),
                    data.get("available_until"),
                ),
            ).fetchone()


class ActorConnectionRepository:
    def get(self, connection_id: UUID | str) -> dict[str, Any] | None:
        return fetch_one(
            "SELECT * FROM orivia.actor_connections WHERE connection_id=%s",
            (connection_id,),
        )

    def create_request(self, data: dict[str, Any]) -> dict[str, Any]:
        connection_type = _enum(data["connection_type"], CONNECTION_TYPES, "connection_type")
        visibility = _enum(data.get("visibility", "SHARED"), VISIBILITIES, "visibility")
        requester_actor_id = data["requester_actor_id"]
        target_actor_id = data["target_actor_id"]
        if requester_actor_id == target_actor_id:
            raise ValueError("un actor no puede conectarse consigo mismo")
        need_id = data.get("need_id")
        offer_id = data.get("offer_id")
        if connection_type == "NEED_MATCH" and not need_id:
            raise ValueError("need_id requerido para NEED_MATCH")
        if connection_type == "OFFER_MATCH" and not offer_id:
            raise ValueError("offer_id requerido para OFFER_MATCH")
        if connection_type == "DIRECT" and (need_id or offer_id):
            raise ValueError("DIRECT no admite need_id ni offer_id")
        with transaction() as connection:
            return connection.execute(
                """
                INSERT INTO orivia.actor_connections(
                  requester_actor_id, target_actor_id, connection_type, status,
                  visibility, need_id, offer_id, message, requested_by
                ) VALUES(%s,%s,%s::orivia.connection_type,'REQUESTED',
                         %s::orivia.cluster_visibility,%s,%s,%s,%s)
                RETURNING *
                """,
                (
                    requester_actor_id, target_actor_id, connection_type, visibility,
                    need_id, offer_id, data.get("message"), data.get("requested_by"),
                ),
            ).fetchone()

    def set_status(self, connection_id: UUID | str, status: str) -> dict[str, Any] | None:
        status = _enum(status, CONNECTION_STATUSES, "status")
        with transaction() as connection:
            return connection.execute(
                """
                UPDATE orivia.actor_connections
                SET status=%s::orivia.connection_status
                WHERE connection_id=%s
                RETURNING *
                """,
                (status, connection_id),
            ).fetchone()


class TrustSignalRepository:
    def list_for_actor(
        self, actor_id: UUID | str, public_only: bool = True
    ) -> list[dict[str, Any]]:
        visibility_clause = "" if not public_only else """
            AND s.visibility='PUBLIC'
            AND s.status='CONFIRMED'
            AND a.status='ACTIVE'
            AND a.visibility='PUBLIC'
        """
        return fetch_all(
            f"""
            SELECT s.trust_signal_id, s.actor_id, s.connection_id, s.signal_type,
                   s.status, s.source, s.visibility, s.score, s.explanation,
                   s.evidence_ref, s.occurred_at, s.expires_at
            FROM orivia.trust_signals s
            JOIN orivia.actors a USING(actor_id)
            WHERE s.actor_id=%s {visibility_clause}
            ORDER BY s.occurred_at DESC, s.trust_signal_id
            """,
            (actor_id,),
        )

    def append(self, data: dict[str, Any]) -> dict[str, Any]:
        signal_type = _enum(data["signal_type"], TRUST_SIGNAL_TYPES, "signal_type")
        status = _enum(data.get("status", "PENDING"), TRUST_SIGNAL_STATUSES, "status")
        source = _enum(data.get("source", "SYSTEM"), TRUST_SIGNAL_SOURCES, "source")
        visibility = _enum(data.get("visibility", "SHARED"), VISIBILITIES, "visibility")
        score = data.get("score")
        if score is not None:
            try:
                if not 0 <= Decimal(str(score)) <= 100:
                    raise ValueError("score debe estar entre 0 y 100")
            except (InvalidOperation, TypeError) as exc:
                raise ValueError("score debe ser numérico") from exc
        explanation = str(data["explanation"]).strip()
        if len(explanation) < 5:
            raise ValueError("explanation debe tener al menos 5 caracteres")
        with transaction() as connection:
            return connection.execute(
                """
                INSERT INTO orivia.trust_signals(
                  actor_id, connection_id, signal_type, status, source, visibility,
                  score, explanation, evidence_ref, issued_by, occurred_at, expires_at
                ) VALUES(%s,%s,%s::orivia.trust_signal_type,
                         %s::orivia.trust_signal_status,%s::orivia.trust_signal_source,
                         %s::orivia.cluster_visibility,%s,%s,%s,%s,
                         coalesce(%s, now()),%s)
                RETURNING *
                """,
                (
                    data["actor_id"], data.get("connection_id"), signal_type, status,
                    source, visibility, score, explanation,
                    data.get("evidence_ref"), data.get("issued_by"),
                    data.get("occurred_at"), data.get("expires_at"),
                ),
            ).fetchone()
