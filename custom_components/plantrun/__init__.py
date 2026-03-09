"""The PlantRun integration."""
import logging
from datetime import datetime

import voluptuous as vol

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ServiceValidationError

from .const import (
    ACTIVE_RUN_STRATEGIES,
    ACTIVE_RUN_STRATEGY_LEGACY,
    ATTR_ACTIVE_RUN_STRATEGY,
    ATTR_RUN_ID,
    ATTR_RUN_NAME,
    ATTR_STRICT_ACTIVE_RESOLUTION,
    ATTR_USE_ACTIVE_RUN,
    DOMAIN,
    PLATFORMS,
)
from .store import PlantRunStorage
from .coordinator import PlantRunCoordinator
from .models import RunData, Phase, Note, Binding
from .providers_seedfinder import async_search_cultivar
from .run_resolution import resolve_run_or_raise

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up PlantRun from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    # Register the frontend static path
    hass.http.register_static_path(
        "/plantrun_frontend",
        hass.config.path("custom_components/plantrun/www"),
        cache_headers=False,
    )

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
        await storage.async_set_active_run_id(new_run.id)
        await coordinator.async_request_refresh()
        _LOGGER.info("Created new run: %s", new_run.id)

    def resolve_target_run(call: ServiceCall) -> RunData:
        """Resolve target run from explicit id/name or active run compatibility args."""
        try:
            return resolve_run_or_raise(
                storage,
                run_id=call.data.get(ATTR_RUN_ID),
                run_name=call.data.get(ATTR_RUN_NAME),
                use_active_run=call.data.get(ATTR_USE_ACTIVE_RUN, False),
                strict_active_resolution=call.data.get(ATTR_STRICT_ACTIVE_RESOLUTION, False),
                active_run_strategy=call.data.get(
                    ATTR_ACTIVE_RUN_STRATEGY, ACTIVE_RUN_STRATEGY_LEGACY
                ),
            )
        except ValueError as err:
            raise ServiceValidationError(f"Run resolution failed: {err}") from err

    async def handle_add_phase(call: ServiceCall) -> None:
        """Handle the add_phase service."""
        run = resolve_target_run(call)

        phase_name = call.data["phase_name"]

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
            if storage.active_run_id == run.id:
                replacement = next((r.id for r in storage.runs if r.status == "active"), None)
                await storage.async_set_active_run_id(replacement)
        else:
            run.end_time = None
            run.status = "active"
            await storage.async_set_active_run_id(run.id)

        await storage.async_update_run(run)
        await coordinator.async_request_refresh()
        _LOGGER.info("Added phase %s to run %s", phase_name, run.id)

    async def handle_add_note(call: ServiceCall) -> None:
        """Handle the add_note service."""
        run = resolve_target_run(call)

        text = call.data["text"]

        now = datetime.utcnow().isoformat()
        run.notes.append(Note(text=text, timestamp=now))
        await storage.async_update_run(run)
        await coordinator.async_request_refresh()
        _LOGGER.info("Added note to run %s", run.id)

    async def handle_end_run(call: ServiceCall) -> None:
        """Handle the end_run service."""
        run = resolve_target_run(call)

        end_time = call.data.get("end_time", datetime.utcnow().isoformat())

        run.end_time = end_time
        run.status = "ended"
        if run.phases:
            run.phases[-1].end_time = end_time

        await storage.async_update_run(run)
        if storage.active_run_id == run.id:
            replacement = next((r.id for r in storage.runs if r.status == "active"), None)
            await storage.async_set_active_run_id(replacement)
        await coordinator.async_request_refresh()
        _LOGGER.info("Ended run %s", run.id)

    async def handle_set_cultivar(call: ServiceCall) -> None:
        """Handle the set_cultivar service using SeedFinder provider."""
        run = resolve_target_run(call)

        cultivar_name = call.data["cultivar_name"]

        # Search SeedFinder
        results = await async_search_cultivar(cultivar_name)
        if results:
            # We pick the first match for automation purposes,
            # though a full UI would let the user pick.
            run.cultivar = results[0]
            _LOGGER.info(
                "Attached Cultivar %s from SeedFinder to run %s", results[0].name, run.id
            )
        else:
            _LOGGER.warning("Cultivar %s not found, continuing without details", cultivar_name)
            # Create a basic fallback snapshot
            from .models import CultivarSnapshot
            run.cultivar = CultivarSnapshot(name=cultivar_name, breeder="Unknown (Manual Entry)")
            
        await storage.async_update_run(run)
        await coordinator.async_request_refresh()
        
    async def handle_add_binding(call: ServiceCall) -> None:
        """Handle the add_binding service."""
        run = resolve_target_run(call)

        metric_type = call.data["metric_type"]
        sensor_id = call.data["sensor_id"]
            
        # Optional: Remove existing binding of same type
        run.bindings = [b for b in run.bindings if b.metric_type != metric_type]
        run.bindings.append(Binding(metric_type=metric_type, sensor_id=sensor_id))
        
        await storage.async_update_run(run)
        await coordinator.async_request_refresh()
        _LOGGER.info("Bound %s to %s for run %s", sensor_id, metric_type, run.id)

    run_resolution_schema = {
        vol.Optional(ATTR_RUN_ID): str,
        vol.Optional(ATTR_RUN_NAME): str,
        vol.Optional(ATTR_USE_ACTIVE_RUN, default=False): bool,
        vol.Optional(ATTR_STRICT_ACTIVE_RESOLUTION, default=False): bool,
        vol.Optional(ATTR_ACTIVE_RUN_STRATEGY, default=ACTIVE_RUN_STRATEGY_LEGACY): vol.In(
            ACTIVE_RUN_STRATEGIES
        ),
    }

    # Register services
    hass.services.async_register(
        DOMAIN, "create_run", handle_create_run, schema=vol.Schema({
            vol.Required("friendly_name"): str,
            vol.Optional("start_time"): str,
            vol.Optional("planted_date"): str,
        })
    )

    hass.services.async_register(
        DOMAIN, "add_phase", handle_add_phase, schema=vol.Schema({
            **run_resolution_schema,
            vol.Required("phase_name"): str,
        })
    )

    hass.services.async_register(
        DOMAIN, "add_note", handle_add_note, schema=vol.Schema({
            **run_resolution_schema,
            vol.Required("text"): str,
        })
    )
    
    hass.services.async_register(
        DOMAIN, "end_run", handle_end_run, schema=vol.Schema({
            **run_resolution_schema,
            vol.Optional("end_time"): str,
        })
    )
    
    hass.services.async_register(
        DOMAIN, "set_cultivar", handle_set_cultivar, schema=vol.Schema({
            **run_resolution_schema,
            vol.Required("cultivar_name"): str,
        })
    )
    
    hass.services.async_register(
        DOMAIN, "add_binding", handle_add_binding, schema=vol.Schema({
            **run_resolution_schema,
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
