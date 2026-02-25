"""Storage for PlantRun."""
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORE_KEY, STORE_VERSION
from .models import RunData

_LOGGER = logging.getLogger(__name__)

class PlantRunStorage:
    """Class to hold PlantRun data."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the storage."""
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, STORE_VERSION, STORE_KEY)
        self.runs: list[RunData] = []
        self._data: dict[str, Any] = {"runs": []}

    async def async_load(self) -> None:
        """Load data from the store."""
        data = await self._store.async_load()
        if data is None:
            data = {"runs": []}

        self._data = data
        self.runs = [RunData.from_dict(r) for r in data.get("runs", [])]
        _LOGGER.debug("Loaded %s runs from storage", len(self.runs))

    async def async_save(self) -> None:
        """Save data to the store."""
        self._data["runs"] = [run.to_dict() for run in self.runs]
        await self._store.async_save(self._data)

    def get_run(self, run_id: str) -> RunData | None:
        """Get a run by ID."""
        for run in self.runs:
            if run.id == run_id:
                return run
        return None

    async def async_add_run(self, run: RunData) -> None:
        """Add a new run."""
        self.runs.append(run)
        await self.async_save()

    async def async_update_run(self, updated_run: RunData) -> None:
        """Update an existing run."""
        for i, run in enumerate(self.runs):
            if run.id == updated_run.id:
                self.runs[i] = updated_run
                await self.async_save()
                return
