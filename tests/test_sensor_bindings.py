import asyncio
import importlib.util
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLANTRUN_DIR = ROOT / "custom_components" / "plantrun"


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def _install_homeassistant_stubs() -> None:
    ha = types.ModuleType("homeassistant")
    sys.modules.setdefault("homeassistant", ha)

    components = types.ModuleType("homeassistant.components")
    sensor_mod = types.ModuleType("homeassistant.components.sensor")

    class SensorEntity:
        _attr_has_entity_name = False
        _attr_should_poll = True

        async def async_added_to_hass(self) -> None:
            return None

        def async_on_remove(self, _callback) -> None:
            return None

        def async_write_ha_state(self) -> None:
            return None

        def schedule_update_ha_state(self, _force_refresh: bool = False) -> None:
            return None

    sensor_mod.SensorEntity = SensorEntity
    sys.modules["homeassistant.components"] = components
    sys.modules["homeassistant.components.sensor"] = sensor_mod

    config_entries = types.ModuleType("homeassistant.config_entries")

    class ConfigEntry:
        def __init__(self, entry_id: str) -> None:
            self.entry_id = entry_id
            self._on_unload = []

        def async_on_unload(self, callback) -> None:
            self._on_unload.append(callback)

    config_entries.ConfigEntry = ConfigEntry
    sys.modules["homeassistant.config_entries"] = config_entries

    core = types.ModuleType("homeassistant.core")

    class HomeAssistant:
        def __init__(self) -> None:
            self.data = {}

    class Event:
        def __init__(self, data=None) -> None:
            self.data = data or {}

    core.HomeAssistant = HomeAssistant
    core.Event = Event
    sys.modules["homeassistant.core"] = core

    entity_platform = types.ModuleType("homeassistant.helpers.entity_platform")
    entity_platform.AddEntitiesCallback = object
    sys.modules["homeassistant.helpers.entity_platform"] = entity_platform

    update_coordinator = types.ModuleType("homeassistant.helpers.update_coordinator")

    class CoordinatorEntity:
        @classmethod
        def __class_getitem__(cls, _item):
            return cls

        def __init__(self, coordinator) -> None:
            self.coordinator = coordinator

        async def async_added_to_hass(self) -> None:
            return None

    update_coordinator.CoordinatorEntity = CoordinatorEntity
    sys.modules["homeassistant.helpers.update_coordinator"] = update_coordinator

    event_mod = types.ModuleType("homeassistant.helpers.event")

    def async_track_state_change_event(_hass, _entity_ids, _callback):
        return lambda: None

    event_mod.async_track_state_change_event = async_track_state_change_event
    sys.modules["homeassistant.helpers.event"] = event_mod


def _load_sensor_module():
    custom_components = types.ModuleType("custom_components")
    custom_components.__path__ = [str(ROOT / "custom_components")]
    sys.modules.setdefault("custom_components", custom_components)

    plantrun_pkg = types.ModuleType("custom_components.plantrun")
    plantrun_pkg.__path__ = [str(PLANTRUN_DIR)]
    sys.modules["custom_components.plantrun"] = plantrun_pkg

    _load_module("custom_components.plantrun.const", PLANTRUN_DIR / "const.py")
    models = _load_module("custom_components.plantrun.models", PLANTRUN_DIR / "models.py")

    coordinator_mod = types.ModuleType("custom_components.plantrun.coordinator")

    class PlantRunCoordinator:
        pass

    coordinator_mod.PlantRunCoordinator = PlantRunCoordinator
    sys.modules["custom_components.plantrun.coordinator"] = coordinator_mod

    sensor = _load_module("custom_components.plantrun.sensor", PLANTRUN_DIR / "sensor.py")
    return sensor, models


_install_homeassistant_stubs()
SENSOR_MODULE, MODELS_MODULE = _load_sensor_module()
Binding = MODELS_MODULE.Binding
RunData = MODELS_MODULE.RunData


class FakeCoordinator:
    def __init__(self, data):
        self.data = data
        self._listeners = []

    def async_add_listener(self, callback):
        self._listeners.append(callback)

        def _remove():
            self._listeners.remove(callback)

        return _remove


