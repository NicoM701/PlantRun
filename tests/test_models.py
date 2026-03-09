import unittest
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

MODELS_PATH = Path(__file__).resolve().parents[1] / "custom_components" / "plantrun" / "models.py"
SPEC = spec_from_file_location("plantrun_models", MODELS_PATH)
assert SPEC and SPEC.loader
MODULE = module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

Binding = MODULE.Binding
RunData = MODULE.RunData


class TestBindingCompatibility(unittest.TestCase):
    def test_binding_from_dict_adds_legacy_id(self) -> None:
        binding = Binding.from_dict({"metric_type": "temperature", "sensor_id": "sensor.tent_temp"})
        self.assertEqual(binding.id, "legacy_temperature")

    def test_run_from_dict_ensures_unique_binding_ids(self) -> None:
        run = RunData.from_dict(
            {
                "id": "run123",
                "friendly_name": "Tent A",
                "start_time": "2026-03-01T00:00:00",
                "bindings": [
                    {"metric_type": "temperature", "sensor_id": "sensor.t1"},
                    {"metric_type": "temperature", "sensor_id": "sensor.t2"},
                ],
            }
        )
        ids = [binding.id for binding in run.bindings]
        self.assertEqual(ids, ["legacy_temperature", "legacy_temperature_2"])

    def test_to_dict_preserves_binding_id(self) -> None:
        run = RunData.from_dict(
            {
                "id": "run456",
                "friendly_name": "Tent B",
                "start_time": "2026-03-01T00:00:00",
                "bindings": [
                    {
                        "id": "bind_abc",
                        "metric_type": "humidity",
                        "sensor_id": "sensor.h1",
                    }
                ],
            }
        )
        serialized = run.to_dict()
        self.assertEqual(serialized["bindings"][0]["id"], "bind_abc")


if __name__ == "__main__":
    unittest.main()
