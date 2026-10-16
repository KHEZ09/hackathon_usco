from __future__ import annotations

from typing import Final

ORDER_STATES: Final = frozenset(
    {
        "CREATED",
        "CONFIRMED",
        "IN_PREPARATION",
        "IN_TRANSIT",
        "DELIVERED",
        "CANCELLED",
    }
)

ALLOWED_TRANSITIONS: Final[dict[str, frozenset[str]]] = {
    "CREATED": frozenset({"CONFIRMED", "CANCELLED"}),
    "CONFIRMED": frozenset({"IN_PREPARATION", "CANCELLED"}),
    "IN_PREPARATION": frozenset({"IN_TRANSIT", "CANCELLED"}),
    "IN_TRANSIT": frozenset({"DELIVERED"}),
    "DELIVERED": frozenset(),
    "CANCELLED": frozenset(),
}


class InvalidOrderTransition(ValueError):
    """Raised when an order attempts an invalid state transition."""


def transition_order(current_state: str, next_state: str) -> str:
    if current_state not in ORDER_STATES:
        raise InvalidOrderTransition(f"unknown current state: {current_state}")
    if next_state not in ORDER_STATES:
        raise InvalidOrderTransition(f"unknown next state: {next_state}")
    if next_state not in ALLOWED_TRANSITIONS[current_state]:
        raise InvalidOrderTransition(
            f"transition not allowed: {current_state} -> {next_state}"
        )
    return next_state
