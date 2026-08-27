from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
WWW = ROOT / "custom_components" / "plantrun" / "www"
CARD_JS = WWW / "plantrun-card.js"
EDITOR_JS = WWW / "plantrun-card-editor.js"
PANEL_ENTRY_JS = WWW / "plantrun-panel.js"
PANEL_API_JS = WWW / "plantrun-panel-api.js"
PANEL_DIALOGS_JS = WWW / "plantrun-panel-dialogs.js"
PANEL_DOMAIN_JS = WWW / "plantrun-panel-domain.js"
PANEL_STYLES_JS = WWW / "plantrun-panel-styles.js"
PANEL_VIEWS_JS = WWW / "plantrun-panel-views.js"


def panel_source() -> str:
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in (PANEL_ENTRY_JS, PANEL_API_JS, PANEL_DIALOGS_JS, PANEL_DOMAIN_JS, PANEL_STYLES_JS, PANEL_VIEWS_JS)
    )


class DashboardJsContractsTests(unittest.TestCase):
    def test_panel_keeps_a_small_authenticated_transport_interface(self):
        source = PANEL_API_JS.read_text(encoding="utf-8")
        self.assertIn('type: "plantrun/get_state"', source)
        self.assertIn('type: "plantrun/command"', source)
        self.assertIn("async getState()", source)
        self.assertIn("async command(command, payload = {})", source)
        self.assertIn("async searchCultivar(breeder, query)", source)
        self.assertIn("async getRecorderHistory(entityId, start, end)", source)
        self.assertNotIn("callService", source)

    def test_panel_uses_production_modules_and_no_prototype_fixtures(self):
        source = PANEL_ENTRY_JS.read_text(encoding="utf-8")
        for module in ("api", "dialogs", "domain", "styles", "views"):
            self.assertIn(f'from "./plantrun-panel-{module}.js?v=0.7.0"', source)
        self.assertNotIn('from "./prototype/', source.lower())
        self.assertNotIn("Tangerine Dream Auto", source)
        self.assertNotIn("Diesel Auto", source)

    def test_state_normalizer_supports_first_class_and_embedded_records(self):
        source = PANEL_DOMAIN_JS.read_text(encoding="utf-8")
        self.assertIn("export function normalizeState(payload)", source)
        self.assertIn("source.plants", source)
        self.assertIn("run?.plant", source)
        self.assertIn("source.journal_entries", source)
        self.assertIn("run?.journal_entries", source)
        self.assertIn("one plant", source.lower())
        self.assertIn("source.sensor_bindings", source)
        self.assertIn('owner === "run" ? "plant"', source)

    def test_overview_is_tent_first_and_plant_dominant(self):
        source = PANEL_VIEWS_JS.read_text(encoding="utf-8")
        self.assertIn('class="tent-overview"', source)
        self.assertIn('class="plant-gallery"', source)
        self.assertIn('data-action="open-run"', source)
        self.assertIn("Nächste Schätzung", source)
        self.assertIn("Noch kein Pflanzenfoto", source)

    def test_workspace_matches_accepted_information_order(self):
        source = panel_source()
        for text in (
            "Lebenszyklus",
            "Recorder-Verlauf",
            "Zielbereich",
            "Minimum",
            "Durchschnitt",
            "Maximum",
            "Feste Daten",
            "Letzter Journaleintrag",
        ):
            self.assertIn(text, source)
        self.assertIn('data-action="select-metric"', source)
        self.assertIn('data-action="select-stage"', source)
        self.assertIn("PlantRun zeichnet keine erfundenen Messwerte.", source)

    def test_frontend_uses_recorded_stage_history_and_real_archive_end(self):
        domain = PANEL_DOMAIN_JS.read_text(encoding="utf-8")
        views = PANEL_VIEWS_JS.read_text(encoding="utf-8")
        self.assertIn("export function recordedStages(run)", domain)
        self.assertIn("run?.stage_history", domain)
        self.assertIn("recorded.has(stage.toLowerCase())", views)
        self.assertIn("run?.ended_at || run?.archived_at", domain)
        self.assertIn("runEnd(b) || 0", views)
        self.assertIn("daysSince(runStart(run), runEnd(run))", views)

    def test_energy_is_bindable_and_unbound_metrics_have_an_honest_owner_label(self):
        domain = PANEL_DOMAIN_JS.read_text(encoding="utf-8")
        panel = PANEL_ENTRY_JS.read_text(encoding="utf-8")
        views = PANEL_VIEWS_JS.read_text(encoding="utf-8")
        self.assertIn('{ key: "energy", label: "Energie"', domain)
        self.assertIn('energy: ["energy", "kwh", "wh"]', panel.lower())
        self.assertIn('itemBinding ? (itemBinding.owner_type === "tent" ? "Zelt" : "Pflanze") : "Nicht zugeordnet"', views)

    def test_create_flow_is_three_steps_for_one_plant_and_one_run(self):
        source = panel_source()
        self.assertIn("1. Sorte und Pflanze", source)
        self.assertIn("2. Ablauf und Sensoren", source)
        self.assertIn("3. Prüfen und anlegen", source)
        self.assertIn('command("create_run"', source)
        self.assertIn("plant_name:", source)
        self.assertIn("initial_stage:", source)
        self.assertIn("stage_plan:", source)
        self.assertIn("container:", source)
        self.assertIn("substrate:", source)
        self.assertIn("light_schedule:", source)
        self.assertNotIn("Add plant", source)

    def test_seedfinder_preview_does_not_import_until_confirmed(self):
        panel = PANEL_ENTRY_JS.read_text(encoding="utf-8")
        dialogs = PANEL_DIALOGS_JS.read_text(encoding="utf-8")
        preview_start = panel.index("_previewCultivar(index)")
        apply_start = panel.index("_applyCultivarPreview()")
        self.assertNotIn("this._createDraft.strain =", panel[preview_start:apply_start])
        self.assertIn("this._createDraft.strain =", panel[apply_start:])
        self.assertIn("this._cultivarPreview", dialogs)
        self.assertIn("Angaben übernehmen", dialogs)

    def test_journal_is_history_first_with_on_demand_editor(self):
        source = panel_source()
        self.assertIn("Verlauf zuerst", source)
        self.assertIn('data-action="open-journal-editor"', source)
        self.assertIn('class="journal-drawer"', source)
        self.assertIn('"create_journal_entry"', source)
        self.assertIn('this._command(command, {', source)
        self.assertIn("occurred_at:", source)
        self.assertIn("run_ids:", source)
        self.assertIn("const tentEntries", source)
        self.assertIn("Sensorkontext wird beim Speichern angehängt", source)

    def test_journal_attachments_support_upload_caption_and_cover_selection(self):
        source = panel_source()
        self.assertIn("data-journal-files", source)
        self.assertIn("_handleJournalFiles(files)", source)
        self.assertIn("attachments:", source)
        self.assertIn('data-action="remove-journal-attachment"', source)
        self.assertIn('data-action="set-plant-cover"', source)
        self.assertIn('data-action="clear-plant-cover"', source)
        self.assertIn("run?.plant?.image", source)
        self.assertIn("cover_attachment_id", source)

    def test_stage_change_is_direct_and_timestamped(self):
        source = panel_source()
        self.assertIn('data-action="select-stage"', source)
        self.assertIn('data-stage-occurred-at', source)
        self.assertIn('command("change_stage"', source)
        self.assertIn("occurred_at:", source)

    def test_archive_and_permanent_deletion_are_separate(self):
        source = panel_source()
        self.assertIn('command("archive_run"', source)
        self.assertIn('command("delete_run"', source)
        self.assertIn("Dauerhaft löschen", source)
        self.assertIn("Diese Aktion kann nicht rückgängig gemacht werden.", source)
        self.assertIn("confirmation_name:", source)
        self.assertIn('data-delete-confirmation', source)
        self.assertNotIn("vollständig lesbar und bearbeitbar", source)

    def test_styles_follow_shape_mobile_focus_and_motion_contracts(self):
        styles = PANEL_STYLES_JS.read_text(encoding="utf-8")
        for token in ("--radius-work:24px", "--radius-group:18px", "--radius-control:12px"):
            self.assertIn(token, styles)
        self.assertIn("@media(max-width:720px)", styles)
        self.assertIn("@media(prefers-reduced-motion:reduce)", styles)
        self.assertIn(":focus-visible", styles)
        self.assertIn(".mobile-nav", styles)

    def test_lovelace_card_and_editor_remain_registered(self):
        card = CARD_JS.read_text(encoding="utf-8")
        editor = EDITOR_JS.read_text(encoding="utf-8")
        self.assertIn('const TAG = "plantrun-card"', card)
        self.assertIn("customElements.define(TAG, PlantRunCard)", card)
        self.assertIn('const TAG = "plantrun-card-editor"', editor)
        self.assertIn("customElements.define(TAG, PlantRunCardEditor)", editor)


if __name__ == "__main__":
    unittest.main()
