from app import create_app
from app.blockchain.postgres_anchor import PostgresBlockchainAnchor
from app.orders.postgres_repository import PostgresOrderRepository
from app.orders.repository import InMemoryOrderRepository


def test_development_defaults_to_in_memory_adapters(monkeypatch):
    monkeypatch.delenv("ORIVIA_ENV", raising=False)
    monkeypatch.delenv("ORIVIA_ORDER_REPOSITORY", raising=False)

    app = create_app()

    assert isinstance(app.extensions["orivia_order_repository"], InMemoryOrderRepository)
    assert app.config["ORDER_REPOSITORY_BACKEND"] == "memory"


def test_production_selects_postgres_adapters(monkeypatch):
    monkeypatch.setenv("ORIVIA_ENV", "production")
    monkeypatch.setenv("ORIVIA_JWT_SECRET_KEY", "x" * 64)
    monkeypatch.setenv("ORIVIA_ORDER_REPOSITORY", "postgres")
    monkeypatch.setenv(
        "ORIVIA_DATABASE_URL",
        "postgresql://orivia:production-only-password@postgres:5432/orivia",
    )

    app = create_app()

    assert isinstance(app.extensions["orivia_order_repository"], PostgresOrderRepository)
    assert isinstance(app.extensions["orivia_blockchain_anchor"], PostgresBlockchainAnchor)
    assert app.config["ORDER_REPOSITORY_BACKEND"] == "postgres"
