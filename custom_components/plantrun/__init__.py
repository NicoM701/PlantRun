"""The PlantRun integration."""
import base64
import binascii
import json
import logging
import re
from datetime import datetime, timezone
from functools import partial
from pathlib import Path
from typing import Any

import voluptuous as vol

try:
    from aiohttp import web
except Exception:  # pragma: no cover - lightweight test stubs may not provide aiohttp.web
    class _WebCompat:
        @staticmethod
        def json_response(payload: Any, status: int = 200) -> dict[str, Any]:
            return {"status": status, "payload": payload}

    web = _WebCompat()

from homeassistant.components import frontend, websocket_api
try:
    from homeassistant.components.http import HomeAssistantView, StaticPathConfig
except ImportError:  # pragma: no cover - compatibility for test stubs
    from homeassistant.components.http import StaticPathConfig

    class HomeAssistantView:  # type: ignore[no-redef]
        requires_auth = True

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import ServiceValidationError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers import entity_registry as er

from .const import (
    ACTIVE_RUN_STRATEGIES,
    ACTIVE_RUN_STRATEGY_LEGACY,
    ATTR_ACTIVE_RUN_STRATEGY,
    ATTR_RUN_ID,
    ATTR_RUN_NAME,
    ATTR_STRICT_ACTIVE_RESOLUTION,
    ATTR_USE_ACTIVE_RUN,
    ALLOWED_METRIC_TYPES,
    DOMAIN,
    INITIAL_PHASE_NAME,
    PLATFORMS,
    UNSUPPORTED_BINDING_METRIC_TYPES,
)
from .coordinator import PlantRunCoordinator
from .history_context import build_binding_history_context
from .models import Binding, CultivarSnapshot, Note, Phase, RunData
from . import providers_seedfinder as _providers_seedfinder
from .retention import async_capture_daily_rollup, get_summary_with_rollup_fallback
from .run_resolution import resolve_run_or_raise
from .store import PlantRunStorage
from .summary import summary_energy_preferences_from_options

async_fetch_cultivar_image = _providers_seedfinder.async_fetch_cultivar_image
async_search_cultivar = _providers_seedfinder.async_search_cultivar
async_search_cultivar_by_query = getattr(
    _providers_seedfinder,
    "async_search_cultivar_by_query",
    _providers_seedfinder.async_search_cultivar,
)

_LOGGER = logging.getLogger(__name__)

PANEL_URL_PATH = "plantrun-dashboard"
PANEL_TITLE = "PlantRun"
PANEL_ICON = "mdi:sprout"
CANONICAL_PHASES = {
    "seedling": "Seedling",
    "vegetative": "Vegetative",
    "flowering": "Flowering",
    "harvest": "Harvested",
    "harvested": "Harvested",
}
_MANIFEST_VERSION = json.loads((Path(__file__).parent / "manifest.json").read_text(encoding="utf-8"))[
    "version"
]
_PANEL_SCRIPT_PATH = Path(__file__).parent / "www" / "plantrun-panel.js"
_PANEL_SCRIPT_CACHE_KEY = f"{_MANIFEST_VERSION}-{int(_PANEL_SCRIPT_PATH.stat().st_mtime)}"
PANEL_MODULE_URL = f"/plantrun_frontend/plantrun-panel.js?v={_PANEL_SCRIPT_CACHE_KEY}"
PANEL_JS_URL = PANEL_MODULE_URL
UPLOADS_SUBDIR = "plantrun_uploads"
_OBSOLETE_LEGACY_ENTITY_IDS = {
    "sensor.plantrun_active_cultivar",
    "sensor.plantrun_active_phase",
    "sensor.plantrun_active_run",
    "sensor.plantrun_active_run_count",
    "sensor.plantrun_last_event",
    "sensor.plantrun_active_cultivar_breeder",
    "sensor.plantrun_active_cultivar_flower_window",
}
_OBSOLETE_LEGACY_UNIQUE_IDS = {
    "plantrun_active_cultivar_name",
    "plantrun_active_phase",
    "plantrun_active_run",
    "plantrun_active_run_count",
    "plantrun_last_event",
    "plantrun_active_cultivar_breeder",
    "plantrun_active_cultivar_flower_window",
}