class FakeEntry:
    def __init__(self, entry_id: str) -> None:
        self.entry_id = entry_id
        self.unload_callbacks = []

    def async_on_unload(self, callback) -> None:
        self.unload_callbacks.append(callback)


class FakeHass:
    def __init__(self, domain: str, entry_id: str, coordinator) -> None:
        self.data = {domain: {entry_id: {"coordinator": coordinator}}}
        self.states = types.SimpleNamespace(
            get=lambda _entity_id: types.SimpleNamespace(state="21.4", attributes={})
        )


class TestSensorBindingCompatibility(unittest.TestCase):
    def test_unique_id_legacy_first_binding_compatibility(self) -> None:
        run = RunData.from_dict(
            {
                "id": "run123",
                "friendly_name": "Tent A",
                "start_time": "2026-03-01T00:00:00",
                "bindings": [{"metric_type": "temperature", "sensor_id": "sensor.t1"}],
            }
        )
        unique_id = SENSOR_MODULE._binding_unique_id(run.id, run.bindings[0])
        self.assertEqual(unique_id, "plantrun_temperature_run123")

    def test_unique_id_second_binding_same_metric_is_distinct(self) -> None:
        run = RunData.from_dict(
            {
                "id": "run123",
                "friendly_name": "Tent A",
                "start_time": "2026-03-01T00:00:00",
                "bindings": [
                    {"metric_type": "temperature", "sensor_id": "sensor.t1"},
                    {"metric_type": "temperature", "sensor_id": "sensor.t2"},
                ],
            }
        )
        first = SENSOR_MODULE._binding_unique_id(run.id, run.bindings[0])
        second = SENSOR_MODULE._binding_unique_id(run.id, run.bindings[1])
        self.assertEqual(first, "plantrun_temperature_run123")
        self.assertEqual(second, "plantrun_temperature_run123_legacy_temperature_2")
        self.assertNotEqual(first, second)


