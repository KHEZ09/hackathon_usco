#!/usr/bin/env python3
"""Deploy the ORIVIA trace registry to the configured EVM network."""
from __future__ import annotations

import json
import os
from pathlib import Path

from eth_account import Account
from web3 import Web3


ROOT = Path(__file__).resolve().parents[1]
ARTIFACT = ROOT / "app" / "blockchain" / "contract_artifact.json"


def required(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Falta la variable {name}")
    return value


def main() -> None:
    rpc_url = required("ORIVIA_BLOCKCHAIN_RPC_URL")
    private_key = required("ORIVIA_BLOCKCHAIN_PRIVATE_KEY")
    expected_chain_id = int(required("ORIVIA_BLOCKCHAIN_CHAIN_ID"))
    web3 = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={"timeout": 15}))
    if not web3.is_connected():
        raise SystemExit("No se pudo conectar al RPC EVM")
    if int(web3.eth.chain_id) != expected_chain_id:
        raise SystemExit(
            f"Chain id incorrecto: {web3.eth.chain_id}; esperado {expected_chain_id}"
        )

    artifact = json.loads(ARTIFACT.read_text(encoding="utf-8"))
    account = Account.from_key(private_key)
    balance = web3.eth.get_balance(account.address)
    if balance == 0:
        raise SystemExit("La cuenta firmante no tiene saldo para gas")

    contract = web3.eth.contract(abi=artifact["abi"], bytecode=artifact["bytecode"])
    nonce = web3.eth.get_transaction_count(account.address, "pending")
    transaction = contract.constructor().build_transaction(
        {
            "from": account.address,
            "nonce": nonce,
            "chainId": expected_chain_id,
            "gas": 1_000_000,
            "gasPrice": web3.eth.gas_price,
        }
    )
    signed = account.sign_transaction(transaction)
    tx_hash = web3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = web3.eth.wait_for_transaction_receipt(tx_hash, timeout=180)
    if int(receipt["status"]) != 1:
        raise SystemExit("La transacción de despliegue fue revertida")
    address = web3.to_checksum_address(receipt["contractAddress"])
    print(json.dumps({
        "chain_id": expected_chain_id,
        "contract_address": address,
        "transaction_id": tx_hash.hex(),
        "block_number": int(receipt["blockNumber"]),
        "signer": account.address,
    }, indent=2))


if __name__ == "__main__":
    main()
