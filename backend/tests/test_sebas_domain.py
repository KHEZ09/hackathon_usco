import pytest

from app.ai.service import build_read_only_prompt
from app.audit.service import create_audit_record
from app.blockchain.adapter import MemoryBlockchainAnchor
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
