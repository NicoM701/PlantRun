import unittest

from tests.dashboard_js_test_utils import assert_has_snippets, load_panel_source


class DashboardPanelInteractionRegressionTests(unittest.TestCase):
    def setUp(self):
        self.source = load_panel_source()

    def test_expansion_state_is_isolated_per_run_id(self):
        assert_has_snippets(
            self,
            self.source,
            [
                "const isExpanded = !!this._expandedRuns[runId];",
                "this._expandedRuns = { ...this._expandedRuns, [runId]: !isExpanded };",
                "this._expandedRuns = Object.fromEntries(Object.entries(this._expandedRuns).filter(([runId]) => validIds.has(runId)));",
            ],
        )

    def test_short_tap_and_long_press_are_single_fire_paths(self):
        assert_has_snippets(
            self,
            self.source,
            [
                "state.longPressTriggered = true",
                "this._openEntity(entityId)",
                "const wasLongPress = !!state.longPressTriggered;",
                "if (!wasLongPress)",
                "this._openRunHistory(runId, entityId);",
                "delete next[key];",
            ],
        )

    def test_rapid_interactions_clear_prior_timer_and_block_click_duplicates(self):
        assert_has_snippets(
            self,
            self.source,
            [
                "if (current?.timer)",
                "window.clearTimeout(current.timer);",
                "@click=${(e) => e.preventDefault()}",
                "_sensorPressCancel",
            ],
        )

    def test_delegated_clicks_are_scoped_to_shadow_root_actions(self):
        assert_has_snippets(
            self,
            self.source,
            [
                "const DELEGATED_ACTION_SELECTOR = [",
                "event.target.closest(DELEGATED_ACTION_SELECTOR)",
                "if (!target || !this.shadowRoot.contains(target))",
            ],
        )

    def test_modal_overlays_are_scoped_to_panel_host(self):
        assert_has_snippets(
            self,
            self.source,
            [
                ":host {\n            display: block;\n            position: relative;",
                ".overlay, .modal-shell { position: absolute; inset: 0; z-index: 20; }",
                ".overlay-card {\n            position: absolute; inset: 24px; z-index: 1;",
            ],
        )

    def test_host_listeners_and_decorative_art_do_not_steal_pointer_input(self):
        assert_has_snippets(
            self,
            self.source,
            [
                "this.addEventListener(\"click\", this._boundDelegatedClick, true);",
                "this.removeEventListener(\"click\", this._boundDelegatedClick, true);",
                ".overview-hero-art {",
                "pointer-events: none;",
                ".run-card-art { border-radius: 24px 10px 24px 10px; overflow:visible;",
                ".empty-art-composition { min-height: 340px; position: relative; display:grid; place-items:center; overflow:visible; pointer-events: none; user-select: none; }",
            ],
        )


if __name__ == "__main__":
    unittest.main()
