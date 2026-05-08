"""Canonical run-window helpers for recorder-scoped history lookups."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from .models import RunData


@dataclass(frozen=True)
class RunWindow:
    """Concrete time span for a run.

    Active runs are open-ended from the user's perspective, but recorder queries
    need a finite end. Use ``effective_end`` for backend queries and expose
    ``end`` as the stored run end, if one exists.
    """

    start: datetime | None
    end: datetime | None
    effective_end: datetime
    is_open: bool

    def to_contract(self) -> dict[str, str | bool | None]:
        """Return frontend-safe ISO values for history context contracts."""
        return {
            "start": _datetime_to_iso(self.start),
            "end": _datetime_to_iso(self.end),
            "effective_end": _datetime_to_iso(self.effective_end),
            "is_open": self.is_open,
        }


def parse_iso_datetime(value: Any) -> datetime | None:
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


def run_window_for(run: RunData, *, now: datetime | None = None) -> RunWindow:
    """Return the canonical recorder window for a run."""
    effective_now = now or datetime.now(timezone.utc)
    start = parse_iso_datetime(run.planted_date) or parse_iso_datetime(run.start_time)
    stored_end = parse_iso_datetime(run.end_time) if run.end_time else None
    is_ended = run.status == "ended" or stored_end is not None
    end = stored_end if is_ended else None
    effective_end = end or effective_now

    return RunWindow(
        start=start,
        end=end,
        effective_end=effective_end,
        is_open=end is None,
    )


def run_window_contract_for(run: RunData, *, now: datetime | str | None = None) -> dict[str, str | bool | None]:
    """Return a JSON-safe run-window contract for one run."""
    resolved_now = parse_iso_datetime(now) if isinstance(now, str) else now
    return run_window_for(run, now=resolved_now).to_contract()


def _datetime_to_iso(value: datetime | None) -> str | None:
    if value is None:
        return None
    return value.isoformat()
