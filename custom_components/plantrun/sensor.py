"""Sensor platform for PlantRun."""
import logging

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.core import Event

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

        # Spawn proxy sensors for all existing bindings
        if run.bindings:
            for binding in run.bindings:
                entities.append(
                    PlantRunProxySensor(
                        run_id=run.id,
                        run_name=run.friendly_name,
                        metric_type=binding.metric,
                        source_entity_id=binding.sensor_id
                    )
                )

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


class PlantRunProxySensor(SensorEntity):
    """Sensor that mirrors an existing HA entity but attaches to the PlantRun device."""
    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, run_id: str, run_name: str, metric_type: str, source_entity_id: str) -> None:
        """Initialize the proxy sensor."""
        self.run_id = run_id
        self.run_name = run_name
        self.metric_type = metric_type
        self.source_entity_id = source_entity_id
        
        self._attr_unique_id = f"plantrun_{metric_type}_{run_id}"
        self._attr_name = metric_type.replace("_", " ").title()
        
        # Link this to the correct PlantRun Device
        self._attr_device_info = {
            "identifiers": {(DOMAIN, self.run_id)},
            "name": self.run_name,
            "manufacturer": "PlantRun",
        }

    async def async_added_to_hass(self) -> None:
        """Handle entity which will be added."""
        await super().async_added_to_hass()
        
        def _handle_state_change(event: Event) -> None:
            new_state = event.data.get("new_state")
            if new_state:
                self._attr_native_value = new_state.state
                # Try to copy unit and device class if available
                self._attr_native_unit_of_measurement = new_state.attributes.get("unit_of_measurement")
                self._attr_device_class = new_state.attributes.get("device_class")
                self._attr_state_class = new_state.attributes.get("state_class")
                self.async_write_ha_state()

        # Listen to state changes from the real sensor
        self.async_on_remove(
            async_track_state_change_event(
                self.hass, [self.source_entity_id], _handle_state_change
            )
        )
        
        # Initialize with current state if it exists
        state = self.hass.states.get(self.source_entity_id)
        if state:
            self._attr_native_value = state.state
            self._attr_native_unit_of_measurement = state.attributes.get("unit_of_measurement")
            self._attr_device_class = state.attributes.get("device_class")
            self._attr_state_class = state.attributes.get("state_class")
