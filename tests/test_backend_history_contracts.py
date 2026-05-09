from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
INIT_PY = ROOT / "custom_components" / "plantrun" / "__init__.py"
SENSOR_PY = ROOT / "custom_components" / "plantrun" / "sensor.py"


class BackendHistoryContractTests(unittest.TestCase):
    def test_backend_exposes_binding_history_context_websocket(self):
        source = INIT_PY.read_text(encoding="utf-8")
        self.assertIn('plantrun/get_run_binding_history_context', source)
        self.assertIn('"context": build_binding_history_context(', source)

    def test_backend_exposes_authenticated_seedfinder_search_over_websocket(self):
        source = INIT_PY.read_text(encoding="utf-8")
        self.assertIn('plantrun/search_cultivar', source)
        self.assertIn('connection.send_result(msg["id"], {"results": []})', source)
        self.assertIn('results = await async_search_cultivar_by_query(breeder, query, session=session)', source)

    def test_binding_updates_no_longer_delete_metric_history_bucket(self):
        source = INIT_PY.read_text(encoding="utf-8")
        self.assertNotIn('run.sensor_history.pop(previous_metric_type, None)', source)

    def test_proxy_sensor_exposes_history_context_and_clears_value_when_unavailable(self):
        source = SENSOR_PY.read_text(encoding="utf-8")
        self.assertIn('"history_context": context', source)
        self.assertIn('if not self._sync_binding_from_run() or not self.available:', source)
        self.assertIn('self._attr_native_value = None', source)


if __name__ == "__main__":
    unittest.main()
