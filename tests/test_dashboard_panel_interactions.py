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


if __name__ == "__main__":
    unittest.main()
