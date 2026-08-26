"""Pure PlantRun v3 domain model.

This module owns cultivation invariants. Home Assistant transport and storage
code should cross this seam through ``PlantRunDomain`` instead of mutating the
records directly.
"""

from copy import deepcopy
from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
import json
from typing import Callable, Literal, Mapping
from uuid import uuid4


Owner = Literal["tent", "run"]
RunStatus = Literal["active", "archived"]


class _Unset:
    pass


_UNSET = _Unset()


class DomainError(ValueError):
    """Base error raised when a domain command cannot be applied."""


class ValidationError(DomainError):
    """Raised when command input violates a PlantRun invariant."""


class NotFoundError(DomainError):
    """Raised when a referenced PlantRun record does not exist."""


class ConfirmationError(DomainError):
    """Raised when permanent deletion was not confirmed exactly."""


@dataclass(frozen=True)
class SourcedDuration:
    minimum_days: int
    maximum_days: int
    meaning: str
    start_event: str
    source: str
    original_wording: str


@dataclass(frozen=True)
class StrainIdentity:
    name: str
    breeder: str | None = None
    duration: SourcedDuration | None = None


@dataclass(frozen=True)
class BindingDraft:
    owner: Owner
    metric_type: str
    entity_id: str
    started_at: datetime | None = None


@dataclass(frozen=True)
class RunDraft:
    run_name: str
    tent_name: str
    plant_name: str
    planted_at: datetime
    stage_plan: tuple[str, ...]
    initial_stage: str
    strain: StrainIdentity | None = None
    sensor_bindings: tuple[BindingDraft, ...] = ()
    nickname: str | None = None
    image: str | None = None
    container: str | None = None
    substrate: str | None = None
    light_schedule: str | None = None


