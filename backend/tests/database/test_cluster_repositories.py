import pytest

from app import create_app
from app.database.cluster_repositories import (
    ActorConnectionRepository,
    ActorNeedRepository,
    ActorRepository,
    TrustSignalRepository,
)


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


def test_connection_repository_rejects_incoherent_context_before_database(monkeypatch):
    monkeypatch.setattr(
        "app.database.cluster_repositories.transaction",
        lambda: pytest.fail("no debe abrir una transacción"),
    )

    with pytest.raises(ValueError, match="need_id requerido"):
        ActorConnectionRepository().create_request(
            {
                "requester_actor_id": "producer",
                "target_actor_id": "buyer",
                "connection_type": "NEED_MATCH",
            }
        )


def test_connection_repository_rejects_self_connection_before_database():
    with pytest.raises(ValueError, match="consigo mismo"):
        ActorConnectionRepository().create_request(
            {
                "requester_actor_id": "same",
                "target_actor_id": "same",
                "connection_type": "DIRECT",
            }
        )


def test_trust_repository_validates_score_and_explanation_before_database():
    with pytest.raises(ValueError, match="score debe estar"):
        TrustSignalRepository().append(
            {
                "actor_id": "actor",
                "signal_type": "PROFILE_COMPLETENESS",
                "score": 101,
                "explanation": "válida",
            }
        )

    with pytest.raises(ValueError, match="explanation"):
        TrustSignalRepository().append(
            {
                "actor_id": "actor",
                "signal_type": "PROFILE_COMPLETENESS",
                "explanation": "no",
            }
        )


def test_public_trust_repository_requires_confirmed_public_actor(monkeypatch):
    calls = {}

    def fake_fetch_all(query, params=()):
        calls["query"] = query
        calls["params"] = params
        return []

    monkeypatch.setattr("app.database.cluster_repositories.fetch_all", fake_fetch_all)

    TrustSignalRepository().list_for_actor("actor-id")

    assert "JOIN orivia.actors" in calls["query"]
    assert "s.visibility='PUBLIC'" in calls["query"]
    assert "s.status='CONFIRMED'" in calls["query"]
    assert "a.status='ACTIVE'" in calls["query"]
    assert calls["params"] == ("actor-id",)
