from app.database.repositories import UserRepository


def test_user_repository_exposes_login_contract(monkeypatch):
    expected = {
        "user_id": "1",
        "email": "demo@test.co",
        "password_hash": "hash",
        "account_status": "ACTIVE",
        "roles": ["OPERATOR"],
    }
    monkeypatch.setattr(
        "app.database.repositories.fetch_one", lambda query, params: expected
    )
    row = UserRepository().by_login("demo@test.co")
    assert row["email"] == "demo@test.co"
    assert "password_hash" in row
