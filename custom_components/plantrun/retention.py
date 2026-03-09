"""Hybrid retention helpers (recorder-first + daily snapshots fallback)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .models import RunData
from .store import PlantRunStorage
from .summary import build_run_summary


def snapshot_day(ts: datetime | None = None) -> str:
    """Return UTC day key for rollups."""
    return (ts or datetime.utcnow()).date().isoformat()


def _summary_has_live_history(summary: dict[str, Any]) -> bool:
    """Return True when summary has at least one usable live data point."""
    if summary.get("energy_kwh") is not None:
        return True

    for metric in ("temperature", "humidity", "soil_moisture", "water"):
        metric_stats = summary.get(metric)
        if not isinstance(metric_stats, dict):
            continue
        if any(metric_stats.get(key) is not None for key in ("min", "max", "avg", "start", "end")):
            return True
    return False


def _rollup_health(day: str) -> dict[str, Any]:
    """Return age metadata for a rollup snapshot."""
    try:
        snap_date = datetime.fromisoformat(day).replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        age_days = max(0, int((now - snap_date).total_seconds() // 86400))
    except ValueError:
        return {"rollup_day": day, "rollup_age_days": None, "rollup_health": "invalid_day"}

    health = "fresh" if age_days <= 2 else "stale"
    return {"rollup_day": day, "rollup_age_days": age_days, "rollup_health": health}


def _with_summary_meta(summary: dict[str, Any], *, source: str, fallback_reason: str | None = None, day: str | None = None) -> dict[str, Any]:
    enriched = dict(summary)
    meta: dict[str, Any] = {
        "source": source,
        "fallback_reason": fallback_reason,
    }
    if day is not None:
        meta.update(_rollup_health(day))
    else:
        meta.update({"rollup_day": None, "rollup_age_days": None, "rollup_health": None})
    enriched["summary_meta"] = meta
    return enriched


async def async_capture_daily_rollup(storage: PlantRunStorage, run: RunData) -> dict[str, Any]:
    """Capture and persist one daily rollup summary for a run."""
    summary = _with_summary_meta(build_run_summary(run), source="live")
    day = snapshot_day()
    await storage.async_set_daily_rollup(run.id, day, summary)
    return summary


def get_summary_with_rollup_fallback(storage: PlantRunStorage, run: RunData) -> dict[str, Any]:
    """Get summary with fallback to latest stored rollup when live history is sparse."""
    live = build_run_summary(run)
    if _summary_has_live_history(live):
        return _with_summary_meta(live, source="live")

    run_rollups = storage.daily_rollups.get(run.id, {})
    if not run_rollups:
        return _with_summary_meta(live, source="live", fallback_reason="no_history_no_rollup")

    latest_day = sorted(run_rollups.keys())[-1]
    latest_summary = run_rollups[latest_day]
    return _with_summary_meta(latest_summary, source="rollup", fallback_reason="no_live_history", day=latest_day)