def _write_uploaded_image(output_dir: Path, output_name: str, raw: bytes) -> None:
    """Persist uploaded image data outside the event loop."""
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / output_name).write_bytes(raw)


def _storage_for_hass(hass: HomeAssistant) -> PlantRunStorage | None:
    """Return the first configured PlantRun storage instance."""
    domain_data = hass.data.get(DOMAIN, {})
    for entry_data in domain_data.values():
        if isinstance(entry_data, dict) and "storage" in entry_data:
            storage = entry_data["storage"]
            if isinstance(storage, PlantRunStorage):
                return storage
    return None


def _summary_energy_preferences_for_hass(hass: HomeAssistant) -> dict[str, Any]:
    """Return normalized pricing preferences for the single configured entry."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        return summary_energy_preferences_from_options(None)
    return summary_energy_preferences_from_options(entries[0].options)


def _source_entity_exists(hass: HomeAssistant, entity_id: str) -> bool:
    """Return True when the bound HA source entity exists in the state machine."""
    states = getattr(hass, "states", None)
    if states is None or not hasattr(states, "get"):
        return False
    return states.get(entity_id) is not None


def _is_obsolete_legacy_entity(entity_entry: Any) -> bool:
    """Return True when an entity registry entry matches a known retired singleton."""
    return (
        getattr(entity_entry, "entity_id", None) in _OBSOLETE_LEGACY_ENTITY_IDS
        or getattr(entity_entry, "unique_id", None) in _OBSOLETE_LEGACY_UNIQUE_IDS
    )


def _async_remove_obsolete_legacy_entities(hass: HomeAssistant, entry: ConfigEntry) -> int:
    """Remove retired singleton sensor registry entries for this config entry."""
    registry = er.async_get(hass)
    removed = 0
    for entity_entry in er.async_entries_for_config_entry(registry, entry.entry_id):
        if not _is_obsolete_legacy_entity(entity_entry):
            continue
        registry.async_remove(entity_entry.entity_id)
        removed += 1
    return removed


@websocket_api.websocket_command({"type": "plantrun/get_runs"})
@websocket_api.async_response
async def websocket_get_runs(hass: HomeAssistant, connection: Any, msg: dict[str, Any]) -> None:
    """Return full PlantRun runtime state for the sidebar dashboard."""
    storage = _storage_for_hass(hass)
    if storage is None:
        connection.send_error(msg["id"], "not_loaded", "PlantRun is not loaded")
        return

    connection.send_result(
        msg["id"],
        {
            "runs": [run.to_dict() for run in storage.runs],
            "active_run_id": storage.active_run_id,
        },
    )


@websocket_api.websocket_command({"type": "plantrun/get_run", "run_id": str})
@websocket_api.async_response
async def websocket_get_run(hass: HomeAssistant, connection: Any, msg: dict[str, Any]) -> None:
    """Return one PlantRun run for lightweight frontend consumers."""
    storage = _storage_for_hass(hass)
    if storage is None:
        connection.send_error(msg["id"], "not_loaded", "PlantRun is not loaded")
        return

    run = storage.get_run(msg["run_id"])
    if run is None:
        connection.send_error(msg["id"], "not_found", f"Run '{msg['run_id']}' not found")
        return

    connection.send_result(msg["id"], {"run": run.to_dict()})


@websocket_api.websocket_command({"type": "plantrun/get_run_summary", "run_id": str})
@websocket_api.async_response
async def websocket_get_run_summary(
    hass: HomeAssistant, connection: Any, msg: dict[str, Any]
) -> None:
    """Return run KPI summary for panel cards."""
    storage = _storage_for_hass(hass)
    if storage is None:
        connection.send_error(msg["id"], "not_loaded", "PlantRun is not loaded")
        return

    run = storage.get_run(msg["run_id"])
    if run is None:
        connection.send_error(msg["id"], "not_found", f"Run '{msg['run_id']}' not found")
        return

    connection.send_result(
        msg["id"],
        get_summary_with_rollup_fallback(
            storage,
            run,
            **_summary_energy_preferences_for_hass(hass),
        ),
    )


@websocket_api.websocket_command(
    {"type": "plantrun/get_run_binding_history_context", "run_id": str, "binding_id": str}
)
@websocket_api.async_response
async def websocket_get_run_binding_history_context(
    hass: HomeAssistant, connection: Any, msg: dict[str, Any]
) -> None:
    """Return recorder query context for one run binding."""
    storage = _storage_for_hass(hass)
    if storage is None:
        connection.send_error(msg["id"], "not_loaded", "PlantRun is not loaded")
        return

    run = storage.get_run(msg["run_id"])
    if run is None:
        connection.send_error(msg["id"], "not_found", f"Run '{msg['run_id']}' not found")
        return

    binding = run.get_binding(msg["binding_id"])
    if binding is None:
        connection.send_error(
            msg["id"],
            "not_found",
            f"Binding '{msg['binding_id']}' not found on run '{run.id}'",
        )
        return

    connection.send_result(
        msg["id"],
        {
            "context": build_binding_history_context(
                run,
                binding,
                source_exists=_source_entity_exists(hass, binding.sensor_id),
            )
        },
    )


class PlantRunSearchView(HomeAssistantView):
    """HTTP endpoint used by the rebuilt frontend for live cultivar search."""

    url = "/api/plantrun/search_cultivar"
    name = "api:plantrun:search_cultivar"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    async def post(self, request: Any) -> Any:
        """Return scored cultivar suggestions for breeder/query pairs."""
        payload = await request.json()
        breeder = str(payload.get("breeder", "")).strip()
        query = str(
            payload.get("query")
            or payload.get("cultivar")
            or payload.get("cultivar_name")
            or payload.get("strain")
            or ""
        ).strip()

        if not breeder or not query:
            return web.json_response({"results": []})

        session = async_get_clientsession(self.hass)
        results = await async_search_cultivar_by_query(breeder, query, session=session)
        return web.json_response({"results": [result.to_dict() for result in results[:5]]})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up PlantRun from a config entry."""
    hass.data.setdefault(DOMAIN, {})

    if not hass.data[DOMAIN].get("_static_registered"):
        # Register frontend static path (HA API changed from sync to async registration).
        if hasattr(hass.http, "async_register_static_paths"):
            await hass.http.async_register_static_paths(
                [
                    StaticPathConfig(
                        "/plantrun_frontend",
                        hass.config.path("custom_components/plantrun/www"),
                        cache_headers=False,
                    )
                ]
            )
        else:
            # Backward-compat for older HA cores.
            hass.http.register_static_path(
                "/plantrun_frontend",
                hass.config.path("custom_components/plantrun/www"),
                cache_headers=False,
            )
        hass.data[DOMAIN]["_static_registered"] = True

    if not hass.data[DOMAIN].get("_panel_registered"):
        frontend.async_register_built_in_panel(
            hass,
            "custom",
            sidebar_title=PANEL_TITLE,
            sidebar_icon=PANEL_ICON,
            frontend_url_path=PANEL_URL_PATH,
            config={
                "_panel_custom": {
                    "name": "plantrun-dashboard-panel",
                    "embed_iframe": False,
                    "trust_external": False,
                    # Keep both for cross-version HA compatibility.
                    "module_url": PANEL_MODULE_URL,
                    "js_url": PANEL_JS_URL,
                }
            },
            require_admin=False,
        )
        hass.data[DOMAIN]["_panel_registered"] = True

    if not hass.data[DOMAIN].get("_ws_registered"):
        websocket_api.async_register_command(hass, websocket_get_runs)
        websocket_api.async_register_command(hass, websocket_get_run)
        websocket_api.async_register_command(hass, websocket_get_run_summary)
        websocket_api.async_register_command(hass, websocket_get_run_binding_history_context)
        hass.data[DOMAIN]["_ws_registered"] = True

    if not hass.data[DOMAIN].get("_search_view_registered"):
        search_view = PlantRunSearchView(hass)
        if hasattr(hass.http, "register_view"):
            hass.http.register_view(search_view)
        elif hasattr(hass.http, "async_register_view"):
            await hass.http.async_register_view(search_view)
        hass.data[DOMAIN]["_search_view_registered"] = True

    storage = PlantRunStorage(hass)
    await storage.async_load()

    coordinator = PlantRunCoordinator(hass, storage)
    await coordinator.async_refresh()

    runtime_data = {
        "storage": storage,
        "coordinator": coordinator,
    }
    hass.data[DOMAIN][entry.entry_id] = runtime_data
    entry.runtime_data = runtime_data

    removed_legacy_entities = _async_remove_obsolete_legacy_entities(hass, entry)
    if removed_legacy_entities:
        _LOGGER.info(
            "Removed %s obsolete legacy PlantRun sensor registry entr%s during setup.",
            removed_legacy_entities,
            "y" if removed_legacy_entities == 1 else "ies",
        )

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(async_reload_entry))

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

    async def refresh_after_update() -> None:
        await coordinator.async_request_refresh()

    async def handle_create_daily_rollup(call: ServiceCall) -> None:
        """Capture one daily summary snapshot for a target run."""
        run = resolve_target_run(call)
        await async_capture_daily_rollup(
            storage,
            run,
            **_summary_energy_preferences_for_hass(hass),
        )
        await refresh_after_update()

    async def handle_create_run(call: ServiceCall) -> None:
        """Handle the create_run service."""
        friendly_name = call.data.get("friendly_name", "Unnamed Run")
        start_time = call.data.get("start_time", datetime.now(timezone.utc).isoformat())
        planted_date = call.data.get("planted_date")

        new_run = RunData(
            friendly_name=friendly_name,
            start_time=start_time,
            planted_date=planted_date,
            phases=[Phase(name=INITIAL_PHASE_NAME, start_time=start_time)],
        )
        await storage.async_add_run(new_run)
        await storage.async_set_active_run_id(new_run.id)
        await refresh_after_update()
        _LOGGER.info("Created new run: %s", new_run.id)

    async def handle_add_phase(call: ServiceCall) -> None:
        """Handle the add_phase service."""
        run = resolve_target_run(call)
        phase_name = str(call.data["phase_name"]).strip()
        canonical_phase = CANONICAL_PHASES.get(phase_name.lower())
        if not canonical_phase:
            raise ServiceValidationError(
                "phase_name must be one of Seedling, Vegetative, Flowering, or Harvested."
            )
        now = datetime.now(timezone.utc).isoformat()

        current_phase = run.phases[-1].name if run.phases else None
        if current_phase == canonical_phase:
            _LOGGER.info("Skipped duplicate phase %s on run %s", canonical_phase, run.id)
            return

        if run.phases:
            run.phases[-1].end_time = now

        run.phases.append(Phase(name=canonical_phase, start_time=now))

        if canonical_phase == "Harvested":
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
        await refresh_after_update()
        _LOGGER.info("Added phase %s to run %s", canonical_phase, run.id)

    async def handle_add_note(call: ServiceCall) -> None:
        """Handle the add_note service."""
        run = resolve_target_run(call)
        text = call.data["text"]
        now = datetime.now(timezone.utc).isoformat()
        run.notes.append(Note(text=text, timestamp=now))
        await storage.async_update_run(run)
        await refresh_after_update()
        _LOGGER.info("Added note to run %s", run.id)

    async def handle_update_note(call: ServiceCall) -> None:
        """Handle the update_note service."""
        run = resolve_target_run(call)
        note_id = call.data["note_id"]
        new_text = call.data["text"]

        note = next((n for n in run.notes if n.id == note_id), None)
        if note is None:
            raise ServiceValidationError(f"Note '{note_id}' not found on run '{run.id}'.")

        note.text = new_text
        note.timestamp = datetime.now(timezone.utc).isoformat()
        await storage.async_update_run(run)
        await refresh_after_update()
        _LOGGER.info("Updated note %s on run %s", note_id, run.id)

    async def handle_delete_note(call: ServiceCall) -> None:
        """Handle the delete_note service."""
        run = resolve_target_run(call)
        note_id = call.data["note_id"]

        initial_count = len(run.notes)
        run.notes = [n for n in run.notes if n.id != note_id]
        if len(run.notes) == initial_count:
            raise ServiceValidationError(f"Note '{note_id}' not found on run '{run.id}'.")

        await storage.async_update_run(run)
        await refresh_after_update()
        _LOGGER.info("Deleted note %s from run %s", note_id, run.id)

    async def handle_end_run(call: ServiceCall) -> None:
        """Handle the end_run service."""
        run = resolve_target_run(call)
        end_time = call.data.get("end_time", datetime.now(timezone.utc).isoformat())

        run.end_time = end_time
        run.status = "ended"
        if run.phases:
            run.phases[-1].end_time = end_time

        await storage.async_update_run(run)
        if storage.active_run_id == run.id:
            replacement = next((r.id for r in storage.runs if r.status == "active"), None)
            await storage.async_set_active_run_id(replacement)
        await refresh_after_update()
        _LOGGER.info("Ended run %s", run.id)

    async def handle_set_cultivar(call: ServiceCall) -> None:
        """Handle the set_cultivar service using SeedFinder provider."""
        run = resolve_target_run(call)

        cultivar_name = call.data["cultivar_name"].strip()
        if not cultivar_name:
            raise ServiceValidationError("cultivar_name must not be empty after trimming whitespace.")
        breeder = str(call.data.get("breeder", "")).strip()
        strain = str(call.data.get("strain", "")).strip()

        if breeder:
            lookup_strain = strain or cultivar_name
            session = async_get_clientsession(hass)
            results = await async_search_cultivar(breeder, lookup_strain, session=session)
            if not results:
                raise ServiceValidationError(
                    "Cultivar lookup failed: no SeedFinder result for "
                    f"breeder='{breeder}', strain='{lookup_strain}'."
                )
            selected = results[0]
            if selected.detail_url and not selected.image_url:
                image_selection = await async_fetch_cultivar_image(
                    selected.detail_url,
                    selected.name or lookup_strain,
                    session=session,
                )
                selected.image_url = image_selection.url
            else:
                image_selection = None
            run.cultivar = selected
            if selected.image_url and not run.image_url:
                run.image_url = selected.image_url
                run.image_source = "seedfinder"
            _LOGGER.info(
                "Attached Cultivar %s from SeedFinder to run %s", run.cultivar.name, run.id
            )
        else:
            run.cultivar = CultivarSnapshot(name=cultivar_name, breeder="Unknown (Manual Entry)")
            _LOGGER.info(
                "Saved manual cultivar snapshot for run %s (name=%s)", run.id, cultivar_name
            )

        await storage.async_update_run(run)
        await refresh_after_update()

    async def handle_add_binding(call: ServiceCall) -> None:
        """Handle the add_binding service."""
        run = resolve_target_run(call)
        metric_type = str(call.data["metric_type"]).strip()
        sensor_id = str(call.data["sensor_id"]).strip()

        if metric_type not in ALLOWED_METRIC_TYPES:
            raise ServiceValidationError(
                f"Unsupported metric_type '{metric_type}'. Allowed values: {', '.join(ALLOWED_METRIC_TYPES)}."
            )

        if metric_type in UNSUPPORTED_BINDING_METRIC_TYPES:
            raise ServiceValidationError(
                "camera bindings are not yet supported by the current sensor-only PlantRun model. "
                "Please bind camera entities outside PlantRun for now."
            )

        if not sensor_id:
            raise ServiceValidationError("sensor_id must not be empty.")

        if run.has_binding(metric_type, sensor_id):
            raise ServiceValidationError(
                f"Binding already exists for metric_type='{metric_type}' and sensor_id='{sensor_id}'."
            )

        binding = Binding(metric_type=metric_type, sensor_id=sensor_id)
        run.bindings.append(binding)

        await storage.async_update_run(run)
        await refresh_after_update()
        _LOGGER.info(
            "Bound %s to %s for run %s (binding_id=%s)",
            sensor_id,
            metric_type,
            run.id,
            binding.id,
        )

    def resolve_binding_from_call(call: ServiceCall, run: RunData) -> Binding:
        """Resolve a binding from explicit binding id or exact metric/sensor match."""
        binding_id = str(call.data.get("binding_id", "")).strip()
        if binding_id:
            binding = next((item for item in run.bindings if item.id == binding_id), None)
            if binding is None:
                raise ServiceValidationError(
                    f"Binding '{binding_id}' not found on run '{run.id}'."
                )
            return binding

        metric_type = str(call.data.get("metric_type", "")).strip()
        sensor_id = str(call.data.get("sensor_id", "")).strip()
        binding = next(
            (
                item
                for item in run.bindings
                if item.metric_type == metric_type and item.sensor_id == sensor_id
            ),
            None,
        )
        if binding is None:
            raise ServiceValidationError(
                "Binding lookup failed. Provide binding_id or the exact metric_type + sensor_id pair."
            )
        return binding

    async def handle_remove_binding(call: ServiceCall) -> None:
        """Handle the remove_binding service without deleting sensor history."""
        run = resolve_target_run(call)
        binding = resolve_binding_from_call(call, run)

        run.bindings = [item for item in run.bindings if item.id != binding.id]
        await storage.async_update_run(run)
        await refresh_after_update()
        _LOGGER.info(
            "Removed binding %s from run %s (metric_type=%s, sensor_id=%s)",
            binding.id,
            run.id,
            binding.metric_type,
            binding.sensor_id,
        )

    async def handle_update_binding(call: ServiceCall) -> None:
        """Handle the update_binding service for existing run bindings."""
        run = resolve_target_run(call)
        binding = resolve_binding_from_call(call, run)

        new_metric_type = str(call.data["metric_type"]).strip()
        new_sensor_id = str(call.data["sensor_id"]).strip()

        if new_metric_type not in ALLOWED_METRIC_TYPES:
            raise ServiceValidationError(
                f"Unsupported metric_type '{new_metric_type}'. Allowed values: {', '.join(ALLOWED_METRIC_TYPES)}."
            )

        if new_metric_type in UNSUPPORTED_BINDING_METRIC_TYPES:
            raise ServiceValidationError(
                "camera bindings are not yet supported by the current sensor-only PlantRun model. "
                "Please bind camera entities outside PlantRun for now."
            )

        if not new_sensor_id:
            raise ServiceValidationError("sensor_id must not be empty.")

        duplicate = next(
            (
                item
                for item in run.bindings
                if item.id != binding.id
                and item.metric_type == new_metric_type
                and item.sensor_id == new_sensor_id
            ),
            None,
        )
        if duplicate is not None:
            raise ServiceValidationError(
                f"Binding already exists for metric_type='{new_metric_type}' and sensor_id='{new_sensor_id}'."
            )

        binding.metric_type = new_metric_type
        binding.sensor_id = new_sensor_id
        await storage.async_update_run(run)
        await refresh_after_update()
        _LOGGER.info(
            "Updated binding %s on run %s to metric_type=%s sensor_id=%s",
            binding.id,
            run.id,
            binding.metric_type,
            binding.sensor_id,
        )

    async def handle_update_run(call: ServiceCall) -> None:
        """Handle partial run updates for sidebar CRUD flows."""
        run = resolve_target_run(call)

        for field in ("friendly_name", "status"):
            if field in call.data:
                setattr(run, field, call.data[field])

        if "planted_date" in call.data:
            run.planted_date = call.data["planted_date"] or None

        if "notes_summary" in call.data:
            run.notes_summary = call.data["notes_summary"] or None

        if "dry_yield_grams" in call.data:
            value = call.data["dry_yield_grams"]
            run.dry_yield_grams = None if value is None else float(value)

        if "base_config" in call.data:
            base_config = call.data["base_config"]
            if not isinstance(base_config, dict):
                raise ServiceValidationError("base_config must be an object/map.")
            run.base_config = base_config

        if "image_url" in call.data:
            run.image_url = call.data["image_url"]
        if "image_source" in call.data:
            run.image_source = call.data["image_source"]

        await storage.async_update_run(run)
        await refresh_after_update()

    async def handle_set_run_image(call: ServiceCall) -> None:
        """Handle image upload URL assignment for a run."""
        run = resolve_target_run(call)

        image_url = call.data.get("image_url")
        image_source = call.data.get("image_source", "manual")
        image_data = call.data.get("image_data")
        file_name = call.data.get("file_name", "upload.jpg")

        if image_data:
            payload = image_data
            if payload.startswith("data:"):
                _, _, payload = payload.partition(",")
            try:
                raw = base64.b64decode(payload, validate=True)
            except (binascii.Error, ValueError) as err:
                raise ServiceValidationError("image_data is not valid base64 data.") from err

            if len(raw) > 8 * 1024 * 1024:
                raise ServiceValidationError("Uploaded image exceeds 8MB limit.")

            suffix = Path(file_name).suffix.lower()
            if suffix not in {".jpg", ".jpeg", ".png", ".webp"}:
                suffix = ".jpg"

            sanitized = re.sub(r"[^a-zA-Z0-9_-]+", "_", run.id)
            ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
            output_name = f"{sanitized}_{ts}{suffix}"

            output_dir = Path(hass.config.path("www", UPLOADS_SUBDIR))
            await hass.async_add_executor_job(
                partial(_write_uploaded_image, output_dir, output_name, raw)
            )

            run.image_url = f"/local/{UPLOADS_SUBDIR}/{output_name}"
            run.image_source = "uploaded"
        elif image_url:
            run.image_url = image_url
            run.image_source = image_source
        else:
            raise ServiceValidationError("Provide either image_data or image_url.")

        await storage.async_update_run(run)
        await refresh_after_update()

    run_resolution_schema = {
        vol.Optional(ATTR_RUN_ID): str,
        vol.Optional(ATTR_RUN_NAME): str,
        vol.Optional(ATTR_USE_ACTIVE_RUN, default=False): bool,
        vol.Optional(ATTR_STRICT_ACTIVE_RESOLUTION, default=False): bool,
        vol.Optional(ATTR_ACTIVE_RUN_STRATEGY, default=ACTIVE_RUN_STRATEGY_LEGACY): vol.In(
            ACTIVE_RUN_STRATEGIES
        ),
    }

    def register_service(name: str, handler: Any, schema: vol.Schema) -> None:
        if hass.services.has_service(DOMAIN, name):
            hass.services.async_remove(DOMAIN, name)
        hass.services.async_register(DOMAIN, name, handler, schema=schema)

    register_service(
        "create_run",
        handle_create_run,
        vol.Schema(
            {
                vol.Required("friendly_name"): str,
                vol.Optional("start_time"): str,
                vol.Optional("planted_date"): str,
            }
        ),
    )

    register_service(
        "create_daily_rollup",
        handle_create_daily_rollup,
        vol.Schema({**run_resolution_schema}),
    )

    register_service(
        "add_phase",
        handle_add_phase,
        vol.Schema(
            {
                **run_resolution_schema,
                vol.Required("phase_name"): str,
            }
        ),
    )

    register_service(
        "add_note",
        handle_add_note,
        vol.Schema(
            {
                **run_resolution_schema,
                vol.Required("text"): str,
            }
        ),
    )

    register_service(
        "update_note",
        handle_update_note,
        vol.Schema(
            {
                **run_resolution_schema,
                vol.Required("note_id"): str,
                vol.Required("text"): str,
            }
        ),
    )

    register_service(
        "delete_note",
        handle_delete_note,
        vol.Schema(
            {
                **run_resolution_schema,
                vol.Required("note_id"): str,
            }
        ),
    )

    register_service(
        "end_run",
        handle_end_run,
        vol.Schema(
            {
                **run_resolution_schema,
                vol.Optional("end_time"): str,
            }
        ),
    )

    register_service(
        "set_cultivar",
        handle_set_cultivar,
        vol.Schema(
            {
                **run_resolution_schema,
                vol.Required("cultivar_name"): str,
                vol.Optional("breeder"): str,
                vol.Optional("strain"): str,
            }
        ),
    )

    register_service(
        "add_binding",
        handle_add_binding,
        vol.Schema(
            {
                **run_resolution_schema,
                vol.Required("metric_type"): vol.In(ALLOWED_METRIC_TYPES),
                vol.Required("sensor_id"): vol.All(str, vol.Length(min=1)),
            }
        ),
    )

    register_service(
        "remove_binding",
        handle_remove_binding,
        vol.Schema(
            {
                **run_resolution_schema,
                vol.Optional("binding_id"): str,
                vol.Optional("metric_type"): vol.In(ALLOWED_METRIC_TYPES),
                vol.Optional("sensor_id"): str,
            }
        ),
    )

    register_service(
        "update_binding",
        handle_update_binding,
        vol.Schema(
            {
                **run_resolution_schema,
                vol.Required("binding_id"): str,
                vol.Required("metric_type"): vol.In(ALLOWED_METRIC_TYPES),
                vol.Required("sensor_id"): vol.All(str, vol.Length(min=1)),
            }
        ),
    )

    register_service(
        "update_run",
        handle_update_run,
        vol.Schema(
            {
                **run_resolution_schema,
                vol.Optional("friendly_name"): str,
                vol.Optional("planted_date"): vol.Any(None, str),
                vol.Optional("notes_summary"): vol.Any(None, str),
                vol.Optional("status"): str,
                vol.Optional("dry_yield_grams"): vol.Any(None, vol.Coerce(float)),
                vol.Optional("base_config"): dict,
                vol.Optional("image_url"): str,
                vol.Optional("image_source"): str,
            }
        ),
    )

    register_service(
        "set_run_image",
        handle_set_run_image,
        vol.Schema(
            {
                **run_resolution_schema,
                vol.Optional("image_data"): str,
                vol.Optional("file_name"): str,
                vol.Optional("image_url"): str,
                vol.Optional("image_source"): str,
            }
        ),
    )

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
        entry.runtime_data = None
        has_other_entries = any(
            isinstance(value, dict) and "storage" in value
            for value in hass.data.get(DOMAIN, {}).values()
        )
        if not has_other_entries and hass.data.get(DOMAIN, {}).get("_panel_registered"):
            frontend.async_remove_panel(hass, PANEL_URL_PATH)
            hass.data[DOMAIN]["_panel_registered"] = False

    return unload_ok


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload config entry when options change."""
    await hass.config_entries.async_reload(entry.entry_id)
