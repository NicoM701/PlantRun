import unittest
import json
from datetime import datetime, timedelta, timezone
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path


DOMAIN_PATH = (
    Path(__file__).resolve().parents[1]
    / "custom_components"
    / "plantrun"
    / "domain.py"
)
SPEC = spec_from_file_location("plantrun_domain", DOMAIN_PATH)
assert SPEC and SPEC.loader
DOMAIN = module_from_spec(SPEC)
SPEC.loader.exec_module(DOMAIN)

BindingDraft = DOMAIN.BindingDraft
JournalDraft = DOMAIN.JournalDraft
PlantRunDomain = DOMAIN.PlantRunDomain
RunDraft = DOMAIN.RunDraft
SourcedDuration = DOMAIN.SourcedDuration
StrainIdentity = DOMAIN.StrainIdentity


UTC = timezone.utc
PLANTED_AT = datetime(2026, 8, 25, 14, 0, tzinfo=UTC)
NOW = datetime(2026, 8, 25, 18, 0, tzinfo=UTC)


class PrefixIds:
    def __init__(self) -> None:
        self._counts: dict[str, int] = {}

    def __call__(self, prefix: str) -> str:
        count = self._counts.get(prefix, 0) + 1
        self._counts[prefix] = count
        return f"{prefix}-{count}"


def make_domain() -> PlantRunDomain:
    return PlantRunDomain(clock=lambda: NOW, id_factory=PrefixIds())


def create_minimal_run(domain: PlantRunDomain, name: str = "Diesel Auto RQS"):
    return domain.create_run(
        RunDraft(
            run_name=name,
            tent_name="Growzelt",
            plant_name=name,
            planted_at=PLANTED_AT,
            stage_plan=("Germination", "Seedling", "Flowering", "Harvested"),
            initial_stage="Germination",
        )
    )


class TestRunCreation(unittest.TestCase):
    def test_creates_one_plant_run_with_sourced_duration_and_dated_bindings(self) -> None:
        domain = make_domain()
        duration = SourcedDuration(
            minimum_days=90,
            maximum_days=95,
            meaning="seed to harvest",
            start_event="germination",
            source="https://example.test/diesel-auto",
            original_wording="90-95 days after germination",
        )

        run = domain.create_run(
            RunDraft(
                run_name="Diesel Auto RQS",
                tent_name="Growzelt",
                plant_name="Diesel Auto",
                planted_at=PLANTED_AT,
                stage_plan=("Germination", "Seedling", "Vegetative", "Flowering", "Harvested"),
                initial_stage="Germination",
                strain=StrainIdentity(
                    name="Diesel Auto",
                    breeder="Royal Queen Seeds",
                    duration=duration,
                ),
                container="7 L final container",
                substrate="All-Mix soil",
                light_schedule="20:00 to 14:00, 18/6",
                sensor_bindings=(
                    BindingDraft(
                        owner="tent",
                        metric_type="temperature",
                        entity_id="sensor.growzelt_temperature",
                    ),
                    BindingDraft(
                        owner="run",
                        metric_type="soil_moisture",
                        entity_id="sensor.diesel_soil_moisture",
                    ),
                ),
            )
        )

        snapshot = domain.snapshot()
        self.assertEqual(len(snapshot.tents), 1)
        self.assertEqual(len(snapshot.plants), 1)
        self.assertEqual(len(snapshot.runs), 1)
        self.assertEqual(run.plant_id, snapshot.plants[0].id)
        self.assertEqual(run.tent_id, snapshot.tents[0].id)
        self.assertEqual(run.current_stage, "Germination")
        self.assertEqual(run.stage_history[0].occurred_at, PLANTED_AT)
        self.assertEqual(snapshot.plants[0].strain.duration, duration)
        self.assertEqual(snapshot.plants[0].container, "7 L final container")
        self.assertEqual(snapshot.plants[0].substrate, "All-Mix soil")
        self.assertEqual(snapshot.tents[0].light_schedule, "20:00 to 14:00, 18/6")
        self.assertEqual(
            [(binding.owner, binding.started_at) for binding in snapshot.bindings],
            [("tent", PLANTED_AT), ("run", PLANTED_AT)],
        )

    def test_invalid_run_creation_is_atomic(self) -> None:
        domain = make_domain()

        with self.assertRaisesRegex(DOMAIN.ValidationError, "initial_stage"):
            domain.create_run(
                RunDraft(
                    run_name="Broken run",
                    tent_name="Growzelt",
                    plant_name="Broken plant",
                    planted_at=PLANTED_AT,
                    stage_plan=("Seedling", "Flowering"),
                    initial_stage="Germination",
                )
            )

        snapshot = domain.snapshot()
        self.assertEqual(snapshot.tents, ())
        self.assertEqual(snapshot.plants, ())
        self.assertEqual(snapshot.runs, ())

    def test_reuses_persistent_tent_and_does_not_duplicate_shared_binding(self) -> None:
        domain = make_domain()
        shared = BindingDraft(
            owner="tent",
            metric_type="temperature",
            entity_id="sensor.growzelt_temperature",
        )
        first = domain.create_run(
            RunDraft(
                run_name="Diesel Auto RQS",
                tent_name="Growzelt",
                plant_name="Diesel Auto",
                planted_at=PLANTED_AT,
                stage_plan=("Germination", "Harvested"),
                initial_stage="Germination",
                sensor_bindings=(shared,),
            )
        )
        second = domain.create_run(
            RunDraft(
                run_name="Tangerine Dream Auto Zamnesia",
                tent_name="growzelt",
                plant_name="Tangerine Dream Auto",
                planted_at=PLANTED_AT,
                stage_plan=("Germination", "Harvested"),
                initial_stage="Germination",
                sensor_bindings=(shared,),
            )
        )

        snapshot = domain.snapshot()
        self.assertEqual(first.tent_id, second.tent_id)
        self.assertEqual(len(snapshot.tents), 1)
        self.assertEqual(len(snapshot.runs), 2)
        self.assertEqual(len({run.plant_id for run in snapshot.runs}), 2)
        self.assertEqual(len(snapshot.bindings), 1)


