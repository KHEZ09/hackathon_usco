from __future__ import annotations

from threading import RLock
from uuid import uuid4

from .models import (
    ActorRecord,
    ConnectionRecord,
    NeedRecord,
    OfferRecord,
    TrustSignals,
    utc_now,
)
from .trust import TrustAssessment, calculate_trust


class ClusterValidationError(ValueError):
    """Input cannot be accepted by the cluster contract."""


class InMemoryClusterRepository:
    """Development adapter; Kevin's PostgreSQL layer can replace this boundary."""

    def __init__(self) -> None:
        self._lock = RLock()
        self._actors = {
            actor.actor_id: actor for actor in self._seed_actors()
        }
        self._needs = {need.need_id: need for need in self._seed_needs()}
        self._offers = {offer.offer_id: offer for offer in self._seed_offers()}
        self._connections: dict[str, ConnectionRecord] = {}

    @staticmethod
    def _seed_actors() -> list[ActorRecord]:
        return [
            ActorRecord(
                actor_id="actor-prod-001",
                name="Finca El Porvenir",
                actor_type="producer",
                municipality="Pitalito",
                department="Huila",
                description="Productor de cacao con trazabilidad por lote.",
                email="contacto@elporvenir.example",
                phone="+57 300 000 0001",
                internal_notes="Synthetic seed; replace with verified profile.",
                trust_signals=TrustSignals(True, 5, 5, 5, 2),
            ),
            ActorRecord(
                actor_id="actor-assoc-001",
                name="Asociación Cacao Huila",
                actor_type="association",
                municipality="Garzón",
                department="Huila",
                description="Asociación que conecta productores y compradores.",
                email="hola@cacaohuila.example",
                phone="+57 300 000 0002",
                internal_notes="Synthetic seed; federation account pending.",
                trust_signals=TrustSignals(True, 4, 4, 4, 2),
            ),
            ActorRecord(
                actor_id="actor-buy-001",
                name="Transformadora Andina",
                actor_type="buyer",
                municipality="Neiva",
                department="Huila",
                description="Comprador y transformador de cacao regional.",
                email="compras@andina.example",
                phone="+57 300 000 0003",
                internal_notes="Synthetic seed; procurement profile.",
                trust_signals=TrustSignals(True, 3, 4, 5, 1),
            ),
        ]

    @staticmethod
    def _seed_needs() -> list[NeedRecord]:
        return [
            NeedRecord(
                need_id="need-001",
                actor_id="actor-prod-001",
                title="Secado solar modular",
                description="Necesitamos capacidad de secado para la próxima cosecha.",
                category="infraestructura",
                quantity=1,
                unit="módulo",
                status="OPEN",
                visibility="PUBLIC",
                created_at=utc_now(),
            ),
            NeedRecord(
                need_id="need-002",
                actor_id="actor-buy-001",
                title="Cacao fermentado trazable",
                description="Buscamos lotes con evidencia completa de origen.",
                category="comercial",
                quantity=500,
                unit="kg",
                status="OPEN",
                visibility="PUBLIC",
                created_at=utc_now(),
            ),
        ]

    @staticmethod
    def _seed_offers() -> list[OfferRecord]:
        return [
            OfferRecord(
                offer_id="offer-001",
                actor_id="actor-assoc-001",
                title="Acompañamiento de fermentación",
                description="Asistencia técnica para mejorar consistencia del proceso.",
                category="asistencia-tecnica",
                quantity=3,
                unit="jornadas",
                status="OPEN",
                created_at=utc_now(),
            )
        ]

    def list_actors(self, query: str = "", actor_type: str = "") -> list[ActorRecord]:
        query = query.strip().casefold()
        actor_type = actor_type.strip().casefold()
        return [
            actor
            for actor in self._actors.values()
            if (not query or query in f"{actor.name} {actor.municipality} {actor.description}".casefold())
            and (not actor_type or actor.actor_type.casefold() == actor_type)
        ]

    def get_actor(self, actor_id: str) -> ActorRecord | None:
        return self._actors.get(actor_id)

    def get_public_actor(self, actor_id: str) -> ActorRecord | None:
        return self.get_actor(actor_id)

    def list_needs(self, query: str = "", status: str = "") -> list[NeedRecord]:
        query = query.strip().casefold()
        status = status.strip().casefold()
        return [
            need
            for need in self._needs.values()
            if (not query or query in f"{need.title} {need.description} {need.category}".casefold())
            and (not status or need.status.casefold() == status)
        ]

    def get_need(self, need_id: str) -> NeedRecord | None:
        return self._needs.get(need_id)

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
        if not actor_id or not title.strip() or not description.strip() or not category.strip():
            raise ClusterValidationError("actor_id, title, description and category are required")
        if quantity <= 0:
            raise ClusterValidationError("quantity must be greater than zero")
        need = NeedRecord(
            need_id=f"need-{uuid4().hex[:12]}",
            actor_id=actor_id,
            title=title.strip(),
            description=description.strip(),
            category=category.strip(),
            quantity=quantity,
            unit=unit.strip() or "unidad",
            status="OPEN",
            visibility="PUBLIC",
            created_at=utc_now(),
        )
        with self._lock:
            self._needs[need.need_id] = need
        return need

    def create_connection(
        self,
        *,
        requester_id: str,
        target_actor_id: str,
        need_id: str | None,
        message: str,
    ) -> ConnectionRecord:
        if not requester_id or not target_actor_id or requester_id == target_actor_id:
            raise ClusterValidationError("requester and target must be different")
        if not message.strip():
            raise ClusterValidationError("message is required")
        if target_actor_id not in self._actors:
            raise KeyError(target_actor_id)
        if need_id is not None and need_id not in self._needs:
            raise KeyError(need_id)
        duplicate = any(
            item.requester_id == requester_id
            and item.target_actor_id == target_actor_id
            and item.need_id == need_id
            and item.status == "PENDING"
            for item in self._connections.values()
        )
        if duplicate:
            raise ClusterValidationError("a pending connection already exists")
        connection = ConnectionRecord(
            connection_id=f"connection-{uuid4().hex[:12]}",
            requester_id=requester_id,
            target_actor_id=target_actor_id,
            need_id=need_id,
            message=message.strip(),
            status="PENDING",
            created_at=utc_now(),
        )
        with self._lock:
            self._connections[connection.connection_id] = connection
        return connection

    def trust_for_actor(self, actor_id: str) -> TrustAssessment:
        actor = self.get_actor(actor_id)
        if actor is None:
            raise KeyError(actor_id)
        return calculate_trust(actor.trust_signals)

    def list_offers(self) -> list[OfferRecord]:
        return list(self._offers.values())
