from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True)
class Product:
    product_id: UUID
    sku: str
    name: str
    kind: str
    sale_price: Decimal
    min_stock_kg: Decimal
