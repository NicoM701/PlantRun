import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL_PATH = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel.js"


class PanelAutocompleteTest(unittest.TestCase):
    def test_cultivar_input_supports_keyboard_click_and_stable_async_selection(self):
        source = PANEL_PATH.read_text(encoding="utf-8")

        self.assertIn("_handleKeydown(event)", source)
        self.assertIn('event.key === "Enter" || event.key === "Tab"', source)
        self.assertIn('event.key === "Escape"', source)
        self.assertIn('data-action="choose-cultivar"', source)
        self.assertIn('@mousedown=${"(e) => e.preventDefault()"}', source)
        self.assertIn("_scheduleCultivarSearch()", source)
        self.assertIn("_renderSuggestionsOnly()", source)


if __name__ == "__main__":
    unittest.main()
