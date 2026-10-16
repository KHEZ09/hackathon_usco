import pytest
from psycopg.errors import UniqueViolation

from app import create_app
from app.auth_tokens.passwords import verify_password
from app.users.self_registration import password_issues, self_registration_roles

STRONG = "Cacao-Huila-2026"


class FakeUserRepository:
    """Repositorio en memoria con la misma regla de correo único que PostgreSQL."""

    def __init__(self):
        self.rows = {}

    def by_login(self, login):
        # Igual que PostgreSQL: solo devuelve cuentas activas.
        row = self.rows.get(login.lower())
        return row if row and row["account_status"] == "ACTIVE" else None

    def create(self, data, roles):
        if data["email"].lower() in self.rows:
            raise UniqueViolation("duplicate key value violates unique constraint")
        row = {
            "user_id": f"user-{len(self.rows) + 1}",
            "full_name": data["full_name"],
            "email": data["email"],
            "password_hash": data["password_hash"],
            "account_status": data["account_status"],
            "roles": list(roles),
        }
        self.rows[data["email"].lower()] = row
        return {k: v for k, v in row.items() if k != "roles"}

    def list_accounts(self, status=None):
        return [r for r in self.rows.values() if status is None or r["account_status"] == status]

    def update(self, user_id, fields):
        for row in self.rows.values():
            if row["user_id"] == user_id:
                row.update(fields)
                return {k: v for k, v in row.items() if k != "roles"}
        return None


@pytest.fixture
def setup(monkeypatch):
    monkeypatch.delenv("ORIVIA_SELF_REGISTRATION_ROLES", raising=False)
    monkeypatch.setenv("ORIVIA_REGISTER_RATE_LIMIT_ENABLED", "false")
    app = create_app()
    repo = FakeUserRepository()
    app.extensions["orivia_user_repository"] = repo
    return app.test_client(), repo


def _payload(**overrides):
    body = {
        "full_name": "Ana María Rivera",
        "email": "Ana.Rivera@Finca.co",
        "password": STRONG,
        "password_confirmation": STRONG,
        "role": "BUYER",
    }
    body.update(overrides)
    return body


def test_successful_registration_hashes_password_and_hides_it(setup):
    client, repo = setup
    response = client.post("/api/v1/auth/register", json=_payload())

    assert response.status_code == 201
    data = response.get_json()["data"]
    assert data["email"] == "ana.rivera@finca.co"
    assert data["roles"] == ["BUYER"]
    assert "password" not in response.get_data(as_text=True).lower().replace("password_", "")
    assert STRONG not in response.get_data(as_text=True)
    stored = repo.rows["ana.rivera@finca.co"]
    assert stored["password_hash"] != STRONG
    assert stored["password_hash"].startswith("$2")
    assert verify_password(STRONG, stored["password_hash"])


def test_registered_user_can_login_with_existing_endpoint(setup):
    client, _ = setup
    client.post("/api/v1/auth/register", json=_payload())
    client.application.extensions["orivia_auth_repository"] = type(
        "A", (), {"insert_refresh_token": lambda *a, **k: None}
    )()

    response = client.post("/api/v1/auth/login", json={"email": "ana.rivera@finca.co", "password": STRONG})

    assert response.status_code == 200
    assert response.get_json()["user"]["email"] == "ana.rivera@finca.co"


def test_duplicate_email_is_rejected_without_details(setup):
    client, _ = setup
    assert client.post("/api/v1/auth/register", json=_payload()).status_code == 201

    response = client.post("/api/v1/auth/register", json=_payload(email="ANA.RIVERA@finca.co"))

    assert response.status_code == 409
    body = response.get_json()
    assert body["error"] == "EMAIL_UNAVAILABLE"
    assert "constraint" not in body["message"].lower()


def test_duplicate_detected_by_database_constraint(setup):
    client, repo = setup
    repo.by_login = lambda login: None  # simula carrera: solo la restricción única lo detecta
    client.post("/api/v1/auth/register", json=_payload())

    response = client.post("/api/v1/auth/register", json=_payload())

    assert response.status_code == 409
    assert response.get_json()["error"] == "EMAIL_UNAVAILABLE"


@pytest.mark.parametrize("weak", ["corta1!", "sinmayusculas-2026", "SINMINUSCULAS-2026", "SinNumeros-Cacao", "SinSimbolo2026Cacao"])
def test_weak_password_is_rejected(setup, weak):
    client, repo = setup
    response = client.post("/api/v1/auth/register", json=_payload(password=weak, password_confirmation=weak))

    assert response.status_code == 400
    assert response.get_json()["error"] == "WEAK_PASSWORD"
    assert weak not in response.get_data(as_text=True)
    assert not repo.rows


def test_password_containing_email_is_weak():
    assert password_issues("Ana.rivera-2026!", "ana.rivera@finca.co")


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"email": "no-es-correo"}, "email"),
        ({"email": "ana@finca"}, "email"),
        ({"full_name": "<script>alert(1)</script>"}, "full_name"),
        ({"full_name": "A"}, "full_name"),
        ({"password_confirmation": "Otra-Clave-2026"}, "password_confirmation"),
        ({"password": None}, "password"),
    ],
)
def test_invalid_data_is_rejected(setup, overrides, field):
    client, repo = setup
    response = client.post("/api/v1/auth/register", json=_payload(**overrides))

    assert response.status_code == 400
    assert response.get_json()["field"] == field
    assert not repo.rows


def test_non_json_body_is_rejected(setup):
    client, _ = setup
    response = client.post("/api/v1/auth/register", data="x", content_type="text/plain")
    assert response.status_code == 400