class TestJournal(unittest.TestCase):
    def test_adds_dated_entry_with_optional_details_and_sensor_context(self) -> None:
        domain = make_domain()
        run = create_minimal_run(domain)

        entry = domain.add_journal_entry(
            JournalDraft(
                tent_id=run.tent_id,
                run_ids=(run.id,),
                entry_type="Water",
                text="Soil wetted and a small unmeasured sprinkle over the seed.",
                occurred_at=PLANTED_AT,
                details={"amount_ml": None},
                sensor_snapshot={"sensor.growzelt_temperature": 24.1},
            )
        )

        self.assertEqual(entry.created_at, NOW)
        self.assertEqual(entry.updated_at, NOW)
        self.assertEqual(entry.occurred_at, PLANTED_AT)
        self.assertEqual(entry.run_ids, (run.id,))
        self.assertEqual(entry.details, {"amount_ml": None})
        self.assertEqual(
            entry.sensor_snapshot,
            {"sensor.growzelt_temperature": 24.1},
        )
        self.assertEqual(domain.snapshot().journal_entries, (entry,))

    def test_edit_preserves_creation_time_and_delete_removes_the_entry(self) -> None:
        edited_at = NOW + timedelta(hours=1)
        moments = iter((NOW, NOW, edited_at))
        domain = PlantRunDomain(clock=lambda: next(moments), id_factory=PrefixIds())
        run = create_minimal_run(domain)
        entry = domain.add_journal_entry(
            JournalDraft(
                tent_id=run.tent_id,
                run_ids=(run.id,),
                entry_type="Inspect",
                text="Seed checked.",
                occurred_at=PLANTED_AT,
            )
        )

        replacement = domain.edit_journal_entry(
            entry.id,
            JournalDraft(
                tent_id=run.tent_id,
                run_ids=(run.id,),
                entry_type="Inspect",
                text="Seed checked, soil still moist.",
                occurred_at=PLANTED_AT + timedelta(minutes=15),
                details={"follow_up": "tomorrow"},
            ),
        )

        self.assertEqual(replacement.id, entry.id)
        self.assertEqual(replacement.created_at, entry.created_at)
        self.assertEqual(replacement.updated_at, edited_at)
        self.assertEqual(replacement.occurred_at, PLANTED_AT + timedelta(minutes=15))
        self.assertEqual(replacement.details, {"follow_up": "tomorrow"})
        self.assertEqual(domain.delete_journal_entry(entry.id), replacement)
        self.assertEqual(domain.snapshot().journal_entries, ())


