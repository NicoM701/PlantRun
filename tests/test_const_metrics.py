import importlib.util
import sys
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


CONST = _load_module("custom_components.plantrun.const", PLANTRUN_DIR / "const.py")


class TestConstMetrics(unittest.TestCase):
    def test_allowed_metric_types_include_expected_values(self) -> None:
        expected = {
            "temperature",
            "humidity",
            "soil_moisture",
            "conductivity",
            "light",
            "energy",
            "water",
            "camera",
        }
        self.assertEqual(set(CONST.ALLOWED_METRIC_TYPES), expected)

    def test_camera_marked_as_unsupported_binding(self) -> None:
        self.assertIn("camera", CONST.UNSUPPORTED_BINDING_METRIC_TYPES)


if __name__ == "__main__":
    unittest.main()
