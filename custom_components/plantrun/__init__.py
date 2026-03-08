"""PlantRun integration."""

from __future__ import annotations

import logging
from datetime import UTC, datetime

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall, SupportsResponse
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers import config_validation as cv

from .const import (
    BINDABLE_SENSOR_KEYS,
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
    PLATFORMS,
    PHASE_GROWTH,
    PHASES,
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


def _non_empty_text(value: str) -> str:
    value = str(value).strip()
    if not value:
        raise vol.Invalid("Value must not be empty")
    return value


def _optional_iso_datetime(value: str) -> str:
    value = _non_empty_text(value)
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise vol.Invalid("Use ISO datetime format, e.g. 2026-02-22T12:00:00+00:00") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC).isoformat()


def _validate_run_selector(data: dict) -> dict:
    run_id = data.get(ATTR_RUN_ID)
    run_name = data.get(ATTR_RUN_NAME)
    use_active_run = data.get(ATTR_USE_ACTIVE_RUN, True)

    if run_id and run_name:
        raise vol.Invalid("Use either run_id or run_name, not both.")
    if not run_id and not run_name and not use_active_run:
        raise vol.Invalid("Provide run_id/run_name or set use_active_run to true.")
    return data


RUN_SELECTOR_FIELDS = {
    vol.Optional(ATTR_RUN_ID): _non_empty_text,
    vol.Optional(ATTR_RUN_NAME): _non_empty_text,
    vol.Optional(ATTR_USE_ACTIVE_RUN, default=True): bool,
}

