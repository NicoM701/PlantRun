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
HISTORY_CONTEXT = _load_module("custom_components.plantrun.history_context", PLANTRUN_DIR / "history_context.py")

RunData = MODELS.RunData


class TestRunWindow(unittest.TestCase):
    def test_active_run_window_uses_now(self) -> None:
        run = RunData(
            id="runA",
            friendly_name="Tent A",
            start_time="2026-05-01T10:00:00+00:00",
            status="active",
        )

        window = HISTORY_CONTEXT.get_run_window(run, now="2026-05-08T10:00:00+00:00")

        self.assertEqual(window["start"], "2026-05-01T10:00:00+00:00")
        self.assertEqual(window["end"], "2026-05-08T10:00:00+00:00")
        self.assertTrue(window["is_active"])

    def test_ended_run_window_uses_end_time(self) -> None:
        run = RunData(
            id="runB",
            friendly_name="Tent B",
            start_time="2026-04-01T10:00:00+00:00",
            end_time="2026-04-20T08:00:00+00:00",
            status="ended",
        )

        window = HISTORY_CONTEXT.get_run_window(run, now="2026-05-08T10:00:00+00:00")

        self.assertEqual(window["end"], "2026-04-20T08:00:00+00:00")
        self.assertFalse(window["is_active"])


class TestBindingHistoryContext(unittest.TestCase):
    def test_bound_sensor_context_prefers_run_window_truth(self) -> None:
        run = RunData.from_dict(
            {
                "id": "runC",
                "friendly_name": "Tent C",
                "start_time": "2026-05-01T10:00:00+00:00",
                "bindings": [{"id": "bind1", "metric_type": "temperature", "sensor_id": "sensor.t1"}],
                "sensor_history": {"temperature": [{"timestamp": "2026-05-02T10:00:00+00:00", "value": 22}]},
            }
        )
        binding = run.get_binding("bind1")
        assert binding is not None

        context = HISTORY_CONTEXT.build_binding_history_context(
            run,
            binding,
            source_exists=True,
            now="2026-05-08T10:00:00+00:00",
        )

        self.assertEqual(context["entity_id"], "sensor.t1")
        self.assertEqual(context["metric_type"], "temperature")
        self.assertEqual(context["binding_status"], "bound")
        self.assertEqual(context["run_window"]["start"], "2026-05-01T10:00:00+00:00")
        self.assertEqual(context["run_end"], "2026-05-08T10:00:00+00:00")
        self.assertEqual(context["run_window"]["effective_end"], "2026-05-08T10:00:00+00:00")
        self.assertTrue(context["legacy_history_available"])

    def test_missing_source_marks_binding_orphaned(self) -> None:
        run = RunData.from_dict(
            {
                "id": "runD",
                "friendly_name": "Tent D",
                "start_time": "2026-05-01T10:00:00+00:00",
                "bindings": [{"id": "bind2", "metric_type": "humidity", "sensor_id": "sensor.h1"}],
            }
        )
        binding = run.get_binding("bind2")
        assert binding is not None

        context = HISTORY_CONTEXT.build_binding_history_context(run, binding, source_exists=False)

        self.assertEqual(context["binding_status"], "orphaned")
        self.assertTrue(context["orphaned"])
        self.assertEqual(context["error"], "source_entity_missing")


if __name__ == "__main__":
    unittest.main()
