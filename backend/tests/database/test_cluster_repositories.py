import pytest

from app import create_app
from app.database.cluster_repositories import ActorNeedRepository, ActorRepository


def test_cluster_repositories_are_registered_in_factory():
    app = create_app()

    repositories = app.extensions["orivia_cluster_repositories"]

    assert set(repositories) == {
        "actors",
        "actor_needs",
        "actor_offers",
        "actor_connections",
        "trust_signals",
    }


def test_public_actor_repository_applies_public_contract(monkeypatch):
    calls = {}

    def fake_fetch_all(query, params=()):
        calls["query"] = query
        calls["params"] = params
        return [{"slug": "finca-la-montana"}]

    monkeypatch.setattr("app.database.cluster_repositories.fetch_all", fake_fetch_all)

    result = ActorRepository().list_public(
        query="cacao", actor_type="producer", municipality="Pitalito"
    )

    assert result == [{"slug": "finca-la-montana"}]
    assert "visibility='PUBLIC'" in calls["query"]
    assert "status='ACTIVE'" in calls["query"]
    assert calls["params"][3] == "PRODUCER"


def test_need_repository_rejects_unknown_category_before_database(monkeypatch):
    called = False

    def fail_fetch_all(*args, **kwargs):
        nonlocal called
        called = True
        return []

    monkeypatch.setattr("app.database.cluster_repositories.fetch_all", fail_fetch_all)

    with pytest.raises(ValueError, match="category inválido"):
        ActorNeedRepository().list_public(category="UNKNOWN")

    assert called is False
