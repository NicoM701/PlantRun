"""PlantRun integration."""

from __future__ import annotations

import logging

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.helpers import discovery
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import (
    ATTR_BINDING_KEY,
    ATTR_BREEDER,
    ATTR_CULTIVAR_ID,
    ATTR_ENDED_AT,
    ATTR_ENTITY_ID,
    ATTR_NOTE,
    ATTR_PHASE,
    ATTR_PREFER_AUTOMATIC,
    ATTR_RUN_ID,
    ATTR_RUN_NAME,
    ATTR_SPECIES,
    ATTR_STARTED_AT,
    ATTR_USE_ACTIVE_RUN,
    DATA_MANAGER,
    DATA_STORAGE,
    DOMAIN,
    PHASE_GROWTH,
    SERVICE_ADD_NOTE,
    SERVICE_ATTACH_CULTIVAR_TO_RUN,
    SERVICE_BIND_SENSOR_TO_RUN,
    SERVICE_END_RUN,
    SERVICE_IMPORT_RUN,
    SERVICE_LIST_RUNS,
    SERVICE_REFRESH_CULTIVAR,
    SERVICE_SEARCH_CULTIVAR,
    SERVICE_SET_PHASE,
    SERVICE_START_RUN,
    SERVICE_UNBIND_SENSOR_FROM_RUN,
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

    manager = PlantRunManager(storage)
    hass.data[DOMAIN][DATA_STORAGE] = storage
    hass.data[DOMAIN][DATA_MANAGER] = manager

    async def handle_start_run(call: ServiceCall) -> dict:
        run_id = await manager.start_run(
            run_name=call.data[ATTR_RUN_NAME],
            started_at=call.data.get(ATTR_STARTED_AT),
            phase=call.data.get(ATTR_PHASE, PHASE_GROWTH),
        )
        run = manager.get_run_or_raise(run_id)
        _LOGGER.info("Started run %s", run_id)
        return {"run_id": run_id, "display_id": run.get("display_id"), "run_name": run.get("name")}

    async def handle_import_run(call: ServiceCall) -> dict:
        run_id = await manager.import_run(
            run_name=call.data[ATTR_RUN_NAME],
            started_at=call.data[ATTR_STARTED_AT],
            phase=call.data.get(ATTR_PHASE, PHASE_GROWTH),
            ended_at=call.data.get(ATTR_ENDED_AT),
        )
        run = manager.get_run_or_raise(run_id)
        _LOGGER.info("Imported run %s", run_id)
        return {"run_id": run_id, "display_id": run.get("display_id"), "run_name": run.get("name")}

    async def handle_end_run(call: ServiceCall) -> None:
        await manager.end_run(
            run_id=call.data.get(ATTR_RUN_ID),
            run_name=call.data.get(ATTR_RUN_NAME),
            use_active_run=bool(call.data.get(ATTR_USE_ACTIVE_RUN, True)),
        )

    async def handle_set_phase(call: ServiceCall) -> None:
        await manager.set_phase(
            phase=call.data[ATTR_PHASE],
            run_id=call.data.get(ATTR_RUN_ID),
            run_name=call.data.get(ATTR_RUN_NAME),
            use_active_run=bool(call.data.get(ATTR_USE_ACTIVE_RUN, True)),
        )

    async def handle_add_note(call: ServiceCall) -> None:
        await manager.add_note(
            note=call.data[ATTR_NOTE],
            run_id=call.data.get(ATTR_RUN_ID),
            run_name=call.data.get(ATTR_RUN_NAME),
            use_active_run=bool(call.data.get(ATTR_USE_ACTIVE_RUN, True)),
        )

    async def handle_search_cultivar(call: ServiceCall) -> dict:
        """Try online SeedFinder first, fallback to local fuzzy cache."""
        species = call.data[ATTR_SPECIES]
        breeder = call.data.get(ATTR_BREEDER, "")
        prefer_automatic = bool(call.data.get(ATTR_PREFER_AUTOMATIC, False))

        try:
            session = async_get_clientsession(hass)
            profile = await fetch_cultivar_profile(
                session,
                species,
                breeder,
                prefer_automatic=prefer_automatic,
            )
            stored = await manager.upsert_cultivar(profile)
            _LOGGER.info("Upserted cultivar %s", stored.get("cultivar_id"))
            return {"result": stored, "source": "seedfinder"}
        except Exception as exc:  # noqa: BLE001 - deliberate provider fallback
            _LOGGER.warning("SeedFinder fetch failed, trying local fallback: %s", exc)
            local_matches = manager.search_local_cultivars(species, breeder)
            if local_matches:
                return {
                    "result": local_matches[0],
                    "source": "local_cache",
                    "matches": local_matches,
                }
            raise

    async def handle_attach_cultivar_to_run(call: ServiceCall) -> None:
        await manager.attach_cultivar_to_run(
            cultivar_id=call.data[ATTR_CULTIVAR_ID],
            run_id=call.data.get(ATTR_RUN_ID),
            run_name=call.data.get(ATTR_RUN_NAME),
            use_active_run=bool(call.data.get(ATTR_USE_ACTIVE_RUN, True)),
        )

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

    async def handle_bind_sensor_to_run(call: ServiceCall) -> None:
        await manager.bind_sensor_to_run(
            binding_key=call.data[ATTR_BINDING_KEY],
            entity_id=call.data[ATTR_ENTITY_ID],
            run_id=call.data.get(ATTR_RUN_ID),
            run_name=call.data.get(ATTR_RUN_NAME),
            use_active_run=bool(call.data.get(ATTR_USE_ACTIVE_RUN, True)),
        )

    async def handle_unbind_sensor_from_run(call: ServiceCall) -> None:
        await manager.unbind_sensor_from_run(
            binding_key=call.data[ATTR_BINDING_KEY],
            run_id=call.data.get(ATTR_RUN_ID),
            run_name=call.data.get(ATTR_RUN_NAME),
            use_active_run=bool(call.data.get(ATTR_USE_ACTIVE_RUN, True)),
        )

    async def handle_list_runs(call: ServiceCall) -> dict:
        runs = manager.list_runs()
        return {
            "runs": [
                {
                    "run_id": r.get("id"),
                    "display_id": r.get("display_id"),
                    "run_name": r.get("name"),
                    "started_at": r.get("started_at"),
                    "ended_at": r.get("ended_at"),
                    "phase": r.get("phase"),
                }
                for r in runs
            ]
        }

    hass.services.async_register(
        DOMAIN, SERVICE_START_RUN, handle_start_run, supports_response=SupportsResponse.ONLY
    )
    hass.services.async_register(
        DOMAIN, SERVICE_IMPORT_RUN, handle_import_run, supports_response=SupportsResponse.ONLY
    )
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
    hass.services.async_register(
        DOMAIN,
        SERVICE_BIND_SENSOR_TO_RUN,
        handle_bind_sensor_to_run,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_UNBIND_SENSOR_FROM_RUN,
        handle_unbind_sensor_from_run,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_LIST_RUNS, handle_list_runs, supports_response=SupportsResponse.ONLY
    )

    await discovery.async_load_platform(hass, "sensor", DOMAIN, {}, config)

    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up PlantRun from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = entry.data

    manager: PlantRunManager | None = hass.data.get(DOMAIN, {}).get(DATA_MANAGER)
    if manager is not None and not manager.list_runs():
        mode = entry.data.get("initial_run_mode")
        run_name = entry.data.get("initial_run_name")
        if mode in ("new", "import") and run_name:
            started_at = entry.data.get("initial_started_at")
            phase = entry.data.get("initial_phase", PHASE_GROWTH)
            try:
                if mode == "new":
                    await manager.start_run(run_name=run_name, started_at=started_at, phase=phase)
                else:
                    if not started_at:
                        raise ValueError("initial_started_at required for import mode")
                    await manager.import_run(run_name=run_name, started_at=started_at, phase=phase)
            except Exception as exc:  # noqa: BLE001
                _LOGGER.warning("Initial run bootstrap skipped: %s", exc)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    hass.data[DOMAIN].pop(entry.entry_id, None)
    return True
