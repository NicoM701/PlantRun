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


ha = types.ModuleType("homeassistant")
sys.modules.setdefault("homeassistant", ha)
core = types.ModuleType("homeassistant.core")
class HomeAssistant: pass
core.HomeAssistant = HomeAssistant
sys.modules["homeassistant.core"] = core
helpers = types.ModuleType("homeassistant.helpers")
storage_mod = types.ModuleType("homeassistant.helpers.storage")
class Store:
    def __init__(self,*_a,**_k):
        pass
storage_mod.Store = Store
sys.modules["homeassistant.helpers"] = helpers
sys.modules["homeassistant.helpers.storage"] = storage_mod


custom_components = types.ModuleType("custom_components")
custom_components.__path__ = [str(ROOT / "custom_components")]
sys.modules.setdefault("custom_components", custom_components)

plantrun_pkg = types.ModuleType("custom_components.plantrun")
plantrun_pkg.__path__ = [str(PLANTRUN_DIR)]
sys.modules["custom_components.plantrun"] = plantrun_pkg

CONST = _load_module("custom_components.plantrun.const", PLANTRUN_DIR / "const.py")
MODELS = _load_module("custom_components.plantrun.models", PLANTRUN_DIR / "models.py")
RUN_RESOLUTION = _load_module(
    "custom_components.plantrun.run_resolution", PLANTRUN_DIR / "run_resolution.py"
)

RunData = MODELS.RunData


class FakeStorage:
    def __init__(self, runs, active_run_id=None):
        self.runs = runs
        self.active_run_id = active_run_id

    def get_run(self, run_id):
        return next((run for run in self.runs if run.id == run_id), None)


class TestRunResolution(unittest.TestCase):
    def test_strict_active_resolution_lists_runs(self) -> None:
        run_a = RunData(id="a1", friendly_name="Tent A", start_time="2026-03-01", status="active")
        run_b = RunData(id="b1", friendly_name="Tent B", start_time="2026-03-01", status="active")
        storage = FakeStorage([run_a, run_b])

        with self.assertRaises(ValueError) as err:
            RUN_RESOLUTION.resolve_run_or_raise(
                storage,
                run_id=None,
                run_name=None,
                use_active_run=True,
                strict_active_resolution=True,
                active_run_strategy=CONST.ACTIVE_RUN_STRATEGY_LEGACY,
            )

        self.assertIn("Multiple runs are active", str(err.exception))
        self.assertIn("Tent A (a1)", str(err.exception))

    def test_active_run_id_strategy_requires_valid_target(self) -> None:
        run_a = RunData(id="a1", friendly_name="Tent A", start_time="2026-03-01", status="active")
        run_b = RunData(id="b1", friendly_name="Tent B", start_time="2026-03-01", status="active")
        storage = FakeStorage([run_a, run_b], active_run_id="missing")

        with self.assertRaises(ValueError) as err:
            RUN_RESOLUTION.resolve_run_or_raise(
                storage,
                run_id=None,
                run_name=None,
                use_active_run=True,
                strict_active_resolution=False,
                active_run_strategy=CONST.ACTIVE_RUN_STRATEGY_ACTIVE_RUN_ID,
            )

        self.assertIn("requires a valid active_run_id", str(err.exception))


if __name__ == "__main__":
    unittest.main()
