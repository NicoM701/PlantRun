"""The PlantRun integration."""
import logging
from datetime import datetime

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall

from .const import DOMAIN, PLATFORMS
from .store import PlantRunStorage
from .coordinator import PlantRunCoordinator
from .models import RunData, Phase, Note

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up PlantRun from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    storage = PlantRunStorage(hass)
    await storage.async_load()

    coordinator = PlantRunCoordinator(hass, storage)
    await coordinator.async_config_entry_first_refresh()

    hass.data[DOMAIN][entry.entry_id] = {
        "storage": storage,
        "coordinator": coordinator,
    }

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    async def handle_create_run(call: ServiceCall) -> None:
        """Handle the create_run service."""
        friendly_name = call.data.get("friendly_name", "Unnamed Run")
        start_time = call.data.get("start_time", datetime.utcnow().isoformat())

        new_run = RunData(
            friendly_name=friendly_name,
            start_time=start_time
        )
        await storage.async_add_run(new_run)
        await coordinator.async_request_refresh()
        _LOGGER.info("Created new run: %s", new_run.id)

    async def handle_add_phase(call: ServiceCall) -> None:
        """Handle the add_phase service."""
        run_id = call.data["run_id"]
        phase_name = call.data["phase_name"]

        run = storage.get_run(run_id)
        if not run:
            _LOGGER.error("Run %s not found", run_id)
            return

        now = datetime.utcnow().isoformat()

        # End current phase
        if run.phases:
            run.phases[-1].end_time = now

        # Add new phase
        run.phases.append(Phase(name=phase_name, start_time=now))
        await storage.async_update_run(run)
        await coordinator.async_request_refresh()
        _LOGGER.info("Added phase %s to run %s", phase_name, run_id)

    async def handle_add_note(call: ServiceCall) -> None:
        """Handle the add_note service."""
        run_id = call.data["run_id"]
        text = call.data["text"]

        run = storage.get_run(run_id)
        if not run:
            _LOGGER.error("Run %s not found", run_id)
            return

        now = datetime.utcnow().isoformat()
        run.notes.append(Note(text=text, timestamp=now))
        await storage.async_update_run(run)
        await coordinator.async_request_refresh()
        _LOGGER.info("Added note to run %s", run_id)

    # Register services
    hass.services.async_register(
        DOMAIN, "create_run", handle_create_run, schema=vol.Schema({
            vol.Required("friendly_name"): str,
            vol.Optional("start_time"): str,
        })
    )

    hass.services.async_register(
        DOMAIN, "add_phase", handle_add_phase, schema=vol.Schema({
            vol.Required("run_id"): str,
            vol.Required("phase_name"): str,
        })
    )

    hass.services.async_register(
        DOMAIN, "add_note", handle_add_note, schema=vol.Schema({
            vol.Required("run_id"): str,
            vol.Required("text"): str,
        })
    )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)

    return unload_ok
