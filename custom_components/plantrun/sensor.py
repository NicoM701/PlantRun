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
from .models import Binding, RunData

_LOGGER = logging.getLogger(__name__)

METRIC_METADATA: dict[str, dict[str, str]] = {
    "temperature": {"device_class": "temperature", "state_class": "measurement", "unit": "°C"},
    "humidity": {"device_class": "humidity", "state_class": "measurement", "unit": "%"},
    "soil_moisture": {"device_class": "moisture", "state_class": "measurement", "unit": "%"},
    "light": {"state_class": "measurement"},
    "energy": {"device_class": "energy", "state_class": "total_increasing", "unit": "kWh"},
    "water": {"state_class": "measurement"},
}

# Accept common illuminance aliases and normalize to canonical "lx".
LIGHT_ILLUMINANCE_UNIT_ALIASES = {"lx", "lux"}

async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the sensor platform."""
    data = hass.data[DOMAIN][entry.entry_id]
    coordinator: PlantRunCoordinator = data["coordinator"]

    known_run_ids: set[str] = set()
    known_binding_ids: set[tuple[str, str]] = set()

    def _collect_new_entities() -> list[SensorEntity]:
        entities: list[SensorEntity] = []
        for run in coordinator.data:
            if run.id not in known_run_ids:
                known_run_ids.add(run.id)
                entities.append(PlantRunActivePhaseSensor(coordinator, run.id))
                entities.append(PlantRunStatusSensor(coordinator, run.id))
                entities.append(PlantRunCultivarSensor(coordinator, run.id))

            for binding in run.bindings:
                key = (run.id, binding.id)
                if key in known_binding_ids:
                    continue
                known_binding_ids.add(key)
                entities.append(
                    PlantRunProxySensor(
                        coordinator=coordinator,
                        run_id=run.id,
                        run_name=run.friendly_name,
                        binding=binding,
                    )
                )
        return entities

    initial_entities = [PlantRunTotalRunsSensor(coordinator), *_collect_new_entities()]
    async_add_entities(initial_entities)

    def _handle_coordinator_update() -> None:
        new_entities = _collect_new_entities()
        if new_entities:
            async_add_entities(new_entities)

    entry.async_on_unload(coordinator.async_add_listener(_handle_coordinator_update))


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


class PlantRunProxySensor(CoordinatorEntity[PlantRunCoordinator], SensorEntity):
    """Sensor that mirrors an existing HA entity but attaches to the PlantRun device."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(
        self,
        coordinator: PlantRunCoordinator,
        run_id: str,
        run_name: str,
        binding: Binding,
    ) -> None:
        """Initialize the proxy sensor."""
        super().__init__(coordinator)
        self.run_id = run_id
        self.run_name = run_name
        self.metric_type = binding.metric_type
        self.source_entity_id = binding.sensor_id
        self.binding_id = binding.id
        
        self._attr_unique_id = _binding_unique_id(run_id, binding)
        self._attr_name = self.metric_type.replace("_", " ").title()
        
        # Link this to the correct PlantRun Device
        self._attr_device_info = {
            "identifiers": {(DOMAIN, self.run_id)},
            "name": self.run_name,
            "manufacturer": "PlantRun",
        }

    def _binding_still_exists(self) -> bool:
        """Return True while this binding still exists on the run."""
        for run in self.coordinator.data:
            if run.id != self.run_id:
                continue
            return any(binding.id == self.binding_id for binding in run.bindings)
        return False

    def _apply_source_metadata(self, attrs: dict) -> None:
        """Apply metadata with safe metric-specific fallback for recorder/statistics."""
        expected = METRIC_METADATA.get(self.metric_type, {})
        source_unit = attrs.get("unit_of_measurement")
        source_device_class = attrs.get("device_class")
        source_state_class = attrs.get("state_class")

        if self.metric_type == "light":
            normalized_light_unit = _normalize_light_unit(source_unit)
            self._attr_native_unit_of_measurement = normalized_light_unit
            self._attr_device_class = source_device_class or _light_device_class_for_unit(normalized_light_unit)
            self._attr_state_class = source_state_class or expected.get("state_class")
            return

        expected_unit = expected.get("unit")
        if expected_unit and source_unit and source_unit != expected_unit:
            _LOGGER.warning(
                "Unit drift for %s (%s): source='%s', expected='%s'. Keeping source unit.",
                self.source_entity_id,
                self.metric_type,
                source_unit,
                expected_unit,
            )

        # Never relabel units without converting values first.
        # Keep source unit to avoid corrupt recorder/statistics semantics.
        self._attr_native_unit_of_measurement = source_unit or expected_unit
        self._attr_device_class = source_device_class or expected.get("device_class")
        self._attr_state_class = source_state_class or expected.get("state_class")

    def _source_state_available(self) -> bool:
        """Return true when the source entity exists and is usable."""
        if not hasattr(self, "hass"):
            return True

        state = self.hass.states.get(self.source_entity_id)
        if state is None:
            return False
        return state.state != "unavailable"

    @property
    def available(self) -> bool:
        """Mark proxy unavailable when binding was removed at runtime."""
        return self._binding_still_exists() and self._source_state_available()

    def _handle_coordinator_update(self) -> None:
        """Update availability as runtime bindings are added/removed."""
        self.async_write_ha_state()

    async def async_added_to_hass(self) -> None:
        """Handle entity which will be added."""
        await super().async_added_to_hass()
        
        def _handle_state_change(event: Event) -> None:
            new_state = event.data.get("new_state")
            if new_state is None:
                self._attr_native_value = None
                # Thread-safe from worker/event contexts on newer HA cores.
                self.schedule_update_ha_state()
                return

            self._attr_native_value = new_state.state
            self._apply_source_metadata(new_state.attributes)
            # Thread-safe from worker/event contexts on newer HA cores.
            self.schedule_update_ha_state()

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
            self._apply_source_metadata(state.attributes)
            self.async_write_ha_state()


def _binding_unique_id(run_id: str, binding: Binding) -> str:
    """Return stable unique_id with legacy compatibility for v1 bindings."""
    # Preserve existing dashboards/entity IDs when migrating from the v1 model.
    if binding.id == f"legacy_{binding.metric_type}":
        return f"plantrun_{binding.metric_type}_{run_id}"
    return f"plantrun_{binding.metric_type}_{run_id}_{binding.id}"


def _normalize_light_unit(unit: str | None) -> str | None:
    """Normalize recognized light-unit aliases to their canonical representation."""
    if unit is None:
        return None

    normalized = unit.strip().casefold()
    if normalized in LIGHT_ILLUMINANCE_UNIT_ALIASES:
        return "lx"

    return unit


def _light_device_class_for_unit(unit: str | None) -> str | None:
    """Return a safe light device class fallback for known illuminance units."""
    if unit is None:
        return None

    normalized = unit.strip().casefold()
    if normalized in LIGHT_ILLUMINANCE_UNIT_ALIASES:
        return "illuminance"

    return None
