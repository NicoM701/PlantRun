"""Hybrid retention helpers (recorder-first + daily snapshots fallback)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from .models import RunData
from .store import PlantRunStorage
from .summary import build_run_summary


def snapshot_day(ts: datetime | None = None) -> str:
    """Return UTC day key for rollups."""
    return (ts or datetime.utcnow()).date().isoformat()


async def async_capture_daily_rollup(storage: PlantRunStorage, run: RunData) -> dict[str, Any]:
    """Capture and persist one daily rollup summary for a run."""
    summary = build_run_summary(run)
    day = snapshot_day()
    await storage.async_set_daily_rollup(run.id, day, summary)
    return summary


def get_summary_with_rollup_fallback(storage: PlantRunStorage, run: RunData) -> dict[str, Any]:
    """Get summary with fallback to latest stored rollup when live history is sparse."""
    live = build_run_summary(run)
    if live.get("energy_kwh") is not None:
        return live

    run_rollups = storage.daily_rollups.get(run.id, {})
    if not run_rollups:
        return live

    latest_day = sorted(run_rollups.keys())[-1]
    return run_rollups[latest_day]
