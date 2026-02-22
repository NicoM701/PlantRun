"""Domain manager for PlantRun business logic."""

from __future__ import annotations

import uuid
from collections.abc import Mapping
from copy import deepcopy
from typing import Any

from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import BINDABLE_SENSOR_KEYS, PHASES, PHASE_GROWTH, SIGNAL_DATA_UPDATED
from .storage import PlantRunStorage


def _default_bindings() -> dict[str, str | None]:
    return {key: None for key in BINDABLE_SENSOR_KEYS}


def _norm(value: str) -> str:
    return " ".join(value.strip().lower().split())


class PlantRunManager:
    """Owns run lifecycle operations and persistence."""

    def __init__(self, storage: PlantRunStorage) -> None:
        self.storage = storage

    @property
    def data(self) -> dict[str, Any]:
        return self.storage.data

    def get_run_or_raise(self, run_id: str) -> dict[str, Any]:
        run = self.data.get("runs", {}).get(run_id)
        if not run:
            raise HomeAssistantError(f"Unknown run_id: {run_id}")
        return run

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

    async def start_run(self, run_name: str) -> str:
        run_name = run_name.strip()
        if not run_name:
            raise HomeAssistantError("run_name cannot be empty")

        active_run_id = self.data.get("active_run_id")
        if active_run_id:
            active_run = self.data.get("runs", {}).get(active_run_id)
            active_name = active_run.get("name") if active_run else active_run_id
            raise HomeAssistantError(
                f"Run already active ({active_name}). End it before starting a new one."
            )

        run_id = uuid.uuid4().hex[:12]
        now = self.storage.utc_now_iso()
        self.data["runs"][run_id] = {
            "id": run_id,
            "name": run_name,
            "phase": PHASE_GROWTH,
            "started_at": now,
            "ended_at": None,
            "notes": [],
            "phase_history": [{"phase": PHASE_GROWTH, "at": now}],
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
        self.data["active_run_id"] = run_id

        await self._save_and_signal(
            "start_run", run_id, {"run_name": run_name, "phase": PHASE_GROWTH}
        )
        return run_id

    async def end_run(self, run_id: str) -> None:
        run = self.get_run_or_raise(run_id)
        if run.get("ended_at"):
            raise HomeAssistantError(f"Run already ended: {run_id}")

        run["ended_at"] = self.storage.utc_now_iso()
        if self.data.get("active_run_id") == run_id:
            self.data["active_run_id"] = None

        await self._save_and_signal("end_run", run_id, {"run_name": run.get("name")})

    async def set_phase(self, run_id: str, phase: str) -> None:
        if phase not in PHASES:
            raise HomeAssistantError(f"Invalid phase: {phase}")

        run = self.get_run_or_raise(run_id)
        run["phase"] = phase
        run.setdefault("phase_history", []).append(
            {"phase": phase, "at": self.storage.utc_now_iso()}
        )

        await self._save_and_signal("set_phase", run_id, {"phase": phase})

    async def add_note(self, run_id: str, note: str) -> None:
        note = note.strip()
        if not note:
            raise HomeAssistantError("note cannot be empty")

        run = self.get_run_or_raise(run_id)
        run.setdefault("notes", []).append({"at": self.storage.utc_now_iso(), "text": note})

        await self._save_and_signal("add_note", run_id, {"note": note})

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

    async def attach_cultivar_to_run(self, run_id: str, cultivar_id: str) -> None:
        run = self.get_run_or_raise(run_id)
        cultivar = self.get_cultivar_or_raise(cultivar_id)
        run["cultivar_id"] = cultivar_id
        run["cultivar_snapshot"] = deepcopy(cultivar)

        await self._save_and_signal(
            "attach_cultivar",
            run_id,
            {
                "cultivar_id": cultivar_id,
                "species": cultivar.get("species"),
                "breeder": cultivar.get("breeder"),
            },
        )

    async def bind_sensor_to_run(self, run_id: str, binding_key: str, entity_id: str) -> None:
        if binding_key not in BINDABLE_SENSOR_KEYS:
            raise HomeAssistantError(
                f"Invalid binding_key: {binding_key}. Allowed: {', '.join(BINDABLE_SENSOR_KEYS)}"
            )
        if not entity_id.strip():
            raise HomeAssistantError("entity_id cannot be empty")

        run = self.get_run_or_raise(run_id)
        run.setdefault("bindings", _default_bindings())
        run["bindings"][binding_key] = entity_id.strip()

        await self._save_and_signal(
            "bind_sensor",
            run_id,
            {"binding_key": binding_key, "entity_id": entity_id.strip()},
        )

    async def unbind_sensor_from_run(self, run_id: str, binding_key: str) -> None:
        if binding_key not in BINDABLE_SENSOR_KEYS:
            raise HomeAssistantError(
                f"Invalid binding_key: {binding_key}. Allowed: {', '.join(BINDABLE_SENSOR_KEYS)}"
            )

        run = self.get_run_or_raise(run_id)
        run.setdefault("bindings", _default_bindings())
        run["bindings"][binding_key] = None

        await self._save_and_signal("unbind_sensor", run_id, {"binding_key": binding_key})
