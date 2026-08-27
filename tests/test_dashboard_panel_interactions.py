import unittest

from tests.dashboard_js_test_utils import assert_has_snippets, load_panel_source


class DashboardPanelInteractionRegressionTests(unittest.TestCase):
    def setUp(self):
        self.source = load_panel_source()

    def test_delegated_events_stay_inside_shadow_root(self):
        assert_has_snippets(self, self.source, [
            'this.shadowRoot.addEventListener("click", this._boundClick);',
            'const action = event.target.closest("[data-action]");',
            "if (!action || !this.shadowRoot.contains(action)) return;",
            'this.shadowRoot.addEventListener("keydown", this._boundKeydown);',
        ])

    def test_logo_version_peek_uses_context_menu_and_ends_on_pointer_exit(self):
        assert_has_snippets(self, self.source, [
            'this.shadowRoot.addEventListener("contextmenu", this._boundContextMenu);',
            'this.shadowRoot.addEventListener("pointerout", this._boundPointerOut);',
            "event.preventDefault();",
            'brand.classList.add("version-peek");',
            'brand.classList.remove("version-peek");',
            'const [moduleVersion, ...buildParts] = MODULE_CACHE_KEY.split("-");',
            'class="rail-brand ${this._versionPeek ? "version-peek" : ""}"',
        ])

    def test_command_busy_state_and_mutation_errors_stay_recoverable(self):
        assert_has_snippets(self, self.source, [
            "this._busy = true;",
            "this._busy = false;",
            'role="alert"',
            "const message = error?.message",
            "this._dialogError = message;",
            "this._toast = message;",
        ])
        self.assertIn('this._error = error?.message || "Home Assistant hat keinen PlantRun-Zustand geliefert.";', self.source)

    def test_create_flow_keeps_initial_stage_in_the_plan(self):
        assert_has_snippets(self, self.source, [
            'target.dataset.createField === "initial_stage"',
            "this._createDraft.stage_plan.includes(target.value)",
            "stage === draft.initial_stage ? \"disabled\" : \"\"",
            "if (stage === this._createDraft.initial_stage && !target.checked)",
        ])

    def test_cultivar_result_preview_requires_explicit_import(self):
        assert_has_snippets(self, self.source, [
            'data-action="preview-cultivar"',
            'data-action="apply-cultivar"',
            "this._previewCultivar(Number(action.dataset.index));",
            "this._applyCultivarPreview();",
            "_previewCultivar(index)",
            "_applyCultivarPreview()",
            "Angaben übernehmen",
        ])

    def test_recorder_fetch_ignores_stale_metric_requests(self):
        assert_has_snippets(self, self.source, [
            "const nonce = ++this._historyNonce;",
            "if (nonce !== this._historyNonce) return;",
            "this._api.getRecorderHistory(",
            "this._historyPoints = points;",
        ])

    def test_dialogs_use_real_modal_semantics_and_backdrops(self):
        assert_has_snippets(self, self.source, [
            'role="dialog"',
            'aria-modal="true"',
            'class="modal-backdrop"',
            'data-action="close-dialog"',
            'data-action="close-journal-editor"',
        ])

    def test_keyboard_shortcut_saves_journal_only_in_editor(self):
        assert_has_snippets(self, self.source, [
            'event.key === "Enter"',
            "event.ctrlKey || event.metaKey",
            'this._journalEditorOpen',
            'this._saveJournalEntry();',
        ])

    def test_sensor_bindings_can_be_reassigned_or_ended(self):
        assert_has_snippets(self, self.source, [
            'data-action="open-binding-editor"',
            'this._command("set_binding"',
            'this._command("clear_binding"',
            'data-action="clear-binding"',
        ])

    def test_new_journal_entry_captures_current_bound_sensor_values(self):
        assert_has_snippets(self, self.source, [
            "_sensorSnapshot(run)",
            "sensor_snapshot:",
            "snapshot.captured_at = capturedAt;",
            "entry?.sensor_snapshot",
        ])

    def test_journal_photo_flow_keeps_pending_data_until_authenticated_command(self):
        assert_has_snippets(self, self.source, [
            'target.matches("[data-journal-files]")',
            "this._readJournalFile(file)",
            "FileReader",
            "canvas.toBlob",
            "data ? { data } : {}",
            'this._command("set_plant_cover"',
        ])

    def test_snapshot_capture_time_is_metadata_not_a_sensor_value(self):
        assert_has_snippets(self, self.source, [
            'key !== "captured_at"',
            "contextRows.length",
        ])

    def test_delete_button_requires_exact_run_name(self):
        assert_has_snippets(self, self.source, [
            "confirmation !== this._runName(run)",
            'data-action="confirm-delete-run"',
            "confirmation_name: confirmation",
        ])


if __name__ == "__main__":
    unittest.main()
