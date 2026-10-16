import jwt

from app import create_app
from app.cluster.models import TrustSignals
from app.cluster.trust import calculate_trust
from app.security.roles import permissions_for_role


def _headers(app, permissions, subject="cluster-user"):
    token = jwt.encode(
        {
            "sub": subject,
            "role": "test",
            "permissions": permissions,
            "iat": 1730000000,
            "exp": 4102444800,
            "iss": app.config["JWT_ISSUER"],
            "jti": f"cluster-{subject}",
            "type": "access",
        },
        app.config["JWT_SECRET_KEY"],
        algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def test_cluster_permissions_are_explicit_and_role_owned():
    assert "cluster:read" in permissions_for_role("operator")
    assert "needs:create" in permissions_for_role("operator")
    assert "orders:transition" in permissions_for_role("operator")
    assert "connections:create" in permissions_for_role("buyer")
    assert "trust:read" in permissions_for_role("viewer")
    assert "lots:status" not in permissions_for_role("operator")


def test_trust_score_is_explainable_and_penalizes_open_incidents():
    high = calculate_trust(TrustSignals(True, 5, 5, 5, 3))
    degraded = calculate_trust(TrustSignals(True, 5, 5, 5, 3, open_incidents=2))

    assert high.score == 100
    assert high.level == "ALTA"
    assert high.formula_version == "trust-v1"
    assert len(high.explanations) == 6
    assert degraded.score == 80
    assert degraded.score < high.score
    assert "Incidencias abiertas" in degraded.explanations[-1]


def test_public_cluster_projection_does_not_leak_private_contact_data():
    app = create_app()
    client = app.test_client()

    response = client.get("/api/v1/public/cluster/actors")

    assert response.status_code == 200
    actor = response.get_json()["actors"][0]
    assert "contact" not in actor
    assert "internal_notes" not in actor
    assert "trust" in actor


def test_authenticated_cluster_lists_shared_data_but_not_private_notes():
    app = create_app()
    client = app.test_client()
    headers = _headers(app, ["cluster:read"])

    response = client.get("/api/v1/cluster/actors", headers=headers)
    detail = client.get(
        "/api/v1/cluster/actors/actor-prod-001", headers=headers
    )

    assert response.status_code == 200
    assert "contact" in response.get_json()["actors"][0]
    assert detail.status_code == 200
    assert "private" not in detail.get_json()


def test_authenticated_cluster_cannot_resolve_private_actor_by_id(monkeypatch):
    app = create_app()
    repository = app.extensions["orivia_cluster_repository"]
    actor = repository.get_actor("actor-prod-001")
    monkeypatch.setattr(repository, "get_actor", lambda _actor_id: actor)
    monkeypatch.setattr(repository, "get_public_actor", lambda _actor_id: None)

    response = app.test_client().get(
        "/api/v1/cluster/actors/private-id",
        headers=_headers(app, ["cluster:read"]),
    )

    assert response.status_code == 404


def test_operator_can_create_need_using_token_subject():
    app = create_app()
    client = app.test_client()
    headers = _headers(app, ["needs:create"], subject="producer-42")

    response = client.post(
        "/api/v1/cluster/needs",
        headers=headers,
        json={
            "actor_id": "attacker-supplied-id",
            "title": "Transporte de cacao",
            "description": "Necesitamos transporte refrigerado.",
            "category": "logistica",
            "quantity": 2,
            "unit": "viajes",
        },
    )

    assert response.status_code == 201
    assert response.get_json()["need"]["actor_id"] == "producer-42"


def test_buyer_can_create_connection_but_viewer_cannot():
    app = create_app()
    client = app.test_client()
    buyer_headers = _headers(app, ["connections:create"], subject="buyer-42")
    viewer_headers = _headers(app, ["cluster:read"], subject="viewer-42")
    payload = {
        "target_actor_id": "actor-prod-001",
        "need_id": "need-001",
        "message": "Quiero conocer la disponibilidad del lote.",
    }

    created = client.post(
        "/api/v1/cluster/connections", headers=buyer_headers, json=payload
    )
    forbidden = client.post(
        "/api/v1/cluster/connections", headers=viewer_headers, json=payload
    )

    assert created.status_code == 201
    assert created.get_json()["connection"]["status"] == "PENDING"
    assert forbidden.status_code == 403


def test_trust_route_returns_formula_and_signals():
    app = create_app()
    client = app.test_client()
    response = client.get(
        "/api/v1/cluster/actors/actor-prod-001/trust",
        headers=_headers(app, ["trust:read"]),
    )

    assert response.status_code == 200
    trust = response.get_json()["trust"]
    assert trust["formula_version"] == "trust-v1"
    assert trust["signals"]["verified_events"] == 5


def test_trust_route_requests_public_signals_for_non_admin(monkeypatch):
    app = create_app()
    repository = app.extensions["orivia_cluster_repository"]
    calls = {}
    original = repository.trust_for_actor

    def wrapped(actor_id, *, public_only=True):
        calls["public_only"] = public_only
        return original(actor_id, public_only=public_only)

    monkeypatch.setattr(repository, "trust_for_actor", wrapped)
    response = app.test_client().get(
        "/api/v1/cluster/actors/actor-prod-001/trust",
        headers=_headers(app, ["trust:read"]),
    )

    assert response.status_code == 200
    assert calls["public_only"] is True
