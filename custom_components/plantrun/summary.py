"""Run summary helpers for KPI cards."""

from __future__ import annotations

from datetime import datetime, timezone
from statistics import mean
from typing import Any, Mapping

from .const import (
    CONF_CURRENCY,
    CONF_ELECTRICITY_PRICE_PER_KWH,
    DEFAULT_CURRENCY,
    DEFAULT_ELECTRICITY_PRICE_PER_KWH,
)
from .models import RunData


def _to_float(value: Any) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _parse_iso_datetime(value: Any) -> datetime | None:
    """Parse ISO datetime values with tolerant UTC fallback for naive timestamps."""
    if not isinstance(value, str):
        return None

    cleaned = value.strip()
    if not cleaned:
        return None

    try:
        parsed = datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed


def _point_timestamp(point: Mapping[str, Any]) -> datetime | None:
    """Extract timestamp from history points across legacy/new key names."""
    for key in ("timestamp", "time", "last_changed", "last_updated"):
        parsed = _parse_iso_datetime(point.get(key))
        if parsed is not None:
            return parsed
    return None


def _windowed_points(
    points: list[dict[str, Any]],
    *,
    start: datetime,
    end: datetime,
) -> list[dict[str, Any]]:
    """Return only points that are inside the run window.

    If no timestamps exist on points, preserves legacy behavior and returns input as-is.
    """
    has_any_timestamp = any(_point_timestamp(point) is not None for point in points)
    if not has_any_timestamp:
        return points

    windowed: list[dict[str, Any]] = []
    for point in points:
        ts = _point_timestamp(point)
        if ts is None:
            continue
        if start <= ts <= end:
            windowed.append(point)
    return windowed


def normalize_energy_currency(value: Any) -> str:
    """Return an explicit, stable currency code for summaries."""
    if isinstance(value, str):
        cleaned = value.strip().upper()
        if cleaned:
            return cleaned
    return DEFAULT_CURRENCY


def normalize_energy_price_per_kwh(
    value: Any,
    *,
    default: float | None = None,
) -> float | None:
    """Return a non-negative price, falling back when input is missing/invalid."""
    parsed = _to_float(value)
    if parsed is None or parsed < 0:
        return default
    return parsed


def summary_energy_preferences_from_options(options: Mapping[str, Any] | None) -> dict[str, Any]:
    """Extract summary pricing preferences from config entry options."""
    options = options or {}
    return {
        "energy_price_per_kwh": normalize_energy_price_per_kwh(
            options.get(CONF_ELECTRICITY_PRICE_PER_KWH),
            default=DEFAULT_ELECTRICITY_PRICE_PER_KWH,
        ),
        "energy_currency": normalize_energy_currency(options.get(CONF_CURRENCY)),
    }


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


def build_run_summary(
    run: RunData,
    *,
    energy_price_per_kwh: float | None = None,
    energy_currency: str | None = None,
) -> dict[str, Any]:
    """Build period-aware KPI summary from run sensor history.

    Works with partial/missing data by returning null metrics for empty series.
    """
    history = run.sensor_history or {}
    start_dt = _parse_iso_datetime(run.start_time)
    end_dt = _parse_iso_datetime(run.end_time) if run.end_time else datetime.now(timezone.utc)

    def _maybe_window(metric_points: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if start_dt is None or end_dt is None or end_dt < start_dt:
            return metric_points
        return _windowed_points(metric_points, start=start_dt, end=end_dt)

    energy_stats = _series_stats(_maybe_window(history.get("energy", [])))
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
        "energy_currency": normalize_energy_currency(energy_currency),
        "temperature": _series_stats(_maybe_window(history.get("temperature", []))),
        "humidity": _series_stats(_maybe_window(history.get("humidity", []))),
        "soil_moisture": _series_stats(_maybe_window(history.get("soil_moisture", []))),
        "water": _series_stats(_maybe_window(history.get("water", []))),
    }
