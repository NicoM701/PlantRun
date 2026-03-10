"""Hybrid retention helpers (recorder-first + daily snapshots fallback)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .models import RunData
from .store import PlantRunStorage
from .summary import (
    build_run_summary,
    normalize_energy_currency,
    normalize_energy_price_per_kwh,
)


def snapshot_day(ts: datetime | None = None) -> str:
    """Return UTC day key for rollups."""
    return (ts or datetime.now(timezone.utc)).date().isoformat()


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


def _history_state(summary: dict[str, Any]) -> str:
    """Describe whether live summary has usable history data."""
    if _summary_has_live_history(summary):
        return "complete"
    return "empty"


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


def _with_summary_meta(
    summary: dict[str, Any],
    *,
    source: str,
    fallback_reason: str | None = None,
    day: str | None = None,
) -> dict[str, Any]:
    enriched = dict(summary)
    meta: dict[str, Any] = {
        "source": source,
        "fallback_reason": fallback_reason,
        "history_state": _history_state(summary),
    }
    if day is not None:
        meta.update(_rollup_health(day))
    else:
        meta.update({"rollup_day": None, "rollup_age_days": None, "rollup_health": None})
    enriched["summary_meta"] = meta
    return enriched


def _normalize_rollup_summary_energy(
    summary: dict[str, Any],
    *,
    energy_price_per_kwh: float | None,
    energy_currency: str | None,
) -> dict[str, Any]:
    """Backfill explicit currency and recompute legacy unlabeled rollup cost safely."""
    enriched = dict(summary)
    configured_currency = normalize_energy_currency(energy_currency)
    stored_currency = summary.get("energy_currency")
    legacy_currency_missing = not isinstance(stored_currency, str) or not stored_currency.strip()

    if legacy_currency_missing:
        # Legacy rollups did not persist an explicit currency. Avoid assigning
        # a potentially wrong label to already-stored costs.
        if summary.get("energy_cost") is not None:
            return enriched

        # If no cost was stored, compute from current preferences and label it.
        enriched["energy_currency"] = configured_currency
        energy_kwh = summary.get("energy_kwh")
        parsed_kwh = normalize_energy_price_per_kwh(energy_kwh)
        if parsed_kwh is None or energy_price_per_kwh is None:
            enriched["energy_cost"] = None
        else:
            enriched["energy_cost"] = parsed_kwh * energy_price_per_kwh
        return enriched

    enriched["energy_currency"] = normalize_energy_currency(stored_currency)
    return enriched


async def async_capture_daily_rollup(
    storage: PlantRunStorage,
    run: RunData,
    *,
    energy_price_per_kwh: float | None = None,
    energy_currency: str | None = None,
) -> dict[str, Any]:
    """Capture and persist one daily rollup summary for a run."""
    summary = _with_summary_meta(
        build_run_summary(
            run,
            energy_price_per_kwh=energy_price_per_kwh,
            energy_currency=energy_currency,
        ),
        source="live",
    )
    day = snapshot_day()
    await storage.async_set_daily_rollup(run.id, day, summary)
    return summary


def get_summary_with_rollup_fallback(
    storage: PlantRunStorage,
    run: RunData,
    *,
    energy_price_per_kwh: float | None = None,
    energy_currency: str | None = None,
) -> dict[str, Any]:
    """Get summary with fallback to latest stored rollup when live history is sparse."""
    live = build_run_summary(
        run,
        energy_price_per_kwh=energy_price_per_kwh,
        energy_currency=energy_currency,
    )
    run_rollups = storage.daily_rollups.get(run.id, {})
    if _summary_has_live_history(live):
        return _with_summary_meta(live, source="live")

    if not run_rollups:
        return _with_summary_meta(live, source="live", fallback_reason="no_history_no_rollup")

    latest_day = sorted(run_rollups.keys())[-1]
    latest_summary = _normalize_rollup_summary_energy(
        run_rollups[latest_day],
        energy_price_per_kwh=energy_price_per_kwh,
        energy_currency=energy_currency,
    )
    return _with_summary_meta(latest_summary, source="rollup", fallback_reason="no_live_history", day=latest_day)
