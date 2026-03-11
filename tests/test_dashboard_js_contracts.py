from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
CARD_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-card.js"
PANEL_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel.js"


class DashboardJsContractsTests(unittest.TestCase):
    def test_card_treats_common_placeholder_run_ids_as_unset(self):
        source = CARD_JS.read_text(encoding="utf-8")
        self.assertIn('"<run_id>"', source)
        self.assertIn('"your_run_id"', source)
        self.assertIn('normalized.includes("<run_id")', source)

    def test_card_uses_distinct_moisture_visual_class(self):
        source = CARD_JS.read_text(encoding="utf-8")
        self.assertIn(".chip-icon.moisture", source)
        self.assertIn('colorClass = "moisture"', source)

    def test_panel_replaces_duplicate_run_age_copy_with_target_days_context(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("_targetDaysForRun(run)", source)
        self.assertIn('Target: ${this._targetDaysForRun(run) || "—"} days', source)
        self.assertNotIn('${runAgeDays} ${runAgeDays === 1 ? "day" : "days"} running', source)


if __name__ == "__main__":
    unittest.main()
