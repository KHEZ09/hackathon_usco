from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class AnchorReceipt:
    event_hash: str
    status: str
    reference: str
    network: str = "local"
    transaction_id: str | None = None
    block_number: int | None = None
    chain_id: int | None = None
    contract_address: str | None = None


class BlockchainAnchor(Protocol):
    def get(self, event_hash: str) -> AnchorReceipt | None:
        ...

    def anchor(
        self,
        event_hash: str,
        *,
        entity_type: str = "order",
        entity_id: str | None = None,
        event_type: str | None = None,
        occurred_at: str | None = None,
    ) -> AnchorReceipt:
        ...

    def verify(self, receipt: AnchorReceipt) -> bool:
        ...


class MemoryBlockchainAnchor:
    """Deterministic local adapter used until a real chain is selected."""

    def __init__(self) -> None:
        self._anchored_hashes: set[str] = set()

    def anchor(
        self,
        event_hash: str,
        *,
        entity_type: str = "order",
        entity_id: str | None = None,
        event_type: str | None = None,
        occurred_at: str | None = None,
    ) -> AnchorReceipt:
        if not event_hash:
            raise ValueError("event_hash is required")
        self._anchored_hashes.add(event_hash)
        return AnchorReceipt(
            event_hash=event_hash,
            status="ANCHORED",
            reference=f"memory://{event_hash}",
            network="memory",
        )

    def get(self, event_hash: str) -> AnchorReceipt | None:
        if event_hash not in self._anchored_hashes:
            return None
        return AnchorReceipt(
            event_hash=event_hash,
            status="ANCHORED",
            reference=f"memory://{event_hash}",
            network="memory",
        )

    def verify(self, receipt: AnchorReceipt) -> bool:
        return (
            receipt.status == "ANCHORED"
            and receipt.reference == f"memory://{receipt.event_hash}"
            and receipt.event_hash in self._anchored_hashes
        )
