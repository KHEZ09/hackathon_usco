from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from psycopg.types.json import Jsonb

from .connection import fetch_all, fetch_one, transaction


class UserRepository:
    def by_login(self, login: str) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT u.*, array_agg(ur.role::text) FILTER (WHERE ur.role IS NOT NULL) AS roles
            FROM orivia.app_user u LEFT JOIN orivia.app_user_role ur USING(user_id)
            WHERE lower(u.email)=lower(%s) AND u.account_status='ACTIVE' GROUP BY u.user_id
        """,
            (login,),
        )

    def by_id(self, user_id: UUID | str) -> dict[str, Any] | None:
        return fetch_one(
            """
            SELECT u.user_id,u.full_name,u.email,u.account_status,u.phone,u.municipality,u.created_at,
                   array_agg(ur.role::text) FILTER (WHERE ur.role IS NOT NULL) AS roles
            FROM orivia.app_user u LEFT JOIN orivia.app_user_role ur USING(user_id)
            WHERE u.user_id=%s GROUP BY u.user_id
        """,
            (user_id,),
        )

    def list(self, status: str | None = None) -> list[dict[str, Any]]:
        return fetch_all(
            """SELECT user_id,full_name,email,account_status,phone,municipality,created_at
                          FROM orivia.app_user WHERE (%s IS NULL OR account_status=%s::orivia.account_status)
                          ORDER BY created_at DESC""",
            (status, status),
        )

    def create(self, data: dict[str, Any], roles: list[str]) -> dict[str, Any]:
        with transaction() as connection:
            row = connection.execute(
                """INSERT INTO orivia.app_user(full_name,email,password_hash,account_status,phone,municipality)
                VALUES(%s,%s,%s,%s::orivia.account_status,%s,%s)
                RETURNING user_id,full_name,email,account_status,phone,municipality,created_at""",
                (
                    data["full_name"],
                    data["email"],
                    data["password_hash"],
                    data.get("account_status", "ACTIVE"),
                    data.get("phone"),
                    data.get("municipality"),
                ),
            ).fetchone()
            for role in roles:
                connection.execute(
                    "INSERT INTO orivia.app_user_role(user_id,role) VALUES(%s,%s::orivia.user_role)",
                    (row["user_id"], role),
                )
            return row

    def update(
        self, user_id: UUID | str, fields: dict[str, Any]
    ) -> dict[str, Any] | None:
        allowed = {"full_name", "account_status", "phone", "municipality"}
        values = {key: value for key, value in fields.items() if key in allowed}
        if not values:
            return self.by_id(user_id)
        assignments = ", ".join(
            f"{key}=%s" + ("::orivia.account_status" if key == "account_status" else "")
            for key in values
        )
        with transaction() as connection:
            return connection.execute(
                f"UPDATE orivia.app_user SET {assignments} WHERE user_id=%s RETURNING user_id,full_name,email,account_status,phone,municipality,created_at",
                (*values.values(), user_id),
            ).fetchone()


class AuthRepository:
    def insert_refresh_token(
        self, user_id: UUID | str, token_hash: str, ttl_seconds: int
    ) -> None:
        expires_at = datetime.now(UTC) + timedelta(seconds=ttl_seconds)
        with transaction() as connection:
            connection.execute(
                """INSERT INTO orivia.refresh_token(user_id,token_hash,expires_at)
                VALUES(%s,%s,%s)""",
                (user_id, token_hash, expires_at),
            )

    def rotate_refresh_token(
        self, token_hash: str, replacement_hash: str, ttl_seconds: int
    ) -> dict[str, Any] | None:
        expires_at = datetime.now(UTC) + timedelta(seconds=ttl_seconds)
        with transaction() as connection:
            token = connection.execute(
                """SELECT refresh_token_id,user_id FROM orivia.refresh_token
                WHERE token_hash=%s AND revoked_at IS NULL AND expires_at > now()
                FOR UPDATE""",
                (token_hash,),
            ).fetchone()
            if token is None:
                return None

            user = connection.execute(
                """SELECT u.*, array_agg(ur.role::text)
                    FILTER (WHERE ur.role IS NOT NULL) AS roles
                FROM orivia.app_user u
                LEFT JOIN orivia.app_user_role ur USING(user_id)
                WHERE u.user_id=%s AND u.account_status='ACTIVE'
                GROUP BY u.user_id""",
                (token["user_id"],),
            ).fetchone()
            if user is None:
                connection.execute(
                    "UPDATE orivia.refresh_token SET revoked_at=now() WHERE refresh_token_id=%s",
                    (token["refresh_token_id"],),
                )
                return None

            connection.execute(
                "UPDATE orivia.refresh_token SET revoked_at=now() WHERE refresh_token_id=%s",
                (token["refresh_token_id"],),
            )
            connection.execute(
                """INSERT INTO orivia.refresh_token(user_id,token_hash,expires_at)
                VALUES(%s,%s,%s)""",
                (token["user_id"], replacement_hash, expires_at),
            )
            return user


class CatalogRepository:
    def products(
        self, query: str | None = None, public_only: bool = True
    ) -> list[dict[str, Any]]:
        return fetch_all(
            """SELECT product_id,sku,name,kind,unit,sale_price,max_cost_per_kg,min_stock_kg,is_public,is_active
            FROM orivia.product WHERE is_active AND (%s::text IS NULL OR name ILIKE '%%'||%s::text||'%%' OR sku ILIKE '%%'||%s::text||'%%')
            AND (%s=false OR is_public) ORDER BY name""",
            (query, query, query, public_only),
        )

    def suppliers(self) -> list[dict[str, Any]]:
        return fetch_all(
            "SELECT supplier_id,name,contact_name,email,phone,municipality,department FROM orivia.supplier WHERE is_active ORDER BY name"
        )

    def customers(self) -> list[dict[str, Any]]:
        return fetch_all(
            "SELECT customer_id,name,email,phone,document_ref FROM orivia.customer WHERE is_active ORDER BY name"
        )

    def traceability(
        self, query: str | None = None, municipality: str | None = None
    ) -> list[dict[str, Any]]:
        return fetch_all(
            """SELECT * FROM orivia.v_public_traceability
            WHERE (%s::text IS NULL OR lot_code ILIKE '%%'||%s::text||'%%' OR product_name ILIKE '%%'||%s::text||'%%' OR supplier_name ILIKE '%%'||%s::text||'%%')
            AND (%s::text IS NULL OR municipality=%s::text) ORDER BY received_at DESC""",
            (query, query, query, query, municipality, municipality),
        )


class AccountingRepository:
    def inventory(self) -> list[dict[str, Any]]:
        return fetch_all("SELECT * FROM orivia.v_inventory ORDER BY name")

    def costs(self) -> list[dict[str, Any]]:
        return fetch_all("""SELECT l.lot_code,p.name,lc.total_cost,lc.cost_per_kg,lc.updated_at
        FROM orivia.lot_cost lc JOIN orivia.lot l USING(lot_id) JOIN orivia.product p USING(product_id) ORDER BY lc.updated_at DESC""")

    def open_alerts(self) -> list[dict[str, Any]]:
        return fetch_all("""SELECT 'LOW_STOCK' alert_type, product_id, name, available_kg, min_stock_kg
          FROM orivia.v_inventory WHERE low_stock""")

    def set_lot_cost(
        self, lot_id: UUID | str, total_cost: Any, cost_per_kg: Any
    ) -> dict[str, Any] | None:
        with transaction() as connection:
            return connection.execute(
                """INSERT INTO orivia.lot_cost(lot_id,total_cost,cost_per_kg)
                VALUES(%s,%s,%s) ON CONFLICT(lot_id) DO UPDATE SET total_cost=EXCLUDED.total_cost,
                cost_per_kg=EXCLUDED.cost_per_kg,updated_at=now() RETURNING *""",
                (lot_id, total_cost, cost_per_kg),
            ).fetchone()

    def margins(self) -> list[dict[str, Any]]:
        return fetch_all("""SELECT p.sku,p.name,p.sale_price,lc.cost_per_kg,
            (p.sale_price-lc.cost_per_kg) margin_per_kg,
            CASE WHEN p.sale_price > 0 THEN ((p.sale_price-lc.cost_per_kg)*100/p.sale_price) ELSE 0 END margin_pct
            FROM orivia.lot_cost lc JOIN orivia.lot l USING(lot_id) JOIN orivia.product p USING(product_id)
            ORDER BY margin_pct ASC""")


class ReportRepository:
    def overview(self) -> dict[str, Any]:
        return {
            "inventory": AccountingRepository().inventory(),
            "alerts": AccountingRepository().open_alerts(),
            "orders": fetch_one(
                """SELECT count(*)::int order_count, coalesce(sum(total_amount),0) revenue FROM orivia.sales_order WHERE status <> 'CANCELLED'"""
            ),
        }


class IntegrationRepository:
    def start(self, provider: str, key: str) -> dict[str, Any]:
        with transaction() as connection:
            return connection.execute(
                """INSERT INTO orivia.integration_sync_log(provider,idempotency_key,status,attempts)
                VALUES(%s,%s,'STARTED',0) ON CONFLICT(provider,idempotency_key) DO UPDATE SET status='STARTED' RETURNING *""",
                (provider, key),
            ).fetchone()

    def finish(
        self,
        provider: str,
        key: str,
        status: str,
        payload: dict,
        error: str | None = None,
        attempts: int = 1,
    ) -> dict[str, Any]:
        with transaction() as connection:
            return connection.execute(
                """UPDATE orivia.integration_sync_log SET status=%s::orivia.sync_status,response_summary=%s,
                error_message=%s,attempts=%s,finished_at=now() WHERE provider=%s AND idempotency_key=%s RETURNING *""",
                (status, Jsonb(payload), error, attempts, provider, key),
            ).fetchone()
