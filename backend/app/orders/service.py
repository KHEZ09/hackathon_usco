from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from .states import transition_order


@dataclass(frozen=True)
class OrderTransition:
    event_id: str
    order_id: str
    actor_id: str
    previous_state: str
    next_state: str
    occurred_at: str


def create_transition(
    *, order_id: str, actor_id: str, current_state: str, next_state: str
) -> OrderTransition:
    """Validate and describe a transition without persisting it.

    Persistence belongs to Kevin's database/repository module. Sebas owns the
    state rule and the event contract that will be persisted later.
    """
    if not order_id.strip() or not actor_id.strip():
        raise ValueError("order_id and actor_id are required")
    validated_state = transition_order(current_state, next_state)
    occurred_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    return OrderTransition(
        event_id=str(uuid4()),
        order_id=order_id,
        actor_id=actor_id,
        previous_state=current_state,
        next_state=validated_state,
        occurred_at=occurred_at,
    )
