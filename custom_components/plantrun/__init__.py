"""PlantRun integration."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.helpers import discovery
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    ATTR_BREEDER,
    ATTR_CULTIVAR_ID,
    ATTR_NOTE,
    ATTR_PHASE,
    ATTR_RUN_ID,
    ATTR_RUN_NAME,
    ATTR_SPECIES,
    DATA_MANAGER,
    DATA_STORAGE,
    DOMAIN,
    SERVICE_ADD_NOTE,
    SERVICE_ATTACH_CULTIVAR_TO_RUN,
    SERVICE_END_RUN,
    SERVICE_REFRESH_CULTIVAR,
    SERVICE_SEARCH_CULTIVAR,
    SERVICE_SET_PHASE,
    SERVICE_START_RUN,
)
from .manager import PlantRunManager
from .providers_seedfinder import fetch_cultivar_profile
from .storage import PlantRunStorage

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up PlantRun."""
    hass.data.setdefault(DOMAIN, {})

    storage = PlantRunStorage(hass)
    await storage.async_load()

    manager = PlantRunManager(hass, storage)
    hass.data[DOMAIN][DATA_STORAGE] = storage
    hass.data[DOMAIN][DATA_MANAGER] = manager

    async def handle_start_run(call: ServiceCall) -> None:
        run_id = await manager.start_run(call.data[ATTR_RUN_NAME])
        _LOGGER.info("Started run %s", run_id)

    async def handle_end_run(call: ServiceCall) -> None:
        run_id = call.data[ATTR_RUN_ID]
        await manager.end_run(run_id)
        _LOGGER.info("Ended run %s", run_id)

    async def handle_set_phase(call: ServiceCall) -> None:
        run_id = call.data[ATTR_RUN_ID]
        phase = call.data[ATTR_PHASE]
        await manager.set_phase(run_id, phase)
        _LOGGER.info("Run %s phase set to %s", run_id, phase)

    async def handle_add_note(call: ServiceCall) -> None:
        run_id = call.data[ATTR_RUN_ID]
        await manager.add_note(run_id, call.data[ATTR_NOTE])
        _LOGGER.info("Added note to run %s", run_id)

    async def handle_search_cultivar(call: ServiceCall) -> dict:
        session = async_get_clientsession(hass)
        species = call.data[ATTR_SPECIES]
        breeder = call.data[ATTR_BREEDER]
        profile = await fetch_cultivar_profile(session, species, breeder)
        stored = await manager.upsert_cultivar(profile)
        _LOGGER.info("Upserted cultivar %s", stored.get("cultivar_id"))
        return {"result": stored}

    async def handle_attach_cultivar_to_run(call: ServiceCall) -> None:
        run_id = call.data[ATTR_RUN_ID]
        cultivar_id = call.data[ATTR_CULTIVAR_ID]
        await manager.attach_cultivar_to_run(run_id, cultivar_id)
        _LOGGER.info("Attached cultivar %s to run %s", cultivar_id, run_id)

    async def handle_refresh_cultivar(call: ServiceCall) -> dict:
        cultivar_id = call.data[ATTR_CULTIVAR_ID]
        cultivar = manager.get_cultivar_or_raise(cultivar_id)
        session = async_get_clientsession(hass)
        profile = await fetch_cultivar_profile(
            session,
            str(cultivar.get("species") or ""),
            str(cultivar.get("breeder") or ""),
        )
        stored = await manager.upsert_cultivar(profile)
        _LOGGER.info("Refreshed cultivar %s", cultivar_id)
        return {"result": stored}

    hass.services.async_register(DOMAIN, SERVICE_START_RUN, handle_start_run)
    hass.services.async_register(DOMAIN, SERVICE_END_RUN, handle_end_run)
    hass.services.async_register(DOMAIN, SERVICE_SET_PHASE, handle_set_phase)
    hass.services.async_register(DOMAIN, SERVICE_ADD_NOTE, handle_add_note)
    hass.services.async_register(
        DOMAIN,
        SERVICE_SEARCH_CULTIVAR,
        handle_search_cultivar,
        supports_response=SupportsResponse.ONLY,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_ATTACH_CULTIVAR_TO_RUN,
        handle_attach_cultivar_to_run,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_REFRESH_CULTIVAR,
        handle_refresh_cultivar,
        supports_response=SupportsResponse.ONLY,
    )

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
