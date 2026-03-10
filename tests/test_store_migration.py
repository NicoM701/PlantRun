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


class _StubStore:
    def __init__(self, *_args, **_kwargs):
        self.saved = None

    async def async_load(self):
        return self.saved

    async def async_save(self, data):
        self.saved = data


def _install_homeassistant_stubs() -> None:
    ha = types.ModuleType("homeassistant")
    sys.modules.setdefault("homeassistant", ha)

    core = types.ModuleType("homeassistant.core")

    class HomeAssistant:
        pass

    core.HomeAssistant = HomeAssistant
    sys.modules["homeassistant.core"] = core

    helpers = types.ModuleType("homeassistant.helpers")
    storage = types.ModuleType("homeassistant.helpers.storage")
    storage.Store = _StubStore
    sys.modules["homeassistant.helpers"] = helpers
    sys.modules["homeassistant.helpers.storage"] = storage


_install_homeassistant_stubs()

custom_components = types.ModuleType("custom_components")
custom_components.__path__ = [str(ROOT / "custom_components")]
sys.modules.setdefault("custom_components", custom_components)

plantrun_pkg = types.ModuleType("custom_components.plantrun")
plantrun_pkg.__path__ = [str(PLANTRUN_DIR)]
sys.modules["custom_components.plantrun"] = plantrun_pkg

_load_module("custom_components.plantrun.const", PLANTRUN_DIR / "const.py")
_load_module("custom_components.plantrun.models", PLANTRUN_DIR / "models.py")
STORE_MODULE = _load_module("custom_components.plantrun.store", PLANTRUN_DIR / "store.py")
PlantRunStorage = STORE_MODULE.PlantRunStorage


class TestStoreMigration(unittest.TestCase):
    def test_migrates_v1_payload(self) -> None:
        payload = {
            "runs": [{"friendly_name": "Run A", "start_time": "2026-03-01T00:00:00"}],
        }
        migrated, changed = PlantRunStorage._normalize_payload(payload)
        self.assertTrue(changed)
        self.assertEqual(migrated["schema_version"], 2)
        self.assertIn("active_run_id", migrated)
        self.assertEqual(migrated["active_run_id"], None)
        self.assertEqual(migrated["runs"][0]["notes"], [])

    def test_migration_is_idempotent(self) -> None:
        payload = {
            "schema_version": 2,
            "active_run_id": None,
            "daily_rollups": {},
            "runs": [
                {
                    "id": "run1",
                    "friendly_name": "Run A",
                    "start_time": "2026-03-01T00:00:00",
                    "notes": [],
                    "phases": [],
                    "bindings": [],
                }
            ],
        }
        first, first_changed = PlantRunStorage._normalize_payload(payload)
        second, second_changed = PlantRunStorage._normalize_payload(first)
        self.assertFalse(first_changed)
        self.assertFalse(second_changed)
        self.assertEqual(first, second)

    def test_async_load_skips_malformed_runs_and_clears_invalid_active_run(self) -> None:
        storage = PlantRunStorage(object())
        storage._store.saved = {
            "schema_version": 2,
            "active_run_id": "missing-run",
            "daily_rollups": {},
            "runs": [
                {
                    "id": "run1",
                    "friendly_name": "Run A",
                    "start_time": "2026-03-01T00:00:00",
                    "notes": [],
                    "phases": [],
                    "bindings": [],
                },
                {
                    "id": "broken",
                    "friendly_name": "Broken Run",
                    "notes": [],
                    "phases": [],
                    "bindings": [],
                },
            ],
        }

        import asyncio

        asyncio.run(storage.async_load())

        self.assertEqual(len(storage.runs), 1)
        self.assertEqual(storage.runs[0].id, "run1")
        self.assertIsNone(storage.active_run_id)


if __name__ == "__main__":
    unittest.main()
