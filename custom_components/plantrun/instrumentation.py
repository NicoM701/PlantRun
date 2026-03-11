"""Lightweight in-process instrumentation helpers for optional perf visibility."""

from __future__ import annotations

from collections import defaultdict
from contextlib import contextmanager
from time import perf_counter


class PlantRunInstrumentation:
    """Minimal counters + timers collector.

    Disabled by default to keep runtime overhead near-zero.
    """

    def __init__(self, *, enabled: bool = False) -> None:
        self.enabled = enabled
        self._counters: dict[str, int] = defaultdict(int)
        self._timings_ms: dict[str, list[float]] = defaultdict(list)

    def incr(self, name: str, amount: int = 1) -> None:
        if not self.enabled:
            return
        self._counters[name] += amount

    @contextmanager
    def timer(self, name: str):
        if not self.enabled:
            yield
            return
        start = perf_counter()
        try:
            yield
        finally:
            self._timings_ms[name].append((perf_counter() - start) * 1000.0)

    def snapshot(self) -> dict[str, dict[str, float | int]]:
        timing_stats: dict[str, dict[str, float | int]] = {}
        for name, samples in self._timings_ms.items():
            if not samples:
                continue
            total = sum(samples)
            timing_stats[name] = {
                "count": len(samples),
                "total_ms": round(total, 3),
                "avg_ms": round(total / len(samples), 3),
                "max_ms": round(max(samples), 3),
            }
        return {
            "counters": dict(self._counters),
            "timings": timing_stats,
        }