class TestStages(unittest.TestCase):
    def test_can_switch_directly_to_any_planned_stage_and_reorder_without_rewriting_history(self) -> None:
        domain = make_domain()
        run = create_minimal_run(domain)
        flowering_at = PLANTED_AT + timedelta(days=25)
        correction_at = PLANTED_AT + timedelta(days=26)

        flowering = domain.change_stage(run.id, "Flowering", flowering_at)
        corrected = domain.change_stage(run.id, "Germination", correction_at)
        history_before_reorder = corrected.stage_history
        reordered = domain.set_stage_plan(
            run.id,
            ("Germination", "Flowering", "Seedling", "Harvested"),
        )

        self.assertEqual(flowering.current_stage, "Flowering")
        self.assertEqual(corrected.current_stage, "Germination")
        self.assertEqual(corrected.stage_history[-1].from_stage, "Flowering")
        self.assertEqual(corrected.stage_history[-1].occurred_at, correction_at)
        self.assertEqual(reordered.stage_history, history_before_reorder)
        self.assertEqual(
            reordered.stage_plan,
            ("Germination", "Flowering", "Seedling", "Harvested"),
        )

    def test_stage_changes_and_run_end_cannot_break_timeline_order(self) -> None:
        domain = make_domain()
        run = create_minimal_run(domain)
        flowering_at = PLANTED_AT + timedelta(days=25)
        domain.change_stage(run.id, "Flowering", flowering_at)

        with self.assertRaisesRegex(DOMAIN.ValidationError, "latest stage change"):
            domain.change_stage(run.id, "Germination", flowering_at - timedelta(days=1))
        with self.assertRaisesRegex(DOMAIN.ValidationError, "latest stage change"):
            domain.finish_run(run.id, flowering_at - timedelta(hours=1))


class TestRunEditingAndBindings(unittest.TestCase):
    def test_updates_run_and_plant_identity_without_replacing_their_ids(self) -> None:
        domain = make_domain()
        run = create_minimal_run(domain)
        corrected_planting = PLANTED_AT - timedelta(hours=1)
        strain = StrainIdentity(name="Diesel Auto", breeder="Royal Queen Seeds")

        updated = domain.update_run(
            run.id,
            run_name="Diesel Auto 2026",
            nickname="Diesel",
            plant_name="Diesel Auto",
            strain=strain,
            planted_at=corrected_planting,
            image="/local/plantrun/diesel.jpg",
        )

        snapshot = domain.snapshot()
        plant = snapshot.plants[0]
        self.assertEqual(updated.id, run.id)
        self.assertEqual(updated.plant_id, run.plant_id)
        self.assertEqual(updated.name, "Diesel Auto 2026")
        self.assertEqual(updated.nickname, "Diesel")
        self.assertEqual(updated.planted_at, corrected_planting)
        self.assertEqual(plant.id, run.plant_id)
        self.assertEqual(plant.name, "Diesel Auto")
        self.assertEqual(plant.strain, strain)
        self.assertEqual(plant.image, "/local/plantrun/diesel.jpg")

    def test_rebinding_a_metric_closes_the_old_assignment_at_the_change_time(self) -> None:
        domain = make_domain()
        run = domain.create_run(
            RunDraft(
                run_name="Diesel Auto RQS",
                tent_name="Growzelt",
                plant_name="Diesel Auto",
                planted_at=PLANTED_AT,
                stage_plan=("Germination", "Harvested"),
                initial_stage="Germination",
                sensor_bindings=(
                    BindingDraft(
                        owner="run",
                        metric_type="soil_moisture",
                        entity_id="sensor.soil_probe_1",
                    ),
                ),
            )
        )
        reassigned_at = PLANTED_AT + timedelta(days=7)

        new_binding = domain.set_sensor_binding(
            "run",
            run.id,
            "soil_moisture",
            "sensor.soil_probe_2",
            reassigned_at,
        )

        bindings = domain.snapshot().bindings
        self.assertEqual(len(bindings), 2)
        self.assertEqual(bindings[0].entity_id, "sensor.soil_probe_1")
        self.assertEqual(bindings[0].ended_at, reassigned_at)
        self.assertEqual(new_binding.entity_id, "sensor.soil_probe_2")
        self.assertEqual(new_binding.started_at, reassigned_at)
        self.assertIsNone(new_binding.ended_at)

    def test_clearing_a_binding_ends_ownership_without_erasing_history(self) -> None:
        domain = make_domain()
        run = create_minimal_run(domain)
        binding = domain.set_sensor_binding(
            "run",
            run.id,
            "soil_moisture",
            "sensor.diesel_soil",
            PLANTED_AT,
        )
        cleared_at = PLANTED_AT + timedelta(days=2)

        closed = domain.end_sensor_binding(
            "run",
            run.id,
            "soil_moisture",
            cleared_at,
        )

        self.assertEqual([item.id for item in closed], [binding.id])
        self.assertEqual(domain.snapshot().bindings[0].ended_at, cleared_at)

    def test_archived_run_cannot_receive_an_active_binding(self) -> None:
        domain = make_domain()
        run = create_minimal_run(domain)
        ended_at = PLANTED_AT + timedelta(days=80)
        domain.finish_run(run.id, ended_at)

        with self.assertRaisesRegex(DOMAIN.ValidationError, "archived runs"):
            domain.set_sensor_binding(
                "run",
                run.id,
                "soil_moisture",
                "sensor.late_probe",
                ended_at,
            )


