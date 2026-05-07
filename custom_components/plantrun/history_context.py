"""Recorder-first binding history context helpers."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from .models import Binding, RunData
from .run_window import run_window_contract_for, run_window_for


def get_run_window(run: RunData, *, now: str | datetime | None = None) -> dict[str, Any]:
    """Return the canonical run window in a frontend-safe shape."""
    contract = run_window_contract_for(run, now=now)
    return {
        "start": contract["start"],
        "end": contract["effective_end"],
        "is_active": bool(contract["is_open"]),
    }


def build_binding_history_context(
    run: RunData,
    binding: Binding,
    *,
    source_exists: bool,
    now: datetime | None = None,
) -> dict[str, Any]:
    """Build frontend-friendly history context from run window + live binding state."""
    resolved_now = now if isinstance(now, datetime) else None
    if isinstance(now, str):
        window_contract = run_window_contract_for(run, now=now)
    else:
        window_contract = run_window_for(run, now=resolved_now).to_contract()
    orphaned = not source_exists
    return {
        "binding_id": binding.id,
        "entity_id": binding.sensor_id,
        "metric_type": binding.metric_type,
        "run_id": run.id,
        "run_status": run.status,
        "run_start": window_contract["start"],
        "run_end": window_contract["effective_end"],
        "stored_run_end": window_contract["end"],
        "run_window": window_contract,
        "binding_status": "orphaned" if orphaned else "bound",
        "orphaned": orphaned,
        "error": "source_entity_missing" if orphaned else None,
        "legacy_history_available": binding.metric_type in (run.sensor_history or {}),
    }
