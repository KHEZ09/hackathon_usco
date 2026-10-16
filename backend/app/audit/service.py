from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import uuid4


@dataclass(frozen=True)
class AuditRecord:
    audit_id: str
    actor_id: str
    action: str
    entity_type: str
    entity_id: str
    changes: dict[str, Any]


def create_audit_record(
    *,
    actor_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    changes: dict[str, Any],
) -> AuditRecord:
    if not actor_id or not action or not entity_type or not entity_id:
        raise ValueError("actor, action and entity identifiers are required")
    return AuditRecord(
        audit_id=str(uuid4()),
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changes=changes,
    )
