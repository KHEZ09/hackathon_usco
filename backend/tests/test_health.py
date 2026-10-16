from app import create_app


def test_health_endpoint():
    client = create_app().test_client()

    response = client.get("/health")

    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"


def test_ready_reports_unavailable_database():
    client = create_app().test_client()

    response = client.get("/ready")

    assert response.status_code == 503
    assert response.get_json()["dependencies"]["database"] == "unavailable"