class TestArchiveAndDeletion(unittest.TestCase):
    def test_finishing_archives_the_run_and_preserves_every_record(self) -> None:
        domain = make_domain()
        run = domain.create_run(
            RunDraft(
                run_name="Diesel Auto RQS",
                tent_name="Growzelt",
                plant_name="Diesel Auto",
                planted_at=PLANTED_AT,
                stage_plan=("Germination", "Harvested"),
                initial_stage="Germination",
                sensor_bindings=(
                    BindingDraft(
                        owner="run",
                        metric_type="soil_moisture",
                        entity_id="sensor.diesel_soil",
                    ),
                ),
            )
        )
        entry = domain.add_journal_entry(
            JournalDraft(
                tent_id=run.tent_id,
                run_ids=(run.id,),
                entry_type="Harvest",
                text="Harvested and hung to dry.",
                occurred_at=PLANTED_AT + timedelta(days=90),
            )
        )

        archived = domain.finish_run(
            run.id,
            PLANTED_AT + timedelta(days=90),
            harvest_details={"dry_yield_g": 48.5},
        )

        snapshot = domain.snapshot()
        self.assertEqual(archived.status, "archived")
        self.assertEqual(archived.ended_at, PLANTED_AT + timedelta(days=90))
        self.assertEqual(archived.harvest_details, {"dry_yield_g": 48.5})
        self.assertEqual(snapshot.journal_entries, (entry,))
        self.assertEqual(len(snapshot.plants), 1)
        self.assertEqual(len(snapshot.bindings), 1)
        self.assertEqual(snapshot.bindings[0].ended_at, archived.ended_at)

    def test_permanent_deletion_requires_exact_name_and_removes_only_run_owned_data(self) -> None:
        domain = make_domain()
        first = domain.create_run(
            RunDraft(
                run_name="Diesel Auto RQS",
                tent_name="Growzelt",
                plant_name="Diesel Auto",
                planted_at=PLANTED_AT,
                stage_plan=("Germination", "Harvested"),
                initial_stage="Germination",
                sensor_bindings=(
                    BindingDraft(
                        owner="tent",
                        metric_type="temperature",
                        entity_id="sensor.growzelt_temperature",
                    ),
                    BindingDraft(
                        owner="run",
                        metric_type="soil_moisture",
                        entity_id="sensor.diesel_soil",
                    ),
                ),
            )
        )
        second = create_minimal_run(domain, "Tangerine Dream Auto Zamnesia")
        shared_entry = domain.add_journal_entry(
            JournalDraft(
                tent_id=first.tent_id,
                run_ids=(first.id, second.id),
                text="Both seeds planted directly into final pots.",
                occurred_at=PLANTED_AT,
            )
        )
        only_first_entry = domain.add_journal_entry(
            JournalDraft(
                tent_id=first.tent_id,
                run_ids=(first.id,),
                text="Only belongs to Diesel Auto RQS.",
                occurred_at=PLANTED_AT,
            )
        )
        before = domain.snapshot()

        with self.assertRaises(DOMAIN.ConfirmationError):
            domain.permanently_delete_run(first.id, "diesel auto rqs")
        self.assertEqual(domain.snapshot(), before)

        deleted = domain.permanently_delete_run(first.id, "Diesel Auto RQS")
        snapshot = domain.snapshot()
        self.assertEqual(deleted, first)
        self.assertEqual([run.id for run in snapshot.runs], [second.id])
        self.assertEqual([plant.id for plant in snapshot.plants], [second.plant_id])
        self.assertEqual(len(snapshot.tents), 1)
        self.assertEqual(
            [(binding.owner, binding.entity_id) for binding in snapshot.bindings],
            [("tent", "sensor.growzelt_temperature")],
        )
        self.assertEqual(snapshot.journal_entries[0].id, shared_entry.id)
        self.assertEqual(snapshot.journal_entries[0].run_ids, (second.id,))
        self.assertNotIn(only_first_entry.id, {entry.id for entry in snapshot.journal_entries})


