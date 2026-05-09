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

    def test_panel_run_creation_basics_are_minimal_and_duration_is_seedfinder_derived(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertNotIn("Grow medium", source)
        self.assertNotIn("Grow space", source)
        self.assertIn("Keep step 1 dead simple. Name it, set the plant date, move on.", source)
        self.assertIn("Estimated total run duration:", source)
        self.assertIn("target_days: this._derivedTargetDays(item)", source)
        self.assertIn("if (Number.isFinite(targetDays) && targetDays > 0)", source)

    def test_panel_sensor_bindings_use_ha_entity_selector_and_sensor_fallback(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("<ha-selector", source)
        self.assertIn("_entitySelectorConfig(metricType)", source)
        self.assertIn("_sensorEntitiesForMetric(metricType)", source)
        self.assertIn('include_entities: includeEntities', source)
        self.assertIn("Choose a compatible Home Assistant sensor", source)
        self.assertIn("No compatible Home Assistant sensors found", source)
        self.assertNotIn("return filtered.length ? filtered : all;", source)
        self.assertIn('entityId.startsWith("sensor.")', source)
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
        self.assertIn('type: "plantrun/search_cultivar"', source)
        self.assertIn("this._suggestionCache = new Map();", source)
        self.assertIn("if (searchKey === this._lastSearchKey) return;", source)
        self.assertIn("const requestNonce = ++this._searchNonce;", source)
        self.assertIn("if (requestNonce !== this._searchNonce) return;", source)
        self.assertIn("this._renderSuggestionsOnly();", source)

    def test_panel_wizard_input_updates_do_not_render_while_typing(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("_handleInput(event)", source)
        self.assertIn("this._wizard = { ...this._wizard, [field]: target.value };", source)
        self.assertIn('this._wizard.target_days = "";', source)
        handle_input = source[source.index("_handleInput(event)") : source.index("_handleChange(event)")]
        self.assertNotIn("this.render()", handle_input)

    def test_panel_sensor_tap_attempts_native_history_deeplink_before_modal_fallback(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("Tap a sensor to inspect its run window.", source)
        self.assertIn("_renderHistoryInspector()", source)
        self.assertIn('type: "plantrun/get_run_binding_history_context"', source)
        self.assertIn("const EXPERIMENTAL_NATIVE_HISTORY_DEEPLINK = true;", source)
        self.assertIn("window.history.pushState(null, \"\", `/history?${params.toString()}`);", source)
        self.assertIn('data-action="open-native-history"', source)

    def test_panel_phase_control_is_canonical_timeline_with_confirmation(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn('const CANONICAL_STAGES = ["Seedling", "Vegetative", "Flowering", "Harvested"]', source)
        self.assertIn('<h2>Phase</h2>', source)
        self.assertIn('data-action="select-phase"', source)
        self.assertIn("_renderPhaseConfirmModal()", source)
        self.assertIn('data-action="confirm-phase-change"', source)
        self.assertNotIn("window.confirm(", source)
        self.assertNotIn("minus the cursed browser popup", source)

    def test_panel_binding_metric_changes_force_picker_refresh_and_edit_existing_bindings(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn('data-action="edit-binding"', source)
        self.assertIn('this._openBinding(target.dataset.runId, target.dataset.bindingId);', source)
        self.assertIn('this._bindingDraft = binding', source)
        self.assertIn('this.render();', source)

    def test_panel_detail_editor_sends_explicit_nulls_when_fields_are_cleared(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("planted_date: draft.planted_date || null,", source)
        self.assertIn("notes_summary: draft.notes_summary || null,", source)
        self.assertIn('dry_yield_grams: draft.dry_yield_grams === "" ? null : Number(draft.dry_yield_grams),', source)

    def test_panel_detail_editor_persists_target_days_and_keeps_dialog_open_on_error(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("const targetDays = Number(draft.target_days || this._derivedTargetDays(draft.selected_cultivar));", source)
        self.assertIn("...(this._runs.find((item) => item.id === draft.run_id)?.base_config || {}),", source)
        self.assertIn("target_days: targetDays,", source)
        self.assertIn("this._detailDraft = null;", source)
        self.assertIn("this._error = err?.message || \"Unable to save run changes.\";", source)


if __name__ == "__main__":
    unittest.main()
