from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
CARD_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-card.js"
EDITOR_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-card-editor.js"
PANEL_ENTRY_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel.js"
PANEL_API_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel-api.js"
PANEL_DIALOGS_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel-dialogs.js"
PANEL_DOMAIN_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel-domain.js"
PANEL_STYLES_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel-styles.js"
PANEL_VIEWS_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel-views.js"


class _PanelBundle:
    def read_text(self, *, encoding: str) -> str:
        return "\n".join(
            path.read_text(encoding=encoding)
            for path in (
                PANEL_ENTRY_JS,
                PANEL_API_JS,
                PANEL_DIALOGS_JS,
                PANEL_DOMAIN_JS,
                PANEL_STYLES_JS,
                PANEL_VIEWS_JS,
            )
        )


PANEL_JS = _PanelBundle()


class DashboardJsContractsTests(unittest.TestCase):
    def test_panel_uses_explicit_api_domain_and_style_modules(self):
        entry_source = PANEL_ENTRY_JS.read_text(encoding="utf-8")
        for module in ("api", "dialogs", "domain", "styles", "views"):
            self.assertIn(f'from "./plantrun-panel-{module}.js?v=0.6.0"', entry_source)
        self.assertNotIn("this._hass.callWS", entry_source)
        self.assertNotIn("this._hass.callService", entry_source)

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
        self.assertIn("this._loadingRunId === runId", source)

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

    def test_panel_sensor_tap_loads_transient_recorder_chart_before_native_fallback(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("PlantRun does not draw invented trend lines.", source)
        self.assertIn("Live from Home Assistant Recorder", source)
        self.assertIn("No samples are persisted by PlantRun.", source)
        self.assertIn("_renderHistoryInspector()", source)
        self.assertIn('type: "plantrun/get_run_binding_history_context"', source)
        self.assertIn('hass.callApi("GET", `history/period/', source)
        self.assertIn("_historyChartMarkup(panel)", source)
        self.assertIn("const EXPERIMENTAL_NATIVE_HISTORY_DEEPLINK = true;", source)
        self.assertIn("window.history.pushState(null, \"\", `/history?${params.toString()}`);", source)
        self.assertIn('data-action="open-native-history"', source)

    def test_panel_guided_setup_validates_basics_and_explains_optional_steps(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn('class="wizard-progress"', source)
        self.assertIn("Give this run a name before continuing.", source)
        self.assertIn("Guided setup", source)
        self.assertIn("Optional. Pick a SeedFinder result", source)
        self.assertIn("without copying their data", source)

    def test_panel_layout_preferences_include_theme_and_real_view_options(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn('layout: "plantrun.ui.layout.v2"', source)
        self.assertIn('data-action="open-personalize"', source)
        self.assertIn('data-action="toggle-layout-section"', source)
        self.assertIn('data-action="set-card-layout"', source)

    def test_panel_has_truthful_care_and_sensor_states(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("_wateringState(run, plant)", source)
        self.assertIn('data-action="water-plant"', source)
        self.assertIn('available ? "Live" : "Unavailable"', source)
        self.assertNotIn('class="mini-curve"', source)

    def test_custom_phase_is_added_to_visible_plan(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("plan.push(currentName)", source)

    def test_panel_finish_flow_captures_yield_and_archives_the_run(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn('data-action="open-end-run"', source)
        self.assertIn('data-end-run-yield', source)
        self.assertIn('data-action="confirm-end-run"', source)
        self.assertIn('this._api.callService("end_run"', source)
        self.assertIn('this._filter = "ended";', source)

    def test_panel_phase_control_is_canonical_timeline_with_confirmation(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("export const CANONICAL_STAGES", source)
        for stage in ("Seedling", "Vegetative", "Flowering", "Harvested"):
            self.assertIn(f'"{stage}"', source)
        self.assertIn("_renderPhaseRail(run)", source)
        self.assertIn('data-action="select-phase"', source)
        self.assertIn("_renderPhaseConfirmModal()", source)
        self.assertIn('data-action="confirm-phase-change"', source)
        self.assertIn('data-action="add-custom-phase"', source)
        self.assertIn('data-custom-phase', source)
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
        self.assertIn("...(existingRun?.base_config || {}),", source)
        self.assertIn("target_days: targetDays,", source)
        self.assertIn("this._detailDraft = null;", source)
        self.assertIn("this._error = err?.message || \"Unable to save run changes.\";", source)

    def test_panel_hero_uses_seedfinder_image_when_available(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn("_heroMediaStyle(run)", source)
        self.assertIn('run.image_url ? " has-image" : ""', source)
        self.assertIn(".hero.has-image", source)
        self.assertIn("var(--hero-image)", source)

    def test_clean_sheet_ui_uses_overview_workspace_and_custom_run_shape(self):
        source = PANEL_JS.read_text(encoding="utf-8")
        self.assertIn('_screen = "overview"', source)
        self.assertIn('_renderOverview()', source)
        self.assertIn('class="run-gallery layout-', source)
        self.assertIn('class="workspace-screen"', source)
        self.assertIn('class="phase-rail"', source)
        self.assertNotIn('<aside class="sidebar">', source)
        self.assertIn('plants: [""]', source)
        self.assertIn('phase_plan: ["Seedling", "Vegetative", "Flowering", "Harvested"]', source)
        self.assertIn('data-action="add-wizard-plant"', source)
        self.assertIn('data-action="add-wizard-phase"', source)
        self.assertIn('plants_text:', source)
        self.assertIn('phase_plan_text:', source)

    def test_clean_sheet_ui_respects_mobile_and_reduced_motion(self):
        styles = PANEL_STYLES_JS.read_text(encoding="utf-8")
        self.assertIn("@media(max-width:660px)", styles)
        self.assertIn("@media(prefers-reduced-motion:reduce)", styles)
        self.assertIn("button:focus-visible", styles)


if __name__ == "__main__":
    unittest.main()
