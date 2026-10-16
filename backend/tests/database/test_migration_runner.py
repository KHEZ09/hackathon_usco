from pathlib import Path


def test_migrations_are_ordered_and_have_transaction_boundaries():
    root = Path(__file__).parents[2] / "migrations"
    files = sorted(root.glob("[0-9][0-9][0-9]_*.sql"))
    assert [file.name for file in files] == [
        "001_initial.sql",
        "002_seed_synthetic.sql",
        "003_seed_inventory.sql",
        "004_orders_traceability_persistence.sql",
        "005_cluster_network.sql",
        "006_seed_cluster_synthetic.sql",
        "007_lot_traceability.sql",
    ]
    for file in files:
        content = file.read_text(encoding="utf-8")
        assert "BEGIN;" in content
        assert "COMMIT;" in content
