from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
PANEL_PATH = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel.js"


class PanelNotesEditingTests(unittest.TestCase):
    def test_notes_support_edit_delete_and_datetime_display(self):
        source = PANEL_PATH.read_text(encoding="utf-8")

        self.assertIn("formatDateTime", source)
        self.assertIn('data-action="edit-note"', source)
        self.assertIn('data-action="confirm-delete-note"', source)
        self.assertIn('data-action="save-note-edit"', source)
        self.assertIn('data-action="delete-note"', source)
        self.assertIn('data-note-edit-text', source)
        self.assertIn('S.formatDateTime(note.timestamp)', source)
        self.assertIn('this._hass.callService(DOMAIN, "update_note"', source)
        self.assertIn('this._hass.callService(DOMAIN, "delete_note"', source)


if __name__ == "__main__":
    unittest.main()
