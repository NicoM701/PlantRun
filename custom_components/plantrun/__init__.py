"""PlantRun integration."""

from __future__ import annotations

import logging
import uuid

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import discovery
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    ATTR_NOTE,
    ATTR_PHASE,
    ATTR_RUN_ID,
    ATTR_RUN_NAME,
    DOMAIN,
    PHASES,
    PHASE_GROWTH,
    SERVICE_ADD_NOTE,
    SERVICE_END_RUN,
    SERVICE_SET_PHASE,
    SERVICE_START_RUN,
    SIGNAL_DATA_UPDATED,
)
from .storage import PlantRunStorage

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up PlantRun."""
    hass.data.setdefault(DOMAIN, {})

    storage = PlantRunStorage(hass)
    await storage.async_load()
    hass.data[DOMAIN]["storage"] = storage

    async def _save_and_broadcast(event_type: str, run_id: str, details: dict) -> None:
        storage.data["last_event"] = {
            "type": event_type,
            "run_id": run_id,
            "at": storage.utc_now_iso(),
            **details,
        }
        await storage.async_save()
        async_dispatcher_send(hass, SIGNAL_DATA_UPDATED)

    async def handle_start_run(call: ServiceCall) -> None:
        run_name = call.data[ATTR_RUN_NAME].strip()
        if not run_name:
            raise HomeAssistantError("run_name cannot be empty")

        run_id = uuid.uuid4().hex[:12]
        now = storage.utc_now_iso()
        storage.data["runs"][run_id] = {
            "id": run_id,
            "name": run_name,
            "phase": PHASE_GROWTH,
            "started_at": now,
            "ended_at": None,
            "notes": [],
            "phase_history": [{"phase": PHASE_GROWTH, "at": now}],
        }
        storage.data["active_run_id"] = run_id

        await _save_and_broadcast(
            "start_run",
            run_id,
            {
                "run_name": run_name,
                "phase": PHASE_GROWTH,
            },
        )
        _LOGGER.info("Started run %s (%s)", run_name, run_id)

    async def handle_end_run(call: ServiceCall) -> None:
        run_id = call.data[ATTR_RUN_ID]
        run = storage.data["runs"].get(run_id)
        if not run:
            raise HomeAssistantError(f"Unknown run_id: {run_id}")

        run["ended_at"] = storage.utc_now_iso()
        if storage.data.get("active_run_id") == run_id:
            storage.data["active_run_id"] = None

        await _save_and_broadcast("end_run", run_id, {"run_name": run.get("name")})
        _LOGGER.info("Ended run %s", run_id)

    async def handle_set_phase(call: ServiceCall) -> None:
        run_id = call.data[ATTR_RUN_ID]
        phase = call.data[ATTR_PHASE]
        run = storage.data["runs"].get(run_id)
        if not run:
            raise HomeAssistantError(f"Unknown run_id: {run_id}")
        if phase not in PHASES:
            raise HomeAssistantError(f"Invalid phase: {phase}")

        run["phase"] = phase
        run.setdefault("phase_history", []).append(
            {"phase": phase, "at": storage.utc_now_iso()}
        )

        await _save_and_broadcast("set_phase", run_id, {"phase": phase})
        _LOGGER.info("Run %s phase set to %s", run_id, phase)

    async def handle_add_note(call: ServiceCall) -> None:
        run_id = call.data[ATTR_RUN_ID]
        note = call.data[ATTR_NOTE].strip()
        run = storage.data["runs"].get(run_id)
        if not run:
            raise HomeAssistantError(f"Unknown run_id: {run_id}")
        if not note:
            raise HomeAssistantError("note cannot be empty")

        run.setdefault("notes", []).append({"at": storage.utc_now_iso(), "text": note})

        await _save_and_broadcast("add_note", run_id, {"note": note})
        _LOGGER.info("Added note to run %s", run_id)

    hass.services.async_register(DOMAIN, SERVICE_START_RUN, handle_start_run)
    hass.services.async_register(DOMAIN, SERVICE_END_RUN, handle_end_run)
    hass.services.async_register(DOMAIN, SERVICE_SET_PHASE, handle_set_phase)
    hass.services.async_register(DOMAIN, SERVICE_ADD_NOTE, handle_add_note)

    await discovery.async_load_platform(hass, "sensor", DOMAIN, {}, config)

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up PlantRun from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = entry.data
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    hass.data[DOMAIN].pop(entry.entry_id, None)
    return True
