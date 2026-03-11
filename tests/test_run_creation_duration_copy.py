import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TRANSLATIONS_EN = ROOT / "custom_components" / "plantrun" / "translations" / "en.json"
CONFIG_FLOW = ROOT / "custom_components" / "plantrun" / "config_flow.py"


class RunCreationDurationCopyTests(unittest.TestCase):
    def test_options_flow_translation_labels_target_days_as_estimated_duration(self):
        payload = json.loads(TRANSLATIONS_EN.read_text(encoding="utf-8"))
        label = payload["options"]["step"]["create_run_start"]["data"]["target_days"]
        self.assertEqual(label, "Estimated run duration (days)")

    def test_options_flow_schema_keeps_target_days_in_start_step(self):
        source = CONFIG_FLOW.read_text(encoding="utf-8")
        self.assertIn('vol.Optional("target_days", default=84)', source)
        self.assertIn("self._create_target_days = self._normalize_target_days(user_input.get(\"target_days\"))", source)


if __name__ == "__main__":
    unittest.main()
