"""Home Assistant Store adapter for PlantRun domain state."""

from __future__ import annotations

import copy
import logging
from contextlib import nullcontext
from datetime import datetime, timezone
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, INITIAL_PHASE_NAME, STORE_KEY, STORE_SCHEMA_VERSION, STORE_VERSION
from .domain import (
    BindingDraft,
    JournalAttachmentDraft,
    JournalDraft,
    PlantRunDomain,
    RunDraft,
    StrainIdentity,
)
from .instrumentation import PlantRunInstrumentation
from .models import Binding, CultivarSnapshot, Note, Phase, RunData


_LOGGER = logging.getLogger(__name__)


def _empty_domain_state() -> dict[str, list[dict[str, Any]]]:
    return {
        "tents": [],
        "plants": [],
        "runs": [],
        "journal_entries": [],
        "sensor_bindings": [],
    }


def _empty_payload() -> dict[str, Any]:
    return {
        "schema_version": STORE_SCHEMA_VERSION,
        "domain": _empty_domain_state(),
        "legacy_v2": {"runs": [], "active_run_id": None, "daily_rollups": {}},
        "active_run_id": None,
        "daily_rollups": {},
        "compatibility_runs": [],
    }


def _aware_time(value: str | None, fallback: datetime | None = None) -> datetime:
    """Normalize legacy date strings for the timezone-aware v3 domain."""

    if value:
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            parsed = fallback or datetime.now(timezone.utc)
    else:
        parsed = fallback or datetime.now(timezone.utc)
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


