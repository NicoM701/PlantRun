import sys
import types
import unittest


def _install_homeassistant_stubs() -> None:
    if "homeassistant" in sys.modules:
        return

    homeassistant = types.ModuleType("homeassistant")
    exceptions = types.ModuleType("homeassistant.exceptions")
    helpers = types.ModuleType("homeassistant.helpers")
    dispatcher = types.ModuleType("homeassistant.helpers.dispatcher")
    aiohttp_client = types.ModuleType("homeassistant.helpers.aiohttp_client")
    config_validation = types.ModuleType("homeassistant.helpers.config_validation")
    core = types.ModuleType("homeassistant.core")
    config_entries = types.ModuleType("homeassistant.config_entries")
    storage_mod = types.ModuleType("homeassistant.helpers.storage")

    class HomeAssistantError(Exception):
        pass

    class HomeAssistant:
        pass

    class ConfigEntry:
        pass

    class ServiceCall:
        def __init__(self, data):
            self.data = data

    class SupportsResponse:
        ONLY = "only"

    class Store:
        def __init__(self, hass, version, key):
            del hass, version, key
            self._data = None

        def __class_getitem__(cls, _item):
            return cls

        async def async_load(self):
            return self._data

        async def async_save(self, data):
            self._data = data

    exceptions.HomeAssistantError = HomeAssistantError
    exceptions.ServiceValidationError = HomeAssistantError
    dispatcher.async_dispatcher_send = lambda *_args, **_kwargs: None
    aiohttp_client.async_get_clientsession = lambda hass: hass
    config_validation.entity_id = lambda value: value
    core.HomeAssistant = HomeAssistant
    core.ServiceCall = ServiceCall
    core.SupportsResponse = SupportsResponse
    config_entries.ConfigEntry = ConfigEntry
    storage_mod.Store = Store

    homeassistant.exceptions = exceptions
    homeassistant.helpers = helpers
    homeassistant.core = core

    sys.modules["homeassistant"] = homeassistant
    sys.modules["homeassistant.exceptions"] = exceptions
    sys.modules["homeassistant.helpers"] = helpers
    sys.modules["homeassistant.helpers.dispatcher"] = dispatcher
    sys.modules["homeassistant.helpers.aiohttp_client"] = aiohttp_client
    sys.modules["homeassistant.helpers.config_validation"] = config_validation
    sys.modules["homeassistant.core"] = core
    sys.modules["homeassistant.config_entries"] = config_entries
    sys.modules["homeassistant.helpers.storage"] = storage_mod


def _install_voluptuous_stub() -> None:
    if "voluptuous" in sys.modules:
        return

    voluptuous = types.ModuleType("voluptuous")

    class Invalid(Exception):
        pass

    class _Schema:
        def __init__(self, *_args, **_kwargs):
            pass

        def __call__(self, value):
            return value

    def _required(value, default=None):
        del default
        return value

    def _optional(value, default=None):
        del default
        return value

    def _in(_values):
        def _validator(value):
            return value

        return _validator

    def _all(*_validators):
        def _validator(value):
            return value

        return _validator

    voluptuous.Invalid = Invalid
    voluptuous.Schema = _Schema
    voluptuous.Required = _required
    voluptuous.Optional = _optional
    voluptuous.In = _in
    voluptuous.All = _all
    voluptuous.PREVENT_EXTRA = object()

    sys.modules["voluptuous"] = voluptuous


def _install_external_lib_stubs() -> None:
    if "aiohttp" not in sys.modules:
        aiohttp = types.ModuleType("aiohttp")

        class ClientSession:  # pragma: no cover
            pass

        aiohttp.ClientSession = ClientSession
        sys.modules["aiohttp"] = aiohttp

    if "bs4" not in sys.modules:
        bs4 = types.ModuleType("bs4")

        class BeautifulSoup:  # pragma: no cover
            def __init__(self, *_args, **_kwargs):
                pass

        bs4.BeautifulSoup = BeautifulSoup
        sys.modules["bs4"] = bs4


_install_homeassistant_stubs()
_install_voluptuous_stub()
_install_external_lib_stubs()

from homeassistant.exceptions import HomeAssistantError

from custom_components.plantrun import async_setup
from custom_components.plantrun.const import (
    DATA_MANAGER,
    DOMAIN,
    SERVICE_END_RUN,
    SERVICE_SEARCH_CULTIVAR,
    SERVICE_START_RUN,
)


class _FakeServices:
    def __init__(self):
        self.handlers = {}

    def async_register(self, domain, service, handler, schema=None, supports_response=None):
        del schema, supports_response
        self.handlers[(domain, service)] = handler


class _FakeHass:
    def __init__(self):
        self.data = {}
        self.services = _FakeServices()


class ServiceCompatibilityTests(unittest.IsolatedAsyncioTestCase):
    async def test_end_run_service_respects_explicit_first_active_strategy(self):
        hass = _FakeHass()
        await async_setup(hass, {})
        start_handler = hass.services.handlers[(DOMAIN, SERVICE_START_RUN)]
        end_handler = hass.services.handlers[(DOMAIN, SERVICE_END_RUN)]
        manager = hass.data[DOMAIN][DATA_MANAGER]

        first = await start_handler(types.SimpleNamespace(data={"run_name": "Run A"}))
        second = await start_handler(types.SimpleNamespace(data={"run_name": "Run B"}))
        manager.data["active_run_id"] = second["run_id"]

        await end_handler(
            types.SimpleNamespace(
                data={"use_active_run": True, "active_run_strategy": "first_active"}
            )
        )

        self.assertIsNotNone(manager.data["runs"][first["run_id"]]["ended_at"])
        self.assertIsNone(manager.data["runs"][second["run_id"]]["ended_at"])

    async def test_search_cultivar_without_breeder_uses_local_cache(self):
        hass = _FakeHass()
        await async_setup(hass, {})
        manager = hass.data[DOMAIN][DATA_MANAGER]
        manager.data["cultivars"]["seedfinder:test:blue-dream"] = {
            "cultivar_id": "seedfinder:test:blue-dream",
            "species": "Blue Dream",
            "breeder": "Test Seeds",
        }
        handler = hass.services.handlers[(DOMAIN, SERVICE_SEARCH_CULTIVAR)]

        result = await handler(types.SimpleNamespace(data={"species": "Blue Dream"}))

        self.assertEqual(result["source"], "local_cache")
        self.assertEqual(result["result"]["cultivar_id"], "seedfinder:test:blue-dream")
        self.assertIn("No breeder provided", result["message"])

    async def test_search_cultivar_without_breeder_clear_error_when_no_local_match(self):
        hass = _FakeHass()
        await async_setup(hass, {})
        handler = hass.services.handlers[(DOMAIN, SERVICE_SEARCH_CULTIVAR)]

        with self.assertRaises(HomeAssistantError) as ctx:
            await handler(types.SimpleNamespace(data={"species": "Unknown Strain"}))

        self.assertIn("Provide breeder for SeedFinder lookup", str(ctx.exception))


if __name__ == "__main__":
    unittest.main()
