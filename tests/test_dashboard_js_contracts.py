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

    def test_card_ignores_stale_fetches_when_run_selection_changes(self):
        source = CARD_JS.read_text(encoding="utf-8")
        self.assertIn("this._requestNonce = 0;", source)
        self.assertIn("const requestNonce = ++this._requestNonce;", source)
        self.assertIn("if (requestNonce !== this._requestNonce)", source)
        self.assertIn('if (runId !== this._loadedRunId)', source)
        self.assertIn('this._loadedRunId = runId;', source)

    def test_panel_replaces_duplicate_run_age_copy_with_target_days_context(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("_targetDaysForRun(run)", source)
        self.assertIn('Target: ${this._targetDaysForRun(run) || "—"} days', source)
        self.assertNotIn('${runAgeDays} ${runAgeDays === 1 ? "day" : "days"} running', source)

    def test_panel_sensor_interaction_contract_short_tap_vs_long_press(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("Tap sensor tile for run history · long press for entity details", source)
        self.assertIn("_sensorPressStart", source)
        self.assertIn("_sensorPressEnd", source)
        self.assertIn("_sensorPressCancel", source)
        self.assertIn("state.longPressTriggered = true", source)
        self.assertIn("this._openEntity(entityId)", source)
        self.assertIn("if (!wasLongPress)", source)
        self.assertIn("this._openRunHistory(runId, entityId)", source)

    def test_panel_run_creation_copy_makes_duration_explicit(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("Estimated run duration (days)", source)
        self.assertIn("Explicit estimate used for planning context", source)

    def test_panel_sensor_range_bar_exposes_status_classes_and_copy(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn('const status = numeric < min ? "below" : numeric > max ? "above" : "in_range";', source)
        self.assertIn('const statusClass = status === "below" ? "warn" : status === "above" ? "high" : "ok";', source)
        self.assertIn('class="range-fill ${statusClass}"', source)
        self.assertIn('"Below target"', source)
        self.assertIn('"In range"', source)
        self.assertIn('"Above target"', source)

    def test_panel_compact_card_includes_mini_phase_track_marker(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn('data-contract="compact-mini-phase-track"', source)

    def test_panel_run_creation_prefers_new_run_id_over_duplicate_name_match(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn('const knownRunIds = new Set(this._runs.map((run) => run.id));', source)
        self.assertIn('this._resolveNewlyCreatedRun(normalizedForm.friendly_name, knownRunIds);', source)
        self.assertIn('_resolveNewlyCreatedRun(name, previousRunIds = new Set())', source)
        self.assertIn('const newlyDiscovered = this._runs.filter((run) => !previousRunIds.has(run.id));', source)

    def test_panel_cultivar_search_clears_stale_selection_and_ignores_old_responses(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn('next.cultivar_name = "";', source)
        self.assertIn('const requestNonce = ++this._searchRequestNonce;', source)
        self.assertIn('if (requestNonce !== this._searchRequestNonce)', source)

    def test_panel_wizard_input_updates_preserve_typing_state(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn('_setWizardField(field, value, { render = false } = {})', source)
        self.assertIn('const focusState = this._captureFocusState();', source)
        self.assertIn('this._restoreFocusState(focusState);', source)

    def test_panel_detail_editor_sends_explicit_nulls_when_fields_are_cleared(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn('planted_date: draft.planted_date || null,', source)
        self.assertIn('notes_summary: draft.notes_summary || null,', source)
        self.assertIn('dry_yield_grams: draft.dry_yield_grams === "" ? null : Number(draft.dry_yield_grams),', source)


if __name__ == "__main__":
    unittest.main()
