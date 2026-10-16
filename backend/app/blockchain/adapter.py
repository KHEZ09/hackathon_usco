from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class AnchorReceipt:
    event_hash: str
    status: str
    reference: str


class BlockchainAnchor(Protocol):
    def anchor(self, event_hash: str) -> AnchorReceipt:
        ...

    def verify(self, receipt: AnchorReceipt) -> bool:
        ...


class MemoryBlockchainAnchor:
    """Deterministic local adapter used until a real chain is selected."""

    def __init__(self) -> None:
        self._anchored_hashes: set[str] = set()

    def anchor(self, event_hash: str) -> AnchorReceipt:
        if not event_hash:
            raise ValueError("event_hash is required")
        self._anchored_hashes.add(event_hash)
        return AnchorReceipt(
            event_hash=event_hash,
            status="ANCHORED",
            reference=f"memory://{event_hash}",
        )

    def verify(self, receipt: AnchorReceipt) -> bool:
        return (
            receipt.status == "ANCHORED"
            and receipt.reference == f"memory://{receipt.event_hash}"
            and receipt.event_hash in self._anchored_hashes
        )
