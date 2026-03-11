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

custom_components = types.ModuleType("custom_components")
custom_components.__path__ = [str(ROOT / "custom_components")]
sys.modules.setdefault("custom_components", custom_components)
plantrun_pkg = types.ModuleType("custom_components.plantrun")
plantrun_pkg.__path__ = [str(PLANTRUN_DIR)]
sys.modules["custom_components.plantrun"] = plantrun_pkg

MODELS = _load_module("custom_components.plantrun.models", PLANTRUN_DIR / "models.py")
SUMMARY = _load_module("custom_components.plantrun.summary", PLANTRUN_DIR / "summary.py")
RunData = MODELS.RunData


class TestSummary(unittest.TestCase):
    def test_summary_with_cost_and_missing_metrics(self) -> None:
        run = RunData(
            id="run1",
            friendly_name="Tent A",
            start_time="2026-03-01T00:00:00",
            sensor_history={
                "energy": [{"value": 10}, {"value": 12.5}],
                "temperature": [{"value": 21.2}, {"value": 22.8}],
            },
        )
        summary = SUMMARY.build_run_summary(
            run,
            energy_price_per_kwh=0.30,
            energy_currency="usd",
        )
        self.assertEqual(summary["energy_kwh"], 2.5)
        self.assertAlmostEqual(summary["energy_cost"], 0.75)
        self.assertEqual(summary["energy_currency"], "USD")
        self.assertEqual(summary["humidity"]["avg"], None)

    def test_summary_defaults_currency_without_price(self) -> None:
        run = RunData(
            id="run2",
            friendly_name="Tent B",
            start_time="2026-03-01T00:00:00",
            sensor_history={"energy": [{"value": 1.0}, {"value": 4.0}]},
        )

        summary = SUMMARY.build_run_summary(run)
        self.assertEqual(summary["energy_kwh"], 3.0)
        self.assertIsNone(summary["energy_cost"])
        self.assertEqual(summary["energy_currency"], "EUR")

    def test_summary_energy_preferences_from_options_uses_safe_defaults(self) -> None:
        prefs = SUMMARY.summary_energy_preferences_from_options(
            {
                "electricity_price_per_kwh": -1,
                "currency": " gbp ",
            }
        )
        self.assertEqual(prefs["energy_price_per_kwh"], 0.0)
        self.assertEqual(prefs["energy_currency"], "GBP")

    def test_summary_energy_uses_only_run_window_samples(self) -> None:
        run = RunData(
            id="run-windowed",
            friendly_name="Tent C",
            start_time="2026-03-01T10:00:00+00:00",
            end_time="2026-03-01T14:00:00+00:00",
            sensor_history={
                "energy": [
                    {"timestamp": "2026-03-01T08:00:00+00:00", "value": 100.0},
                    {"timestamp": "2026-03-01T10:30:00+00:00", "value": 110.0},
                    {"timestamp": "2026-03-01T13:30:00+00:00", "value": 114.0},
                    {"timestamp": "2026-03-01T15:00:00+00:00", "value": 200.0},
                ]
            },
        )

        summary = SUMMARY.build_run_summary(run, energy_price_per_kwh=0.4, energy_currency="EUR")
        self.assertEqual(summary["energy_kwh"], 4.0)
        self.assertEqual(summary["energy_cost"], 1.6)

    def test_summary_ignores_untimestamped_points_when_timestamped_series_exists(self) -> None:
        run = RunData(
            id="run-no-leak",
            friendly_name="Tent D",
            start_time="2026-03-01T10:00:00+00:00",
            end_time="2026-03-01T12:00:00+00:00",
            sensor_history={
                "energy": [
                    {"value": 9999.0},
                    {"timestamp": "2026-03-01T10:15:00+00:00", "value": 50.0},
                    {"timestamp": "2026-03-01T11:45:00+00:00", "value": 54.0},
                ]
            },
        )

        summary = SUMMARY.build_run_summary(run, energy_price_per_kwh=0.5)
        self.assertEqual(summary["energy_kwh"], 4.0)
        self.assertEqual(summary["energy_cost"], 2.0)


if __name__ == "__main__":
    unittest.main()
