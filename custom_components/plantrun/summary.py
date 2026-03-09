"""Run summary helpers for KPI cards."""

from __future__ import annotations

from statistics import mean
from typing import Any

from .models import RunData


def _to_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _series_stats(points: list[dict[str, Any]]) -> dict[str, float | None]:
    vals = [_to_float(point.get("value")) for point in points]
    cleaned = [v for v in vals if v is not None]
    if not cleaned:
        return {"min": None, "max": None, "avg": None, "start": None, "end": None}
    return {
        "min": min(cleaned),
        "max": max(cleaned),
        "avg": mean(cleaned),
        "start": cleaned[0],
        "end": cleaned[-1],
    }


def build_run_summary(run: RunData, *, energy_price_per_kwh: float | None = None) -> dict[str, Any]:
    """Build period-aware KPI summary from run sensor history.

    Works with partial/missing data by returning null metrics for empty series.
    """
    history = run.sensor_history or {}
    energy_stats = _series_stats(history.get("energy", []))
    energy_delta = None
    energy_cost = None
    if energy_stats["start"] is not None and energy_stats["end"] is not None:
        energy_delta = max(0.0, energy_stats["end"] - energy_stats["start"])
        if energy_price_per_kwh is not None:
            energy_cost = energy_delta * energy_price_per_kwh

    return {
        "run_id": run.id,
        "friendly_name": run.friendly_name,
        "started_at": run.start_time,
        "ended_at": run.end_time,
        "energy_kwh": energy_delta,
        "energy_cost": energy_cost,
        "temperature": _series_stats(history.get("temperature", [])),
        "humidity": _series_stats(history.get("humidity", [])),
        "soil_moisture": _series_stats(history.get("soil_moisture", [])),
        "water": _series_stats(history.get("water", [])),
    }
