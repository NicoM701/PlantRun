import sys
import types
import unittest


def _install_homeassistant_stubs() -> None:
    homeassistant = sys.modules.get("homeassistant") or types.ModuleType("homeassistant")
    components = sys.modules.get("homeassistant.components") or types.ModuleType("homeassistant.components")
    sensor_mod = sys.modules.get("homeassistant.components.sensor") or types.ModuleType("homeassistant.components.sensor")
    config_entries = sys.modules.get("homeassistant.config_entries") or types.ModuleType("homeassistant.config_entries")
    core = sys.modules.get("homeassistant.core") or types.ModuleType("homeassistant.core")
    helpers = sys.modules.get("homeassistant.helpers") or types.ModuleType("homeassistant.helpers")
    dispatcher = sys.modules.get("homeassistant.helpers.dispatcher") or types.ModuleType("homeassistant.helpers.dispatcher")
    entity_platform = sys.modules.get("homeassistant.helpers.entity_platform") or types.ModuleType("homeassistant.helpers.entity_platform")

    class SensorEntity:
        pass

    class ConfigEntry:
        pass

    class HomeAssistant:
        pass

    sensor_mod.SensorEntity = SensorEntity
    config_entries.ConfigEntry = ConfigEntry
    core.HomeAssistant = HomeAssistant
    dispatcher.async_dispatcher_connect = lambda *_args, **_kwargs: (lambda: None)
    entity_platform.AddEntitiesCallback = object

    homeassistant.components = components
    homeassistant.config_entries = config_entries
    homeassistant.core = core
    homeassistant.helpers = helpers

    sys.modules["homeassistant"] = homeassistant
    sys.modules["homeassistant.components"] = components
    sys.modules["homeassistant.components.sensor"] = sensor_mod
    sys.modules["homeassistant.config_entries"] = config_entries
    sys.modules["homeassistant.core"] = core
    sys.modules["homeassistant.helpers"] = helpers
    sys.modules["homeassistant.helpers.dispatcher"] = dispatcher
    sys.modules["homeassistant.helpers.entity_platform"] = entity_platform


_install_homeassistant_stubs()

from custom_components.plantrun.const import DATA_STORAGE, DOMAIN
from custom_components.plantrun.sensor import (
    PlantRunActiveCultivarNameSensor,
    PlantRunActivePhaseSensor,
)


class _FakeStorage:
    def __init__(self, data):
        self.data = data


class _FakeHass:
    def __init__(self, storage_data):
        self.data = {DOMAIN: {DATA_STORAGE: _FakeStorage(storage_data)}}


class SensorRepresentationTests(unittest.TestCase):
    def test_active_phase_sensor_exposes_represented_run_in_multi_run_context(self):
        hass = _FakeHass(
            {
                "active_run_id": "run-b",
                "active_run_ids": ["run-a", "run-b"],
                "runs": {
                    "run-a": {"id": "run-a", "display_id": "a-1234", "name": "Run A", "phase": "growth"},
                    "run-b": {"id": "run-b", "display_id": "b-5678", "name": "Run B", "phase": "flower"},
                },
            }
        )
        sensor = PlantRunActivePhaseSensor(hass)

        self.assertEqual(sensor.native_value, "flower")
        attrs = sensor.extra_state_attributes
        self.assertEqual(attrs["represented_run_id"], "run-b")
        self.assertEqual(attrs["represented_display_id"], "b-5678")
        self.assertEqual(attrs["represented_run_name"], "Run B")
        self.assertEqual(attrs["active_count"], 2)
        self.assertEqual(attrs["resolution"], "compatibility_fallback")

    def test_active_cultivar_sensor_exposes_represented_run_attributes(self):
        hass = _FakeHass(
            {
                "active_run_id": "run-a",
                "active_run_ids": ["run-a", "run-b"],
                "runs": {
                    "run-a": {
                        "id": "run-a",
                        "display_id": "a-1234",
                        "name": "Run A",
                        "phase": "growth",
                        "cultivar_snapshot": {"species": "Blue Dream"},
                    },
                    "run-b": {"id": "run-b", "display_id": "b-5678", "name": "Run B", "phase": "flower"},
                },
            }
        )
        sensor = PlantRunActiveCultivarNameSensor(hass)

        self.assertEqual(sensor.native_value, "Blue Dream")
        attrs = sensor.extra_state_attributes
        self.assertEqual(attrs["represented_run_id"], "run-a")
        self.assertEqual(attrs["active_count"], 2)
        self.assertIn("active_run_ids", attrs)


if __name__ == "__main__":
    unittest.main()
