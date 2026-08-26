import unittest

from tests.dashboard_js_test_utils import load_panel_source


class PanelJournalEditingTests(unittest.TestCase):
    def test_journal_supports_create_edit_delete_and_occurrence_time(self):
        source = load_panel_source()
        self.assertIn('"create_journal_entry"', source)
        self.assertIn('"update_journal_entry"', source)
        self.assertIn('command("delete_journal_entry"', source)
        self.assertIn('data-journal-occurred-at', source)
        self.assertIn('data-action="edit-journal-entry"', source)
        self.assertIn('data-action="request-delete-journal-entry"', source)
        self.assertIn("occurred_at:", source)
        self.assertIn("entry_id: entry.id", source)


if __name__ == "__main__":
    unittest.main()
