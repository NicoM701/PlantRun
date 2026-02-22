"""Storage helpers for PlantRun."""

from __future__ import annotations

from copy import deepcopy
from datetime import UTC, datetime

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DEFAULT_DATA, STORAGE_KEY, STORAGE_VERSION


class PlantRunStorage:
    """Persistent storage for run data."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._store = Store[dict](hass, STORAGE_VERSION, STORAGE_KEY)
        self.data: dict = deepcopy(DEFAULT_DATA)

    async def async_load(self) -> None:
        """Load state from disk."""
        stored = await self._store.async_load()
        if isinstance(stored, dict):
            merged = deepcopy(DEFAULT_DATA)
            merged.update(stored)
            self.data = merged

    async def async_save(self) -> None:
        """Save state to disk."""
        await self._store.async_save(self.data)

    @staticmethod
    def utc_now_iso() -> str:
        """Return timezone-safe timestamp for run logs."""
        return datetime.now(UTC).isoformat()