class TestPersistence(unittest.TestCase):
    def test_exported_state_is_json_safe_and_round_trips_without_losing_meaning(self) -> None:
        domain = make_domain()
        duration = SourcedDuration(
            minimum_days=70,
            maximum_days=77,
            meaning="seed to harvest",
            start_event="germination",
            source="https://example.test/tangerine-dream-auto",
            original_wording="about 11 weeks after germination",
        )
        run = domain.create_run(
            RunDraft(
                run_name="Tangerine Dream Auto Zamnesia",
                nickname="Tangerine",
                tent_name="Growzelt",
                plant_name="Tangerine Dream Auto",
                planted_at=PLANTED_AT,
                stage_plan=("Germination", "Seedling", "Flowering", "Harvested"),
                initial_stage="Germination",
                strain=StrainIdentity(
                    name="Tangerine Dream Auto",
                    breeder="Zamnesia",
                    duration=duration,
                ),
                image="https://example.test/tangerine.jpg",
                container="7 L final container",
                substrate="All-Mix soil",
                light_schedule="20:00 to 14:00, 18/6",
            )
        )
        domain.add_journal_entry(
            JournalDraft(
                tent_id=run.tent_id,
                run_ids=(run.id,),
                entry_type="Water",
                text="Small unmeasured sprinkle over the seed.",
                occurred_at=PLANTED_AT,
                details={"amount_ml": None},
            )
        )
        domain.change_stage(run.id, "Seedling", PLANTED_AT + timedelta(days=3))

        state = domain.export_state()
        encoded = json.dumps(state)
        restored = PlantRunDomain.from_state(
            json.loads(encoded),
            clock=lambda: NOW,
            id_factory=PrefixIds(),
        )

        self.assertEqual(
            set(state),
            {"tents", "plants", "runs", "journal_entries", "sensor_bindings"},
        )
        self.assertEqual(restored.snapshot(), domain.snapshot())
        self.assertEqual(
            restored.snapshot().plants[0].strain.duration.original_wording,
            "about 11 weeks after germination",
        )
        self.assertEqual(restored.snapshot().plants[0].container, "7 L final container")
        self.assertEqual(restored.snapshot().plants[0].substrate, "All-Mix soil")
        self.assertEqual(restored.snapshot().tents[0].light_schedule, "20:00 to 14:00, 18/6")


if __name__ == "__main__":
    unittest.main()
