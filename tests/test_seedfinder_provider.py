import sys
import types
import unittest


def _install_homeassistant_stubs() -> None:
    if "homeassistant" in sys.modules:
        return

    homeassistant = types.ModuleType("homeassistant")
    exceptions = types.ModuleType("homeassistant.exceptions")
    config_entries = types.ModuleType("homeassistant.config_entries")
    core = types.ModuleType("homeassistant.core")
    helpers = types.ModuleType("homeassistant.helpers")
    aiohttp_client = types.ModuleType("homeassistant.helpers.aiohttp_client")
    config_validation = types.ModuleType("homeassistant.helpers.config_validation")
    dispatcher = types.ModuleType("homeassistant.helpers.dispatcher")
    storage_mod = types.ModuleType("homeassistant.helpers.storage")

    class HomeAssistantError(Exception):
        pass

    class ConfigEntry:
        pass

    class HomeAssistant:
        pass

    class ServiceCall:
        data = {}

    class SupportsResponse:
        ONLY = "only"

    class Store:
        def __init__(self, hass, version, key):
            self._data = None

        def __class_getitem__(cls, _item):
            return cls

        async def async_load(self):
            return self._data

        async def async_save(self, data):
            self._data = data

    exceptions.HomeAssistantError = HomeAssistantError
    exceptions.ServiceValidationError = HomeAssistantError
    config_entries.ConfigEntry = ConfigEntry
    core.HomeAssistant = HomeAssistant
    core.ServiceCall = ServiceCall
    core.SupportsResponse = SupportsResponse
    aiohttp_client.async_get_clientsession = lambda hass: hass
    config_validation.entity_id = lambda value: value
    dispatcher.async_dispatcher_send = lambda *_args, **_kwargs: None
    storage_mod.Store = Store

    homeassistant.config_entries = config_entries
    homeassistant.core = core
    homeassistant.helpers = helpers
    homeassistant.exceptions = exceptions

    sys.modules["homeassistant"] = homeassistant
    sys.modules["homeassistant.exceptions"] = exceptions
    sys.modules["homeassistant.config_entries"] = config_entries
    sys.modules["homeassistant.core"] = core
    sys.modules["homeassistant.helpers"] = helpers
    sys.modules["homeassistant.helpers.aiohttp_client"] = aiohttp_client
    sys.modules["homeassistant.helpers.config_validation"] = config_validation
    sys.modules["homeassistant.helpers.dispatcher"] = dispatcher
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
        _ = default
        return value

    def _optional(value, default=None):
        _ = default
        return value

    def _coerce(converter):
        def _convert(value):
            return converter(value)

        return _convert

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
    voluptuous.Coerce = _coerce
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

from custom_components.plantrun.providers_seedfinder import (
    _breeder_path,
    _normalize_seedfinder_url,
    _score_match,
)


class SeedFinderProviderTests(unittest.TestCase):
    def test_breeder_path_normalizes_and_encodes(self):
        self.assertEqual(_breeder_path(" Fast Buds 420 "), "fast-buds-420")

    def test_score_prefers_automatic_when_requested(self):
        plain = _score_match("Green Apple", "Green Apple", prefer_automatic=False)
        automatic = _score_match("Green Apple", "Green Apple Auto", prefer_automatic=True)
        self.assertGreater(automatic, plain)

    def test_normalize_seedfinder_url_joins_relative_path(self):
        url = _normalize_seedfinder_url("https://seedfinder.eu", "/en/strain/green-apple/")
        self.assertEqual(url, "https://seedfinder.eu/en/strain/green-apple/")

    def test_normalize_seedfinder_url_rejects_foreign_host(self):
        with self.assertRaises(HomeAssistantError):
            _normalize_seedfinder_url("https://seedfinder.eu", "https://example.com/evil")


if __name__ == "__main__":
    unittest.main()
