from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel.js"
PANEL_API_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel-api.js"
PANEL_DIALOGS_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel-dialogs.js"
PANEL_DOMAIN_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel-domain.js"
PANEL_STYLES_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel-styles.js"
PANEL_VIEWS_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel-views.js"


def load_panel_source() -> str:
    return "\n".join(
        path.read_text(encoding="utf-8")
        for path in (
            PANEL_JS,
            PANEL_API_JS,
            PANEL_DIALOGS_JS,
            PANEL_DOMAIN_JS,
            PANEL_STYLES_JS,
            PANEL_VIEWS_JS,
        )
    )


def assert_has_snippets(testcase, source: str, snippets: list[str]) -> None:
    for snippet in snippets:
        testcase.assertIn(snippet, source)
