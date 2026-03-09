import asyncio
import base64
import importlib.util
import json
import shutil
import sys
import tempfile
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLANTRUN_DIR = ROOT / "custom_components" / "plantrun"


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def _install_homeassistant_stubs() -> None:
    vol = types.ModuleType("voluptuous")

    class Schema:
        def __init__(self, schema):
            self.schema = schema

    def Required(key, default=None):
        return key

    def Optional(key, default=None):
        return key

    def In(values):
        return values

    def All(*args, **kwargs):
        return args[0] if args else None

    def Length(min=0):
        return min

    def Coerce(_type):
        return _type

    vol.Schema = Schema
    vol.Required = Required
    vol.Optional = Optional
    vol.In = In
    vol.All = All
    vol.Length = Length
    vol.Coerce = Coerce
    sys.modules["voluptuous"] = vol

    ha = types.ModuleType("homeassistant")
    sys.modules.setdefault("homeassistant", ha)

    components = types.ModuleType("homeassistant.components")
    frontend = types.ModuleType("homeassistant.components.frontend")
    websocket_api = types.ModuleType("homeassistant.components.websocket_api")

    frontend._registered = []

    def async_register_built_in_panel(_hass, *_args, **_kwargs):
        frontend._registered.append((_args, _kwargs))

    def async_remove_panel(_hass, _path):
        return None

    frontend.async_register_built_in_panel = async_register_built_in_panel
    frontend.async_remove_panel = async_remove_panel

    websocket_api._registered = []

    def websocket_command(_schema):
        def decorator(func):
            return func

        return decorator

    def async_response(func):
        return func

    def async_register_command(_hass, command):
        websocket_api._registered.append(command)

    websocket_api.websocket_command = websocket_command
    websocket_api.async_response = async_response
    websocket_api.async_register_command = async_register_command

    sys.modules["homeassistant.components"] = components
    sys.modules["homeassistant.components.frontend"] = frontend
    sys.modules["homeassistant.components.websocket_api"] = websocket_api

    http_mod = types.ModuleType("homeassistant.components.http")

    class StaticPathConfig:
        def __init__(self, url_path, path, cache_headers=False):
            self.url_path = url_path
            self.path = path
            self.cache_headers = cache_headers

    http_mod.StaticPathConfig = StaticPathConfig
    sys.modules["homeassistant.components.http"] = http_mod

    config_entries = types.ModuleType("homeassistant.config_entries")

    class ConfigFlow:
        def __init_subclass__(cls, **_kwargs):
            return None

    class OptionsFlow:
        def async_abort(self, reason):
            return {"type": "abort", "reason": reason}

        def async_show_form(self, step_id, data_schema=None, errors=None):
            return {"type": "form", "step_id": step_id, "errors": errors or {}}

        def async_create_entry(self, title, data):
            return {"type": "create_entry", "title": title, "data": data}

    class ConfigEntry:
        def __init__(self, entry_id="entry-1"):
            self.entry_id = entry_id
            self.runtime_data = None

        def add_update_listener(self, _listener):
            return lambda: None

        def async_on_unload(self, _cb):
            return None

    config_entries.ConfigFlow = ConfigFlow
    config_entries.OptionsFlow = OptionsFlow
    config_entries.ConfigEntry = ConfigEntry
    sys.modules["homeassistant.config_entries"] = config_entries

    core = types.ModuleType("homeassistant.core")

    class HomeAssistant:
        pass

    class ServiceCall:
        def __init__(self, data=None):
            self.data = data or {}

    def callback(func):
        return func

    core.HomeAssistant = HomeAssistant
    core.ServiceCall = ServiceCall
    core.callback = callback
    sys.modules["homeassistant.core"] = core

    data_flow = types.ModuleType("homeassistant.data_entry_flow")
    data_flow.FlowResult = dict
    sys.modules["homeassistant.data_entry_flow"] = data_flow

    helpers_mod = types.ModuleType("homeassistant.helpers")
    selector_mod = types.ModuleType("homeassistant.helpers.selector")

    class DateSelector:
        pass

    class EntitySelectorConfig:
        def __init__(self, domain):
            self.domain = domain

    class EntitySelector:
        def __init__(self, config):
            self.config = config

    selector_mod.DateSelector = DateSelector
    selector_mod.EntitySelectorConfig = EntitySelectorConfig
    selector_mod.EntitySelector = EntitySelector
    sys.modules["homeassistant.helpers"] = helpers_mod
    sys.modules["homeassistant.helpers.selector"] = selector_mod

    aiohttp_client = types.ModuleType("homeassistant.helpers.aiohttp_client")
    aiohttp_client._session = object()

    def async_get_clientsession(_hass):
        return aiohttp_client._session

    aiohttp_client.async_get_clientsession = async_get_clientsession
    sys.modules["homeassistant.helpers.aiohttp_client"] = aiohttp_client

    exceptions_mod = types.ModuleType("homeassistant.exceptions")

    class ServiceValidationError(Exception):
        pass

    exceptions_mod.ServiceValidationError = ServiceValidationError
    sys.modules["homeassistant.exceptions"] = exceptions_mod


