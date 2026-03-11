import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL_PATH = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel.js"


class PanelAutocompleteTest(unittest.TestCase):
    def test_cultivar_input_supports_keyboard_and_click_selection(self):
        source = PANEL_PATH.read_text(encoding="utf-8")

        self.assertIn("_onCultivarKeydown", source)
        self.assertIn('event.key === "ArrowDown"', source)
        self.assertIn('event.key === "ArrowUp"', source)
        self.assertIn('event.key === "Enter" || event.key === "Tab"', source)
        self.assertIn('@mousedown=${(e) => e.preventDefault()}', source)
        self.assertIn("_clearCultivarSuggestionsSoon", source)


if __name__ == "__main__":
    unittest.main()
