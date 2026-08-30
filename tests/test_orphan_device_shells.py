import importlib.util
import sys
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PLANTRUN_DIR = ROOT / "custom_components" / "plantrun"

DOMAIN = "plantrun"
LIVE_RUN_ID = "run_2df887ffb2a4456389d1c05a3c66125c"
ORPHAN_ID = "0b46f385bb4541c0a862f1fdf70570be"
OTHER_ORPHAN_ID = "68b5f27b118a48e2a2cf302d0f3c5e72"


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


class FakeDevice:
    def __init__(self, device_id: str, identifiers, config_entries):
        self.id = device_id
        self.identifiers = set(identifiers)
        self.config_entries = set(config_entries)


class FakeDeviceRegistry:
    def __init__(self, devices=None):
        self.devices = {device.id: device for device in (devices or [])}
        self.removed = []

    def async_remove_device(self, device_id: str) -> None:
        if device_id in self.devices:
            self.removed.append(device_id)
            self.devices.pop(device_id, None)


class FakeStorage:
    def __init__(self, runs):
        self.runs = runs
        self.legacy_v2 = {"runs": [{"id": "legacy-hidden-run"}]}


class FakeRun:
    def __init__(self, run_id: str):
        self.id = run_id


def _install_stubs() -> None:
    ha = types.ModuleType("homeassistant")
    sys.modules.setdefault("homeassistant", ha)

    core = types.ModuleType("homeassistant.core")
    core.HomeAssistant = object
    sys.modules["homeassistant.core"] = core

    helpers = types.ModuleType("homeassistant.helpers")
    helpers.__path__ = []
    device_registry_mod = types.ModuleType("homeassistant.helpers.device_registry")

    def async_get(hass):
        return hass.device_registry

    def async_entries_for_config_entry(registry, entry_id):
        return [
            device
            for device in registry.devices.values()
            if entry_id in device.config_entries
        ]

    device_registry_mod.async_get = async_get
    device_registry_mod.async_entries_for_config_entry = async_entries_for_config_entry
    helpers.device_registry = device_registry_mod
    sys.modules["homeassistant.helpers"] = helpers
    sys.modules["homeassistant.helpers.device_registry"] = device_registry_mod

    custom_components = types.ModuleType("custom_components")
    custom_components.__path__ = [str(ROOT / "custom_components")]
    sys.modules.setdefault("custom_components", custom_components)
    plantrun_pkg = types.ModuleType("custom_components.plantrun")
    plantrun_pkg.__path__ = [str(PLANTRUN_DIR)]
    sys.modules["custom_components.plantrun"] = plantrun_pkg


_install_stubs()
_load_module("custom_components.plantrun.const", PLANTRUN_DIR / "const.py")
CLEANUP = _load_module(
    "custom_components.plantrun.device_cleanup",
    PLANTRUN_DIR / "device_cleanup.py",
)


def _orphan_device(entry_id="entry-1"):
    return FakeDevice(
        "0ba35f45b515117a8d3145580e6e6aeb",
        {(DOMAIN, ORPHAN_ID)},
        {entry_id},
    )


def _live_device(entry_id="entry-1"):
    return FakeDevice(
        "live-device",
        {(DOMAIN, LIVE_RUN_ID)},
        {entry_id},
    )


def _foreign_device(entry_id="entry-1"):
    return FakeDevice(
        "foreign-device",
        {("hue", "abc123")},
        {entry_id},
    )


class OrphanDeviceShellTests(unittest.TestCase):
    def test_orphan_bare_uuid_may_be_removed(self):
        live_ids = CLEANUP.live_run_ids(FakeStorage([FakeRun(LIVE_RUN_ID)]))
        self.assertTrue(CLEANUP.device_may_be_removed(_orphan_device(), live_ids))

    def test_live_run_device_must_not_be_removed(self):
        live_ids = CLEANUP.live_run_ids(FakeStorage([FakeRun(LIVE_RUN_ID)]))
        self.assertFalse(CLEANUP.device_may_be_removed(_live_device(), live_ids))

    def test_hidden_legacy_bucket_does_not_keep_a_shell(self):
        storage = FakeStorage([FakeRun(LIVE_RUN_ID)])
        live_ids = CLEANUP.live_run_ids(storage)
        self.assertNotIn("legacy-hidden-run", live_ids)
        self.assertTrue(
            CLEANUP.device_may_be_removed(
                FakeDevice("legacy-shell", {(DOMAIN, "legacy-hidden-run")}, {"entry-1"}),
                live_ids,
            )
        )

    def test_foreign_domain_device_must_not_be_removed(self):
        live_ids = CLEANUP.live_run_ids(FakeStorage([FakeRun(LIVE_RUN_ID)]))
        self.assertFalse(CLEANUP.device_may_be_removed(_foreign_device(), live_ids))

    def test_prune_removes_orphan_shells_and_keeps_live_and_foreign_devices(self):
        entry = types.SimpleNamespace(entry_id="entry-1")
        hass = types.SimpleNamespace(
            device_registry=FakeDeviceRegistry(
                [
                    _orphan_device(),
                    FakeDevice(
                        "2add613e0385d5f9695f1501312d94fc",
                        {(DOMAIN, OTHER_ORPHAN_ID)},
                        {entry.entry_id},
                    ),
                    _live_device(),
                    _foreign_device(),
                    FakeDevice(
                        "other-entry-orphan",
                        {(DOMAIN, "dead-on-other-entry")},
                        {"other-entry"},
                    ),
                ]
            )
        )

        removed = CLEANUP.async_prune_orphan_devices(
            hass,
            entry,
            CLEANUP.live_run_ids(FakeStorage([FakeRun(LIVE_RUN_ID)])),
        )

        self.assertEqual(removed, 2)
        self.assertEqual(
            hass.device_registry.removed,
            [
                "0ba35f45b515117a8d3145580e6e6aeb",
                "2add613e0385d5f9695f1501312d94fc",
            ],
        )
        self.assertIn("live-device", hass.device_registry.devices)
        self.assertIn("foreign-device", hass.device_registry.devices)
        self.assertIn("other-entry-orphan", hass.device_registry.devices)
