"""Storage helpers for PlantRun."""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DEFAULT_DATA, STORAGE_KEY, STORAGE_VERSION

DEFAULT_METRICS = {
    "energy_kwh": None,
    "energy_cost": None,
    "soil_moisture": None,
    "air_humidity": None,
}


class PlantRunStorage:
    """Persistent storage for run data."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store = Store[dict](hass, STORAGE_VERSION, STORAGE_KEY)
        self.data: dict = deepcopy(DEFAULT_DATA)

    async def async_load(self) -> None:
        """Load state from disk."""
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            merged = deepcopy(DEFAULT_DATA)
            merged.update(stored)

            # --- Migration: active_run_id (singular) → active_run_ids (list) ---
            if "active_run_ids" not in stored:
                old_active = merged.get("active_run_id")
                merged["active_run_ids"] = [old_active] if old_active else []
            merged.setdefault("active_run_ids", [])
            # Keep active_run_id as a convenience alias (first active or None)
            ids = merged["active_run_ids"]
            merged["active_run_id"] = ids[0] if ids else None

            runs = merged.get("runs", {})
            if isinstance(runs, dict):
                for run in runs.values():
                    run.setdefault("notes", [])
                    run.setdefault("phase_history", [])
                    run.setdefault("metrics", deepcopy(DEFAULT_METRICS))
                    run.setdefault("media", [])
                    run.setdefault("cultivar_id", None)
                    run.setdefault("cultivar_snapshot", None)
                    if not run.get("slug"):
                        name = str(run.get("name") or "run")
                        slug = "-".join(name.lower().split()) or "run"
                        run["slug"] = slug
                    run.setdefault("display_id", f"{run.get('slug','run')}-{str(run.get('id',''))[:4]}")
                    run.setdefault(
                        "bindings",
                        {
                            "temperature": None,
                            "air_humidity": None,
                            "soil_moisture": None,
                            "energy": None,
                            "camera": None,
                            "water": None,
                        },
                    )

            cultivars = merged.get("cultivars", {})
            if not isinstance(cultivars, dict):
                merged["cultivars"] = {}

            self.data = merged

    async def async_save(self) -> None:
        """Save state to disk."""
        await self._store.async_save(self.data)

    @staticmethod
    def utc_now_iso() -> str:
        """Return timezone-safe timestamp for run logs."""
        return datetime.now(UTC).isoformat()
