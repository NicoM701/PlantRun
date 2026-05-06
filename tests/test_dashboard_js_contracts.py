from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
CARD_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-card.js"
EDITOR_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-card-editor.js"
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
        self.assertIn('binding.metric_type === "soil_moisture" ? "moisture"', source)

    def test_card_ignores_stale_fetches_when_run_selection_changes(self):
        source = CARD_JS.read_text(encoding="utf-8")
        self.assertIn("this._requestNonce = 0;", source)
        self.assertIn("const requestNonce = ++this._requestNonce;", source)
        self.assertIn("if (requestNonce !== this._requestNonce) return;", source)
        self.assertIn("runId !== this._loadedRunId", source)
        self.assertIn("this._loadedRunId = runId;", source)

    def test_editor_loads_real_runs_for_selection(self):
        source = EDITOR_JS.read_text(encoding="utf-8")
        self.assertIn('this._hass.callWS({ type: "plantrun/get_runs" });', source)
        self.assertIn("_runOptions()", source)
        self.assertIn("Placeholder IDs are ignored until replaced.", source)

    def test_panel_run_creation_copy_makes_duration_explicit(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("Estimated run duration (days)", source)
        self.assertIn("The duration is stored as planning context", source)
        self.assertIn("target_days: Number(this._wizard.target_days) || 90", source)

    def test_panel_sensor_bindings_use_ha_entity_selector_and_sensor_fallback(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("<ha-selector", source)
        self.assertIn('selector.selector = { entity: { domain: "sensor" } };', source)
        self.assertIn('entityId.startsWith("sensor.")', source)
        self.assertIn("Choose a Home Assistant sensor entity", source)
        self.assertNotIn('data-binding-input="sensor_id"', source)

    def test_panel_run_creation_prefers_new_run_id_over_duplicate_name_match(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("const knownRunIds = new Set(this._runs.map((run) => run.id));", source)
        self.assertIn("_resolveNewlyCreatedRun(name, knownRunIds)", source)
        self.assertIn("_resolveNewlyCreatedRun(name, previousRunIds = new Set())", source)
        self.assertIn("const newlyDiscovered = this._runs.filter((run) => !previousRunIds.has(run.id));", source)

    def test_panel_cultivar_search_clears_stale_selection_and_ignores_old_responses(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("this._wizard.selected_cultivar = null;", source)
        self.assertIn("const requestNonce = ++this._searchNonce;", source)
        self.assertIn("if (requestNonce !== this._searchNonce) return;", source)
        self.assertIn("this._renderSuggestionsOnly();", source)

    def test_panel_wizard_input_updates_do_not_render_while_typing(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("_handleInput(event)", source)
        self.assertIn("this._wizard = { ...this._wizard, [field]: target.value };", source)
        handle_input = source[source.index("_handleInput(event)") : source.index("_handleChange(event)")]
        self.assertNotIn("this.render()", handle_input)

    def test_panel_detail_editor_sends_explicit_nulls_when_fields_are_cleared(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("planted_date: draft.planted_date || null,", source)
        self.assertIn("notes_summary: draft.notes_summary || null,", source)
        self.assertIn('dry_yield_grams: draft.dry_yield_grams === "" ? null : Number(draft.dry_yield_grams),', source)


if __name__ == "__main__":
    unittest.main()