@pytest.mark.parametrize("role", ["ADMIN", "admin", "OPERATOR"])
def test_privileged_roles_are_created_pending_approval(setup, role):
    client, repo = setup
    response = client.post("/api/v1/auth/register", json=_payload(role=role))

    assert response.status_code == 201
    assert response.get_json()["data"]["requires_approval"] is True
    stored = repo.rows["ana.rivera@finca.co"]
    assert stored["account_status"] == "SUSPENDED"
    assert stored["roles"] == [role.upper()]
    # Una cuenta pendiente no puede iniciar sesión hasta que un administrador la apruebe.
    login = client.post("/api/v1/auth/login", json={"email": "ana.rivera@finca.co", "password": STRONG})
    assert login.status_code == 401


def test_buyer_is_active_immediately(setup):
    client, repo = setup
    response = client.post("/api/v1/auth/register", json=_payload(role="BUYER"))
    assert response.get_json()["data"]["requires_approval"] is False
    assert repo.rows["ana.rivera@finca.co"]["account_status"] == "ACTIVE"


@pytest.mark.parametrize("role", ["ACCOUNTING", "ROOT"])
def test_unauthorized_role_cannot_be_self_assigned(setup, role):
    client, repo = setup
    response = client.post("/api/v1/auth/register", json=_payload(role=role))

    assert response.status_code == 403
    assert response.get_json()["error"] == "ROLE_NOT_ALLOWED"
    assert not repo.rows


def test_extra_privilege_fields_are_ignored(setup):
    client, repo = setup
    response = client.post(
        "/api/v1/auth/register",
        json=_payload(roles=["ADMIN"], permissions=["*"], account_status="ACTIVE"),
    )

    assert response.status_code == 201
    assert repo.rows["ana.rivera@finca.co"]["roles"] == ["BUYER"]


def test_admin_roles_are_never_enabled_by_configuration(monkeypatch):
    monkeypatch.setenv("ORIVIA_SELF_REGISTRATION_ROLES", "ADMIN,ACCOUNTING,OPERATOR,BUYER")
    assert self_registration_roles() == ("OPERATOR", "BUYER")


def test_roles_endpoint_lists_only_self_service_roles(setup):
    client, _ = setup
    roles = [r["role"] for r in client.get("/api/v1/auth/register/roles").get_json()["data"]]
    assert roles == ["BUYER", "VIEWER", "OPERATOR", "ADMIN"]


def test_registration_is_rate_limited(monkeypatch):
    monkeypatch.setenv("ORIVIA_REGISTER_RATE_LIMIT_ENABLED", "true")
    monkeypatch.setenv("ORIVIA_REGISTER_RATE_LIMIT_MAX_ATTEMPTS", "3")
    app = create_app()
    app.extensions["orivia_user_repository"] = FakeUserRepository()
    client = app.test_client()

    codes = [client.post("/api/v1/auth/register", json=_payload(email=f"u{i}@finca.co")).status_code for i in range(4)]

    assert codes[:3] == [201, 201, 201]
    assert codes[3] == 429


def _admin_headers(app, subject="admin-1", role="ADMIN"):
    import jwt

    token = jwt.encode(
        {"sub": subject, "role": role.lower(), "roles": [role], "permissions": ["*"] if role == "ADMIN" else ["orders:read"],
         "iat": 1730000000, "exp": 4102444800, "iss": app.config["JWT_ISSUER"], "jti": f"acc-{subject}", "type": "access"},
        app.config["JWT_SECRET_KEY"], algorithm="HS256",
    )
    return {"Authorization": f"Bearer {token}"}


def test_admin_approves_pending_operator_who_then_can_login(setup):
    client, _ = setup
    client.post("/api/v1/auth/register", json=_payload(role="OPERATOR"))
    admin = _admin_headers(client.application)

    pending = client.get("/api/v1/auth/accounts?status=SUSPENDED", headers=admin).get_json()["data"]
    assert [a["email"] for a in pending] == ["ana.rivera@finca.co"]
    assert pending[0]["pending_approval"] is True and "password_hash" not in pending[0]

    approved = client.patch(f"/api/v1/auth/accounts/{pending[0]['user_id']}/status", headers=admin, json={"status": "ACTIVE"})
    assert approved.status_code == 200
    client.application.extensions["orivia_auth_repository"] = type("A", (), {"insert_refresh_token": lambda *a, **k: None})()
    login = client.post("/api/v1/auth/login", json={"email": "ana.rivera@finca.co", "password": STRONG})
    assert login.status_code == 200
    assert login.get_json()["user"]["roles"] == ["OPERATOR"]


@pytest.mark.parametrize("role", ["OPERATOR", "ADMIN", "BUYER", "ACCOUNTING", "VIEWER"])
def test_admin_creates_active_accounts_of_any_role(setup, role):
    client, repo = setup
    response = client.post("/api/v1/auth/accounts", headers=_admin_headers(client.application), json=_payload(role=role))
    assert response.status_code == 201
    assert repo.rows["ana.rivera@finca.co"]["account_status"] == "ACTIVE"
    assert repo.rows["ana.rivera@finca.co"]["roles"] == [role]


def test_non_admin_cannot_manage_accounts(setup):
    client, _ = setup
    buyer = _admin_headers(client.application, subject="buyer-1", role="BUYER")
    assert client.get("/api/v1/auth/accounts", headers=buyer).status_code == 403
    assert client.post("/api/v1/auth/accounts", headers=buyer, json=_payload(role="ADMIN")).status_code == 403
    assert client.get("/api/v1/auth/accounts").status_code == 401


def test_admin_cannot_block_itself(setup):
    client, _ = setup
    response = client.patch("/api/v1/auth/accounts/admin-1/status", headers=_admin_headers(client.application), json={"status": "BLOCKED"})
    assert response.status_code == 400
