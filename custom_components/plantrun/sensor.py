"""Sensor platform for PlantRun."""

from __future__ import annotations

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.dispatcher import async_dispatcher_connect
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DATA_STORAGE, DOMAIN, SIGNAL_DATA_UPDATED


def _build_entities(hass: HomeAssistant) -> list[SensorEntity]:
    return [
        PlantRunActiveRunSensor(hass),
        PlantRunActiveRunCountSensor(hass),
        PlantRunActivePhaseSensor(hass),
        PlantRunTotalRunsSensor(hass),
        PlantRunLastEventSensor(hass),
        PlantRunActiveCultivarNameSensor(hass),
        PlantRunActiveCultivarBreederSensor(hass),
        PlantRunActiveCultivarFlowerWindowSensor(hass),
    ]


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up PlantRun sensors from config entry."""
    del entry
    async_add_entities(_build_entities(hass), True)


async def async_setup_platform(
    hass: HomeAssistant,
    config: dict,
    async_add_entities: AddEntitiesCallback,
    discovery_info: dict | None = None,
) -> None:
    """Set up PlantRun sensors from discovery."""
    del config, discovery_info
    async_add_entities(_build_entities(hass), True)


class PlantRunBaseSensor(SensorEntity):
    """Base class for sensors reading integration storage."""

    _attr_should_poll = False

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    @property
    def storage(self) -> dict:
        return self.hass.data[DOMAIN][DATA_STORAGE].data

    def active_run(self) -> dict | None:
        """Return the first active run (legacy compat)."""
        active_ids = self.storage.get("active_run_ids", [])
        if not active_ids:
            # Fallback to legacy field
            active_run_id = self.storage.get("active_run_id")
            if not active_run_id:
                return None
            return self.storage.get("runs", {}).get(active_run_id)
        return self.storage.get("runs", {}).get(active_ids[0])

    def active_runs(self) -> list[dict]:
        """Return all active runs."""
        active_ids = self.storage.get("active_run_ids", [])
        runs_store = self.storage.get("runs", {})
        return [runs_store[rid] for rid in active_ids if rid in runs_store]

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
        runs = self.active_runs()
        if not runs:
            return None
        if len(runs) == 1:
            return runs[0].get("name")
        return f"{len(runs)} active runs"

    @property
    def extra_state_attributes(self) -> dict:
        runs = self.active_runs()
        if not runs:
            return {"active_count": 0}
        if len(runs) == 1:
            r = runs[0]
            return {
                "active_count": 1,
                "run_id": r.get("id"),
                "display_id": r.get("display_id"),
                "started_at": r.get("started_at"),
                "bindings": r.get("bindings"),
            }
        return {
            "active_count": len(runs),
            "runs": [
                {
                    "run_id": r.get("id"),
                    "display_id": r.get("display_id"),
                    "name": r.get("name"),
                    "phase": r.get("phase"),
                    "started_at": r.get("started_at"),
                }
                for r in runs
            ],
        }


class PlantRunActiveRunCountSensor(PlantRunBaseSensor):
    _attr_name = "PlantRun Active Run Count"
    _attr_unique_id = "plantrun_active_run_count"
    _attr_icon = "mdi:sprout-outline"

    @property
    def native_value(self) -> int:
        return len(self.active_runs())


class PlantRunActivePhaseSensor(PlantRunBaseSensor):
    _attr_name = "PlantRun Active Phase"
    _attr_unique_id = "plantrun_active_phase"
    _attr_icon = "mdi:chart-timeline-variant"

    @property
    def native_value(self) -> str | None:
        run = self.active_run()
        return run.get("phase") if run else None


class PlantRunActiveCultivarNameSensor(PlantRunBaseSensor):
    _attr_name = "PlantRun Active Cultivar"
    _attr_unique_id = "plantrun_active_cultivar_name"
    _attr_icon = "mdi:leaf"

    @property
    def native_value(self) -> str | None:
        run = self.active_run()
        if not run:
            return None
        snapshot = run.get("cultivar_snapshot") or {}
        return snapshot.get("species")


class PlantRunActiveCultivarBreederSensor(PlantRunBaseSensor):
    _attr_name = "PlantRun Active Cultivar Breeder"
    _attr_unique_id = "plantrun_active_cultivar_breeder"
    _attr_icon = "mdi:domain"

    @property
    def native_value(self) -> str | None:
        run = self.active_run()
        if not run:
            return None
        snapshot = run.get("cultivar_snapshot") or {}
        return snapshot.get("breeder")


class PlantRunActiveCultivarFlowerWindowSensor(PlantRunBaseSensor):
    _attr_name = "PlantRun Active Cultivar Flower Window"
    _attr_unique_id = "plantrun_active_cultivar_flower_window"
    _attr_icon = "mdi:calendar-clock"

    @property
    def native_value(self) -> str | None:
        run = self.active_run()
        if not run:
            return None
        snapshot = run.get("cultivar_snapshot") or {}
        return snapshot.get("flower_time")


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
