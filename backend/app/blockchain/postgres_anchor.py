from __future__ import annotations

from typing import Any

from ..database.connection import fetch_one, transaction
from .adapter import AnchorReceipt, BlockchainAnchor


class PostgresBlockchainAnchor(BlockchainAnchor):
    """Durable local anchor backed by PostgreSQL.

    It deliberately reports a local reference. This provides durable,
    idempotent evidence for the hackathon without pretending that a public
    blockchain transaction was already submitted.
    """

    @staticmethod
    def _receipt(row: dict[str, Any] | None) -> AnchorReceipt | None:
        if row is None:
            return None
        return AnchorReceipt(
            event_hash=str(row["event_hash"]),
            status="ANCHORED" if row["status"] == "ANCHORED" else str(row["status"]),
            reference=f"postgres://orivia/blockchain_anchor/{row['anchor_id']}",
        )

    def get(self, event_hash: str) -> AnchorReceipt | None:
        return self._receipt(
            fetch_one(
                """
                SELECT anchor_id, event_hash, status
                FROM orivia.blockchain_anchor WHERE event_hash=%s
                ORDER BY created_at DESC LIMIT 1
                """,
                (event_hash,),
            )
        )

    def anchor(self, event_hash: str) -> AnchorReceipt:
        if not event_hash:
            raise ValueError("event_hash is required")
        existing = self.get(event_hash)
        if existing is not None:
            return existing
        with transaction() as connection:
            event = connection.execute(
                "SELECT event_id FROM orivia.order_event WHERE event_hash=%s",
                (event_hash,),
            ).fetchone()
            if event is None:
                raise ValueError("event_hash does not exist")
            row = connection.execute(
                """
                INSERT INTO orivia.blockchain_anchor(
                    event_id, network, status, transaction_id, event_hash,
                    attempts, anchored_at
                ) VALUES(%s,'postgres-local','ANCHORED',%s,%s,1,now())
                ON CONFLICT(event_id) DO UPDATE SET event_hash=EXCLUDED.event_hash
                RETURNING anchor_id, event_hash, status
                """,
                (event["event_id"], f"local:{event_hash}", event_hash),
            ).fetchone()
        receipt = self._receipt(row)
        if receipt is None:
            raise RuntimeError("blockchain anchor was not persisted")
        return receipt

    def verify(self, receipt: AnchorReceipt) -> bool:
        persisted = self.get(receipt.event_hash)
        return (
            persisted is not None
            and persisted.status == "ANCHORED"
            and persisted.reference == receipt.reference
        )
