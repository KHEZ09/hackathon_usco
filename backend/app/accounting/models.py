from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True)
class LotCost:
    lot_id: UUID
    total_cost: Decimal
    cost_per_kg: Decimal
