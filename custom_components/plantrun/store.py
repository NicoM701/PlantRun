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
            data = {"runs": [], "active_run_id": None}
        else:
            data.setdefault("runs", [])
            data.setdefault("active_run_id", None)

        self._data = data
        raw_runs = data.get("runs", [])
        self.runs = [RunData.from_dict(r) for r in raw_runs]
        # Persist upgraded binding IDs from legacy records.
        if self._bindings_need_migration(raw_runs):
            await self.async_save()
        _LOGGER.debug("Loaded %s runs from storage", len(self.runs))

    @staticmethod
    def _bindings_need_migration(raw_runs: list[dict[str, Any]]) -> bool:
        """Return true when one or more bindings are in legacy shape."""
        for run in raw_runs:
            ids: set[str] = set()
            for binding in run.get("bindings", []):
                binding_id = binding.get("id")
                if not isinstance(binding_id, str) or not binding_id.strip():
                    return True
                if binding_id in ids:
                    return True
                ids.add(binding_id)
        return False

    async def async_save(self) -> None:
        """Save data to the store."""
        self._data["runs"] = [run.to_dict() for run in self.runs]
        await self._store.async_save(self._data)

    @property
    def active_run_id(self) -> str | None:
        """Return compatibility alias for active run fallback."""
        value = self._data.get("active_run_id")
        return value if isinstance(value, str) and value else None

    async def async_set_active_run_id(self, run_id: str | None) -> None:
        """Persist compatibility alias for active run fallback."""
        self._data["active_run_id"] = run_id
        await self.async_save()

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
