"""The PlantRun integration."""
import logging
from datetime import datetime

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall

from .const import DOMAIN, PLATFORMS
from .store import PlantRunStorage
from .coordinator import PlantRunCoordinator
from .models import RunData, Phase, Note, Binding
from .providers_seedfinder import async_search_cultivar

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
    entry.async_on_unload(entry.add_update_listener(async_reload_entry))

    async def handle_create_run(call: ServiceCall) -> None:
        """Handle the create_run service."""
        friendly_name = call.data.get("friendly_name", "Unnamed Run")
        start_time = call.data.get("start_time", datetime.utcnow().isoformat())
        planted_date = call.data.get("planted_date")

        new_run = RunData(
            friendly_name=friendly_name,
            start_time=start_time,
            planted_date=planted_date
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
        
        # Smart end-date tracking for Harvest
        if phase_name.lower() == "harvest":
            run.end_time = now
            run.status = "ended"
        else:
            run.end_time = None
            run.status = "active"

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

    async def handle_end_run(call: ServiceCall) -> None:
        """Handle the end_run service."""
        run_id = call.data["run_id"]
        end_time = call.data.get("end_time", datetime.utcnow().isoformat())
        
        run = storage.get_run(run_id)
        if not run:
            _LOGGER.error("Run %s not found", run_id)
            return
            
        run.end_time = end_time
        run.status = "ended"
        if run.phases:
            run.phases[-1].end_time = end_time
            
        await storage.async_update_run(run)
        await coordinator.async_request_refresh()
        _LOGGER.info("Ended run %s", run_id)

    async def handle_set_cultivar(call: ServiceCall) -> None:
        """Handle the set_cultivar service using SeedFinder provider."""
        run_id = call.data["run_id"]
        cultivar_name = call.data["cultivar_name"]
        
        run = storage.get_run(run_id)
        if not run:
            _LOGGER.error("Run %s not found", run_id)
            return
            
        # Search SeedFinder
        results = await async_search_cultivar(cultivar_name)
        if results:
            # We pick the first match for automation purposes,
            # though a full UI would let the user pick.
            run.cultivar = results[0]
            _LOGGER.info("Attached Cultivar %s from SeedFinder to run %s", results[0].name, run_id)
        else:
            _LOGGER.warning("Cultivar %s not found, continuing without details", cultivar_name)
            # Create a basic fallback snapshot
            from .models import CultivarSnapshot
            run.cultivar = CultivarSnapshot(name=cultivar_name, breeder="Unknown (Manual Entry)")
            
        await storage.async_update_run(run)
        await coordinator.async_request_refresh()
        
    async def handle_add_binding(call: ServiceCall) -> None:
        """Handle the add_binding service."""
        run_id = call.data["run_id"]
        metric_type = call.data["metric_type"]
        sensor_id = call.data["sensor_id"]

        run = storage.get_run(run_id)
        if not run:
            _LOGGER.error("Run %s not found", run_id)
            return
            
        # Optional: Remove existing binding of same type
        run.bindings = [b for b in run.bindings if b.metric_type != metric_type]
        run.bindings.append(Binding(metric_type=metric_type, sensor_id=sensor_id))
        
        await storage.async_update_run(run)
        await coordinator.async_request_refresh()
        _LOGGER.info("Bound %s to %s for run %s", sensor_id, metric_type, run_id)

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
    
    hass.services.async_register(
        DOMAIN, "end_run", handle_end_run, schema=vol.Schema({
            vol.Required("run_id"): str,
            vol.Optional("end_time"): str,
        })
    )
    
    hass.services.async_register(
        DOMAIN, "set_cultivar", handle_set_cultivar, schema=vol.Schema({
            vol.Required("run_id"): str,
            vol.Required("cultivar_name"): str,
        })
    )
    
    hass.services.async_register(
        DOMAIN, "add_binding", handle_add_binding, schema=vol.Schema({
            vol.Required("run_id"): str,
            vol.Required("metric_type"): str,
            vol.Required("sensor_id"): str,
        })
    )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)

    return unload_ok

async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload config entry when options change."""
    await hass.config_entries.async_reload(entry.entry_id)
