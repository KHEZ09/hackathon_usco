import pytest

from app.ai.service import build_read_only_prompt
from app.audit.service import create_audit_record
from app.blockchain.adapter import MemoryBlockchainAnchor
from app.orders.repository import InMemoryOrderRepository
from app.orders.service import create_transition
from app.orders.states import InvalidOrderTransition
from app.security.roles import permissions_for_role
from app.tracking.event_chain import TraceEvent


def test_role_permissions_are_server_owned():
    assert "orders:create" in permissions_for_role("operator")
    assert permissions_for_role("admin") == frozenset({"*"})


def test_order_transition_rejects_skipping_states():
    with pytest.raises(InvalidOrderTransition):
        create_transition(
            order_id="order-1",
            actor_id="user-1",
            current_state="CREATED",
            next_state="DELIVERED",
        )


def test_order_transition_requires_identifiers():
    with pytest.raises(ValueError):
        create_transition(
            order_id="",
            actor_id="user-1",
            current_state="CREATED",
            next_state="CONFIRMED",
        )


def test_order_repository_rejects_non_finite_quantity():
    repository = InMemoryOrderRepository()

    with pytest.raises(ValueError):
        repository.create(
            actor_id="user-1",
            product="Cacao",
            quantity=float("nan"),
            origin="Huila",
            destination="Neiva",
        )


def test_order_repository_rejects_rehashed_invalid_transition():
    repository = InMemoryOrderRepository()
    order = repository.create(
        actor_id="user-1",
        product="Cacao",
        quantity=10,
        origin="Huila",
        destination="Neiva",
    )
    repository.transition(
        order_id=order.order_id,
        actor_id="user-1",
        next_state="CONFIRMED",
    )
    original = order.events[1]
    tampered = TraceEvent.create(
        order_id=order.order_id,
        event_type="STATUS_CHANGED",
        actor_id=original.actor_id,
        previous_status="CREATED",
        new_status="DELIVERED",
        payload={"from": "CREATED", "to": "DELIVERED"},
        previous_event_hash=order.events[0].event_hash,
        occurred_at=original.occurred_at,
    )
    order.events[1] = tampered
    order.payloads[tampered.event_id] = {"from": "CREATED", "to": "DELIVERED"}

    assert repository.verify_timeline(order.order_id) is False


def test_trace_event_detects_payload_tampering():
    event = TraceEvent.create(
        order_id="order-1",
        event_type="STATUS_CHANGED",
        actor_id="user-1",
        previous_status="CREATED",
        new_status="CONFIRMED",
        payload={"note": "verified"},
        occurred_at="2026-10-15T20:00:00Z",
    )

    assert event.verify({"note": "verified"}) is True
    assert event.verify({"note": "tampered"}) is False


def test_memory_anchor_verifies_hash_without_business_persistence():
    anchor = MemoryBlockchainAnchor()
    receipt = anchor.anchor("sha256:event-1")

    assert anchor.verify(receipt) is True

    tampered_receipt = receipt.__class__(
        event_hash=receipt.event_hash,
        status=receipt.status,
        reference="memory://tampered",
    )
    assert anchor.verify(tampered_receipt) is False


def test_audit_record_requires_actor_and_explains_ai_boundary():
    record = create_audit_record(
        actor_id="user-1",
        action="ORDER_STATUS_CHANGED",
        entity_type="order",
        entity_id="order-1",
        changes={"from": "CREATED", "to": "CONFIRMED"},
    )
    prompt = build_read_only_prompt({"order_id": record.entity_id})

    assert record.actor_id == "user-1"
    assert "No cambies estados" in prompt
