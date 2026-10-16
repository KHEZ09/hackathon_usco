from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True)
class UserRecord:
    user_id: UUID
    full_name: str
    email: str
    password_hash: str
    account_status: str
    roles: tuple[str, ...]


@dataclass(frozen=True)
class ProductRecord:
    product_id: UUID
    sku: str
    name: str
    kind: str
    sale_price: Decimal
    min_stock_kg: Decimal


@dataclass(frozen=True)
class CostRecord:
    lot_id: UUID
    total_cost: Decimal
    cost_per_kg: Decimal


@dataclass(frozen=True)
class IntegrationResult:
    provider: str
    status: str
    attempts: int
    payload: dict
    error_message: str | None = None
