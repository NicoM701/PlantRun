import asyncio
import copy
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

    def async_dispatcher_send(*_args, **_kwargs):
        return None

    exceptions.HomeAssistantError = HomeAssistantError
    exceptions.ServiceValidationError = HomeAssistantError
    dispatcher.async_dispatcher_send = async_dispatcher_send
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

from custom_components.plantrun.const import DEFAULT_DATA
from custom_components.plantrun.manager import PlantRunManager


class FakeStorage:
    def __init__(self):
        self.data = copy.deepcopy(DEFAULT_DATA)
        self.hass = object()

    async def async_save(self):
        return None

    @staticmethod
    def utc_now_iso() -> str:
        return "2026-03-09T00:00:00+00:00"


class PlantRunManagerTests(unittest.IsolatedAsyncioTestCase):
    async def test_import_rejects_end_before_start(self):
        manager = PlantRunManager(FakeStorage())

        with self.assertRaises(HomeAssistantError):
            await manager.import_run(
                run_name="Run A",
                started_at="2026-03-09T12:00:00+00:00",
                ended_at="2026-03-08T12:00:00+00:00",
            )

    async def test_resolve_active_defaults_to_legacy_compatible_fallback_when_multiple_active(self):
        manager = PlantRunManager(FakeStorage())

        run_a = await manager.start_run("Run A", started_at="2026-03-01T00:00:00+00:00")
        await manager.start_run("Run B", started_at="2026-03-02T00:00:00+00:00")

        resolved = manager.resolve_run_or_raise(use_active_run=True)
        self.assertEqual(resolved["id"], run_a)

    async def test_resolve_active_strict_mode_requires_explicit_when_multiple_active(self):
        manager = PlantRunManager(FakeStorage())

        await manager.start_run("Run A", started_at="2026-03-01T00:00:00+00:00")
        await manager.start_run("Run B", started_at="2026-03-02T00:00:00+00:00")

        with self.assertRaises(HomeAssistantError):
            manager.resolve_run_or_raise(use_active_run=True, strict_active_resolution=True)

    async def test_resolve_active_prefers_active_run_id_when_multiple_active(self):
        manager = PlantRunManager(FakeStorage())

        run_a = await manager.start_run("Run A", started_at="2026-03-01T00:00:00+00:00")
        run_b = await manager.start_run("Run B", started_at="2026-03-02T00:00:00+00:00")
        manager.data["active_run_id"] = run_b

        resolved = manager.resolve_run_or_raise(use_active_run=True)
        self.assertEqual(resolved["id"], run_b)
        self.assertNotEqual(resolved["id"], run_a)

    async def test_resolve_active_first_active_strategy_ignores_active_run_id_alias(self):
        manager = PlantRunManager(FakeStorage())

        run_a = await manager.start_run("Run A", started_at="2026-03-01T00:00:00+00:00")
        run_b = await manager.start_run("Run B", started_at="2026-03-02T00:00:00+00:00")
        manager.data["active_run_id"] = run_b

        resolved = manager.resolve_run_or_raise(use_active_run=True, active_run_strategy="first_active")
        self.assertEqual(resolved["id"], run_a)

    async def test_resolve_active_active_run_id_strategy_errors_when_alias_invalid(self):
        manager = PlantRunManager(FakeStorage())

        await manager.start_run("Run A", started_at="2026-03-01T00:00:00+00:00")
        await manager.start_run("Run B", started_at="2026-03-02T00:00:00+00:00")
        manager.data["active_run_id"] = "missing-id"

        with self.assertRaises(HomeAssistantError):
            manager.resolve_run_or_raise(use_active_run=True, active_run_strategy="active_run_id")

    async def test_list_runs_sorted_desc_by_started_at(self):
        manager = PlantRunManager(FakeStorage())

        await manager.start_run("Older", started_at="2026-03-01T00:00:00+00:00")
        await manager.start_run("Newer", started_at="2026-03-03T00:00:00+00:00")

        names = [run["name"] for run in manager.list_runs()]
        self.assertEqual(names[:2], ["Newer", "Older"])


if __name__ == "__main__":
    unittest.main()