class TestDynamicBindingEntities(unittest.TestCase):
    def test_adds_new_binding_entity_without_reload(self) -> None:
        const = sys.modules["custom_components.plantrun.const"]

        run = RunData.from_dict(
            {
                "id": "runA",
                "friendly_name": "Tent A",
                "start_time": "2026-03-01T00:00:00",
                "bindings": [{"metric_type": "temperature", "sensor_id": "sensor.t1"}],
            }
        )
        coordinator = FakeCoordinator([run])
        entry = FakeEntry("entry-1")
        hass = FakeHass(const.DOMAIN, entry.entry_id, coordinator)
        added_batches = []

        def _async_add_entities(entities):
            added_batches.append(list(entities))

        asyncio.run(SENSOR_MODULE.async_setup_entry(hass, entry, _async_add_entities))
        self.assertEqual(len(added_batches), 1)

        initial_ids = {
            getattr(entity, "_attr_unique_id", None)
            for entity in added_batches[0]
            if isinstance(entity, SENSOR_MODULE.PlantRunProxySensor)
        }
        self.assertIn("plantrun_temperature_runA", initial_ids)

        run.bindings.append(Binding(metric_type="temperature", sensor_id="sensor.t2"))
        self.assertEqual(len(coordinator._listeners), 1)
        coordinator._listeners[0]()

        self.assertEqual(len(added_batches), 2)
        new_proxy_ids = [
            entity._attr_unique_id
            for entity in added_batches[1]
            if isinstance(entity, SENSOR_MODULE.PlantRunProxySensor)
        ]
        self.assertEqual(len(new_proxy_ids), 1)
        self.assertNotEqual(new_proxy_ids[0], "plantrun_temperature_runA")

    def test_removed_binding_marks_existing_proxy_unavailable(self) -> None:
        const = sys.modules["custom_components.plantrun.const"]

        run = RunData.from_dict(
            {
                "id": "runA",
                "friendly_name": "Tent A",
                "start_time": "2026-03-01T00:00:00",
                "bindings": [{"metric_type": "temperature", "sensor_id": "sensor.t1"}],
            }
        )
        coordinator = FakeCoordinator([run])
        entry = FakeEntry("entry-1")
        hass = FakeHass(const.DOMAIN, entry.entry_id, coordinator)
        added_batches = []

        def _async_add_entities(entities):
            added_batches.append(list(entities))

        asyncio.run(SENSOR_MODULE.async_setup_entry(hass, entry, _async_add_entities))
        proxy = next(
            entity
            for entity in added_batches[0]
            if isinstance(entity, SENSOR_MODULE.PlantRunProxySensor)
        )
        self.assertTrue(proxy.available)

        run.bindings = []
        coordinator._listeners[0]()
        self.assertFalse(proxy.available)

    def test_metadata_fallback_for_statistics_compat(self) -> None:
        run = RunData.from_dict(
            {
                "id": "runM",
                "friendly_name": "Tent M",
                "start_time": "2026-03-01T00:00:00",
                "bindings": [{"metric_type": "energy", "sensor_id": "sensor.energy_main"}],
            }
        )
        coordinator = FakeCoordinator([run])
        proxy = SENSOR_MODULE.PlantRunProxySensor(
            coordinator=coordinator,
            run_id="runM",
            run_name="Tent M",
            binding=run.bindings[0],
        )
        proxy._apply_source_metadata({"unit_of_measurement": "Wh"})
        self.assertEqual(proxy._attr_state_class, "total_increasing")
        self.assertEqual(proxy._attr_device_class, "energy")
        self.assertEqual(proxy._attr_native_unit_of_measurement, "Wh")

    def test_proxy_unavailable_when_source_entity_missing_or_unavailable(self) -> None:
        run = RunData.from_dict(
            {
                "id": "runS",
                "friendly_name": "Tent S",
                "start_time": "2026-03-01T00:00:00",
                "bindings": [{"metric_type": "temperature", "sensor_id": "sensor.temp"}],
            }
        )
        coordinator = FakeCoordinator([run])
        proxy = SENSOR_MODULE.PlantRunProxySensor(
            coordinator=coordinator,
            run_id="runS",
            run_name="Tent S",
            binding=run.bindings[0],
        )

        proxy.hass = types.SimpleNamespace(states=types.SimpleNamespace(get=lambda _entity_id: None))
        self.assertFalse(proxy.available)

        unavailable_state = types.SimpleNamespace(state="unavailable")
        proxy.hass = types.SimpleNamespace(
            states=types.SimpleNamespace(get=lambda _entity_id: unavailable_state)
        )
        self.assertFalse(proxy.available)


class TestProxyStateChangeThreadSafety(unittest.TestCase):
    def test_state_change_callback_uses_schedule_update(self) -> None:
        run = RunData.from_dict(
            {
                "id": "runT",
                "friendly_name": "Tent T",
                "start_time": "2026-03-01T00:00:00",
                "bindings": [{"metric_type": "temperature", "sensor_id": "sensor.t1"}],
            }
        )
        coordinator = FakeCoordinator([run])
        proxy = SENSOR_MODULE.PlantRunProxySensor(
            coordinator=coordinator,
            run_id="runT",
            run_name="Tent T",
            binding=run.bindings[0],
        )

        captured = {}

        def _capture_track(_hass, _entity_ids, callback):
            captured["callback"] = callback
            return lambda: None

        SENSOR_MODULE.async_track_state_change_event = _capture_track

        class _States:
            @staticmethod
            def get(_entity_id):
                return None

        proxy.hass = types.SimpleNamespace(states=_States())

        calls = {"scheduled": 0, "written": 0}

        def _schedule_update_ha_state(_force_refresh: bool = False) -> None:
            calls["scheduled"] += 1

        def _async_write_ha_state() -> None:
            calls["written"] += 1

        proxy.schedule_update_ha_state = _schedule_update_ha_state
        proxy.async_write_ha_state = _async_write_ha_state

        asyncio.run(proxy.async_added_to_hass())

        event = types.SimpleNamespace(
            data={
                "new_state": types.SimpleNamespace(
                    state="21.4",
                    attributes={"unit_of_measurement": "°C"},
                )
            }
        )
        captured["callback"](event)

        self.assertEqual(calls["scheduled"], 1)
        self.assertEqual(calls["written"], 0)


if __name__ == "__main__":
    unittest.main()
