import unittest

from tests.dashboard_js_test_utils import load_panel_source


class PanelAutocompleteTest(unittest.TestCase):
    def test_cultivar_input_supports_keyboard_click_and_stable_async_selection(self):
        source = load_panel_source()

        self.assertIn("_handleKeydown(event)", source)
        self.assertIn('event.key === "Enter" || event.key === "Tab"', source)
        self.assertIn('event.key === "Escape"', source)
        self.assertIn('data-action="choose-cultivar"', source)
        self.assertIn('data-prevent-mousedown', source)
        self.assertIn('_handleMouseDown(event)', source)
        self.assertIn("_scheduleCultivarSearch()", source)
        self.assertIn("_scheduleDetailCultivarSearch()", source)
        self.assertIn('data-detail-cultivar-input', source)
        self.assertIn('data-action="choose-detail-cultivar"', source)
        self.assertIn("Refreshing results…", source)
        self.assertIn("_renderSuggestionsOnly()", source)


if __name__ == "__main__":
    unittest.main()
