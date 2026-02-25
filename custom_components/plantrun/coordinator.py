"""Data update coordinator for PlantRun."""
import logging
from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .const import DOMAIN
from .store import PlantRunStorage
from .models import RunData

_LOGGER = logging.getLogger(__name__)

class PlantRunCoordinator(DataUpdateCoordinator[list[RunData]]):
    """Class to manage fetching PlantRun data."""

    def __init__(self, hass: HomeAssistant, storage: PlantRunStorage) -> None:
        """Initialize."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(minutes=5),
        )
        self.storage = storage

    async def _async_update_data(self) -> list[RunData]:
        """Fetch data."""
        # The main source of truth is the local storage.
        # This coordinator acts as a central hub if we ever need to fetch/refresh
        # from external sources (e.g. Cultivars). For now, it just returns storage runs.
        return self.storage.runs
