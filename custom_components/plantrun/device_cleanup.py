"""Drop leftover PlantRun device-registry shells that no longer match a live run."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr

from .const import DOMAIN


def live_run_ids(storage: Any) -> set[str]:
    """Return current storage.runs ids only. Never the hidden v2 legacy bucket."""
    return {run.id for run in getattr(storage, "runs", []) if getattr(run, "id", None)}


def _plantrun_identifiers(device: Any) -> list[str]:
    identifiers = getattr(device, "identifiers", ()) or ()
    return [ident for domain, ident in identifiers if domain == DOMAIN]


def device_may_be_removed(device: Any, live_ids: set[str]) -> bool:
    """Return True when every PlantRun identifier is absent from current storage.runs."""
    identifiers = _plantrun_identifiers(device)
    if not identifiers:
        return False
    return all(ident not in live_ids for ident in identifiers)


def async_prune_orphan_devices(
    hass: HomeAssistant,
    entry: Any,
    live_ids: set[str],
) -> int:
    """Remove config-entry devices whose PlantRun identifiers are not live run ids."""
    registry = dr.async_get(hass)
    removed = 0
    for device in dr.async_entries_for_config_entry(registry, entry.entry_id):
        if not device_may_be_removed(device, live_ids):
            continue
        registry.async_remove_device(device.id)
        removed += 1
    return removed
