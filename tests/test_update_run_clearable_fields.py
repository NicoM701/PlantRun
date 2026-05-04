from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
INIT_PY = ROOT / "custom_components" / "plantrun" / "__init__.py"


class UpdateRunClearableFieldsTests(unittest.TestCase):
    def test_update_run_schema_accepts_nullable_detail_fields(self):
        source = INIT_PY.read_text(encoding="utf-8")

        self.assertIn('vol.Optional("planted_date"): vol.Any(None, str),', source)
        self.assertIn('vol.Optional("notes_summary"): vol.Any(None, str),', source)
        self.assertIn('vol.Optional("dry_yield_grams"): vol.Any(None, vol.Coerce(float)),', source)

    def test_update_run_handler_applies_nullable_detail_fields(self):
        source = INIT_PY.read_text(encoding="utf-8")

        self.assertIn('run.planted_date = call.data["planted_date"] or None', source)
        self.assertIn('run.notes_summary = call.data["notes_summary"] or None', source)
        self.assertIn('run.dry_yield_grams = None if value is None else float(value)', source)


if __name__ == "__main__":
    unittest.main()
