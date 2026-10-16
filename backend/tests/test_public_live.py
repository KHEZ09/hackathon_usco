from datetime import datetime, timezone
from unittest.mock import patch

from app import create_app
from app.public_live import routes


def _metrics():
    now = datetime(2026, 10, 16, 13, 0, tzinfo=timezone.utc)
    return {
        "generated_at": now,
        "last_change_at": now,
        "lots": 3,
        "trace_events": 2,
        "orders": 2,
        "order_events": 2,
        "blockchain_anchors": 1,
        "cluster_actors": 4,
        "cluster_needs": 2,
        "cluster_connections": 1,
    }


def test_public_live_returns_aggregate_only_snapshot():
    app = create_app()
    client = app.test_client()
    with (
        patch.object(routes, "fetch_one", return_value=_metrics()),
        patch.object(
            routes,
            "fetch_all",
            side_effect=[
                [{"status": "LIBERATED", "total": 2}],
                [{"status": "DELIVERED", "total": 1}],
                [{"status": "ANCHORED", "total": 1}],
                [
                    {
                        "source": "traceability",
                        "event_type": "REGISTERED",
                        "occurred_at": datetime(2026, 10, 16, 12, 59, tzinfo=timezone.utc),
                    }
                ],
            ],
        ),
    ):
        response = client.get("/api/v1/public/live")

    assert response.status_code == 200
    body = response.get_json()
    assert body["status"] == "ok"
    assert body["metrics"]["blockchain_anchors"] == 1
    assert body["states"]["lots"] == {"LIBERATED": 2}
    assert body["recent_changes"][0]["source"] == "traceability"
    assert "email" not in response.get_data(as_text=True)
    assert "password" not in response.get_data(as_text=True)
    assert response.headers["Cache-Control"] == "no-store, max-age=0"


def test_public_live_hides_database_failure_details():
    app = create_app()
    client = app.test_client()
    with patch.object(routes, "fetch_one", side_effect=RuntimeError("secret DSN")):
        response = client.get("/api/v1/public/live")

    assert response.status_code == 503
    assert response.get_json() == {
        "message": "La vista pública no está disponible temporalmente.",
        "service": "orivia-public-live",
        "status": "unavailable",
    }
    assert "secret DSN" not in response.get_data(as_text=True)
