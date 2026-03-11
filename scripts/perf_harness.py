#!/usr/bin/env python3
"""Synthetic perf harness for summary/store hot paths."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import types
from datetime import datetime, timedelta, timezone
from pathlib import Path
from time import perf_counter

ROOT = Path(__file__).resolve().parents[1]
PLANTRUN_DIR = ROOT / "custom_components" / "plantrun"


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


custom_components = types.ModuleType("custom_components")
custom_components.__path__ = [str(ROOT / "custom_components")]
sys.modules.setdefault("custom_components", custom_components)
plantrun_pkg = types.ModuleType("custom_components.plantrun")
plantrun_pkg.__path__ = [str(PLANTRUN_DIR)]
sys.modules["custom_components.plantrun"] = plantrun_pkg

MODELS = _load_module("custom_components.plantrun.models", PLANTRUN_DIR / "models.py")
INSTRUMENTATION = _load_module("custom_components.plantrun.instrumentation", PLANTRUN_DIR / "instrumentation.py")
SUMMARY = _load_module("custom_components.plantrun.summary", PLANTRUN_DIR / "summary.py")

Note = MODELS.Note
RunData = MODELS.RunData
PlantRunInstrumentation = INSTRUMENTATION.PlantRunInstrumentation
build_run_summary = SUMMARY.build_run_summary


def _build_run(index: int, notes_per_run: int) -> RunData:
    start = datetime(2026, 1, 1, tzinfo=timezone.utc) + timedelta(days=index)
    history = {
        "energy": [
            {"timestamp": (start + timedelta(hours=i)).isoformat(), "value": float(index * 10 + i)}
            for i in range(24)
        ],
        "temperature": [{"value": 22.0 + (i % 5) * 0.3} for i in range(24)],
        "humidity": [{"value": 50.0 + (i % 7) * 0.4} for i in range(24)],
    }
    notes = [
        Note(text=f"note-{index}-{n}", timestamp=(start + timedelta(hours=n % 24)).isoformat())
        for n in range(notes_per_run)
    ]
    return RunData(
        id=f"run-{index}",
        friendly_name=f"Run {index}",
        start_time=start.isoformat(),
        end_time=(start + timedelta(hours=23)).isoformat(),
        notes=notes,
        sensor_history=history,
    )


def run_harness(runs: int, notes_per_run: int, iterations: int) -> dict[str, object]:
    dataset = [_build_run(i, notes_per_run) for i in range(runs)]
    instrumentation = PlantRunInstrumentation(enabled=True)

    t0 = perf_counter()
    for _ in range(iterations):
        for run in dataset:
            build_run_summary(
                run,
                energy_price_per_kwh=0.31,
                energy_currency="EUR",
                instrumentation=instrumentation,
            )
            run.to_dict()
    elapsed_ms = (perf_counter() - t0) * 1000.0

    return {
        "config": {
            "runs": runs,
            "notes_per_run": notes_per_run,
            "iterations": iterations,
        },
        "result": {
            "total_ms": round(elapsed_ms, 3),
            "summary_calls": runs * iterations,
            "ms_per_summary": round(elapsed_ms / max(1, runs * iterations), 3),
        },
        "instrumentation": instrumentation.snapshot(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="PlantRun synthetic perf harness")
    parser.add_argument("--runs", type=int, default=200, help="Synthetic run count")
    parser.add_argument("--notes", type=int, default=30, help="Notes per run")
    parser.add_argument("--iterations", type=int, default=3, help="Loop count over dataset")
    args = parser.parse_args()

    report = run_harness(runs=args.runs, notes_per_run=args.notes, iterations=args.iterations)
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
