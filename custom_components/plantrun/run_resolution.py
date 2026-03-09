"""Run resolution helpers for service compatibility and safety."""

from __future__ import annotations

from .const import (
    ACTIVE_RUN_STRATEGIES,
    ACTIVE_RUN_STRATEGY_ACTIVE_RUN_ID,
    ACTIVE_RUN_STRATEGY_FIRST_ACTIVE,
    ACTIVE_RUN_STRATEGY_LEGACY,
)
from .models import RunData
from .store import PlantRunStorage


def _norm(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _active_runs(storage: PlantRunStorage) -> list[RunData]:
    return [run for run in storage.runs if run.status == "active"]


def resolve_run_or_raise(
    storage: PlantRunStorage,
    *,
    run_id: str | None,
    run_name: str | None,
    use_active_run: bool,
    strict_active_resolution: bool,
    active_run_strategy: str,
) -> RunData:
    """Resolve run selection with compatibility and strict-mode controls."""
    if active_run_strategy not in ACTIVE_RUN_STRATEGIES:
        raise ValueError(
            f"Invalid active_run_strategy '{active_run_strategy}'. "
            f"Expected one of: {', '.join(ACTIVE_RUN_STRATEGIES)}"
        )

    if run_id:
        run = storage.get_run(run_id)
        if not run:
            raise ValueError(f"Run '{run_id}' was not found.")
        return run

    if run_name:
        matches = [run for run in storage.runs if _norm(run.friendly_name) == _norm(run_name)]
        if len(matches) == 1:
            return matches[0]
        if not matches:
            raise ValueError(f"No run found with run_name '{run_name}'.")
        raise ValueError(
            f"Multiple runs match run_name '{run_name}'. Pass run_id for an explicit target."
        )

    if not use_active_run:
        raise ValueError(
            "Missing run selector. Pass run_id/run_name or set use_active_run=true."
        )

    active_runs = _active_runs(storage)
    if not active_runs:
        raise ValueError("No active run is available.")
    if len(active_runs) == 1:
        return active_runs[0]

    if strict_active_resolution:
        descriptors = [f"{run.friendly_name} ({run.id})" for run in active_runs]
        raise ValueError(
            "Multiple runs are active. Pass run_id/run_name explicitly. Active runs: "
            + ", ".join(descriptors)
        )

    active_run_id = storage.active_run_id
    if active_run_strategy in (
        ACTIVE_RUN_STRATEGY_LEGACY,
        ACTIVE_RUN_STRATEGY_ACTIVE_RUN_ID,
    ):
        if active_run_id:
            for run in active_runs:
                if run.id == active_run_id:
                    return run
        if active_run_strategy == ACTIVE_RUN_STRATEGY_ACTIVE_RUN_ID:
            raise ValueError(
                "active_run_strategy='active_run_id' requires a valid active_run_id."
            )

    if active_run_strategy == ACTIVE_RUN_STRATEGY_FIRST_ACTIVE:
        return active_runs[0]

    return active_runs[0]
