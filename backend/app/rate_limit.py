"""A small in-memory sliding-window rate limiter.

Good enough for a single API process. When running several workers or replicas,
move this to a shared store such as Redis.
"""

import time
from collections import defaultdict, deque
from threading import Lock


class RateLimiter:
    def __init__(self, max_events: int, window_seconds: float):
        self.max_events = max_events
        self.window = window_seconds
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        events = self._events[key]
        while events and now - events[0] > self.window:
            events.popleft()
        return events

    def is_limited(self, key: str) -> bool:
        with self._lock:
            events = self._prune(key, time.monotonic())
            if not events:
                self._events.pop(key, None)
                return False
            return len(events) >= self.max_events

    def hit(self, key: str) -> None:
        with self._lock:
            now = time.monotonic()
            self._prune(key, now).append(now)

    def retry_after(self, key: str) -> int:
        with self._lock:
            events = self._prune(key, time.monotonic())
            if not events:
                return 0
            return max(1, int(self.window - (time.monotonic() - events[0])) + 1)

    def reset(self, key: str | None = None) -> None:
        with self._lock:
            if key is None:
                self._events.clear()
            else:
                self._events.pop(key, None)
