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

ha = types.ModuleType("homeassistant")
sys.modules.setdefault("homeassistant", ha)
core = types.ModuleType("homeassistant.core")
core.HomeAssistant = object
sys.modules["homeassistant.core"] = core
helpers = types.ModuleType("homeassistant.helpers")
storage_mod = types.ModuleType("homeassistant.helpers.storage")
storage_mod.Store = object
sys.modules["homeassistant.helpers"] = helpers
sys.modules["homeassistant.helpers.storage"] = storage_mod

custom_components = types.ModuleType("custom_components")
custom_components.__path__ = [str(ROOT / "custom_components")]
sys.modules.setdefault("custom_components", custom_components)
plantrun_pkg = types.ModuleType("custom_components.plantrun")
plantrun_pkg.__path__ = [str(PLANTRUN_DIR)]
sys.modules["custom_components.plantrun"] = plantrun_pkg

MODELS = _load_module("custom_components.plantrun.models", PLANTRUN_DIR / "models.py")
_load_module("custom_components.plantrun.summary", PLANTRUN_DIR / "summary.py")
RETENTION = _load_module("custom_components.plantrun.retention", PLANTRUN_DIR / "retention.py")
RunData = MODELS.RunData


class FakeStorage:
    def __init__(self):
        self._daily_rollups = {}

    @property
    def daily_rollups(self):
        return self._daily_rollups


class TestRetention(unittest.TestCase):
    def test_rollup_fallback_used_when_live_data_missing(self):
        storage = FakeStorage()
        storage.daily_rollups["run1"] = {
            "2026-03-09": {
                "run_id": "run1",
                "energy_kwh": 4.0,
                "temperature": {"avg": 23.1},
            }
        }
        run = RunData(id="run1", friendly_name="Tent", start_time="2026-03-01", sensor_history={})

        summary = RETENTION.get_summary_with_rollup_fallback(storage, run)
        self.assertEqual(summary["energy_kwh"], 4.0)
        self.assertEqual(summary["summary_meta"]["source"], "rollup")
        self.assertEqual(summary["summary_meta"]["fallback_reason"], "no_live_history")

    def test_live_summary_preferred_when_any_metric_history_exists(self):
        storage = FakeStorage()
        storage.daily_rollups["run1"] = {"2026-03-09": {"run_id": "run1", "energy_kwh": 9.9}}
        run = RunData(
            id="run1",
            friendly_name="Tent",
            start_time="2026-03-01",
            sensor_history={"temperature": [{"value": 21.5}]},
        )

        summary = RETENTION.get_summary_with_rollup_fallback(storage, run)
        self.assertEqual(summary["summary_meta"]["source"], "live")
        self.assertIsNone(summary["energy_kwh"])
        self.assertAlmostEqual(summary["temperature"]["avg"], 21.5)
        self.assertEqual(summary["summary_meta"]["history_state"], "complete")
        self.assertIsNone(summary["summary_meta"]["fallback_reason"])

    def test_explicit_meta_when_history_and_rollup_absent(self):
        storage = FakeStorage()
        run = RunData(id="run1", friendly_name="Tent", start_time="2026-03-01", sensor_history={})

        summary = RETENTION.get_summary_with_rollup_fallback(storage, run)
        self.assertEqual(summary["summary_meta"]["source"], "live")
        self.assertEqual(summary["summary_meta"]["fallback_reason"], "no_history_no_rollup")
        self.assertEqual(summary["summary_meta"]["history_state"], "empty")


if __name__ == "__main__":
    unittest.main()