@dataclass(frozen=True)
class JournalDraft:
    tent_id: str
    text: str
    occurred_at: datetime
    run_ids: tuple[str, ...] = ()
    entry_type: str | None = None
    details: Mapping[str, object] = field(default_factory=dict)
    sensor_snapshot: Mapping[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class Tent:
    id: str
    name: str
    created_at: datetime
    light_schedule: str | None = None


@dataclass(frozen=True)
class Plant:
    id: str
    tent_id: str
    name: str
    strain: StrainIdentity | None = None
    image: str | None = None
    container: str | None = None
    substrate: str | None = None


@dataclass(frozen=True)
class StageChange:
    id: str
    from_stage: str | None
    to_stage: str
    occurred_at: datetime
    created_at: datetime


@dataclass(frozen=True)
class Run:
    id: str
    name: str
    tent_id: str
    plant_id: str
    planted_at: datetime
    stage_plan: tuple[str, ...]
    current_stage: str
    stage_history: tuple[StageChange, ...]
    nickname: str | None = None
    status: RunStatus = "active"
    ended_at: datetime | None = None
    harvest_details: Mapping[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class SensorBinding:
    id: str
    owner: Owner
    owner_id: str
    metric_type: str
    entity_id: str
    started_at: datetime
    ended_at: datetime | None = None


@dataclass(frozen=True)
class JournalEntry:
    id: str
    tent_id: str
    text: str
    occurred_at: datetime
    created_at: datetime
    updated_at: datetime
    run_ids: tuple[str, ...] = ()
    entry_type: str | None = None
    details: Mapping[str, object] = field(default_factory=dict)
    sensor_snapshot: Mapping[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class DomainSnapshot:
    tents: tuple[Tent, ...]
    plants: tuple[Plant, ...]
    runs: tuple[Run, ...]
    journal_entries: tuple[JournalEntry, ...]
    bindings: tuple[SensorBinding, ...]


def _default_clock() -> datetime:
    return datetime.now(timezone.utc)


def _default_id_factory(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"


class PlantRunDomain:
    """In-memory domain model with atomic commands and immutable query results."""

    def __init__(
        self,
        *,
        clock: Callable[[], datetime] = _default_clock,
        id_factory: Callable[[str], str] = _default_id_factory,
    ) -> None:
        self._clock = clock
        self._id_factory = id_factory
        self._tents: dict[str, Tent] = {}
        self._plants: dict[str, Plant] = {}
        self._runs: dict[str, Run] = {}
        self._journal_entries: dict[str, JournalEntry] = {}
        self._bindings: dict[str, SensorBinding] = {}

    def create_run(self, draft: RunDraft) -> Run:
        """Create or reuse a Tent, then create exactly one Plant and one Run."""

        run_name = self._required_text(draft.run_name, "run_name")
        tent_name = self._required_text(draft.tent_name, "tent_name")
        plant_name = self._required_text(draft.plant_name, "plant_name")
        planted_at = self._aware_time(draft.planted_at, "planted_at")
        stage_plan = self._stage_plan(draft.stage_plan)
        initial_stage = self._required_text(draft.initial_stage, "initial_stage")
        if initial_stage not in stage_plan:
            raise ValidationError("initial_stage must appear in stage_plan")
        if any(run.name.casefold() == run_name.casefold() for run in self._runs.values()):
            raise ValidationError("run_name must be unique")
        self._validate_strain(draft.strain)
        nickname = self._optional_text(draft.nickname, "nickname")
        image_value = self._optional_text(draft.image, "image")
        container = self._optional_text(draft.container, "container")
        substrate = self._optional_text(draft.substrate, "substrate")
        light_schedule = self._optional_text(draft.light_schedule, "light_schedule")
        binding_keys: set[tuple[str, str]] = set()
        for binding in draft.sensor_bindings:
            self._validate_binding_draft(binding, planted_at)
            binding_key = (binding.owner, binding.metric_type.strip().casefold())
            if binding_key in binding_keys:
                raise ValidationError("a run draft may bind each owner metric only once")
            binding_keys.add(binding_key)

        now = self._aware_time(self._clock(), "clock")
        tent = next(
            (item for item in self._tents.values() if item.name.casefold() == tent_name.casefold()),
            None,
        )
        new_tent = tent is None
        if tent is None:
            tent = Tent(
                id=self._id_factory("tent"),
                name=tent_name,
                created_at=now,
                light_schedule=light_schedule,
            )
        elif light_schedule is not None and tent.light_schedule != light_schedule:
            tent = replace(tent, light_schedule=light_schedule)

        plant = Plant(
            id=self._id_factory("plant"),
            tent_id=tent.id,
            name=plant_name,
            strain=deepcopy(draft.strain),
            image=image_value,
            container=container,
            substrate=substrate,
        )
        first_change = StageChange(
            id=self._id_factory("stage_change"),
            from_stage=None,
            to_stage=initial_stage,
            occurred_at=planted_at,
            created_at=now,
        )
        run = Run(
            id=self._id_factory("run"),
            name=run_name,
            tent_id=tent.id,
            plant_id=plant.id,
            planted_at=planted_at,
            stage_plan=stage_plan,
            current_stage=initial_stage,
            stage_history=(first_change,),
            nickname=nickname,
        )
        bindings = []
        closed_bindings: list[SensorBinding] = []
        for item in draft.sensor_bindings:
            owner_id = tent.id if item.owner == "tent" else run.id
            started_at = item.started_at or planted_at
            active = tuple(
                binding
                for binding in self._bindings.values()
                if binding.owner == item.owner
                and binding.owner_id == owner_id
                and binding.metric_type.casefold() == item.metric_type.strip().casefold()
                and binding.ended_at is None
            )
            if len(active) > 1:
                raise ValidationError("multiple active bindings exist for one metric")
            if active and active[0].entity_id == item.entity_id.strip():
                continue
            if active:
                if active[0].started_at > started_at:
                    raise ValidationError("binding change cannot precede the active assignment")
                closed_bindings.append(replace(active[0], ended_at=started_at))
            bindings.append(
                SensorBinding(
                    id=self._id_factory("binding"),
                    owner=item.owner,
                    owner_id=owner_id,
                    metric_type=item.metric_type.strip(),
                    entity_id=item.entity_id.strip(),
                    started_at=started_at,
                )
            )

        if new_tent or self._tents.get(tent.id) != tent:
            self._tents[tent.id] = tent
        self._plants[plant.id] = plant
        self._runs[run.id] = run
        self._bindings.update({binding.id: binding for binding in closed_bindings})
        self._bindings.update({binding.id: binding for binding in bindings})
        return deepcopy(run)

    def update_run(
        self,
        run_id: str,
        *,
        run_name: str | _Unset = _UNSET,
        nickname: str | None | _Unset = _UNSET,
        plant_name: str | _Unset = _UNSET,
        strain: StrainIdentity | None | _Unset = _UNSET,
        planted_at: datetime | _Unset = _UNSET,
        image: str | None | _Unset = _UNSET,
        container: str | None | _Unset = _UNSET,
        substrate: str | None | _Unset = _UNSET,
        light_schedule: str | None | _Unset = _UNSET,
    ) -> Run:
        """Edit Run and Plant identity while retaining their stable IDs."""

        run = self._run(run_id)
        plant = self._plants[run.plant_id]
        next_run_name = run.name
        if not isinstance(run_name, _Unset):
            next_run_name = self._required_text(run_name, "run_name")
            if any(
                item.id != run.id and item.name.casefold() == next_run_name.casefold()
                for item in self._runs.values()
            ):
                raise ValidationError("run_name must be unique")
        next_nickname = run.nickname
        if not isinstance(nickname, _Unset):
            next_nickname = self._optional_text(nickname, "nickname")
        next_plant_name = plant.name
        if not isinstance(plant_name, _Unset):
            next_plant_name = self._required_text(plant_name, "plant_name")
        next_strain = plant.strain
        if not isinstance(strain, _Unset):
            self._validate_strain(strain)
            next_strain = strain
        next_image = plant.image
        if not isinstance(image, _Unset):
            next_image = self._optional_text(image, "image")
        next_container = plant.container
        if not isinstance(container, _Unset):
            next_container = self._optional_text(container, "container")
        next_substrate = plant.substrate
        if not isinstance(substrate, _Unset):
            next_substrate = self._optional_text(substrate, "substrate")
        tent = self._tents[run.tent_id]
        next_light_schedule = tent.light_schedule
        if not isinstance(light_schedule, _Unset):
            next_light_schedule = self._optional_text(light_schedule, "light_schedule")
        next_planted_at = run.planted_at
        if not isinstance(planted_at, _Unset):
            next_planted_at = self._aware_time(planted_at, "planted_at")
            if run.ended_at is not None and next_planted_at > run.ended_at:
                raise ValidationError("planted_at cannot be after ended_at")
            if any(change.occurred_at < next_planted_at for change in run.stage_history[1:]):
                raise ValidationError("planted_at cannot be after a recorded stage change")

        stage_history = run.stage_history
        if next_planted_at != run.planted_at:
            stage_history = (
                replace(stage_history[0], occurred_at=next_planted_at),
                *stage_history[1:],
            )
        updated_plant = replace(
            plant,
            name=next_plant_name,
            strain=deepcopy(next_strain),
            image=next_image,
            container=next_container,
            substrate=next_substrate,
        )
        updated_run = replace(
            run,
            name=next_run_name,
            nickname=next_nickname,
            planted_at=next_planted_at,
            stage_history=stage_history,
        )
        self._plants[plant.id] = updated_plant
        self._tents[tent.id] = replace(tent, light_schedule=next_light_schedule)
        self._runs[run.id] = updated_run
        return deepcopy(updated_run)

    def add_journal_entry(self, draft: JournalDraft) -> JournalEntry:
        """Record a Tent entry, optionally linked to one or more Runs."""

        self._validate_journal_draft(draft)
        now = self._aware_time(self._clock(), "clock")
        entry = JournalEntry(
            id=self._id_factory("journal_entry"),
            tent_id=draft.tent_id,
            run_ids=tuple(draft.run_ids),
            entry_type=draft.entry_type.strip() if draft.entry_type else None,
            text=draft.text.strip(),
            occurred_at=draft.occurred_at,
            created_at=now,
            updated_at=now,
            details=self._structured_mapping(draft.details, "journal.details"),
            sensor_snapshot=self._structured_mapping(
                draft.sensor_snapshot,
                "journal.sensor_snapshot",
            ),
        )
        self._journal_entries[entry.id] = entry
        return deepcopy(entry)

    def edit_journal_entry(self, entry_id: str, draft: JournalDraft) -> JournalEntry:
        """Replace editable entry content without losing its creation time."""

        current = self._journal_entries.get(entry_id)
        if current is None:
            raise NotFoundError("journal entry not found")
        self._validate_journal_draft(draft)
        replacement = JournalEntry(
            id=current.id,
            tent_id=draft.tent_id,
            run_ids=tuple(draft.run_ids),
            entry_type=draft.entry_type.strip() if draft.entry_type else None,
            text=draft.text.strip(),
            occurred_at=draft.occurred_at,
            created_at=current.created_at,
            updated_at=self._aware_time(self._clock(), "clock"),
            details=self._structured_mapping(draft.details, "journal.details"),
            sensor_snapshot=self._structured_mapping(
                draft.sensor_snapshot,
                "journal.sensor_snapshot",
            ),
        )
        self._journal_entries[entry_id] = replacement
        return deepcopy(replacement)

    def delete_journal_entry(self, entry_id: str) -> JournalEntry:
        """Delete one Journal Entry and return the removed record."""

        try:
            return deepcopy(self._journal_entries.pop(entry_id))
        except KeyError as err:
            raise NotFoundError("journal entry not found") from err

    def change_stage(self, run_id: str, target_stage: str, occurred_at: datetime) -> Run:
        """Switch directly to any planned Stage and append permanent history."""

        run = self._run(run_id)
        target = self._required_text(target_stage, "target_stage")
        occurred = self._aware_time(occurred_at, "occurred_at")
        if target not in run.stage_plan:
            raise ValidationError("target_stage must appear in stage_plan")
        if occurred < run.planted_at:
            raise ValidationError("stage change cannot occur before planting")
        if run.stage_history and occurred < run.stage_history[-1].occurred_at:
            raise ValidationError("stage change cannot precede the latest stage change")
        if run.ended_at is not None and occurred > run.ended_at:
            raise ValidationError("stage change cannot occur after the run ended")
        if target == run.current_stage:
            raise ValidationError("target_stage is already current")
        change = StageChange(
            id=self._id_factory("stage_change"),
            from_stage=run.current_stage,
            to_stage=target,
            occurred_at=occurred,
            created_at=self._aware_time(self._clock(), "clock"),
        )
        updated = replace(
            run,
            current_stage=target,
            stage_history=run.stage_history + (change,),
        )
        self._runs[run_id] = updated
        return deepcopy(updated)

    def set_stage_plan(self, run_id: str, stages: tuple[str, ...]) -> Run:
        """Change displayed Stage order without changing recorded history."""

        run = self._run(run_id)
        stage_plan = self._stage_plan(stages)
        if run.current_stage not in stage_plan:
            raise ValidationError("stage_plan must contain the current stage")
        updated = replace(run, stage_plan=stage_plan)
        self._runs[run_id] = updated
        return deepcopy(updated)

    def finish_run(
        self,
        run_id: str,
        ended_at: datetime,
        *,
        harvest_details: Mapping[str, object] | None = None,
    ) -> Run:
        """Move a Run to the Archive without deleting or freezing its data."""

        run = self._run(run_id)
        ended = self._aware_time(ended_at, "ended_at")
        if ended < run.planted_at:
            raise ValidationError("ended_at cannot be before planting")
        if run.stage_history and ended < run.stage_history[-1].occurred_at:
            raise ValidationError("ended_at cannot precede the latest stage change")
        active_bindings = tuple(
            binding
            for binding in self._bindings.values()
            if binding.owner == "run"
            and binding.owner_id == run.id
            and binding.ended_at is None
        )
        if any(binding.started_at > ended for binding in active_bindings):
            raise ValidationError("run cannot end before an active sensor binding starts")
        updated = replace(
            run,
            status="archived",
            ended_at=ended,
            harvest_details=self._structured_mapping(
                harvest_details or {},
                "harvest_details",
            ),
        )
        for binding in active_bindings:
            self._bindings[binding.id] = replace(binding, ended_at=ended)
        self._runs[run_id] = updated
        return deepcopy(updated)

    def update_harvest_details(
        self,
        run_id: str,
        harvest_details: Mapping[str, object],
    ) -> Run:
        """Correct harvest facts without changing archive state or its end time."""

        run = self._run(run_id)
        updated = replace(
            run,
            harvest_details=self._structured_mapping(harvest_details, "harvest_details"),
        )
        self._runs[run_id] = updated
        return deepcopy(updated)

    def set_sensor_binding(
        self,
        owner: Owner,
        owner_id: str,
        metric_type: str,
        entity_id: str,
        occurred_at: datetime,
    ) -> SensorBinding:
        """Assign a metric and close its prior active assignment at the same time."""

        if owner not in ("tent", "run"):
            raise ValidationError("binding owner must be tent or run")
        if owner == "tent" and owner_id not in self._tents:
            raise NotFoundError("tent not found")
        if owner == "run":
            if owner_id not in self._runs:
                raise NotFoundError("run not found")
            run = self._runs[owner_id]
            if run.status != "active":
                raise ValidationError("archived runs cannot receive active sensor bindings")
        metric = self._required_text(metric_type, "metric_type")
        entity = self._required_text(entity_id, "entity_id")
        occurred = self._aware_time(occurred_at, "occurred_at")
        if owner == "run" and occurred < self._runs[owner_id].planted_at:
            raise ValidationError("binding cannot start before planting")
        active = tuple(
            binding
            for binding in self._bindings.values()
            if binding.owner == owner
            and binding.owner_id == owner_id
            and binding.metric_type.casefold() == metric.casefold()
            and binding.ended_at is None
        )
        if any(binding.started_at > occurred for binding in active):
            raise ValidationError("binding change cannot precede the active assignment")

        new_binding = SensorBinding(
            id=self._id_factory("binding"),
            owner=owner,
            owner_id=owner_id,
            metric_type=metric,
            entity_id=entity,
            started_at=occurred,
        )
        for binding in active:
            self._bindings[binding.id] = replace(binding, ended_at=occurred)
        self._bindings[new_binding.id] = new_binding
        return deepcopy(new_binding)

    def end_sensor_binding(
        self,
        owner: Owner,
        owner_id: str,
        metric_type: str,
        ended_at: datetime,
    ) -> tuple[SensorBinding, ...]:
        """End the active assignment while retaining its dated history."""

        if owner not in ("tent", "run"):
            raise ValidationError("binding owner must be tent or run")
        metric = self._required_text(metric_type, "metric_type")
        ended = self._aware_time(ended_at, "ended_at")
        active = tuple(
            binding
            for binding in self._bindings.values()
            if binding.owner == owner
            and binding.owner_id == owner_id
            and binding.metric_type.casefold() == metric.casefold()
            and binding.ended_at is None
        )
        if not active:
            raise NotFoundError("active sensor binding not found")
        if any(binding.started_at > ended for binding in active):
            raise ValidationError("binding cannot end before it starts")
        closed = tuple(replace(binding, ended_at=ended) for binding in active)
        for binding in closed:
            self._bindings[binding.id] = binding
        return deepcopy(closed)

    def permanently_delete_run(self, run_id: str, confirmation_name: str) -> Run:
        """Irreversibly remove one Run after exact, case-sensitive confirmation."""

        run = self._run(run_id)
        if confirmation_name != run.name:
            raise ConfirmationError("confirmation must exactly match the run name")

        del self._runs[run.id]
        del self._plants[run.plant_id]
        self._bindings = {
            binding_id: binding
            for binding_id, binding in self._bindings.items()
            if not (binding.owner == "run" and binding.owner_id == run.id)
        }
        remaining_entries: dict[str, JournalEntry] = {}
        for entry_id, entry in self._journal_entries.items():
            if run.id not in entry.run_ids:
                remaining_entries[entry_id] = entry
                continue
            remaining_run_ids = tuple(item for item in entry.run_ids if item != run.id)
            if remaining_run_ids:
                remaining_entries[entry_id] = replace(entry, run_ids=remaining_run_ids)
        self._journal_entries = remaining_entries
        return deepcopy(run)

    def snapshot(self) -> DomainSnapshot:
        return deepcopy(
            DomainSnapshot(
                tents=tuple(self._tents.values()),
                plants=tuple(self._plants.values()),
                runs=tuple(self._runs.values()),
                journal_entries=tuple(self._journal_entries.values()),
                bindings=tuple(self._bindings.values()),
            )
        )

    def export_state(self) -> dict[str, object]:
        """Return the complete domain state as Home Assistant Store-safe data."""

        def duration_data(value: SourcedDuration | None) -> dict[str, object] | None:
            if value is None:
                return None
            return {
                "minimum_days": value.minimum_days,
                "maximum_days": value.maximum_days,
                "meaning": value.meaning,
                "start_event": value.start_event,
                "source": value.source,
                "original_wording": value.original_wording,
            }

        def strain_data(value: StrainIdentity | None) -> dict[str, object] | None:
            if value is None:
                return None
            return {
                "name": value.name,
                "breeder": value.breeder,
                "duration": duration_data(value.duration),
            }

        state: dict[str, object] = {
            "tents": [
                {
                    "id": item.id,
                    "name": item.name,
                    "created_at": item.created_at.isoformat(),
                    "light_schedule": item.light_schedule,
                }
                for item in self._tents.values()
            ],
            "plants": [
                {
                    "id": item.id,
                    "tent_id": item.tent_id,
                    "name": item.name,
                    "strain": strain_data(item.strain),
                    "image": item.image,
                    "container": item.container,
                    "substrate": item.substrate,
                }
                for item in self._plants.values()
            ],
            "runs": [
                {
                    "id": item.id,
                    "name": item.name,
                    "nickname": item.nickname,
                    "tent_id": item.tent_id,
                    "plant_id": item.plant_id,
                    "planted_at": item.planted_at.isoformat(),
                    "stage_plan": list(item.stage_plan),
                    "current_stage": item.current_stage,
                    "stage_history": [
                        {
                            "id": change.id,
                            "from_stage": change.from_stage,
                            "to_stage": change.to_stage,
                            "occurred_at": change.occurred_at.isoformat(),
                            "created_at": change.created_at.isoformat(),
                        }
                        for change in item.stage_history
                    ],
                    "status": item.status,
                    "ended_at": item.ended_at.isoformat() if item.ended_at else None,
                    "harvest_details": deepcopy(dict(item.harvest_details)),
                }
                for item in self._runs.values()
            ],
            "journal_entries": [
                {
                    "id": item.id,
                    "tent_id": item.tent_id,
                    "run_ids": list(item.run_ids),
                    "entry_type": item.entry_type,
                    "text": item.text,
                    "occurred_at": item.occurred_at.isoformat(),
                    "created_at": item.created_at.isoformat(),
                    "updated_at": item.updated_at.isoformat(),
                    "details": deepcopy(dict(item.details)),
                    "sensor_snapshot": deepcopy(dict(item.sensor_snapshot)),
                }
                for item in self._journal_entries.values()
            ],
            "sensor_bindings": [
                {
                    "id": item.id,
                    "owner": item.owner,
                    "owner_id": item.owner_id,
                    "metric_type": item.metric_type,
                    "entity_id": item.entity_id,
                    "started_at": item.started_at.isoformat(),
                    "ended_at": item.ended_at.isoformat() if item.ended_at else None,
                }
                for item in self._bindings.values()
            ],
        }
        json.dumps(state)
        return state

    @classmethod
    def from_state(
        cls,
        state: Mapping[str, object],
        *,
        clock: Callable[[], datetime] = _default_clock,
        id_factory: Callable[[str], str] = _default_id_factory,
    ) -> "PlantRunDomain":
        """Restore exported state and reject broken cross-record references."""

        domain = cls(clock=clock, id_factory=id_factory)

        def records(key: str) -> list[Mapping[str, object]]:
            value = state.get(key)
            if not isinstance(value, list) or not all(isinstance(item, Mapping) for item in value):
                raise ValidationError(f"{key} must be a list of records")
            return value

        def text_value(raw: Mapping[str, object], key: str) -> str:
            return domain._required_text(raw.get(key), key)  # type: ignore[arg-type]

        def optional_text(raw: Mapping[str, object], key: str) -> str | None:
            value = raw.get(key)
            if value is None:
                return None
            return domain._required_text(value, key)  # type: ignore[arg-type]

        def time_value(raw: Mapping[str, object], key: str) -> datetime:
            value = raw.get(key)
            if not isinstance(value, str):
                raise ValidationError(f"{key} must be an ISO timestamp")
            try:
                parsed = datetime.fromisoformat(value)
            except ValueError as err:
                raise ValidationError(f"{key} must be an ISO timestamp") from err
            return domain._aware_time(parsed, key)

        def optional_time(raw: Mapping[str, object], key: str) -> datetime | None:
            if raw.get(key) is None:
                return None
            return time_value(raw, key)

        def mapping_value(raw: Mapping[str, object], key: str) -> dict[str, object]:
            value = raw.get(key, {})
            return domain._structured_mapping(value, key)

        def strain_value(raw: object) -> StrainIdentity | None:
            if raw is None:
                return None
            if not isinstance(raw, Mapping):
                raise ValidationError("strain must be a record")
            duration_raw = raw.get("duration")
            duration = None
            if duration_raw is not None:
                if not isinstance(duration_raw, Mapping):
                    raise ValidationError("strain.duration must be a record")
                minimum = duration_raw.get("minimum_days")
                maximum = duration_raw.get("maximum_days")
                if not isinstance(minimum, int) or not isinstance(maximum, int):
                    raise ValidationError("duration days must be integers")
                duration = SourcedDuration(
                    minimum_days=minimum,
                    maximum_days=maximum,
                    meaning=text_value(duration_raw, "meaning"),
                    start_event=text_value(duration_raw, "start_event"),
                    source=text_value(duration_raw, "source"),
                    original_wording=text_value(duration_raw, "original_wording"),
                )
            strain = StrainIdentity(
                name=text_value(raw, "name"),
                breeder=optional_text(raw, "breeder"),
                duration=duration,
            )
            domain._validate_strain(strain)
            return strain

        def put_unique(target: dict[str, object], record_id: str, value: object) -> None:
            if record_id in target:
                raise ValidationError(f"duplicate id: {record_id}")
            target[record_id] = value

        for raw in records("tents"):
            tent = Tent(
                id=text_value(raw, "id"),
                name=text_value(raw, "name"),
                created_at=time_value(raw, "created_at"),
                light_schedule=optional_text(raw, "light_schedule"),
            )
            put_unique(domain._tents, tent.id, tent)

        for raw in records("plants"):
            plant = Plant(
                id=text_value(raw, "id"),
                tent_id=text_value(raw, "tent_id"),
                name=text_value(raw, "name"),
                strain=strain_value(raw.get("strain")),
                image=optional_text(raw, "image"),
                container=optional_text(raw, "container"),
                substrate=optional_text(raw, "substrate"),
            )
            if plant.tent_id not in domain._tents:
                raise ValidationError("plant references an unknown tent")
            put_unique(domain._plants, plant.id, plant)

        for raw in records("runs"):
            plan_raw = raw.get("stage_plan")
            if not isinstance(plan_raw, list):
                raise ValidationError("stage_plan must be a list")
            stage_plan = domain._stage_plan(tuple(plan_raw))  # type: ignore[arg-type]
            history_raw = raw.get("stage_history")
            if not isinstance(history_raw, list) or not history_raw:
                raise ValidationError("stage_history must be a non-empty list")
            history: list[StageChange] = []
            for change_raw in history_raw:
                if not isinstance(change_raw, Mapping):
                    raise ValidationError("stage_history contains an invalid record")
                history.append(
                    StageChange(
                        id=text_value(change_raw, "id"),
                        from_stage=optional_text(change_raw, "from_stage"),
                        to_stage=text_value(change_raw, "to_stage"),
                        occurred_at=time_value(change_raw, "occurred_at"),
                        created_at=time_value(change_raw, "created_at"),
                    )
                )
            if history[0].from_stage is not None:
                raise ValidationError("initial stage history must start from no stage")
            if any(current.from_stage != previous.to_stage for previous, current in zip(history, history[1:])):
                raise ValidationError("stage history chain is broken")
            current_stage = text_value(raw, "current_stage")
            if current_stage not in stage_plan or history[-1].to_stage != current_stage:
                raise ValidationError("current stage does not match plan and history")
            status = raw.get("status")
            if status not in ("active", "archived"):
                raise ValidationError("run status must be active or archived")
            ended_at = optional_time(raw, "ended_at")
            if (status == "archived") != (ended_at is not None):
                raise ValidationError("archived runs require ended_at and active runs forbid it")
            run = Run(
                id=text_value(raw, "id"),
                name=text_value(raw, "name"),
                nickname=optional_text(raw, "nickname"),
                tent_id=text_value(raw, "tent_id"),
                plant_id=text_value(raw, "plant_id"),
                planted_at=time_value(raw, "planted_at"),
                stage_plan=stage_plan,
                current_stage=current_stage,
                stage_history=tuple(history),
                status=status,
                ended_at=ended_at,
                harvest_details=mapping_value(raw, "harvest_details"),
            )
            plant = domain._plants.get(run.plant_id)
            if run.tent_id not in domain._tents or plant is None or plant.tent_id != run.tent_id:
                raise ValidationError("run references an unknown plant or tent")
            if run.ended_at is not None and run.ended_at < run.planted_at:
                raise ValidationError("run ends before planting")
            put_unique(domain._runs, run.id, run)

        run_plant_ids = [run.plant_id for run in domain._runs.values()]
        if len(set(run_plant_ids)) != len(run_plant_ids):
            raise ValidationError("a plant cannot belong to more than one run")
        if set(run_plant_ids) != set(domain._plants):
            raise ValidationError("every plant must belong to exactly one run")

        for raw in records("journal_entries"):
            run_ids_raw = raw.get("run_ids", [])
            if not isinstance(run_ids_raw, list) or not all(isinstance(item, str) for item in run_ids_raw):
                raise ValidationError("journal run_ids must be a list of ids")
            entry = JournalEntry(
                id=text_value(raw, "id"),
                tent_id=text_value(raw, "tent_id"),
                run_ids=tuple(run_ids_raw),
                entry_type=optional_text(raw, "entry_type"),
                text=text_value(raw, "text"),
                occurred_at=time_value(raw, "occurred_at"),
                created_at=time_value(raw, "created_at"),
                updated_at=time_value(raw, "updated_at"),
                details=mapping_value(raw, "details"),
                sensor_snapshot=mapping_value(raw, "sensor_snapshot"),
            )
            domain._validate_journal_draft(
                JournalDraft(
                    tent_id=entry.tent_id,
                    run_ids=entry.run_ids,
                    entry_type=entry.entry_type,
                    text=entry.text,
                    occurred_at=entry.occurred_at,
                    details=entry.details,
                    sensor_snapshot=entry.sensor_snapshot,
                )
            )
            put_unique(domain._journal_entries, entry.id, entry)

        active_binding_keys: set[tuple[str, str, str]] = set()
        for raw in records("sensor_bindings"):
            owner = raw.get("owner")
            if owner not in ("tent", "run"):
                raise ValidationError("binding owner must be tent or run")
            binding = SensorBinding(
                id=text_value(raw, "id"),
                owner=owner,
                owner_id=text_value(raw, "owner_id"),
                metric_type=text_value(raw, "metric_type"),
                entity_id=text_value(raw, "entity_id"),
                started_at=time_value(raw, "started_at"),
                ended_at=optional_time(raw, "ended_at"),
            )
            owners = domain._tents if owner == "tent" else domain._runs
            if binding.owner_id not in owners:
                raise ValidationError("binding references an unknown owner")
            if binding.ended_at is not None and binding.ended_at < binding.started_at:
                raise ValidationError("binding ends before it starts")
            active_key = (binding.owner, binding.owner_id, binding.metric_type.casefold())
            if binding.ended_at is None:
                if active_key in active_binding_keys:
                    raise ValidationError("multiple active bindings exist for one metric")
                active_binding_keys.add(active_key)
            put_unique(domain._bindings, binding.id, binding)

        return domain

    def _run(self, run_id: str) -> Run:
        try:
            return self._runs[run_id]
        except KeyError as err:
            raise NotFoundError("run not found") from err

    @staticmethod
    def _required_text(value: str, field_name: str) -> str:
        if not isinstance(value, str) or not value.strip():
            raise ValidationError(f"{field_name} must not be empty")
        return value.strip()

    @classmethod
    def _optional_text(cls, value: str | None, field_name: str) -> str | None:
        if value is None:
            return None
        return cls._required_text(value, field_name)

    @staticmethod
    def _structured_mapping(value: object, field_name: str) -> dict[str, object]:
        if not isinstance(value, Mapping) or not all(isinstance(key, str) for key in value):
            raise ValidationError(f"{field_name} must be a string-keyed record")
        result = deepcopy(dict(value))
        try:
            json.dumps(result)
        except (TypeError, ValueError) as err:
            raise ValidationError(f"{field_name} must contain JSON-safe values") from err
        return result

    @classmethod
    def _stage_plan(cls, values: tuple[str, ...]) -> tuple[str, ...]:
        result = tuple(cls._required_text(item, "stage") for item in values)
        if not result:
            raise ValidationError("stage_plan must contain at least one stage")
        if len({item.casefold() for item in result}) != len(result):
            raise ValidationError("stage_plan stages must be unique")
        return result

    @staticmethod
    def _aware_time(value: datetime, field_name: str) -> datetime:
        if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
            raise ValidationError(f"{field_name} must be timezone-aware")
        return value

    @classmethod
    def _validate_strain(cls, strain: StrainIdentity | None) -> None:
        if strain is None:
            return
        cls._required_text(strain.name, "strain.name")
        if strain.breeder is not None:
            cls._required_text(strain.breeder, "strain.breeder")
        if strain.duration is None:
            return
        duration = strain.duration
        if duration.minimum_days <= 0 or duration.maximum_days < duration.minimum_days:
            raise ValidationError("duration must be a positive ordered range")
        for field_name in ("meaning", "start_event", "source", "original_wording"):
            cls._required_text(getattr(duration, field_name), f"duration.{field_name}")

    @classmethod
    def _validate_binding_draft(cls, binding: BindingDraft, default_start: datetime) -> None:
        if binding.owner not in ("tent", "run"):
            raise ValidationError("binding owner must be tent or run")
        cls._required_text(binding.metric_type, "binding.metric_type")
        cls._required_text(binding.entity_id, "binding.entity_id")
        cls._aware_time(binding.started_at or default_start, "binding.started_at")

    def _validate_journal_draft(self, draft: JournalDraft) -> None:
        if draft.tent_id not in self._tents:
            raise NotFoundError("tent not found")
        self._required_text(draft.text, "journal.text")
        self._aware_time(draft.occurred_at, "journal.occurred_at")
        if draft.entry_type is not None:
            self._required_text(draft.entry_type, "journal.entry_type")
        if len(set(draft.run_ids)) != len(draft.run_ids):
            raise ValidationError("journal run_ids must be unique")
        for run_id in draft.run_ids:
            run = self._runs.get(run_id)
            if run is None:
                raise NotFoundError("run not found")
            if run.tent_id != draft.tent_id:
                raise ValidationError("journal runs must belong to its tent")
