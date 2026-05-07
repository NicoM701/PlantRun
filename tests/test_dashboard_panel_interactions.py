import unittest

from tests.dashboard_js_test_utils import assert_has_snippets, load_panel_source


class DashboardPanelInteractionRegressionTests(unittest.TestCase):
    def setUp(self):
        self.source = load_panel_source()

    def test_short_tap_and_long_press_are_single_fire_paths(self):
        assert_has_snippets(
            self,
            self.source,
            [
                "this._pressState[key].longPressTriggered = true;",
                "this._openEntity(tile.dataset.entityId);",
                "const wasLongPress = !!state.longPressTriggered;",
                "if (!wasLongPress) this._openRunHistory(tile.dataset.runId, tile.dataset.entityId);",
                "delete this._pressState[key];",
            ],
        )

    def test_rapid_sensor_interactions_clear_prior_timer(self):
        assert_has_snippets(
            self,
            self.source,
            [
                'if (event.target.closest("button, input, select, textarea, ha-selector")) return;',
                "const current = this._pressState[key];",
                "if (current?.timer) window.clearTimeout(current.timer);",
                "_handlePointerCancel(event)",
                "if (state?.timer) window.clearTimeout(state.timer);",
            ],
        )

    def test_delegated_clicks_are_scoped_to_shadow_root_actions(self):
        assert_has_snippets(
            self,
            self.source,
            [
                'this.shadowRoot.addEventListener("click", this._boundClick);',
                'const target = event.target.closest("[data-action]");',
                "if (!target || !this.shadowRoot.contains(target)) return;",
                "event.preventDefault();",
            ],
        )

    def test_modal_backdrops_close_dialogs_without_inputs_triggering_overlay_close(self):
        assert_has_snippets(
            self,
            self.source,
            [
                '<div class="overlay">',
                'class="overlay-backdrop" data-action="close-wizard"',
                'class="overlay-backdrop" data-action="close-binding"',
                'class="overlay-backdrop" data-action="close-edit"',
            ],
        )

    def test_modal_overlays_are_scoped_to_panel_host(self):
        assert_has_snippets(
            self,
            self.source,
            [
                ":host { display:block; min-height:100%;",
                ".overlay { position:absolute; inset:0; z-index:20;",
                ".overlay-backdrop { position:absolute; inset:0;",
                "position:relative;",
            ],
        )

    def test_decorative_stage_art_does_not_steal_pointer_input(self):
        assert_has_snippets(
            self,
            self.source,
            [
                ".stage-glyph { position:absolute;",
                "pointer-events:none;",
                ".sensor-tile {",
                "touch-action:manipulation;",
            ],
        )

    def test_sound_feedback_is_user_gated_and_disableable(self):
        assert_has_snippets(
            self,
            self.source,
            [
                'localStorage.getItem(STORAGE.sound) === "on"',
                'data-action="toggle-sound"',
                "_clickSound()",
                "if (!this._sound) return;",
            ],
        )

    def test_theme_toggle_is_binary_and_has_local_light_dark_tokens(self):
        assert_has_snippets(
            self,
            self.source,
            [
                'this._theme = localStorage.getItem(STORAGE.theme) || (window.matchMedia?.(THEME_QUERY).matches ? "light" : "dark")',
                'this._theme = this._resolvedTheme() === "dark" ? "light" : "dark";',
                '.app.theme-light {',
                '.app.theme-dark {',
            ],
        )


if __name__ == "__main__":
    unittest.main()
