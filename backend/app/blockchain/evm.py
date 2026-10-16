from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from eth_account import Account
from web3 import Web3
from web3.exceptions import Web3Exception

from ..database.connection import fetch_one, transaction
from .adapter import AnchorReceipt, BlockchainAnchor


class BlockchainUnavailable(RuntimeError):
    """Raised when the configured public chain cannot be reached or used."""


def _artifact() -> dict[str, Any]:
    path = Path(__file__).with_name("contract_artifact.json")
    return json.loads(path.read_text(encoding="utf-8"))


def _hash_bytes32(event_hash: str) -> bytes:
    value = event_hash.removeprefix("sha256:").removeprefix("0x")
    if len(value) != 64:
        raise ValueError("event_hash must contain exactly 32 bytes")
    try:
        return bytes.fromhex(value)
    except ValueError as exc:
        raise ValueError("event_hash must be hexadecimal") from exc


def _occurred_timestamp(value: str | None) -> int:
    if not value:
        return 0
    normalized = value.replace("Z", "+00:00")
    return max(0, int(datetime.fromisoformat(normalized).timestamp()))


class EvmBlockchainAnchor(BlockchainAnchor):
    """Anchors ORIVIA event hashes in the deployed EVM registry contract."""

    def __init__(
        self,
        *,
        rpc_url: str,
        private_key: str,
        contract_address: str,
        expected_chain_id: int | None = None,
        tx_timeout_seconds: int = 120,
        gas_limit: int = 180_000,
    ) -> None:
        self._web3 = Web3(
            Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 10})
        )
        if not self._web3.is_connected():
            raise BlockchainUnavailable("No se pudo conectar al RPC EVM configurado")
        self._account = Account.from_key(private_key)
        self._chain_id = int(self._web3.eth.chain_id)
        if expected_chain_id is not None and self._chain_id != expected_chain_id:
            raise BlockchainUnavailable(
                f"La red EVM tiene chain_id {self._chain_id}, se esperaba {expected_chain_id}"
            )
        try:
            checksum_address = self._web3.to_checksum_address(contract_address)
        except ValueError as exc:
            raise BlockchainUnavailable("ORIVIA_BLOCKCHAIN_CONTRACT_ADDRESS inválida") from exc
        artifact = _artifact()
        self._contract = self._web3.eth.contract(
            address=checksum_address,
            abi=artifact["abi"],
        )
        self._contract_address = checksum_address
        self._network = f"eip155:{self._chain_id}"
        self._tx_timeout_seconds = tx_timeout_seconds
        self._gas_limit = gas_limit

    @staticmethod
    def _receipt(row: dict[str, Any] | None) -> AnchorReceipt | None:
        if row is None:
            return None
        chain_id = row.get("chain_id")
        transaction_id = row.get("transaction_id")
        reference = (
            f"eip155:{chain_id}/tx/{transaction_id}"
            if chain_id and transaction_id
            else f"postgres://orivia/blockchain_anchor/{row['anchor_id']}"
        )
        return AnchorReceipt(
            event_hash=str(row["event_hash"]),
            status=str(row["status"]),
            reference=reference,
            network=str(row.get("network") or "evm"),
            transaction_id=transaction_id,
            block_number=row.get("block_number"),
            chain_id=chain_id,
            contract_address=row.get("contract_address"),
        )

    def get(self, event_hash: str) -> AnchorReceipt | None:
        return self._receipt(
            fetch_one(
                """
                SELECT anchor_id, event_hash, status, network, transaction_id,
                       block_number, chain_id, contract_address
                FROM orivia.blockchain_anchor
                WHERE event_hash=%s
                ORDER BY created_at DESC LIMIT 1
                """,
                (event_hash,),
            )
        )

    def _persist_pending(
        self,
        *,
        event_hash: str,
        entity_type: str,
        entity_id: str | None,
        transaction_id: str | None = None,
        attempts: int = 0,
        status: str = "PENDING_ANCHOR",
        last_error: str | None = None,
    ) -> None:
        with transaction() as connection:
            event = connection.execute(
                """
                SELECT event_id, order_id::text AS entity_id, event_type
                FROM orivia.order_event WHERE event_hash=%s
                UNION ALL
                SELECT event_id, lot_id::text AS entity_id, event_type
                FROM orivia.trace_lot_event WHERE event_hash=%s
                LIMIT 1
                """,
                (event_hash, event_hash),
            ).fetchone()
            if event is None:
                raise ValueError("event_hash does not exist")
            connection.execute(
                """
                INSERT INTO orivia.blockchain_anchor(
                    event_id, entity_type, entity_id, network, status,
                    transaction_id, event_hash, attempts, last_error, chain_id,
                    contract_address
                ) VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT(event_hash) DO UPDATE SET
                    network=EXCLUDED.network,
                    status=EXCLUDED.status,
                    transaction_id=COALESCE(EXCLUDED.transaction_id,
                                           orivia.blockchain_anchor.transaction_id),
                    attempts=EXCLUDED.attempts,
                    last_error=EXCLUDED.last_error,
                    chain_id=EXCLUDED.chain_id,
                    contract_address=EXCLUDED.contract_address
                """,
                (
                    event.get("event_id") if entity_type == "order" else None,
                    entity_type,
                    entity_id or event.get("entity_id"),
                    self._network,
                    status,
                    transaction_id,
                    event_hash,
                    attempts,
                    last_error,
                    self._chain_id,
                    self._contract_address,
                ),
            )

    def _persist_success(
        self, *, event_hash: str, transaction_id: str, block_number: int
    ) -> AnchorReceipt:
        with transaction() as connection:
            row = connection.execute(
                """
                UPDATE orivia.blockchain_anchor
                SET status='ANCHORED', transaction_id=%s, block_number=%s,
                    anchored_at=now(), last_error=NULL
                WHERE event_hash=%s
                RETURNING anchor_id, event_hash, status, network, transaction_id,
                          block_number, chain_id, contract_address
                """,
                (transaction_id, block_number, event_hash),
            ).fetchone()
        receipt = self._receipt(row)
        if receipt is None:
            raise BlockchainUnavailable("No se pudo persistir el anclaje EVM")
        return receipt

    def _persist_failure(self, event_hash: str, message: str) -> None:
        with transaction() as connection:
            connection.execute(
                """
                UPDATE orivia.blockchain_anchor
                SET status='FAILED', last_error=%s, attempts=attempts+1
                WHERE event_hash=%s
                """,
                (message[:1000], event_hash),
            )

    def anchor(
        self,
        event_hash: str,
        *,
        entity_type: str = "order",
        entity_id: str | None = None,
        event_type: str | None = None,
        occurred_at: str | None = None,
    ) -> AnchorReceipt:
        event_hash_bytes = _hash_bytes32(event_hash)
        existing = self.get(event_hash)
        if existing and existing.status == "ANCHORED":
            return existing

        attempts = (existing.transaction_id is not None if existing else False)
        self._persist_pending(
            event_hash=event_hash,
            entity_type=entity_type,
            entity_id=entity_id,
            attempts=int(attempts),
        )
        try:
            subject_hash = self._web3.keccak(
                text=f"{entity_type}:{entity_id or event_hash}"
            )
            type_hash = self._web3.keccak(text=event_type or "TRACE_EVENT")
            nonce = self._web3.eth.get_transaction_count(
                self._account.address, "pending"
            )
            transaction = self._contract.functions.anchor(
                event_hash_bytes,
                subject_hash,
                type_hash,
                _occurred_timestamp(occurred_at),
            ).build_transaction(
                {
                    "from": self._account.address,
                    "nonce": nonce,
                    "chainId": self._chain_id,
                    "gas": self._gas_limit,
                    "gasPrice": self._web3.eth.gas_price,
                }
            )
            signed = self._account.sign_transaction(transaction)
            tx_hash = self._web3.eth.send_raw_transaction(signed.raw_transaction)
            tx_hex = tx_hash.hex()
            self._persist_pending(
                event_hash=event_hash,
                entity_type=entity_type,
                entity_id=entity_id,
                transaction_id=tx_hex,
                attempts=1,
            )
            receipt = self._web3.eth.wait_for_transaction_receipt(
                tx_hash, timeout=self._tx_timeout_seconds
            )
            if int(receipt["status"]) != 1:
                raise BlockchainUnavailable("La transacción EVM fue revertida")
            return self._persist_success(
                event_hash=event_hash,
                transaction_id=tx_hex,
                block_number=int(receipt["blockNumber"]),
            )
        except Exception as exc:
            self._persist_failure(event_hash, str(exc))
            if isinstance(exc, BlockchainUnavailable):
                raise
            raise BlockchainUnavailable(f"No se pudo anclar el evento: {exc}") from exc

    def verify(self, receipt: AnchorReceipt) -> bool:
        if receipt.status != "ANCHORED":
            return False
        try:
            return bool(
                self._contract.functions.isAnchored(
                    _hash_bytes32(receipt.event_hash)
                ).call()
            )
        except (OSError, ValueError, Web3Exception):
            return False