class FakeStorage:
    instances = []

    def __init__(self, _hass=None):
        self.runs = []
        self.active_run_id = None
        self.saved_runs = []
        FakeStorage.instances.append(self)

    async def async_load(self):
        return None

    async def async_add_run(self, run):
        self.runs.append(run)

    async def async_set_active_run_id(self, run_id):
        self.active_run_id = run_id

    async def async_update_run(self, run):
        self.saved_runs.append(run.id)
        for index, existing in enumerate(self.runs):
            if existing.id == run.id:
                self.runs[index] = run
                return
        self.runs.append(run)

    def get_run(self, run_id):
        for run in self.runs:
            if run.id == run_id:
                return run
        return None


class FakeCoordinator:
    def __init__(self, _hass, storage):
        self.storage = storage
        self.refresh_calls = 0

    async def async_refresh(self):
        self.refresh_calls += 1

    async def async_request_refresh(self):
        return None


class FakeServices:
    def __init__(self):
        self._services = {}
        self.calls = []

    def has_service(self, domain, name):
        return (domain, name) in self._services

    def async_remove(self, domain, name):
        self._services.pop((domain, name), None)

    def async_register(self, domain, name, handler, schema=None):
        self._services[(domain, name)] = handler

    async def async_call(self, domain, name, data=None, blocking=False):
        self.calls.append((domain, name, data or {}, blocking))
        return None

    def get_handler(self, domain, name):
        return self._services[(domain, name)]


class FakeConfigEntries:
    async def async_forward_entry_setups(self, _entry, _platforms):
        return True

    async def async_unload_platforms(self, _entry, _platforms):
        return True


class FakeHTTP:
    def __init__(self):
        self.calls = 0

    async def async_register_static_paths(self, _paths):
        self.calls += 1


class FakeConfig:
    def __init__(self, root: Path):
        self._root = root

    def path(self, *parts):
        return str(self._root.joinpath(*parts))


class StabilityLifecycleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        _install_homeassistant_stubs()

        custom_components = types.ModuleType("custom_components")
        custom_components.__path__ = [str(ROOT / "custom_components")]
        sys.modules.setdefault("custom_components", custom_components)

        plantrun_pkg = types.ModuleType("custom_components.plantrun")
        plantrun_pkg.__path__ = [str(PLANTRUN_DIR)]
        sys.modules["custom_components.plantrun"] = plantrun_pkg

        _load_module("custom_components.plantrun.const", PLANTRUN_DIR / "const.py")
        models = _load_module("custom_components.plantrun.models", PLANTRUN_DIR / "models.py")
        _load_module("custom_components.plantrun.run_resolution", PLANTRUN_DIR / "run_resolution.py")
        _load_module("custom_components.plantrun.retention", PLANTRUN_DIR / "retention.py")
        _load_module("custom_components.plantrun.summary", PLANTRUN_DIR / "summary.py")

        providers_mod = types.ModuleType("custom_components.plantrun.providers_seedfinder")
        providers_mod.calls = []

        async def async_search_cultivar(_breeder, _strain, session=None):
            providers_mod.calls.append(("search", session))
            if _breeder == "Barney's Farm":
                return [
                    models.CultivarSnapshot(
                        name="Runtz Layer Cake",
                        breeder=_breeder,
                        detail_url="https://example.invalid/detail",
                    )
                ]
            return []

        async def async_fetch_cultivar_image_url(_detail_url, session=None):
            providers_mod.calls.append(("image", session))
            return "https://example.invalid/image.jpg"

        providers_mod.async_search_cultivar = async_search_cultivar
        providers_mod.async_fetch_cultivar_image_url = async_fetch_cultivar_image_url
        sys.modules["custom_components.plantrun.providers_seedfinder"] = providers_mod
        cls.providers = providers_mod
        cls.models = models

        coordinator_mod = types.ModuleType("custom_components.plantrun.coordinator")
        coordinator_mod.PlantRunCoordinator = FakeCoordinator
        sys.modules["custom_components.plantrun.coordinator"] = coordinator_mod

        store_mod = types.ModuleType("custom_components.plantrun.store")
        store_mod.PlantRunStorage = FakeStorage
        sys.modules["custom_components.plantrun.store"] = store_mod

        cls.config_flow = _load_module("custom_components.plantrun.config_flow", PLANTRUN_DIR / "config_flow.py")
        cls.integration = _load_module("custom_components.plantrun.__init__", PLANTRUN_DIR / "__init__.py")

    def setUp(self):
        self.providers.calls.clear()
        FakeStorage.instances.clear()
        self.tmpdir = Path(tempfile.mkdtemp(prefix="plantrun-test-"))

    def tearDown(self):
        shutil.rmtree(self.tmpdir, ignore_errors=True)

    def _build_hass(self):
        services = FakeServices()
        executor_calls = []

        async def async_add_executor_job(func):
            executor_calls.append(func)
            return func()

        hass = types.SimpleNamespace(
            data={},
            http=FakeHTTP(),
            config=FakeConfig(self.tmpdir),
            services=services,
            config_entries=FakeConfigEntries(),
            async_add_executor_job=async_add_executor_job,
        )
        hass._executor_calls = executor_calls
        return hass

    def test_options_flow_aborts_cleanly_when_storage_not_ready(self):
        ConfigEntry = sys.modules["homeassistant.config_entries"].ConfigEntry
        entry = ConfigEntry("entry-missing")
        flow = self.config_flow.PlantRunOptionsFlowHandler(entry)
        flow.hass = types.SimpleNamespace(data={self.config_flow.DOMAIN: {}})

        result = asyncio.run(flow.async_step_init())
        self.assertEqual(result["type"], "abort")
        self.assertEqual(result["reason"], "integration_not_ready")

    def test_setup_entry_sets_runtime_data_and_registers_module_panel_once(self):
        frontend = sys.modules["homeassistant.components.frontend"]
        frontend._registered.clear()
        hass = self._build_hass()
        entry = sys.modules["homeassistant.config_entries"].ConfigEntry("entry-1")

        asyncio.run(self.integration.async_setup_entry(hass, entry))
        asyncio.run(self.integration.async_setup_entry(hass, entry))

        self.assertEqual(hass.http.calls, 1)
        self.assertEqual(len(frontend._registered), 1)
        _, panel_kwargs = frontend._registered[0]
        self.assertEqual(
            panel_kwargs["config"]["_panel_custom"]["module_url"],
            self.integration.PANEL_MODULE_URL,
        )
        self.assertIn("storage", entry.runtime_data)
        self.assertIn("coordinator", entry.runtime_data)

    def test_panel_script_is_loaded_as_a_versioned_module(self):
        panel_script = (PLANTRUN_DIR / "www" / "plantrun-panel.js").read_text(encoding="utf-8")
        manifest_version = json.loads((PLANTRUN_DIR / "manifest.json").read_text(encoding="utf-8"))[
            "version"
        ]

        self.assertNotIn('import {', panel_script)
        self.assertIn('customElements.get("ha-panel-lovelace")', panel_script)
        self.assertEqual(
            self.integration.PANEL_MODULE_URL,
            f"/plantrun_frontend/plantrun-panel.js?v={manifest_version}",
        )

    def test_options_flow_uses_shared_session_for_seedfinder_lookup(self):
        ConfigEntry = sys.modules["homeassistant.config_entries"].ConfigEntry
        entry = ConfigEntry("entry-seedfinder")
        storage = FakeStorage()
        entry.runtime_data = {"storage": storage}
        flow = self.config_flow.PlantRunOptionsFlowHandler(entry)
        flow.hass = self._build_hass()

        result = asyncio.run(
            flow.async_step_create_run_start(
                {
                    "friendly_name": "Tent A",
                    "planted_date": "2026-03-10",
                    "cultivar_breeder": "Barney's Farm",
                    "cultivar_strain": "Runtz Layer Cake",
                }
            )
        )

        self.assertEqual(result["step_id"], "create_run_details")
        self.assertEqual(self.providers.calls[0][0], "search")
        self.assertIs(
            self.providers.calls[0][1],
            sys.modules["homeassistant.helpers.aiohttp_client"]._session,
        )

    def test_options_flow_service_calls_wait_for_completion(self):
        ConfigEntry = sys.modules["homeassistant.config_entries"].ConfigEntry
        entry = ConfigEntry("entry-options")
        storage = FakeStorage()
        entry.runtime_data = {"storage": storage}
        flow = self.config_flow.PlantRunOptionsFlowHandler(entry)
        flow.hass = self._build_hass()
        flow._create_friendly_name = "Tent B"
        flow._create_planted_date = "2026-03-10"
        flow._create_seedfinder_results = []

        result = asyncio.run(
            flow.async_step_create_run_details(
                {
                    "cultivar_result": "None",
                    "temperature_sensor": "sensor.tent_temp",
                }
            )
        )

        self.assertEqual(result["type"], "create_entry")
        self.assertEqual(len(flow.hass.services.calls), 1)
        domain, name, data, blocking = flow.hass.services.calls[0]
        self.assertEqual((domain, name), (self.config_flow.DOMAIN, "add_binding"))
        self.assertEqual(data["sensor_id"], "sensor.tent_temp")
        self.assertTrue(blocking)

    def test_set_cultivar_service_uses_shared_session(self):
        hass = self._build_hass()
        entry = sys.modules["homeassistant.config_entries"].ConfigEntry("entry-service")
        asyncio.run(self.integration.async_setup_entry(hass, entry))

        storage = FakeStorage.instances[-1]
        run = self.models.RunData(id="run-1", friendly_name="Tent C", start_time="2026-03-10T00:00:00")
        storage.runs.append(run)
        storage.active_run_id = run.id

        handler = hass.services.get_handler(self.integration.DOMAIN, "set_cultivar")
        call = sys.modules["homeassistant.core"].ServiceCall(
            {
                "run_id": run.id,
                "cultivar_name": "Runtz Layer Cake",
                "breeder": "Barney's Farm",
            }
        )

        asyncio.run(handler(call))

        self.assertEqual([name for name, _session in self.providers.calls], ["search", "image"])
        for _name, session in self.providers.calls:
            self.assertIs(session, sys.modules["homeassistant.helpers.aiohttp_client"]._session)
        self.assertEqual(run.image_source, "seedfinder")

    def test_set_run_image_uses_executor_for_filesystem_writes(self):
        hass = self._build_hass()
        entry = sys.modules["homeassistant.config_entries"].ConfigEntry("entry-image")
        asyncio.run(self.integration.async_setup_entry(hass, entry))

        storage = FakeStorage.instances[-1]
        run = self.models.RunData(id="run-image", friendly_name="Tent D", start_time="2026-03-10T00:00:00")
        storage.runs.append(run)
        storage.active_run_id = run.id

        handler = hass.services.get_handler(self.integration.DOMAIN, "set_run_image")
        call = sys.modules["homeassistant.core"].ServiceCall(
            {
                "run_id": run.id,
                "image_data": base64.b64encode(b"image-bytes").decode("ascii"),
                "file_name": "photo.png",
            }
        )

        asyncio.run(handler(call))

        self.assertEqual(len(hass._executor_calls), 1)
        self.assertEqual(run.image_source, "uploaded")
        self.assertTrue((self.tmpdir / "www" / self.integration.UPLOADS_SUBDIR).exists())


if __name__ == "__main__":
    unittest.main()
