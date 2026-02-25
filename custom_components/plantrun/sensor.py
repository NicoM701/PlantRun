"""Sensor platform for PlantRun."""
import logging

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import PlantRunCoordinator
from .models import RunData

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the sensor platform."""
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator: PlantRunCoordinator = data["coordinator"]

    entities: list[SensorEntity] = []

    # Currently we create entities for all existing runs at startup.
    # To handle adding runs at runtime, we would use a dispatcher signal or listener here.
    for run in coordinator.data:
        entities.append(PlantRunActivePhaseSensor(coordinator, run.id))
        entities.append(PlantRunStatusSensor(coordinator, run.id))
        entities.append(PlantRunCultivarSensor(coordinator, run.id))

    # Add a general summary sensor
    entities.append(PlantRunTotalRunsSensor(coordinator))

    async_add_entities(entities)


class PlantRunTotalRunsSensor(CoordinatorEntity[PlantRunCoordinator], SensorEntity):
    """Sensor that shows total number of runs."""

    _attr_icon = "mdi:sprout"
    _attr_has_entity_name = True

    def __init__(self, coordinator: PlantRunCoordinator) -> None:
        """Initialize."""
        super().__init__(coordinator)
        self._attr_unique_id = "plantrun_total_runs"
        self._attr_name = "Total Plant Runs"

    @property
    def native_value(self) -> int:
        """Return the native value of the sensor."""
        return len(self.coordinator.data)


class PlantRunBaseRunSensor(CoordinatorEntity[PlantRunCoordinator], SensorEntity):
    """Base class for run specific sensors."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: PlantRunCoordinator, run_id: str) -> None:
        """Initialize."""
        super().__init__(coordinator)
        self.run_id = run_id

    @property
    def run_data(self) -> RunData | None:
        for r in self.coordinator.data:
            if r.id == self.run_id:
                return r
        return None

    @property
    def device_info(self) -> dict:
        """Return device info to group sensors."""
        run = self.run_data
        name = run.friendly_name if run else f"Run {self.run_id}"
        return {
            "identifiers": {(DOMAIN, self.run_id)},
            "name": name,
            "manufacturer": "PlantRun",
        }


class PlantRunStatusSensor(PlantRunBaseRunSensor):
    """Sensor for run status."""
    _attr_icon = "mdi:information-outline"

    def __init__(self, coordinator: PlantRunCoordinator, run_id: str) -> None:
        """Initialize."""
        super().__init__(coordinator, run_id)
        self._attr_unique_id = f"plantrun_status_{run_id}"
        self._attr_name = "Status"
        self._attr_translation_key = "status"

    @property
    def native_value(self) -> str | None:
        run = self.run_data
        return run.status if run else None


class PlantRunActivePhaseSensor(PlantRunBaseRunSensor):
    """Sensor for active phase."""
    _attr_icon = "mdi:timelapse"

    def __init__(self, coordinator: PlantRunCoordinator, run_id: str) -> None:
        """Initialize."""
        super().__init__(coordinator, run_id)
        self._attr_unique_id = f"plantrun_active_phase_{run_id}"
        self._attr_name = "Active Phase"
        self._attr_translation_key = "active_phase"

    @property
    def native_value(self) -> str | None:
        run = self.run_data
        if not run or not run.phases:
            return "None"
        # Return the latest phase name
        return run.phases[-1].name

class PlantRunCultivarSensor(PlantRunBaseRunSensor):
    """Sensor for active cultivar."""
    _attr_icon = "mdi:seed"

    def __init__(self, coordinator: PlantRunCoordinator, run_id: str) -> None:
        """Initialize."""
        super().__init__(coordinator, run_id)
        self._attr_unique_id = f"plantrun_cultivar_{run_id}"
        self._attr_name = "Cultivar"

    @property
    def native_value(self) -> str | None:
        run = self.run_data
        if not run or not run.cultivar:
            return "None"
        return run.cultivar.name