class PlantRunStorage:
    """Persist the v3 domain and expose legacy RunData projections to HA sensors."""

    def __init__(
        self,
        hass: HomeAssistant,
        instrumentation: PlantRunInstrumentation | None = None,
    ) -> None:
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, STORE_VERSION, STORE_KEY)
        self._instrumentation = instrumentation
        self._data = _empty_payload()
        self.domain = PlantRunDomain()
        self.runs: list[RunData] = []

    @staticmethod
    def _migrate_v1_to_v2(payload: dict[str, Any]) -> dict[str, Any]:
        """Normalize the last public legacy payload before preserving it."""

        migrated = copy.deepcopy(payload)
        migrated.setdefault("runs", [])
        migrated.setdefault("active_run_id", None)
        migrated.setdefault("daily_rollups", {})
        normalized_runs: list[dict[str, Any]] = []
        for run in migrated.get("runs", []):
            if not isinstance(run, dict):
                continue
            item = copy.deepcopy(run)
            item.setdefault("notes", [])
            item.setdefault("phases", [])
            item.setdefault("bindings", [])
            if not item["phases"] and isinstance(item.get("start_time"), str) and item["start_time"]:
                item["phases"] = [{"name": INITIAL_PHASE_NAME, "start_time": item["start_time"]}]
            normalized_runs.append(item)
        migrated["runs"] = normalized_runs
        migrated["schema_version"] = 2
        return migrated

    @classmethod
    def _normalize_payload(cls, payload: dict[str, Any] | None) -> tuple[dict[str, Any], bool]:
        """Upgrade legacy runs into a preserved, non-visible backup bucket."""

        if payload is None:
            return _empty_payload(), True
        original = copy.deepcopy(payload)
        current = copy.deepcopy(payload)
        schema_version = current.get("schema_version")
        if not isinstance(schema_version, int):
            schema_version = 1

        if schema_version < 3:
            legacy = cls._migrate_v1_to_v2(current)
            current = _empty_payload()
            current["legacy_v2"] = {
                "runs": legacy.get("runs", []),
                "active_run_id": legacy.get("active_run_id"),
                "daily_rollups": legacy.get("daily_rollups", {}),
            }
        else:
            current.setdefault("schema_version", STORE_SCHEMA_VERSION)
            current.setdefault("domain", _empty_domain_state())
            current.setdefault(
                "legacy_v2",
                {"runs": [], "active_run_id": None, "daily_rollups": {}},
            )
            current.setdefault("active_run_id", None)
            current.setdefault("daily_rollups", {})
            current.setdefault("compatibility_runs", [])
            for key, default in _empty_domain_state().items():
                current["domain"].setdefault(key, default)
        current["schema_version"] = STORE_SCHEMA_VERSION
        return current, current != original

    async def async_load(self) -> None:
        if self._instrumentation is not None:
            self._instrumentation.incr("store.load.calls")
        timer = self._instrumentation.timer("store.load.ms") if self._instrumentation else nullcontext()
        with timer:
            raw = await self._store.async_load()
        normalized, changed = self._normalize_payload(raw)
        self.domain = PlantRunDomain.from_state(normalized["domain"])
        self._data = normalized
        self._refresh_projections()

        compatibility_runs: list[RunData] = []
        for item in normalized.get("compatibility_runs", []):
            try:
                compatibility_runs.append(RunData.from_dict(item))
            except Exception as err:
                changed = True
                _LOGGER.warning("Skipping malformed compatibility Run: %s", err)
        self.runs.extend(compatibility_runs)
        if changed:
            await self.async_save()

    def public_state(self) -> dict[str, Any]:
        state = self.domain.export_state()
        tents = state["tents"]
        return {
            "schema_version": STORE_SCHEMA_VERSION,
            **state,
            "active_tent_id": tents[0]["id"] if tents else None,
        }

    async def async_commit_domain(self, candidate: PlantRunDomain) -> None:
        """Persist a complete candidate before replacing the in-memory state."""

        next_data = copy.deepcopy(self._data)
        next_data["schema_version"] = STORE_SCHEMA_VERSION
        next_data["domain"] = candidate.export_state()
        active_ids = [run["id"] for run in next_data["domain"]["runs"] if run["status"] == "active"]
        stored_active = self._data.get("active_run_id")
        active = stored_active if stored_active in active_ids else next(iter(active_ids), None)
        next_data["active_run_id"] = active
        await self._store.async_save(next_data)
        self._data = next_data
        self.domain = candidate
        self._refresh_projections()

    def _refresh_projections(self) -> None:
        state = self.domain.export_state()
        plants = {item["id"]: item for item in state["plants"]}
        bindings = state["sensor_bindings"]
        entries = state["journal_entries"]
        projected: list[RunData] = []
        for raw in state["runs"]:
            plant = plants[raw["plant_id"]]
            cover_attachment_id = plant.get("cover_attachment_id")
            cover_image = next(
                (
                    attachment.get("url")
                    for entry in entries
                    if raw["id"] in entry.get("run_ids", [])
                    for attachment in entry.get("attachments", [])
                    if attachment.get("id") == cover_attachment_id
                ),
                None,
            )
            display_image = cover_image or plant.get("image")
            run_bindings = [
                item
                for item in bindings
                if (
                    item["owner"] == "run"
                    and item["owner_id"] == raw["id"]
                    and (raw["status"] == "archived" or item["ended_at"] is None)
                )
                or (
                    item["owner"] == "tent"
                    and item["owner_id"] == raw["tent_id"]
                    and item["ended_at"] is None
                )
            ]
            stage_history = raw["stage_history"]
            phases = []
            for index, change in enumerate(stage_history):
                end_time = (
                    stage_history[index + 1]["occurred_at"]
                    if index + 1 < len(stage_history)
                    else raw["ended_at"]
                )
                phases.append(
                    Phase(
                        id=change["id"],
                        name=change["to_stage"],
                        start_time=change["occurred_at"],
                        end_time=end_time,
                    )
                )
            strain = plant.get("strain") or {}
            duration = strain.get("duration") or {}
            minimum = duration.get("minimum_days")
            maximum = duration.get("maximum_days")
            flower_window = (
                round((minimum + maximum) / 2)
                if isinstance(minimum, int) and isinstance(maximum, int)
                else None
            )
            notes = [
                Note(
                    id=item["id"],
                    text=item["text"],
                    timestamp=item["occurred_at"],
                    attachments=copy.deepcopy(item.get("attachments", [])),
                )
                for item in entries
                if raw["id"] in item.get("run_ids", [])
            ]
            harvest = raw.get("harvest_details") or {}
            projected.append(
                RunData(
                    id=raw["id"],
                    friendly_name=raw["name"],
                    start_time=raw["planted_at"],
                    planted_date=raw["planted_at"],
                    end_time=raw["ended_at"],
                    status="ended" if raw["status"] == "archived" else "active",
                    phases=phases,
                    notes=notes,
                    bindings=[
                        Binding(
                            id=item["id"],
                            metric_type=item["metric_type"],
                            sensor_id=item["entity_id"],
                        )
                        for item in run_bindings
                    ],
                    cultivar=(
                        CultivarSnapshot(
                            name=strain.get("name"),
                            breeder=strain.get("breeder"),
                            flower_window_days=flower_window,
                            image_url=display_image,
                            detail_url=duration.get("source"),
                        )
                        if strain
                        else None
                    ),
                    dry_yield_grams=harvest.get("dry_yield_g"),
                    base_config={
                        "plant_id": plant["id"],
                        "plants": [{"id": plant["id"], "name": plant["name"]}],
                        "phase_plan": raw["stage_plan"],
                        "cover_attachment_id": cover_attachment_id,
                    },
                    image_url=display_image,
                    image_source="journal" if cover_attachment_id else "plant",
                )
            )
        self.runs = projected

    async def async_save(self) -> None:
        if self._instrumentation is not None:
            self._instrumentation.incr("store.save.calls")
        domain_ids = {run["id"] for run in self.domain.export_state()["runs"]}
        self._data["compatibility_runs"] = [
            run.to_dict() for run in self.runs if run.id not in domain_ids
        ]
        self._data["domain"] = self.domain.export_state()
        self._data["schema_version"] = STORE_SCHEMA_VERSION
        await self._store.async_save(self._data)

    @property
    def active_run_id(self) -> str | None:
        stored = self._data.get("active_run_id")
        if isinstance(stored, str) and any(
            run.id == stored and run.status == "active" for run in self.runs
        ):
            return stored
        return None

    async def async_set_active_run_id(self, run_id: str | None) -> None:
        self._data["active_run_id"] = run_id
        await self.async_save()

    def get_run(self, run_id: str) -> RunData | None:
        return next((run for run in self.runs if run.id == run_id), None)

    @property
    def daily_rollups(self) -> dict[str, dict[str, Any]]:
        value = self._data.get("daily_rollups")
        return value if isinstance(value, dict) else {}

    async def async_set_daily_rollup(self, run_id: str, day: str, summary: dict[str, Any]) -> None:
        rollups = self.daily_rollups
        rollups.setdefault(run_id, {})[day] = summary
        self._data["daily_rollups"] = rollups
        await self.async_save()

    async def async_add_run(self, run: RunData) -> None:
        candidate = PlantRunDomain.from_state(self.domain.export_state())
        planted_at = _aware_time(run.planted_date or run.start_time)
        phase_names = [phase.name for phase in run.phases if phase.name]
        configured_plan = run.base_config.get("phase_plan") if isinstance(run.base_config, dict) else None
        source_plan = configured_plan if isinstance(configured_plan, list) else phase_names
        stage_plan = tuple(dict.fromkeys(str(item).strip() for item in source_plan if str(item).strip()))
        initial_stage = phase_names[0] if phase_names else INITIAL_PHASE_NAME
        if initial_stage not in stage_plan:
            stage_plan = (initial_stage, *stage_plan)
        if not stage_plan:
            stage_plan = (initial_stage,)
        plants = run.base_config.get("plants") if isinstance(run.base_config, dict) else None
        raw_plant = plants[0] if isinstance(plants, list) and plants and isinstance(plants[0], dict) else {}
        plant_name = str(raw_plant.get("name") or run.friendly_name)
        cover_id = run.base_config.get("cover_attachment_id") if isinstance(run.base_config, dict) else None
        source_image = run.image_url if run.image_source != "journal" else None
        strain = None
        if run.cultivar and run.cultivar.name:
            strain = StrainIdentity(name=run.cultivar.name, breeder=run.cultivar.breeder)
        created = candidate.create_run(
            RunDraft(
                run_name=run.friendly_name,
                tent_name=str(run.base_config.get("tent_name") or "Growzelt"),
                plant_name=plant_name,
                planted_at=planted_at,
                stage_plan=stage_plan,
                initial_stage=initial_stage,
                strain=strain,
                image=source_image,
                sensor_bindings=tuple(
                    BindingDraft(
                        owner="run",
                        metric_type=binding.metric_type,
                        entity_id=binding.sensor_id,
                        started_at=planted_at,
                    )
                    for binding in run.bindings
                ),
            )
        )
        for phase in run.phases[1:]:
            snapshot_run = next(item for item in candidate.snapshot().runs if item.id == created.id)
            if phase.name not in snapshot_run.stage_plan:
                candidate.set_stage_plan(created.id, (*snapshot_run.stage_plan, phase.name))
            candidate.change_stage(created.id, phase.name, _aware_time(phase.start_time, planted_at))
        for note in run.notes:
            candidate.add_journal_entry(
                JournalDraft(
                    tent_id=created.tent_id,
                    run_ids=(created.id,),
                    text=note.text,
                    occurred_at=_aware_time(note.timestamp, planted_at),
                    attachments=tuple(
                        self._attachment_draft(item, planted_at)
                        for item in (note.attachments or [])
                        if hasattr(item, "url") or (isinstance(item, dict) and item.get("url"))
                    ),
                )
            )
        if isinstance(cover_id, str) and cover_id:
            candidate.set_plant_cover(created.id, cover_id)
        if run.status == "ended":
            candidate.finish_run(
                created.id,
                _aware_time(run.end_time, planted_at),
                harvest_details={
                    "dry_yield_g": run.dry_yield_grams,
                } if run.dry_yield_grams is not None else {},
            )
        await self.async_commit_domain(candidate)
        run.id = created.id

    async def async_update_run(self, updated_run: RunData) -> None:
        exported = self.domain.export_state()
        raw_run = next((item for item in exported["runs"] if item["id"] == updated_run.id), None)
        if raw_run is None:
            for index, run in enumerate(self.runs):
                if run.id == updated_run.id:
                    self.runs[index] = updated_run
                    await self.async_save()
                    return
            return

        candidate = PlantRunDomain.from_state(exported)
        snapshot = candidate.snapshot()
        domain_run = next(item for item in snapshot.runs if item.id == updated_run.id)
        domain_plant = next(item for item in snapshot.plants if item.id == domain_run.plant_id)
        plants = updated_run.base_config.get("plants") if isinstance(updated_run.base_config, dict) else None
        raw_plant = plants[0] if isinstance(plants, list) and plants and isinstance(plants[0], dict) else {}
        strain = domain_plant.strain
        if updated_run.cultivar and updated_run.cultivar.name:
            strain = StrainIdentity(
                name=updated_run.cultivar.name,
                breeder=updated_run.cultivar.breeder,
                duration=domain_plant.strain.duration if domain_plant.strain else None,
            )
        source_image = updated_run.image_url
        if domain_plant.cover_attachment_id:
            cover_url = next(
                (
                    attachment.url
                    for entry in snapshot.journal_entries
                    if updated_run.id in entry.run_ids
                    for attachment in entry.attachments
                    if attachment.id == domain_plant.cover_attachment_id
                ),
                None,
            )
            if source_image == cover_url:
                source_image = domain_plant.image
        candidate.update_run(
            updated_run.id,
            run_name=updated_run.friendly_name,
            plant_name=str(raw_plant.get("name") or domain_plant.name),
            strain=strain,
            planted_at=_aware_time(updated_run.planted_date or updated_run.start_time, domain_run.planted_at),
            image=source_image,
        )

        configured_plan = updated_run.base_config.get("phase_plan") if isinstance(updated_run.base_config, dict) else None
        if isinstance(configured_plan, list) and configured_plan:
            plan = tuple(dict.fromkeys(str(item).strip() for item in configured_plan if str(item).strip()))
            current = next(item for item in candidate.snapshot().runs if item.id == updated_run.id)
            if current.current_stage not in plan:
                plan = (*plan, current.current_stage)
            candidate.set_stage_plan(updated_run.id, plan)

        current = next(item for item in candidate.snapshot().runs if item.id == updated_run.id)
        if updated_run.phases:
            target = updated_run.phases[-1]
            if target.name != current.current_stage:
                if target.name not in current.stage_plan:
                    candidate.set_stage_plan(updated_run.id, (*current.stage_plan, target.name))
                candidate.change_stage(
                    updated_run.id,
                    target.name,
                    _aware_time(target.start_time, domain_run.planted_at),
                )

        current_entries = {
            entry.id: entry
            for entry in candidate.snapshot().journal_entries
            if updated_run.id in entry.run_ids
        }
        updated_notes = {note.id: note for note in updated_run.notes}
        for entry_id in current_entries.keys() - updated_notes.keys():
            candidate.delete_journal_entry(entry_id)
        for note in updated_run.notes:
            entry = current_entries.get(note.id)
            draft = JournalDraft(
                tent_id=domain_run.tent_id,
                run_ids=(updated_run.id,),
                entry_type=entry.entry_type if entry else None,
                text=note.text,
                occurred_at=_aware_time(note.timestamp, domain_run.planted_at),
                details=entry.details if entry else {},
                sensor_snapshot=entry.sensor_snapshot if entry else {},
                attachments=tuple(
                    self._attachment_draft(item, domain_run.planted_at)
                    for item in (note.attachments or [])
                    if (item.url if hasattr(item, "url") else item.get("url"))
                ),
            )
            if entry is None:
                candidate.add_journal_entry(draft)
            elif (
                entry.text != draft.text
                or entry.occurred_at != draft.occurred_at
                or self._attachment_signatures(entry.attachments)
                != self._attachment_signatures(draft.attachments)
            ):
                candidate.edit_journal_entry(entry.id, draft)

        all_bindings = {binding.id: binding for binding in candidate.snapshot().bindings}
        active_run_bindings = {
            binding.id: binding
            for binding in all_bindings.values()
            if binding.owner == "run" and binding.owner_id == updated_run.id and binding.ended_at is None
        }
        updated_bindings = {binding.id: binding for binding in updated_run.bindings}
        changed_at = datetime.now(timezone.utc)
        for binding_id, binding in active_run_bindings.items():
            replacement = updated_bindings.get(binding_id)
            if replacement is None or (
                replacement.metric_type != binding.metric_type
                or replacement.sensor_id != binding.entity_id
            ):
                candidate.end_sensor_binding(
                    "run",
                    updated_run.id,
                    binding.metric_type,
                    changed_at,
                )
                if replacement is not None:
                    candidate.set_sensor_binding(
                        "run",
                        updated_run.id,
                        replacement.metric_type,
                        replacement.sensor_id,
                        changed_at,
                    )
        for binding_id, binding in updated_bindings.items():
            if binding_id not in all_bindings:
                candidate.set_sensor_binding(
                    "run",
                    updated_run.id,
                    binding.metric_type,
                    binding.sensor_id,
                    changed_at,
                )

        harvest_details = dict(domain_run.harvest_details)
        if updated_run.dry_yield_grams is not None:
            harvest_details["dry_yield_g"] = updated_run.dry_yield_grams
        if updated_run.status == "ended" and domain_run.status == "active":
            candidate.finish_run(
                updated_run.id,
                _aware_time(updated_run.end_time, domain_run.planted_at),
                harvest_details=harvest_details,
            )
        elif harvest_details != dict(domain_run.harvest_details):
            candidate.update_harvest_details(updated_run.id, harvest_details)

        await self.async_commit_domain(candidate)

    @staticmethod
    def _attachment_draft(item: Any, fallback: datetime) -> JournalAttachmentDraft:
        """Convert projected or legacy attachment records for a domain update."""
        if hasattr(item, "url"):
            return JournalAttachmentDraft(
                id=item.id,
                url=item.url,
                captured_at=item.captured_at,
                kind=item.kind,
                media_type=item.media_type,
                caption=item.caption,
                source=item.source,
                source_entity_id=item.source_entity_id,
                owned_by_plantrun=item.owned_by_plantrun,
                file_name=item.file_name,
            )
        return JournalAttachmentDraft(
            id=item.get("id"),
            url=item.get("url"),
            captured_at=_aware_time(item.get("captured_at"), fallback),
            kind=item.get("kind", "photo"),
            media_type=item.get("media_type", "image/jpeg"),
            caption=item.get("caption"),
            source=item.get("source", "upload"),
            source_entity_id=item.get("source_entity_id"),
            owned_by_plantrun=item.get("owned_by_plantrun", False),
            file_name=item.get("file_name"),
        )

    @staticmethod
    def _attachment_signatures(items: Any) -> tuple[tuple[Any, ...], ...]:
        """Compare attachment metadata across domain and legacy projections."""
        if not isinstance(items, (list, tuple)):
            return ()
        signatures = []
        for item in items:
            if hasattr(item, "url"):
                signatures.append(
                    (
                        item.id,
                        item.url,
                        item.captured_at,
                        item.kind,
                        item.media_type,
                        item.caption,
                        item.source,
                        item.source_entity_id,
                        item.owned_by_plantrun,
                        item.file_name,
                    )
                )
            elif isinstance(item, dict):
                signatures.append(
                    (
                        item.get("id"),
                        item.get("url"),
                        item.get("captured_at"),
                        item.get("kind", "photo"),
                        item.get("media_type", "image/jpeg"),
                        item.get("caption"),
                        item.get("source", "upload"),
                        item.get("source_entity_id"),
                        item.get("owned_by_plantrun", False),
                        item.get("file_name"),
                    )
                )
        return tuple(signatures)
