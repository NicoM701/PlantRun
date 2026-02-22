"""Sensor platform for PlantRun."""

from __future__ import annotations

from homeassistant.components.sensor import SensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, SIGNAL_DATA_UPDATED


async def async_setup_platform(
    hass: HomeAssistant,
    config: dict,
    async_add_entities: AddEntitiesCallback,
    discovery_info: dict | None = None,
) -> None:
    """Set up PlantRun sensors from discovery."""
    async_add_entities(
        [
            PlantRunActiveRunSensor(hass),
            PlantRunActivePhaseSensor(hass),
            PlantRunTotalRunsSensor(hass),
            PlantRunLastEventSensor(hass),
        ],
        True,
    )


class PlantRunBaseSensor(SensorEntity):
    """Base class for sensors reading integration storage."""

    _attr_should_poll = False

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    @property
    def storage(self) -> dict:
        return self.hass.data[DOMAIN]["storage"].data

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass, SIGNAL_DATA_UPDATED, self.async_write_ha_state
            )
        )


class PlantRunActiveRunSensor(PlantRunBaseSensor):
    _attr_name = "PlantRun Active Run"
    _attr_unique_id = "plantrun_active_run"
    _attr_icon = "mdi:sprout"

    @property
    def native_value(self) -> str | None:
        active_run_id = self.storage.get("active_run_id")
        if not active_run_id:
            return None
        run = self.storage.get("runs", {}).get(active_run_id)
        return run.get("name") if run else active_run_id

    @property
    def extra_state_attributes(self) -> dict:
        active_run_id = self.storage.get("active_run_id")
        run = self.storage.get("runs", {}).get(active_run_id) if active_run_id else None
        return {
            "run_id": active_run_id,
            "started_at": run.get("started_at") if run else None,
        }


class PlantRunActivePhaseSensor(PlantRunBaseSensor):
    _attr_name = "PlantRun Active Phase"
    _attr_unique_id = "plantrun_active_phase"
    _attr_icon = "mdi:chart-timeline-variant"

    @property
    def native_value(self) -> str | None:
        active_run_id = self.storage.get("active_run_id")
        if not active_run_id:
            return None
        run = self.storage.get("runs", {}).get(active_run_id)
        return run.get("phase") if run else None


class PlantRunTotalRunsSensor(PlantRunBaseSensor):
    _attr_name = "PlantRun Total Runs"
    _attr_unique_id = "plantrun_total_runs"
    _attr_icon = "mdi:counter"

    @property
    def native_value(self) -> int:
        return len(self.storage.get("runs", {}))


class PlantRunLastEventSensor(PlantRunBaseSensor):
    _attr_name = "PlantRun Last Event"
    _attr_unique_id = "plantrun_last_event"
    _attr_icon = "mdi:history"

    @property
    def native_value(self) -> str | None:
        last_event = self.storage.get("last_event")
        if not last_event:
            return None
        return last_event.get("type")

    @property
    def extra_state_attributes(self) -> dict:
        return self.storage.get("last_event") or {}
