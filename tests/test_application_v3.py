import asyncio
import importlib.util
import sys
import types
import unittest
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLANTRUN_DIR = ROOT / "custom_components" / "plantrun"

custom_components = types.ModuleType("custom_components")
custom_components.__path__ = [str(ROOT / "custom_components")]
sys.modules.setdefault("custom_components", custom_components)
plantrun_pkg = types.ModuleType("custom_components.plantrun")
plantrun_pkg.__path__ = [str(PLANTRUN_DIR)]
sys.modules["custom_components.plantrun"] = plantrun_pkg


def _load(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


domain_module = _load("custom_components.plantrun.domain", PLANTRUN_DIR / "domain.py")
application_module = _load(
    "custom_components.plantrun.application", PLANTRUN_DIR / "application.py"
)
CommandError = application_module.CommandError
PlantRunApplication = application_module.PlantRunApplication
PlantRunDomain = domain_module.PlantRunDomain


class RecordingStorage:
    def __init__(self) -> None:
        self.domain = PlantRunDomain()
        self.commits: list[dict] = []
        self.fail_next_commit = False

    async def async_commit_domain(self, candidate: PlantRunDomain) -> None:
        if self.fail_next_commit:
            self.fail_next_commit = False
            raise OSError("disk full")
        self.commits.append(candidate.export_state())
        self.domain = candidate


class YieldingStorage(RecordingStorage):
    async def async_commit_domain(self, candidate: PlantRunDomain) -> None:
        await asyncio.sleep(0)
        await super().async_commit_domain(candidate)


class TestPlantRunApplication(unittest.TestCase):
    def test_create_run_is_one_atomic_command_and_returns_complete_state(self) -> None:
        storage = RecordingStorage()
        app = PlantRunApplication(storage)

        state = asyncio.run(
            app.execute(
                "create_run",
                {
                    "run_name": "Diesel Auto RQS",
                    "tent_name": "Growzelt",
                    "plant_name": "Diesel Auto",
                    "strain": "Diesel Auto",
                    "breeder": "Royal Queen Seeds",
                    "container": "7 L final container",
                    "substrate": "All-Mix soil",
                    "light_schedule": "20:00 to 14:00, 18/6",
                    "planted_at": "2026-08-25T16:00:00+02:00",
                    "initial_stage": "Germination",
                    "stage_plan": [
                        "Germination",
                        "Seedling",
                        "Vegetative",
                        "Flowering",
                        "Harvested",
                    ],
                },
            )
        )

        self.assertEqual(len(storage.commits), 1)
        self.assertEqual(state["schema_version"], 3)
        self.assertEqual(state["tents"][0]["name"], "Growzelt")
        self.assertEqual(state["plants"][0]["name"], "Diesel Auto")
        self.assertEqual(state["plants"][0]["container"], "7 L final container")
        self.assertEqual(state["plants"][0]["substrate"], "All-Mix soil")
        self.assertEqual(state["tents"][0]["light_schedule"], "20:00 to 14:00, 18/6")
        self.assertEqual(state["runs"][0]["name"], "Diesel Auto RQS")
        self.assertEqual(state["runs"][0]["current_stage"], "Germination")
        self.assertEqual(state["active_tent_id"], state["tents"][0]["id"])

    def test_failed_persistence_does_not_replace_the_live_domain(self) -> None:
        storage = RecordingStorage()
        app = PlantRunApplication(storage)
        original_state = storage.domain.export_state()
        storage.fail_next_commit = True

        with self.assertRaisesRegex(OSError, "disk full"):
            asyncio.run(
                app.execute(
                    "create_run",
                    {
                        "run_name": "Tangerine Dream Auto Zamnesia",
                        "tent_name": "Growzelt",
                        "plant_name": "Tangerine Dream Auto",
                        "strain": "Tangerine Dream Auto",
                        "breeder": "Zamnesia",
                        "planted_at": "2026-08-25T16:00:00+02:00",
                        "initial_stage": "Germination",
                        "stage_plan": ["Germination", "Seedling", "Harvested"],
                    },
                )
            )

        self.assertEqual(storage.domain.export_state(), original_state)
        self.assertEqual(storage.commits, [])

    def test_journal_command_preserves_unmeasured_watering_as_optional_detail(self) -> None:
        storage = RecordingStorage()
        app = PlantRunApplication(storage)
        created = asyncio.run(
            app.execute(
                "create_run",
                {
                    "run_name": "Diesel Auto RQS",
                    "tent_name": "Growzelt",
                    "plant_name": "Diesel Auto",
                    "planted_at": "2026-08-25T16:00:00+02:00",
                    "initial_stage": "Germination",
                    "stage_plan": ["Germination", "Harvested"],
                },
            )
        )
        run_id = created["runs"][0]["id"]
        tent_id = created["tents"][0]["id"]

        state = asyncio.run(
            app.execute(
                "create_journal_entry",
                {
                    "tent_id": tent_id,
                    "run_ids": [run_id],
                    "entry_type": "Water",
                    "text": "Wetted the fresh soil, then sprinkled a little water over the seed. Amount not measured.",
                    "occurred_at": "2026-08-25T16:00:00+02:00",
                    "details": {"amount": None, "measured": False},
                },
            )
        )

        entry = state["journal_entries"][0]
        self.assertEqual(entry["entry_type"], "Water")
        self.assertEqual(entry["details"], {"amount": None, "measured": False})
        self.assertEqual(entry["run_ids"], [run_id])

    def test_unknown_command_is_rejected_without_persistence(self) -> None:
        storage = RecordingStorage()
        app = PlantRunApplication(storage)

        with self.assertRaisesRegex(CommandError, "Unsupported command"):
            asyncio.run(app.execute("invent_data", {}))

        self.assertEqual(storage.commits, [])

    def test_concurrent_commands_are_serialized_without_losing_an_entry(self) -> None:
        storage = YieldingStorage()
        app = PlantRunApplication(storage)

        async def scenario() -> dict:
            created = await app.execute(
                "create_run",
                {
                    "run_name": "Diesel Auto RQS",
                    "tent_name": "Growzelt",
                    "plant_name": "Diesel Auto",
                    "planted_at": "2026-08-25T16:00:00+02:00",
                },
            )
            run_id = created["runs"][0]["id"]
            tent_id = created["tents"][0]["id"]
            payload = {
                "tent_id": tent_id,
                "run_ids": [run_id],
                "entry_type": "Inspect",
                "occurred_at": "2026-08-26T10:00:00+02:00",
            }
            await asyncio.gather(
                app.execute("create_journal_entry", {**payload, "text": "First check"}),
                app.execute("create_journal_entry", {**payload, "text": "Second check"}),
            )
            return app.state()

        state = asyncio.run(scenario())

        self.assertEqual(
            {entry["text"] for entry in state["journal_entries"]},
            {"First check", "Second check"},
        )

    def test_frontend_plant_binding_maps_to_run_ownership(self) -> None:
        storage = RecordingStorage()
        app = PlantRunApplication(storage)

        state = asyncio.run(
            app.execute(
                "create_run",
                {
                    "run_name": "Bound plant",
                    "tent_name": "Growzelt",
                    "plant_name": "Bound plant",
                    "planted_at": "2026-08-25T16:00:00+02:00",
                    "bindings": [
                        {
                            "owner_type": "plant",
                            "metric_type": "soil_moisture",
                            "entity_id": "sensor.bound_soil",
                        }
                    ],
                },
            )
        )

        binding = state["sensor_bindings"][0]
        self.assertEqual(binding["owner"], "run")
        self.assertEqual(binding["owner_id"], state["runs"][0]["id"])

    def test_frontend_can_clear_a_binding_without_deleting_its_history(self) -> None:
        storage = RecordingStorage()
        app = PlantRunApplication(storage)
        created = asyncio.run(
            app.execute(
                "create_run",
                {
                    "run_name": "Bound plant",
                    "tent_name": "Growzelt",
                    "plant_name": "Bound plant",
                    "planted_at": "2026-08-25T16:00:00+02:00",
                    "bindings": [
                        {
                            "owner_type": "plant",
                            "metric_type": "soil_moisture",
                            "entity_id": "sensor.bound_soil",
                        }
                    ],
                },
            )
        )

        state = asyncio.run(
            app.execute(
                "clear_binding",
                {
                    "owner_type": "plant",
                    "owner_id": created["runs"][0]["id"],
                    "metric_type": "soil_moisture",
                    "occurred_at": "2026-08-26T12:00:00+02:00",
                },
            )
        )

        self.assertEqual(
            state["sensor_bindings"][0]["ended_at"],
            "2026-08-26T12:00:00+02:00",
        )

    def test_import_bundle_is_atomic_and_idempotent(self) -> None:
        storage = RecordingStorage()
        app = PlantRunApplication(storage)
        payload = {
            "tent_name": "Growzelt",
            "runs": [
                {
                    "run_name": "Diesel Auto RQS",
                    "plant_name": "Diesel Auto",
                    "strain": "Diesel Auto",
                    "breeder": "Royal Queen Seeds",
                    "container": "7 L final container",
                    "substrate": "All-Mix soil",
                    "light_schedule": "20:00 to 14:00, 18/6",
                    "planted_at": "2026-08-25T16:00:00+02:00",
                    "initial_stage": "Germination",
                    "stage_plan": ["Germination", "Seedling", "Vegetative", "Flowering", "Harvested"],
                },
                {
                    "run_name": "Tangerine Dream Auto Zamnesia",
                    "plant_name": "Tangerine Dream Auto",
                    "strain": "Tangerine Dream Auto",
                    "breeder": "Zamnesia",
                    "container": "7 L final container",
                    "substrate": "All-Mix soil",
                    "light_schedule": "20:00 to 14:00, 18/6",
                    "planted_at": "2026-08-25T16:00:00+02:00",
                    "initial_stage": "Germination",
                    "stage_plan": ["Germination", "Seedling", "Vegetative", "Flowering", "Harvested"],
                },
            ],
            "journal_entries": [
                {
                    "run_name": "Diesel Auto RQS",
                    "entry_type": "Planting",
                    "occurred_at": "2026-08-25T16:00:00+02:00",
                    "text": "Dry seed placed directly into All-Mix soil.",
                },
                {
                    "run_name": "Diesel Auto RQS",
                    "entry_type": "Water",
                    "occurred_at": "2026-08-25T16:00:00+02:00",
                    "text": "Fresh soil wetted. Amount not measured.",
                    "details": {"amount": None, "measured": False},
                },
                {
                    "run_name": "Tangerine Dream Auto Zamnesia",
                    "entry_type": "Planting",
                    "occurred_at": "2026-08-25T16:00:00+02:00",
                    "text": "Dry seed placed directly into All-Mix soil.",
                },
                {
                    "run_name": "Tangerine Dream Auto Zamnesia",
                    "entry_type": "Water",
                    "occurred_at": "2026-08-25T16:00:00+02:00",
                    "text": "Fresh soil wetted. Amount not measured.",
                    "details": {"amount": None, "measured": False},
                },
                {
                    "run_name": None,
                    "entry_type": "Lighting",
                    "occurred_at": "2026-08-25T20:00:00+02:00",
                    "text": "First scheduled lights-on. Light schedule is 20:00 to 14:00, 18/6.",
                },
            ],
        }

        first = asyncio.run(app.execute("import_bundle", payload))
        second = asyncio.run(app.execute("import_bundle", payload))

        self.assertEqual(len(first["tents"]), 1)
        self.assertEqual(len(second["runs"]), 2)
        self.assertEqual(len(second["plants"]), 2)
        self.assertEqual(len(second["journal_entries"]), 5)
        self.assertEqual({run["current_stage"] for run in second["runs"]}, {"Germination"})
        self.assertEqual({plant["container"] for plant in second["plants"]}, {"7 L final container"})
        self.assertEqual(second["tents"][0]["light_schedule"], "20:00 to 14:00, 18/6")

    def test_invalid_duration_number_is_reported_as_a_command_error(self) -> None:
        storage = RecordingStorage()
        app = PlantRunApplication(storage)

        with self.assertRaisesRegex(CommandError, "duration.minimum_days must be an integer"):
            asyncio.run(
                app.execute(
                    "create_run",
                    {
                        "run_name": "Broken duration",
                        "tent_name": "Growzelt",
                        "plant_name": "Test plant",
                        "planted_at": "2026-08-25T16:00:00+02:00",
                        "duration": {
                            "minimum_days": "unknown",
                            "maximum_days": 80,
                            "meaning": "breeder estimate",
                            "start_event": "seed",
                            "source": "example.invalid",
                            "original_wording": "70 to 80 days",
                        },
                    },
                )
            )

        self.assertEqual(storage.commits, [])

    def test_import_retry_rejects_conflicting_permanent_facts(self) -> None:
        storage = RecordingStorage()
        app = PlantRunApplication(storage)
        base = {
            "tent_name": "Growzelt",
            "runs": [
                {
                    "run_name": "Diesel Auto RQS",
                    "plant_name": "Diesel Auto",
                    "strain": "Diesel Auto",
                    "breeder": "Royal Queen Seeds",
                    "container": "7 L final container",
                    "substrate": "All-Mix soil",
                    "light_schedule": "20:00 to 14:00, 18/6",
                    "planted_at": "2026-08-25T16:00:00+02:00",
                    "initial_stage": "Germination",
                }
            ],
            "journal_entries": [],
        }
        asyncio.run(app.execute("import_bundle", base))
        conflicting = {
            **base,
            "runs": [{**base["runs"][0], "container": "11 L final container"}],
        }

        with self.assertRaisesRegex(CommandError, "import collision"):
            asyncio.run(app.execute("import_bundle", conflicting))

        self.assertEqual(storage.domain.snapshot().plants[0].container, "7 L final container")


if __name__ == "__main__":
    unittest.main()
