import unittest

from tests.dashboard_js_test_utils import load_panel_source


class PanelAutocompleteTest(unittest.TestCase):
    def test_cultivar_search_is_async_stable_and_manual_entry_remains_available(self):
        source = load_panel_source()
        self.assertIn("const nonce = ++this._searchNonce;", source)
        self.assertIn("if (nonce !== this._searchNonce) return;", source)
        self.assertIn("this._api.searchCultivar(", source)
        self.assertIn('data-action="preview-cultivar"', source)
        self.assertIn('data-action="apply-cultivar"', source)
        self.assertIn("Manuell fortfahren", source)
        self.assertIn("Die Suche blockiert das Anlegen nie.", source)
        self.assertIn('["strain", "breeder"].includes', source)


if __name__ == "__main__":
    unittest.main()
