import json
from pathlib import Path


def test_registry_artifact_has_real_contract_bytecode_and_verification_methods():
    artifact_path = Path(__file__).parents[1] / "app" / "blockchain" / "contract_artifact.json"
    artifact = json.loads(artifact_path.read_text(encoding="utf-8"))
    function_names = {
        item["name"]
        for item in artifact["abi"]
        if item.get("type") == "function"
    }

    assert len(artifact["bytecode"]) > 1000
    assert {"anchor", "isAnchored", "anchoredAt", "submitter"} <= function_names
