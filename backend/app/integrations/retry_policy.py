from __future__ import annotations

from collections.abc import Callable
from time import sleep
from typing import TypeVar

T = TypeVar("T")


def with_retries(
    operation: Callable[[], T], attempts: int = 3, delay_seconds: float = 0.25
) -> tuple[T, int]:
    if not 1 <= attempts <= 5:
        raise ValueError("attempts debe estar entre 1 y 5")
    last_error: Exception | None = None
    for number in range(1, attempts + 1):
        try:
            return operation(), number
        except Exception as exc:  # noqa: BLE001 - el adaptador externo define sus excepciones
            last_error = exc
            if number < attempts:
                sleep(delay_seconds * number)
    raise last_error or RuntimeError("Integración fallida")
