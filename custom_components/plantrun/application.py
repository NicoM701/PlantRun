"""Atomic command interface for PlantRun's Home Assistant adapter."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Mapping, Protocol

from .domain import (
    BindingDraft,
    JournalAttachmentDraft,
    JournalDraft,
    PlantRunDomain,
    RunDraft,
    SourcedDuration,
    StrainIdentity,
)


SCHEMA_VERSION = 3
_MANIFEST_VERSION = json.loads(
    (Path(__file__).parent / "manifest.json").read_text(encoding="utf-8")
)["version"]
DEFAULT_STAGE_PLAN = (
    "Germination",
    "Seedling",
    "Vegetative",
    "Flowering",
    "Harvested",
)


class CommandError(ValueError):
    """Raised when the transport sends an unsupported or malformed command."""


class DomainStorage(Protocol):
    """Persistence seam required by PlantRunApplication."""

    domain: PlantRunDomain

    async def async_commit_domain(self, candidate: PlantRunDomain) -> None:
        """Persist and then publish a complete candidate state."""


def _iso_time(value: Any, field_name: str) -> datetime:
    if not isinstance(value, str) or not value.strip():
        raise CommandError(f"{field_name} must be an ISO timestamp")
    normalized = value.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as err:
        raise CommandError(f"{field_name} must be an ISO timestamp") from err
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise CommandError(f"{field_name} must include a timezone")
    return parsed


def _mapping(value: Any, field_name: str) -> dict[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, Mapping):
        raise CommandError(f"{field_name} must be an object")
    return dict(value)


def _text(value: Any, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise CommandError(f"{field_name} must not be empty")
    return value.strip()


def _optional_text(value: Any) -> str | None:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _integer(value: Any, field_name: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as err:
        raise CommandError(f"{field_name} must be an integer") from err


class PlantRunApplication:
    """Execute complete domain commands and commit each result once."""

    def __init__(self, storage: DomainStorage) -> None:
        self._storage = storage
        self._command_lock = asyncio.Lock()

    def state(self) -> dict[str, Any]:
        """Return the complete frontend state without leaking mutable records."""

        state = self._storage.domain.export_state()
        tents = state.get("tents", [])
        return {
            "schema_version": SCHEMA_VERSION,
            "version": _MANIFEST_VERSION,
            **state,
            "active_tent_id": tents[0]["id"] if tents else None,
        }

    async def execute(self, command: str, payload: Mapping[str, Any] | None) -> dict[str, Any]:
        """Apply one command to a clone, persist it, then expose it as live state."""

        _before, state = await self.execute_with_previous(command, payload)
        return state

    async def execute_with_previous(
        self,
        command: str,
        payload: Mapping[str, Any] | None,
    ) -> tuple[dict[str, Any], dict[str, Any]]:
        """Execute a command and return the committed state plus its predecessor."""

        if not isinstance(command, str) or not command.strip():
            raise CommandError("command must not be empty")
        if payload is None:
            payload = {}
        if not isinstance(payload, Mapping):
            raise CommandError("payload must be an object")

        async with self._command_lock:
            before = self.state()
            candidate = PlantRunDomain.from_state(self._storage.domain.export_state())
            handler = getattr(self, f"_command_{command.strip()}", None)
            if handler is None:
                raise CommandError(f"Unsupported command: {command}")
            handler(candidate, dict(payload))
            await self._storage.async_commit_domain(candidate)
            return before, self.state()

    def _command_create_run(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        raw_duration = _mapping(payload.get("duration"), "duration")
        duration = None
        minimum = raw_duration.get("minimum_days", raw_duration.get("min_days"))
        maximum = raw_duration.get("maximum_days", raw_duration.get("max_days"))
        duration_fields = (
            minimum,
            maximum,
            raw_duration.get("meaning"),
            raw_duration.get("start_event"),
            raw_duration.get("source"),
            raw_duration.get("original_wording", raw_duration.get("original_text")),
        )
        if any(value not in (None, "") for value in duration_fields):
            if not all(value not in (None, "") for value in duration_fields):
                raise CommandError("duration must include its range, meaning, start event, source, and wording")
            duration = SourcedDuration(
                minimum_days=_integer(minimum, "duration.minimum_days"),
                maximum_days=_integer(maximum, "duration.maximum_days"),
                meaning=str(duration_fields[2]),
                start_event=str(duration_fields[3]),
                source=str(duration_fields[4]),
                original_wording=str(duration_fields[5]),
            )

        strain_name = _optional_text(payload.get("strain"))
        strain = (
            StrainIdentity(
                name=strain_name,
                breeder=_optional_text(payload.get("breeder")),
                duration=duration,
            )
            if strain_name
            else None
        )
        raw_bindings = payload.get("sensor_bindings", payload.get("bindings", [])) or []
        if not isinstance(raw_bindings, list):
            raise CommandError("bindings must be a list")
        planted_at = _iso_time(payload.get("planted_at"), "planted_at")
        bindings: list[BindingDraft] = []
        for raw in raw_bindings:
            item = _mapping(raw, "binding")
            owner = str(item.get("owner", item.get("owner_type", "run")))
            if owner == "plant":
                owner = "run"
            bindings.append(
                BindingDraft(
                    owner=owner,
                    metric_type=_text(item.get("metric_type"), "binding.metric_type"),
                    entity_id=_text(
                        item.get("entity_id", item.get("sensor_id")),
                        "binding.entity_id",
                    ),
                    started_at=(
                        _iso_time(item.get("started_at"), "binding.started_at")
                        if item.get("started_at")
                        else planted_at
                    ),
                )
            )
        raw_plan = payload.get("stage_plan") or DEFAULT_STAGE_PLAN
        if not isinstance(raw_plan, (list, tuple)):
            raise CommandError("stage_plan must be a list")
        cultivar = _mapping(payload.get("cultivar"), "cultivar")
        domain.create_run(
            RunDraft(
                run_name=_text(
                    payload.get("run_name", payload.get("friendly_name")),
                    "run_name",
                ),
                tent_name=_text(payload.get("tent_name", "Growzelt"), "tent_name"),
                plant_name=_text(payload.get("plant_name"), "plant_name"),
                planted_at=planted_at,
                stage_plan=tuple(str(stage) for stage in raw_plan),
                initial_stage=_text(payload.get("initial_stage", "Germination"), "initial_stage"),
                strain=strain,
                sensor_bindings=tuple(bindings),
                nickname=_optional_text(payload.get("nickname")),
                image=_optional_text(
                    payload.get("image")
                    or payload.get("image_url")
                    or cultivar.get("image_url")
                ),
                container=_optional_text(payload.get("container")),
                substrate=_optional_text(payload.get("substrate", payload.get("medium"))),
                light_schedule=_optional_text(payload.get("light_schedule")),
            )
        )

    def _journal_attachments(self, payload: dict[str, Any]) -> tuple[JournalAttachmentDraft, ...]:
        raw_attachments = payload.get("attachments", [])
        if not isinstance(raw_attachments, list):
            raise CommandError("attachments must be a list")
        attachments: list[JournalAttachmentDraft] = []
        for raw in raw_attachments:
            item = _mapping(raw, "attachment")
            attachment_id = _optional_text(item.get("id"))
            captured_at = _iso_time(item.get("captured_at"), "attachment.captured_at")
            owned = item.get("owned_by_plantrun", False)
            if not isinstance(owned, bool):
                raise CommandError("attachment.owned_by_plantrun must be a boolean")
            attachments.append(
                JournalAttachmentDraft(
                    id=attachment_id,
                    url=_text(item.get("url"), "attachment.url"),
                    captured_at=captured_at,
                    kind=_optional_text(item.get("kind")) or "photo",
                    media_type=_optional_text(item.get("media_type")) or "image/jpeg",
                    caption=_optional_text(item.get("caption")),
                    source=_optional_text(item.get("source")) or "upload",
                    source_entity_id=_optional_text(item.get("source_entity_id")),
                    owned_by_plantrun=owned,
                    file_name=_optional_text(item.get("file_name")),
                )
            )
        return tuple(attachments)

    def _journal_draft(
        self,
        payload: dict[str, Any],
        *,
        attachments: tuple[JournalAttachmentDraft, ...] | None = None,
    ) -> JournalDraft:
        run_ids = payload.get("run_ids", []) or []
        if not isinstance(run_ids, (list, tuple)):
            raise CommandError("run_ids must be a list")
        return JournalDraft(
            tent_id=_text(payload.get("tent_id"), "tent_id"),
            run_ids=tuple(str(run_id) for run_id in run_ids),
            entry_type=_optional_text(payload.get("entry_type")),
            text=_text(payload.get("text"), "text"),
            occurred_at=_iso_time(payload.get("occurred_at"), "occurred_at"),
            details=_mapping(payload.get("details"), "details"),
            sensor_snapshot=_mapping(payload.get("sensor_snapshot"), "sensor_snapshot"),
            attachments=self._journal_attachments(payload) if attachments is None else attachments,
        )

    def _command_create_journal_entry(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        domain.add_journal_entry(self._journal_draft(payload))

    def _command_update_journal_entry(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        attachments: tuple[JournalAttachmentDraft, ...] | None = None
        if "attachments" not in payload:
            entry_id = _text(payload.get("entry_id"), "entry_id")
            current = next(
                (entry for entry in domain.snapshot().journal_entries if entry.id == entry_id),
                None,
            )
            if current is None:
                raise CommandError("entry_id references an unknown Journal Entry")
            attachments = tuple(
                JournalAttachmentDraft(
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
                for item in current.attachments
            )
        domain.edit_journal_entry(
            _text(payload.get("entry_id"), "entry_id"),
            self._journal_draft(payload, attachments=attachments),
        )

    def _command_delete_journal_entry(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        domain.delete_journal_entry(_text(payload.get("entry_id"), "entry_id"))

    def _command_set_plant_cover(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        domain.set_plant_cover(
            _text(payload.get("run_id"), "run_id"),
            _optional_text(payload.get("attachment_id")),
        )

    def _command_change_stage(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        domain.change_stage(
            _text(payload.get("run_id"), "run_id"),
            _text(payload.get("target_stage", payload.get("stage")), "target_stage"),
            _iso_time(payload.get("occurred_at"), "occurred_at"),
        )

    def _command_set_stage_plan(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        stages = payload.get("stage_plan")
        if not isinstance(stages, (list, tuple)):
            raise CommandError("stage_plan must be a list")
        domain.set_stage_plan(
            _text(payload.get("run_id"), "run_id"),
            tuple(str(stage) for stage in stages),
        )

    def _command_archive_run(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        domain.finish_run(
            _text(payload.get("run_id"), "run_id"),
            _iso_time(payload.get("occurred_at", payload.get("ended_at")), "occurred_at"),
            harvest_details=_mapping(payload.get("harvest_details"), "harvest_details"),
        )

    def _command_delete_run(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        domain.permanently_delete_run(
            _text(payload.get("run_id"), "run_id"),
            _text(payload.get("confirmation_name"), "confirmation_name"),
        )

    def _command_set_binding(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        owner = str(payload.get("owner", payload.get("owner_type", "run")))
        if owner == "plant":
            owner = "run"
        domain.set_sensor_binding(
            owner,
            _text(payload.get("owner_id", payload.get("run_id")), "owner_id"),
            _text(payload.get("metric_type"), "metric_type"),
            _text(payload.get("entity_id", payload.get("sensor_id")), "entity_id"),
            _iso_time(payload.get("occurred_at", payload.get("started_at")), "occurred_at"),
        )

    def _command_clear_binding(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        owner = str(payload.get("owner", payload.get("owner_type", "run")))
        if owner == "plant":
            owner = "run"
        domain.end_sensor_binding(
            owner,
            _text(payload.get("owner_id", payload.get("run_id")), "owner_id"),
            _text(payload.get("metric_type"), "metric_type"),
            _iso_time(payload.get("occurred_at", payload.get("ended_at")), "occurred_at"),
        )

    def _command_update_run(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        kwargs: dict[str, Any] = {}
        if "run_name" in payload or "friendly_name" in payload:
            kwargs["run_name"] = payload.get("run_name", payload.get("friendly_name"))
        for field_name in ("nickname", "plant_name", "image", "container", "substrate", "light_schedule"):
            if field_name in payload:
                kwargs[field_name] = payload[field_name]
        if "planted_at" in payload:
            kwargs["planted_at"] = _iso_time(payload["planted_at"], "planted_at")
        if "strain" in payload or "breeder" in payload or "duration" in payload:
            duration_payload = _mapping(payload.get("duration"), "duration")
            duration = None
            if duration_payload:
                duration = SourcedDuration(
                    minimum_days=_integer(
                        duration_payload.get("minimum_days", duration_payload.get("min_days")),
                        "duration.minimum_days",
                    ),
                    maximum_days=_integer(
                        duration_payload.get("maximum_days", duration_payload.get("max_days")),
                        "duration.maximum_days",
                    ),
                    meaning=_text(duration_payload.get("meaning"), "duration.meaning"),
                    start_event=_text(duration_payload.get("start_event"), "duration.start_event"),
                    source=_text(duration_payload.get("source"), "duration.source"),
                    original_wording=_text(
                        duration_payload.get("original_wording", duration_payload.get("original_text")),
                        "duration.original_wording",
                    ),
                )
            strain_name = _optional_text(payload.get("strain"))
            kwargs["strain"] = (
                StrainIdentity(
                    name=strain_name,
                    breeder=_optional_text(payload.get("breeder")),
                    duration=duration,
                )
                if strain_name
                else None
            )
        domain.update_run(_text(payload.get("run_id"), "run_id"), **kwargs)

    def _command_import_bundle(self, domain: PlantRunDomain, payload: dict[str, Any]) -> None:
        """Import a small external ledger once without duplicating retry results."""

        tent_name = _text(payload.get("tent_name", "Growzelt"), "tent_name")
        raw_runs = payload.get("runs", [])
        raw_entries = payload.get("journal_entries", [])
        if not isinstance(raw_runs, list) or not isinstance(raw_entries, list):
            raise CommandError("import runs and journal_entries must be lists")

        for raw in raw_runs:
            run_payload = _mapping(raw, "run")
            run_payload["tent_name"] = tent_name
            run_name = _text(run_payload.get("run_name"), "run_name")
            snapshot = domain.snapshot()
            existing = next((run for run in snapshot.runs if run.name == run_name), None)
            if existing is None:
                self._command_create_run(domain, run_payload)
                continue

            plant = next(item for item in snapshot.plants if item.id == existing.plant_id)
            tent = next(item for item in snapshot.tents if item.id == existing.tent_id)
            expected_time = _iso_time(run_payload.get("planted_at"), "planted_at")
            raw_stage_plan = run_payload.get("stage_plan") or DEFAULT_STAGE_PLAN
            if not isinstance(raw_stage_plan, (list, tuple)):
                raise CommandError("stage_plan must be a list")
            expected_stage_plan = tuple(str(stage) for stage in raw_stage_plan)
            expected_strain = _optional_text(run_payload.get("strain"))
            existing_strain = plant.strain
            raw_duration = _mapping(run_payload.get("duration"), "duration")
            expected_duration = None
            if raw_duration:
                expected_duration = SourcedDuration(
                    minimum_days=_integer(
                        raw_duration.get("minimum_days", raw_duration.get("min_days")),
                        "duration.minimum_days",
                    ),
                    maximum_days=_integer(
                        raw_duration.get("maximum_days", raw_duration.get("max_days")),
                        "duration.maximum_days",
                    ),
                    meaning=_text(raw_duration.get("meaning"), "duration.meaning"),
                    start_event=_text(raw_duration.get("start_event"), "duration.start_event"),
                    source=_text(raw_duration.get("source"), "duration.source"),
                    original_wording=_text(
                        raw_duration.get("original_wording", raw_duration.get("original_text")),
                        "duration.original_wording",
                    ),
                )
            if (
                tent.name != tent_name
                or plant.name != _text(run_payload.get("plant_name"), "plant_name")
                or existing.planted_at != expected_time
                or existing.stage_plan != expected_stage_plan
                or existing.current_stage != _text(
                    run_payload.get("initial_stage", expected_stage_plan[0]),
                    "initial_stage",
                )
                or (existing_strain.name if existing_strain else None) != expected_strain
                or (existing_strain.breeder if existing_strain else None)
                != _optional_text(run_payload.get("breeder"))
                or (existing_strain.duration if existing_strain else None) != expected_duration
                or plant.container != _optional_text(run_payload.get("container"))
                or plant.substrate != _optional_text(run_payload.get("substrate"))
                or tent.light_schedule != _optional_text(run_payload.get("light_schedule"))
            ):
                raise CommandError(f"import collision for Run '{run_name}'")

        snapshot = domain.snapshot()
        tent = next((item for item in snapshot.tents if item.name == tent_name), None)
        if tent is None and raw_entries:
            raise CommandError("import bundle has Journal Entries but no Tent")
        runs_by_name = {run.name: run for run in snapshot.runs}

        for raw in raw_entries:
            entry_payload = _mapping(raw, "journal_entry")
            run_name = _optional_text(entry_payload.pop("run_name", None))
            if run_name:
                run = runs_by_name.get(run_name)
                if run is None:
                    raise CommandError(f"Journal Entry references unknown Run '{run_name}'")
                run_ids = [run.id]
            else:
                run_ids = []
            occurred_at = _iso_time(entry_payload.get("occurred_at"), "occurred_at")
            entry_type = _optional_text(entry_payload.get("entry_type"))
            text = _text(entry_payload.get("text"), "text")
            duplicate = next(
                (
                    item
                    for item in domain.snapshot().journal_entries
                    if item.tent_id == tent.id
                    and item.run_ids == tuple(run_ids)
                    and item.entry_type == entry_type
                    and item.text == text
                    and item.occurred_at == occurred_at
                ),
                None,
            )
            if duplicate is not None:
                continue
            domain.add_journal_entry(
                JournalDraft(
                    tent_id=tent.id,
                    run_ids=tuple(run_ids),
                    entry_type=entry_type,
                    text=text,
                    occurred_at=occurred_at,
                    details=_mapping(entry_payload.get("details"), "details"),
                    sensor_snapshot=_mapping(
                        entry_payload.get("sensor_snapshot"),
                        "sensor_snapshot",
                    ),
                )
            )
