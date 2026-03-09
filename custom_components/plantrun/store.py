"""Storage for PlantRun."""

import copy
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

from .const import DOMAIN, STORE_KEY, STORE_SCHEMA_VERSION, STORE_VERSION
from .models import RunData

_LOGGER = logging.getLogger(__name__)


class PlantRunStorage:
    """Class to hold PlantRun data."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize the storage."""
        self.hass = hass
        self._store: Store[dict[str, Any]] = Store(hass, STORE_VERSION, STORE_KEY)
        self.runs: list[RunData] = []
        self._data: dict[str, Any] = {
            "schema_version": STORE_SCHEMA_VERSION,
            "runs": [],
            "active_run_id": None,
        }

    @staticmethod
    def _migrate_v1_to_v2(payload: dict[str, Any]) -> dict[str, Any]:
        """Migrate legacy v1 payloads to schema v2.

        v1 payloads did not require `schema_version` and often omitted `active_run_id`.
        """
        migrated = copy.deepcopy(payload)
        migrated.setdefault("runs", [])
        migrated.setdefault("active_run_id", None)

        normalized_runs: list[dict[str, Any]] = []
        for run in migrated.get("runs", []):
            if not isinstance(run, dict):
                continue
            run_copy = copy.deepcopy(run)
            run_copy.setdefault("notes", [])
            run_copy.setdefault("phases", [])
            run_copy.setdefault("bindings", [])
            normalized_runs.append(run_copy)
        migrated["runs"] = normalized_runs
        migrated["schema_version"] = STORE_SCHEMA_VERSION
        return migrated

    @classmethod
    def _normalize_payload(cls, payload: dict[str, Any] | None) -> tuple[dict[str, Any], bool]:
        """Normalize storage payload and return (payload, changed)."""
        if payload is None:
            return (
                {
                    "schema_version": STORE_SCHEMA_VERSION,
                    "runs": [],
                    "active_run_id": None,
                },
                True,
            )

        current = copy.deepcopy(payload)
        original = copy.deepcopy(payload)

        schema_version = current.get("schema_version")
        if not isinstance(schema_version, int):
            schema_version = 1
        if schema_version < STORE_SCHEMA_VERSION:
            current = cls._migrate_v1_to_v2(current)

        current.setdefault("schema_version", STORE_SCHEMA_VERSION)
        current.setdefault("runs", [])
        current.setdefault("active_run_id", None)

        return current, current != original

    async def async_load(self) -> None:
        """Load data from the store."""
        data = await self._store.async_load()
        normalized, changed = self._normalize_payload(data)

        self._data = normalized
        raw_runs = normalized.get("runs", [])
        self.runs = [RunData.from_dict(r) for r in raw_runs]

        # Persist upgraded binding IDs / schema upgrades from legacy records.
        if changed or self._bindings_need_migration(raw_runs):
            await self.async_save()

        _LOGGER.debug("Loaded %s runs from storage", len(self.runs))

    @staticmethod
    def _bindings_need_migration(raw_runs: list[dict[str, Any]]) -> bool:
        """Return true when one or more bindings are in legacy shape."""
        for run in raw_runs:
            ids: set[str] = set()
            for binding in run.get("bindings", []):
                binding_id = binding.get("id")
                if not isinstance(binding_id, str) or not binding_id.strip():
                    return True
                if binding_id in ids:
                    return True
                ids.add(binding_id)
        return False

    async def async_save(self) -> None:
        """Save data to the store."""
        self._data["schema_version"] = STORE_SCHEMA_VERSION
        self._data["runs"] = [run.to_dict() for run in self.runs]
        self._data.setdefault("active_run_id", None)
        await self._store.async_save(self._data)

    @property
    def active_run_id(self) -> str | None:
        """Return compatibility alias for active run fallback."""
        value = self._data.get("active_run_id")
        return value if isinstance(value, str) and value else None

    async def async_set_active_run_id(self, run_id: str | None) -> None:
        """Persist compatibility alias for active run fallback."""
        self._data["active_run_id"] = run_id
        await self.async_save()

    def get_run(self, run_id: str) -> RunData | None:
        """Get a run by ID."""
        for run in self.runs:
            if run.id == run_id:
                return run
        return None

    async def async_add_run(self, run: RunData) -> None:
        """Add a new run."""
        self.runs.append(run)
        await self.async_save()

    async def async_update_run(self, updated_run: RunData) -> None:
        """Update an existing run."""
        for i, run in enumerate(self.runs):
            if run.id == updated_run.id:
                self.runs[i] = updated_run
                await self.async_save()
                return
