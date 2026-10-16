from __future__ import annotations

from dataclasses import dataclass
from math import ceil
from threading import Lock
from time import monotonic


@dataclass
class _Bucket:
    window_started_at: float
    failures: int = 0
    blocked_until: float = 0.0


@dataclass(frozen=True)
class RateLimitDecision:
    allowed: bool
    retry_after_seconds: int = 0


class LoginRateLimiter:
    """Small dependency-free guard for login brute-force attempts.

    The limiter is intentionally kept in the Sebas-owned security layer. It is
    process-local, so a production deployment with many workers or replicas
    should also enforce a shared limit at the reverse proxy or edge. It still
    protects each Gunicorn worker and is useful for the hackathon deployment
    without introducing another service or modifying Kevin's schema.
    """

    def __init__(
        self,
        *,
        max_failures: int = 5,
        window_seconds: int = 600,
        block_seconds: int = 900,
        max_buckets: int = 10_000,
    ) -> None:
        if min(max_failures, window_seconds, block_seconds, max_buckets) <= 0:
            raise ValueError("rate-limit settings must be positive")
        self._max_failures = max_failures
        self._window_seconds = window_seconds
        self._block_seconds = block_seconds
        self._max_buckets = max_buckets
        self._buckets: dict[str, _Bucket] = {}
        self._lock = Lock()

    def check(self, key: str) -> RateLimitDecision:
        now = monotonic()
        with self._lock:
            bucket = self._buckets.get(key)
            if bucket is None:
                return RateLimitDecision(True)
            if bucket.blocked_until > now:
                return RateLimitDecision(
                    False, max(1, ceil(bucket.blocked_until - now))
                )
            if now - bucket.window_started_at >= self._window_seconds:
                self._buckets.pop(key, None)
            return RateLimitDecision(True)

    def record_failure(self, key: str) -> RateLimitDecision:
        now = monotonic()
        with self._lock:
            self._prune(now)
            bucket = self._buckets.get(key)
            if bucket is None or now - bucket.window_started_at >= self._window_seconds:
                bucket = _Bucket(window_started_at=now)
                self._buckets[key] = bucket

            bucket.failures += 1
            if bucket.failures >= self._max_failures:
                bucket.blocked_until = now + self._block_seconds
                return RateLimitDecision(False, self._block_seconds)
            return RateLimitDecision(True)

    def clear(self, key: str) -> None:
        with self._lock:
            self._buckets.pop(key, None)

    def _prune(self, now: float) -> None:
        if len(self._buckets) < self._max_buckets:
            return
        expired = [
            key
            for key, bucket in self._buckets.items()
            if bucket.blocked_until <= now
            and now - bucket.window_started_at >= self._window_seconds
        ]
        for key in expired:
            self._buckets.pop(key, None)
