"""Domain manager for PlantRun business logic."""

from __future__ import annotations

import logging
import re
import uuid
from collections.abc import Mapping
from copy import deepcopy
from datetime import UTC, datetime
from typing import Any

from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import BINDABLE_SENSOR_KEYS, PHASES, PHASE_GROWTH, SIGNAL_DATA_UPDATED
from .storage import PlantRunStorage

_LOGGER = logging.getLogger(__name__)


def _default_bindings() -> dict[str, str | None]:
    return {key: None for key in BINDABLE_SENSOR_KEYS}


def _norm(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-") or "run"


def _parse_iso(value: str | None) -> str:
    if not value:
        return datetime.now(UTC).isoformat()
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)
        return parsed.astimezone(UTC).isoformat()
    except ValueError as exc:
        raise HomeAssistantError(
            f"Invalid datetime '{value}'. Use ISO format, e.g. 2026-02-22T12:00:00+00:00"
        ) from exc


def _to_utc_datetime(value: str | None) -> datetime:
    if not value:
        return datetime.min.replace(tzinfo=UTC)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


class PlantRunManager:
    """Owns run lifecycle operations and persistence."""

    def __init__(self, storage: PlantRunStorage) -> None:
        self.storage = storage

    @property
    def data(self) -> dict[str, Any]:
        return self.storage.data

    def list_runs(self) -> list[dict[str, Any]]:
        runs = list(self.data.get("runs", {}).values())
        runs.sort(key=lambda x: _to_utc_datetime(x.get("started_at")), reverse=True)
        return runs

    def get_run_or_raise(self, run_id: str) -> dict[str, Any]:
        run = self.data.get("runs", {}).get(run_id)
        if not run:
            raise HomeAssistantError(f"Unknown run_id: {run_id}")
        return run

    def resolve_run_or_raise(
        self,
        run_id: str | None = None,
        run_name: str | None = None,
        use_active_run: bool = False,
        strict_active_resolution: bool = False,
    ) -> dict[str, Any]:
        if run_id:
            return self.get_run_or_raise(run_id)

        if run_name:
            needle = _norm(run_name)
            matches = [r for r in self.data.get("runs", {}).values() if _norm(str(r.get("name") or "")) == needle]
            if len(matches) == 1:
                return matches[0]
            if len(matches) > 1:
                raise HomeAssistantError(
                    f"Multiple runs match name '{run_name}'. Use run_id instead."
                )
            raise HomeAssistantError(f"No run found with name '{run_name}'.")

        if use_active_run:
            active_ids = self.data.get("active_run_ids", [])
            if not active_ids:
                raise HomeAssistantError("No active run available.")
            if len(active_ids) == 1:
                return self.get_run_or_raise(active_ids[0])
            if strict_active_resolution:
                # Multiple active runs – caller must specify which one
                names = []
                for rid in active_ids:
                    r = self.data.get("runs", {}).get(rid)
                    names.append(f"  • {r.get('name', '?')} ({r.get('display_id', rid)})" if r else f"  • {rid}")
                raise HomeAssistantError(
                    f"Multiple runs are active. Specify run_id or run_name:\n" + "\n".join(names)
                )

            active_run_id = self.data.get("active_run_id")
            if active_run_id and active_run_id in active_ids:
                _LOGGER.warning(
                    "Multiple active runs; using active_run_id '%s' as compatibility fallback.",
                    active_run_id,
                )
                return self.get_run_or_raise(active_run_id)

            fallback_id = active_ids[0]
            _LOGGER.warning(
                "Multiple active runs; using first active run '%s' as deterministic compatibility fallback.",
                fallback_id,
            )
            return self.get_run_or_raise(fallback_id)

        raise HomeAssistantError("Provide run_id, run_name, or set use_active_run=true")

    def get_cultivar_or_raise(self, cultivar_id: str) -> dict[str, Any]:
        cultivar = self.data.get("cultivars", {}).get(cultivar_id)
        if not cultivar:
            raise HomeAssistantError(f"Unknown cultivar_id: {cultivar_id}")
        return cultivar

    def search_local_cultivars(self, species: str, breeder: str | None = None) -> list[dict[str, Any]]:
        """Fuzzy local fallback over cached cultivars."""
        species_n = _norm(species)
        breeder_n = _norm(breeder or "")

        scored: list[tuple[int, dict[str, Any]]] = []
        for cultivar in self.data.get("cultivars", {}).values():
            c_species = _norm(str(cultivar.get("species") or ""))
            c_breeder = _norm(str(cultivar.get("breeder") or ""))

            score = 0
            if c_species == species_n:
                score += 100
            elif species_n and (species_n in c_species or c_species in species_n):
                score += 70

            if breeder_n:
                if c_breeder == breeder_n:
                    score += 30
                elif breeder_n in c_breeder or c_breeder in breeder_n:
                    score += 15

            if score > 0:
                scored.append((score, cultivar))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [item for _, item in scored]

    async def _save_and_signal(
        self,
        event_type: str,
        run_id: str,
        details: Mapping[str, Any] | None = None,
    ) -> None:
        self.data["last_event"] = {
            "type": event_type,
            "run_id": run_id,
            "at": self.storage.utc_now_iso(),
            **(dict(details) if details else {}),
        }
        await self.storage.async_save()
        async_dispatcher_send(self.storage.hass, SIGNAL_DATA_UPDATED)

    async def _save_global_event(self, event_type: str, details: Mapping[str, Any]) -> None:
        self.data["last_event"] = {
            "type": event_type,
            "at": self.storage.utc_now_iso(),
            **dict(details),
        }
        await self.storage.async_save()
        async_dispatcher_send(self.storage.hass, SIGNAL_DATA_UPDATED)

    def _build_run(self, run_name: str, started_at: str, phase: str) -> tuple[str, dict[str, Any]]:
        run_id = uuid.uuid4().hex[:12]
        slug = _slug(run_name)
        run = {
            "id": run_id,
            "slug": slug,
            "name": run_name,
            "display_id": f"{slug}-{run_id[:4]}",
            "phase": phase,
            "started_at": started_at,
            "ended_at": None,
            "notes": [],
            "phase_history": [{"phase": phase, "at": started_at}],
            "metrics": {
                "energy_kwh": None,
                "energy_cost": None,
                "soil_moisture": None,
                "air_humidity": None,
            },
            "media": [],
            "cultivar_id": None,
            "cultivar_snapshot": None,
            "bindings": _default_bindings(),
        }
        return run_id, run

    async def start_run(
        self,
        run_name: str,
        started_at: str | None = None,
        phase: str = PHASE_GROWTH,
    ) -> str:
        run_name = run_name.strip()
        if not run_name:
            raise HomeAssistantError("run_name cannot be empty")
        if phase not in PHASES:
            raise HomeAssistantError(f"Invalid phase: {phase}")

        started = _parse_iso(started_at)
        run_id, run = self._build_run(run_name, started, phase)
        self.data["runs"][run_id] = run
        self.data.setdefault("active_run_ids", [])
        self.data["active_run_ids"].append(run_id)
        self.data["active_run_id"] = self.data["active_run_ids"][0]

        await self._save_and_signal(
            "start_run", run_id, {"run_name": run_name, "phase": phase, "started_at": started}
        )
        return run_id

    async def import_run(
        self,
        run_name: str,
        started_at: str,
        phase: str = PHASE_GROWTH,
        ended_at: str | None = None,
    ) -> str:
        run_name = run_name.strip()
        if not run_name:
            raise HomeAssistantError("run_name cannot be empty")
        if phase not in PHASES:
            raise HomeAssistantError(f"Invalid phase: {phase}")

        started = _parse_iso(started_at)
        ended = _parse_iso(ended_at) if ended_at else None
        if ended and _to_utc_datetime(ended) < _to_utc_datetime(started):
            raise HomeAssistantError("ended_at cannot be earlier than started_at.")

        run_id, run = self._build_run(run_name, started, phase)
        run["ended_at"] = ended

        self.data["runs"][run_id] = run
        self.data.setdefault("active_run_ids", [])

        if ended is None:
            self.data["active_run_ids"].append(run_id)
            if not self.data.get("active_run_id"):
                self.data["active_run_id"] = run_id

        await self._save_and_signal(
            "import_run",
            run_id,
            {"run_name": run_name, "phase": phase, "started_at": started, "ended_at": ended},
        )
        return run_id

    async def end_run(
        self,
        run_id: str | None = None,
        run_name: str | None = None,
        use_active_run: bool = True,
        strict_active_resolution: bool = False,
    ) -> None:
        run = self.resolve_run_or_raise(
            run_id=run_id,
            run_name=run_name,
            use_active_run=use_active_run,
            strict_active_resolution=strict_active_resolution,
        )
        if run.get("ended_at"):
            raise HomeAssistantError(f"Run already ended: {run.get('id')}")

        run["ended_at"] = self.storage.utc_now_iso()
        rid = run.get("id")
        active_ids = self.data.setdefault("active_run_ids", [])
        if rid in active_ids:
            active_ids.remove(rid)
        self.data["active_run_id"] = active_ids[0] if active_ids else None

        await self._save_and_signal("end_run", run["id"], {"run_name": run.get("name")})

    async def set_phase(
        self,
        phase: str,
        run_id: str | None = None,
        run_name: str | None = None,
        use_active_run: bool = True,
        strict_active_resolution: bool = False,
    ) -> None:
        if phase not in PHASES:
            raise HomeAssistantError(f"Invalid phase: {phase}")

        run = self.resolve_run_or_raise(
            run_id=run_id,
            run_name=run_name,
            use_active_run=use_active_run,
            strict_active_resolution=strict_active_resolution,
        )
        run["phase"] = phase
        run.setdefault("phase_history", []).append(
            {"phase": phase, "at": self.storage.utc_now_iso()}
        )

        await self._save_and_signal("set_phase", run["id"], {"phase": phase})

    async def add_note(
        self,
        note: str,
        run_id: str | None = None,
        run_name: str | None = None,
        use_active_run: bool = True,
        strict_active_resolution: bool = False,
    ) -> None:
        note = note.strip()
        if not note:
            raise HomeAssistantError("note cannot be empty")

        run = self.resolve_run_or_raise(
            run_id=run_id,
            run_name=run_name,
            use_active_run=use_active_run,
            strict_active_resolution=strict_active_resolution,
        )
        run.setdefault("notes", []).append({"at": self.storage.utc_now_iso(), "text": note})

        await self._save_and_signal("add_note", run["id"], {"note": note})

    async def upsert_cultivar(self, cultivar: Mapping[str, Any]) -> dict[str, Any]:
        cultivar_id = str(cultivar.get("cultivar_id") or "").strip()
        if not cultivar_id:
            raise HomeAssistantError("cultivar_id missing in cultivar data")

        merged = {
            **dict(cultivar),
            "updated_at": self.storage.utc_now_iso(),
        }
        self.data["cultivars"][cultivar_id] = merged
        await self._save_global_event(
            "upsert_cultivar",
            {"cultivar_id": cultivar_id, "species": merged.get("species")},
        )
        return merged

    async def attach_cultivar_to_run(
        self,
        cultivar_id: str,
        run_id: str | None = None,
        run_name: str | None = None,
        use_active_run: bool = True,
        strict_active_resolution: bool = False,
    ) -> None:
        run = self.resolve_run_or_raise(
            run_id=run_id,
            run_name=run_name,
            use_active_run=use_active_run,
            strict_active_resolution=strict_active_resolution,
        )
        cultivar = self.get_cultivar_or_raise(cultivar_id)
        run["cultivar_id"] = cultivar_id
        run["cultivar_snapshot"] = deepcopy(cultivar)

        await self._save_and_signal(
            "attach_cultivar",
            run["id"],
            {
                "cultivar_id": cultivar_id,
                "species": cultivar.get("species"),
                "breeder": cultivar.get("breeder"),
            },
        )

    async def bind_sensor_to_run(
        self,
        binding_key: str,
        entity_id: str,
        run_id: str | None = None,
        run_name: str | None = None,
        use_active_run: bool = True,
        strict_active_resolution: bool = False,
    ) -> None:
        if binding_key not in BINDABLE_SENSOR_KEYS:
            raise HomeAssistantError(
                f"Invalid binding_key: {binding_key}. Allowed: {', '.join(BINDABLE_SENSOR_KEYS)}"
            )
        if not entity_id.strip():
            raise HomeAssistantError("entity_id cannot be empty")

        run = self.resolve_run_or_raise(
            run_id=run_id,
            run_name=run_name,
            use_active_run=use_active_run,
            strict_active_resolution=strict_active_resolution,
        )
        run.setdefault("bindings", _default_bindings())
        run["bindings"][binding_key] = entity_id.strip()

        await self._save_and_signal(
            "bind_sensor",
            run["id"],
            {"binding_key": binding_key, "entity_id": entity_id.strip()},
        )

    async def unbind_sensor_from_run(
        self,
        binding_key: str,
        run_id: str | None = None,
        run_name: str | None = None,
        use_active_run: bool = True,
        strict_active_resolution: bool = False,
    ) -> None:
        if binding_key not in BINDABLE_SENSOR_KEYS:
            raise HomeAssistantError(
                f"Invalid binding_key: {binding_key}. Allowed: {', '.join(BINDABLE_SENSOR_KEYS)}"
            )

        run = self.resolve_run_or_raise(
            run_id=run_id,
            run_name=run_name,
            use_active_run=use_active_run,
            strict_active_resolution=strict_active_resolution,
        )
        run.setdefault("bindings", _default_bindings())
        run["bindings"][binding_key] = None

        await self._save_and_signal("unbind_sensor", run["id"], {"binding_key": binding_key})