START_RUN_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_RUN_NAME): _non_empty_text,
        vol.Optional(ATTR_STARTED_AT): _optional_iso_datetime,
        vol.Optional(ATTR_PHASE, default=PHASE_GROWTH): vol.In(PHASES),
    },
    extra=vol.PREVENT_EXTRA,
)
IMPORT_RUN_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_RUN_NAME): _non_empty_text,
        vol.Required(ATTR_STARTED_AT): _optional_iso_datetime,
        vol.Optional(ATTR_ENDED_AT): _optional_iso_datetime,
        vol.Optional(ATTR_PHASE, default=PHASE_GROWTH): vol.In(PHASES),
    },
    extra=vol.PREVENT_EXTRA,
)
END_RUN_SCHEMA = vol.All(
    vol.Schema(RUN_SELECTOR_FIELDS, extra=vol.PREVENT_EXTRA),
    _validate_run_selector,
)
SET_PHASE_SCHEMA = vol.All(
    vol.Schema(
        {
            vol.Required(ATTR_PHASE): vol.In(PHASES),
            **RUN_SELECTOR_FIELDS,
        },
        extra=vol.PREVENT_EXTRA,
    ),
    _validate_run_selector,
)
ADD_NOTE_SCHEMA = vol.All(
    vol.Schema(
        {
            vol.Required(ATTR_NOTE): _non_empty_text,
            **RUN_SELECTOR_FIELDS,
        },
        extra=vol.PREVENT_EXTRA,
    ),
    _validate_run_selector,
)
SEARCH_CULTIVAR_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_SPECIES): _non_empty_text,
        vol.Required(ATTR_BREEDER): _non_empty_text,
        vol.Optional(ATTR_PREFER_AUTOMATIC, default=False): bool,
    },
    extra=vol.PREVENT_EXTRA,
)
ATTACH_CULTIVAR_SCHEMA = vol.All(
    vol.Schema(
        {
            vol.Required(ATTR_CULTIVAR_ID): _non_empty_text,
            **RUN_SELECTOR_FIELDS,
        },
        extra=vol.PREVENT_EXTRA,
    ),
    _validate_run_selector,
)
REFRESH_CULTIVAR_SCHEMA = vol.Schema(
    {vol.Required(ATTR_CULTIVAR_ID): _non_empty_text},
    extra=vol.PREVENT_EXTRA,
)
BIND_SENSOR_SCHEMA = vol.All(
    vol.Schema(
        {
            vol.Required(ATTR_BINDING_KEY): vol.In(BINDABLE_SENSOR_KEYS),
            vol.Required(ATTR_ENTITY_ID): cv.entity_id,
            **RUN_SELECTOR_FIELDS,
        },
        extra=vol.PREVENT_EXTRA,
    ),
    _validate_run_selector,
)
UNBIND_SENSOR_SCHEMA = vol.All(
    vol.Schema(
        {
            vol.Required(ATTR_BINDING_KEY): vol.In(BINDABLE_SENSOR_KEYS),
            **RUN_SELECTOR_FIELDS,
        },
        extra=vol.PREVENT_EXTRA,
    ),
    _validate_run_selector,
)
LIST_RUNS_SCHEMA = vol.Schema({}, extra=vol.PREVENT_EXTRA)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up PlantRun."""
    hass.data.setdefault(DOMAIN, {})

    storage = PlantRunStorage(hass)
    await storage.async_load()

    manager = PlantRunManager(storage)
    hass.data[DOMAIN][DATA_STORAGE] = storage
    hass.data[DOMAIN][DATA_MANAGER] = manager

    async def _service_guard(coro):
        try:
            return await coro
        except ServiceValidationError:
            raise
        except (HomeAssistantError, ValueError) as exc:
            raise ServiceValidationError(str(exc)) from exc

    async def handle_start_run(call: ServiceCall) -> dict:
        return await _service_guard(_handle_start_run(call))

    async def _handle_start_run(call: ServiceCall) -> dict:
        run_id = await manager.start_run(
            run_name=call.data[ATTR_RUN_NAME],
            started_at=call.data.get(ATTR_STARTED_AT),
            phase=call.data.get(ATTR_PHASE, PHASE_GROWTH),
        )
        run = manager.get_run_or_raise(run_id)
        _LOGGER.info("Started run %s", run_id)
        return {"run_id": run_id, "display_id": run.get("display_id"), "run_name": run.get("name")}

    async def handle_import_run(call: ServiceCall) -> dict:
        return await _service_guard(_handle_import_run(call))

    async def _handle_import_run(call: ServiceCall) -> dict:
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
        await _service_guard(
            manager.end_run(
                run_id=call.data.get(ATTR_RUN_ID),
                run_name=call.data.get(ATTR_RUN_NAME),
                use_active_run=bool(call.data.get(ATTR_USE_ACTIVE_RUN, True)),
            )
        )

    async def handle_set_phase(call: ServiceCall) -> None:
        await _service_guard(
            manager.set_phase(
                phase=call.data[ATTR_PHASE],
                run_id=call.data.get(ATTR_RUN_ID),
                run_name=call.data.get(ATTR_RUN_NAME),
                use_active_run=bool(call.data.get(ATTR_USE_ACTIVE_RUN, True)),
            )
        )

    async def handle_add_note(call: ServiceCall) -> None:
        await _service_guard(
            manager.add_note(
                note=call.data[ATTR_NOTE],
                run_id=call.data.get(ATTR_RUN_ID),
                run_name=call.data.get(ATTR_RUN_NAME),
                use_active_run=bool(call.data.get(ATTR_USE_ACTIVE_RUN, True)),
            )
        )

    async def handle_search_cultivar(call: ServiceCall) -> dict:
        return await _service_guard(_handle_search_cultivar(call))

    async def _handle_search_cultivar(call: ServiceCall) -> dict:
        species = call.data[ATTR_SPECIES]
        breeder = call.data[ATTR_BREEDER]
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
        except HomeAssistantError as exc:
            _LOGGER.warning("SeedFinder fetch failed, trying local fallback: %s", exc)
            local_matches = manager.search_local_cultivars(species, breeder)
            if local_matches:
                return {
                    "result": local_matches[0],
                    "source": "local_cache",
                    "matches": local_matches,
                }
            raise HomeAssistantError(
                f"No cultivar found for species '{species}' and breeder '{breeder}'."
            ) from exc

    async def handle_attach_cultivar_to_run(call: ServiceCall) -> None:
        await _service_guard(
            manager.attach_cultivar_to_run(
                cultivar_id=call.data[ATTR_CULTIVAR_ID],
                run_id=call.data.get(ATTR_RUN_ID),
                run_name=call.data.get(ATTR_RUN_NAME),
                use_active_run=bool(call.data.get(ATTR_USE_ACTIVE_RUN, True)),
            )
        )

    async def handle_refresh_cultivar(call: ServiceCall) -> dict:
        return await _service_guard(_handle_refresh_cultivar(call))

    async def _handle_refresh_cultivar(call: ServiceCall) -> dict:
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
        await _service_guard(
            manager.bind_sensor_to_run(
                binding_key=call.data[ATTR_BINDING_KEY],
                entity_id=call.data[ATTR_ENTITY_ID],
                run_id=call.data.get(ATTR_RUN_ID),
                run_name=call.data.get(ATTR_RUN_NAME),
                use_active_run=bool(call.data.get(ATTR_USE_ACTIVE_RUN, True)),
            )
        )

    async def handle_unbind_sensor_from_run(call: ServiceCall) -> None:
        await _service_guard(
            manager.unbind_sensor_from_run(
                binding_key=call.data[ATTR_BINDING_KEY],
                run_id=call.data.get(ATTR_RUN_ID),
                run_name=call.data.get(ATTR_RUN_NAME),
                use_active_run=bool(call.data.get(ATTR_USE_ACTIVE_RUN, True)),
            )
        )

    async def handle_list_runs(call: ServiceCall) -> dict:
        return await _service_guard(_handle_list_runs(call))

    async def _handle_list_runs(call: ServiceCall) -> dict:
        del call
        runs = manager.list_runs()
        active_ids = set(manager.data.get("active_run_ids", []))
        return {
            "runs": [
                {
                    "run_id": r.get("id"),
                    "display_id": r.get("display_id"),
                    "run_name": r.get("name"),
                    "started_at": r.get("started_at"),
                    "ended_at": r.get("ended_at"),
                    "phase": r.get("phase"),
                    "active": r.get("id") in active_ids,
                }
                for r in runs
            ]
        }

    hass.services.async_register(
        DOMAIN,
        SERVICE_START_RUN,
        handle_start_run,
        schema=START_RUN_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_IMPORT_RUN,
        handle_import_run,
        schema=IMPORT_RUN_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
    hass.services.async_register(DOMAIN, SERVICE_END_RUN, handle_end_run, schema=END_RUN_SCHEMA)
    hass.services.async_register(
        DOMAIN, SERVICE_SET_PHASE, handle_set_phase, schema=SET_PHASE_SCHEMA
    )
    hass.services.async_register(DOMAIN, SERVICE_ADD_NOTE, handle_add_note, schema=ADD_NOTE_SCHEMA)
    hass.services.async_register(
        DOMAIN,
        SERVICE_SEARCH_CULTIVAR,
        handle_search_cultivar,
        schema=SEARCH_CULTIVAR_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_ATTACH_CULTIVAR_TO_RUN,
        handle_attach_cultivar_to_run,
        schema=ATTACH_CULTIVAR_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_REFRESH_CULTIVAR,
        handle_refresh_cultivar,
        schema=REFRESH_CULTIVAR_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_BIND_SENSOR_TO_RUN,
        handle_bind_sensor_to_run,
        schema=BIND_SENSOR_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_UNBIND_SENSOR_FROM_RUN,
        handle_unbind_sensor_from_run,
        schema=UNBIND_SENSOR_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_LIST_RUNS,
        handle_list_runs,
        schema=LIST_RUNS_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )

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

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok
