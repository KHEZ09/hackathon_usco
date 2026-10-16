from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime

from ..security.roles import permissions_for_role


def utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


@dataclass(frozen=True)
class TrustSignals:
    """Facts used by the explainable trust score; no opaque model is involved."""

    profile_complete: bool
    evidence_count: int
    verified_events: int
    consistency_checks: int
    resolved_incidents: int
    open_incidents: int = 0


@dataclass(frozen=True)
class ActorRecord:
    actor_id: str
    name: str
    actor_type: str
    municipality: str
    department: str
    description: str
    email: str
    phone: str
    internal_notes: str
    trust_signals: TrustSignals


@dataclass(frozen=True)
class NeedRecord:
    need_id: str
    actor_id: str
    title: str
    description: str
    category: str
    quantity: float
    unit: str
    status: str
    visibility: str
    created_at: str


@dataclass(frozen=True)
class OfferRecord:
    offer_id: str
    actor_id: str
    title: str
    description: str
    category: str
    quantity: float
    unit: str
    status: str
    created_at: str


@dataclass(frozen=True)
class ConnectionRecord:
    connection_id: str
    requester_id: str
    target_actor_id: str
    need_id: str | None
    message: str
    status: str
    created_at: str


@dataclass(frozen=True)
class ClusterPrincipal:
    """Small adapter used by tests and future persistence implementations."""

    subject: str
    permissions: frozenset[str] = field(default_factory=frozenset)

    @classmethod
    def from_role(cls, subject: str, role: str) -> ClusterPrincipal:
        return cls(subject=subject, permissions=permissions_for_role(role))
