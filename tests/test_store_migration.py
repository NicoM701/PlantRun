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
        self.assertEqual(migrated["schema_version"], 3)
        self.assertEqual(migrated["domain"]["runs"], [])
        self.assertEqual(migrated["legacy_v2"]["active_run_id"], None)
        self.assertEqual(migrated["legacy_v2"]["runs"][0]["notes"], [])
        self.assertEqual(
            migrated["legacy_v2"]["runs"][0]["phases"][0]["name"],
            "Seedling",
        )

    def test_migration_is_idempotent(self) -> None:
        payload = {
            "schema_version": 3,
            "active_run_id": None,
            "daily_rollups": {},
            "domain": {
                "tents": [],
                "plants": [],
                "runs": [],
                "journal_entries": [],
                "sensor_bindings": [],
            },
            "legacy_v2": {"runs": [], "active_run_id": None, "daily_rollups": {}},
            "compatibility_runs": [],
        }
        first, first_changed = PlantRunStorage._normalize_payload(payload)
        second, second_changed = PlantRunStorage._normalize_payload(first)
        self.assertFalse(first_changed)
        self.assertFalse(second_changed)
        self.assertEqual(first, second)

    def test_schema_v2_run_without_phases_gets_default_phase(self) -> None:
        payload = {
            "schema_version": 2,
            "active_run_id": None,
            "daily_rollups": {},
            "runs": [
                {
                    "id": "run2",
                    "friendly_name": "Run B",
                    "start_time": "2026-03-02T00:00:00",
                    "notes": [],
                    "phases": [],
                    "bindings": [],
                }
            ],
        }
        migrated, changed = PlantRunStorage._normalize_payload(payload)
        self.assertTrue(changed)
        self.assertEqual(
            migrated["legacy_v2"]["runs"][0]["phases"][0]["name"],
            "Seedling",
        )

    def test_async_load_preserves_legacy_runs_without_exposing_them(self) -> None:
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

        self.assertEqual(storage.runs, [])
        self.assertEqual(len(storage._data["legacy_v2"]["runs"]), 2)
        self.assertIsNone(storage.active_run_id)

    def test_domain_commit_round_trips_through_home_assistant_store(self) -> None:
        import asyncio
        from datetime import datetime, timezone

        domain_module = _load_module(
            "custom_components.plantrun.domain",
            PLANTRUN_DIR / "domain.py",
        )
        domain = domain_module.PlantRunDomain()
        domain.create_run(
            domain_module.RunDraft(
                run_name="Diesel Auto RQS",
                tent_name="Growzelt",
                plant_name="Diesel Auto",
                planted_at=datetime(2026, 8, 25, 16, 0, tzinfo=timezone.utc),
                stage_plan=("Germination", "Harvested"),
                initial_stage="Germination",
            )
        )
        storage = PlantRunStorage(object())

        asyncio.run(storage.async_commit_domain(domain))
        saved = storage._store.saved
        restored = PlantRunStorage(object())
        restored._store.saved = saved
        asyncio.run(restored.async_load())

        self.assertEqual(restored.public_state()["runs"][0]["name"], "Diesel Auto RQS")
        self.assertEqual(restored.runs[0].phases[0].name, "Germination")

    def test_legacy_service_run_creation_enters_the_visible_domain(self) -> None:
        import asyncio

        models = sys.modules["custom_components.plantrun.models"]
        storage = PlantRunStorage(object())
        run = models.RunData(
            friendly_name="Service Run",
            start_time="2026-08-25T16:00:00+02:00",
            planted_date="2026-08-25T16:00:00+02:00",
            phases=[models.Phase(name="Germination", start_time="2026-08-25T16:00:00+02:00")],
            base_config={"plants": [{"name": "Service Plant"}]},
        )

        asyncio.run(storage.async_add_run(run))

        state = storage.public_state()
        self.assertEqual(state["runs"][0]["name"], "Service Run")
        self.assertEqual(state["plants"][0]["name"], "Service Plant")
        self.assertEqual(run.id, state["runs"][0]["id"])
        self.assertEqual(storage._data["compatibility_runs"], [])

    def test_legacy_service_updates_write_stage_and_journal_to_the_domain(self) -> None:
        import asyncio

        models = sys.modules["custom_components.plantrun.models"]
        storage = PlantRunStorage(object())
        run = models.RunData(
            friendly_name="Service Run",
            start_time="2026-08-25T16:00:00+02:00",
            planted_date="2026-08-25T16:00:00+02:00",
            phases=[models.Phase(name="Germination", start_time="2026-08-25T16:00:00+02:00")],
        )
        asyncio.run(storage.async_add_run(run))
        projected = storage.get_run(run.id)
        projected.phases.append(
            models.Phase(name="Seedling", start_time="2026-08-28T12:00:00+02:00")
        )
        projected.notes.append(
            models.Note(text="First leaves visible.", timestamp="2026-08-28T12:05:00+02:00")
        )

        asyncio.run(storage.async_update_run(projected))

        state = storage.public_state()
        self.assertEqual(state["runs"][0]["current_stage"], "Seedling")
        self.assertEqual(state["journal_entries"][0]["text"], "First leaves visible.")

    def test_domain_commit_preserves_an_explicit_active_run_selection(self) -> None:
        import asyncio
        from datetime import datetime, timezone

        domain_module = sys.modules["custom_components.plantrun.domain"]
        domain = domain_module.PlantRunDomain()
        first = domain.create_run(
            domain_module.RunDraft(
                run_name="Diesel Auto RQS",
                tent_name="Growzelt",
                plant_name="Diesel Auto",
                planted_at=datetime(2026, 8, 25, 16, 0, tzinfo=timezone.utc),
                stage_plan=("Germination", "Harvested"),
                initial_stage="Germination",
            )
        )
        second = domain.create_run(
            domain_module.RunDraft(
                run_name="Tangerine Dream Auto Zamnesia",
                tent_name="Growzelt",
                plant_name="Tangerine Dream Auto",
                planted_at=datetime(2026, 8, 25, 16, 0, tzinfo=timezone.utc),
                stage_plan=("Germination", "Harvested"),
                initial_stage="Germination",
            )
        )
        storage = PlantRunStorage(object())
        asyncio.run(storage.async_commit_domain(domain))
        asyncio.run(storage.async_set_active_run_id(second.id))

        candidate = domain_module.PlantRunDomain.from_state(storage.domain.export_state())
        candidate.add_journal_entry(
            domain_module.JournalDraft(
                tent_id=first.tent_id,
                run_ids=(first.id,),
                text="Soil checked.",
                occurred_at=datetime(2026, 8, 26, 10, 0, tzinfo=timezone.utc),
            )
        )
        asyncio.run(storage.async_commit_domain(candidate))

        self.assertEqual(storage.active_run_id, second.id)

    def test_archived_binding_remains_in_compatibility_projection(self) -> None:
        import asyncio
        from datetime import datetime, timedelta, timezone

        domain_module = sys.modules["custom_components.plantrun.domain"]
        planted_at = datetime(2026, 8, 25, 16, 0, tzinfo=timezone.utc)
        domain = domain_module.PlantRunDomain()
        run = domain.create_run(
            domain_module.RunDraft(
                run_name="Diesel Auto RQS",
                tent_name="Growzelt",
                plant_name="Diesel Auto",
                planted_at=planted_at,
                stage_plan=("Germination", "Harvested"),
                initial_stage="Germination",
                sensor_bindings=(
                    domain_module.BindingDraft(
                        owner="run",
                        metric_type="soil_moisture",
                        entity_id="sensor.diesel_soil",
                    ),
                ),
            )
        )
        domain.finish_run(run.id, planted_at + timedelta(days=80))
        storage = PlantRunStorage(object())

        asyncio.run(storage.async_commit_domain(domain))

        projected = storage.get_run(run.id)
        self.assertEqual(len(projected.bindings), 1)
        self.assertEqual(projected.bindings[0].sensor_id, "sensor.diesel_soil")


if __name__ == "__main__":
    unittest.main()
