import unittest

from tests.dashboard_js_test_utils import load_panel_source


class PanelNotesEditingTests(unittest.TestCase):
    def test_notes_support_create_edit_delete_and_datetime_display(self):
        source = load_panel_source()

        self.assertIn("formatDateTime", source)
        self.assertIn('data-action="add-note"', source)
        self.assertIn('data-action="edit-note"', source)
        self.assertIn('data-action="confirm-delete-note"', source)
        self.assertIn('data-action="save-note-edit"', source)
        self.assertIn('data-action="delete-note"', source)
        self.assertIn('data-note-edit-text', source)
        self.assertIn('S.formatDateTime(note.timestamp)', source)
        self.assertIn('_openNewNoteEditor(runId)', source)
        self.assertIn('<h2>${isNew ? "New note" : "Edit note"}</h2>', source)
        self.assertIn('this._api.callService("add_note"', source)
        self.assertIn('this._api.callService("update_note"', source)
        self.assertIn('this._api.callService("delete_note"', source)
        self.assertNotIn('data-note-draft', source)


if __name__ == "__main__":
    unittest.main()
