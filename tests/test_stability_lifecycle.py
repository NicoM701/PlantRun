import asyncio
import importlib.util
import sys
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
    sys.modules["homeassistant.helpers.selector"] = selector_mod

    exceptions_mod = types.ModuleType("homeassistant.exceptions")

    class ServiceValidationError(Exception):
        pass

    exceptions_mod.ServiceValidationError = ServiceValidationError
    sys.modules["homeassistant.exceptions"] = exceptions_mod


class FakeStorage:
    def __init__(self, _hass=None):
        self.runs = []
        self.active_run_id = None

    async def async_load(self):
        return None


class FakeCoordinator:
    def __init__(self, _hass, storage):
        self.storage = storage
        self.refresh_calls = 0

    async def async_refresh(self):
        self.refresh_calls += 1

    async def async_request_refresh(self):
        return None


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
        _load_module("custom_components.plantrun.models", PLANTRUN_DIR / "models.py")
        _load_module("custom_components.plantrun.run_resolution", PLANTRUN_DIR / "run_resolution.py")
        _load_module("custom_components.plantrun.retention", PLANTRUN_DIR / "retention.py")
        _load_module("custom_components.plantrun.summary", PLANTRUN_DIR / "summary.py")
        providers_mod = types.ModuleType("custom_components.plantrun.providers_seedfinder")

        async def async_search_cultivar(_breeder, _strain):
            return []

        async def async_fetch_cultivar_image_url(_detail_url):
            return None

        providers_mod.async_search_cultivar = async_search_cultivar
        providers_mod.async_fetch_cultivar_image_url = async_fetch_cultivar_image_url
        sys.modules["custom_components.plantrun.providers_seedfinder"] = providers_mod

        coordinator_mod = types.ModuleType("custom_components.plantrun.coordinator")
        coordinator_mod.PlantRunCoordinator = FakeCoordinator
        sys.modules["custom_components.plantrun.coordinator"] = coordinator_mod

        store_mod = types.ModuleType("custom_components.plantrun.store")
        store_mod.PlantRunStorage = FakeStorage
        sys.modules["custom_components.plantrun.store"] = store_mod

        cls.config_flow = _load_module("custom_components.plantrun.config_flow", PLANTRUN_DIR / "config_flow.py")
        cls.integration = _load_module("custom_components.plantrun.__init__", PLANTRUN_DIR / "__init__.py")

    def test_options_flow_aborts_cleanly_when_storage_not_ready(self):
        ConfigEntry = sys.modules["homeassistant.config_entries"].ConfigEntry
        entry = ConfigEntry("entry-missing")
        flow = self.config_flow.PlantRunOptionsFlowHandler(entry)
        flow.hass = types.SimpleNamespace(data={self.config_flow.DOMAIN: {}})

        result = asyncio.run(flow.async_step_init())
        self.assertEqual(result["type"], "abort")
        self.assertEqual(result["reason"], "integration_not_ready")

    def test_setup_entry_sets_runtime_data_and_registers_static_once(self):
        class FakeHTTP:
            def __init__(self):
                self.calls = 0

            async def async_register_static_paths(self, _paths):
                self.calls += 1

        class FakeConfig:
            @staticmethod
            def path(value):
                return f"/tmp/{value}"

        class FakeServices:
            def __init__(self):
                self._services = set()

            def has_service(self, domain, name):
                return (domain, name) in self._services

            def async_remove(self, domain, name):
                self._services.discard((domain, name))

            def async_register(self, domain, name, _handler, schema=None):
                self._services.add((domain, name))

        class FakeConfigEntries:
            async def async_forward_entry_setups(self, _entry, _platforms):
                return True

            async def async_unload_platforms(self, _entry, _platforms):
                return True

        hass = types.SimpleNamespace(
            data={},
            http=FakeHTTP(),
            config=FakeConfig(),
            services=FakeServices(),
            config_entries=FakeConfigEntries(),
        )
        entry = sys.modules["homeassistant.config_entries"].ConfigEntry("entry-1")

        asyncio.run(self.integration.async_setup_entry(hass, entry))
        asyncio.run(self.integration.async_setup_entry(hass, entry))

        self.assertEqual(hass.http.calls, 1)
        self.assertIn("storage", entry.runtime_data)
        self.assertIn("coordinator", entry.runtime_data)


if __name__ == "__main__":
    unittest.main()
