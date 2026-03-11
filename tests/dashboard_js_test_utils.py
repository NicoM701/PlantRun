from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PANEL_JS = ROOT / "custom_components" / "plantrun" / "www" / "plantrun-panel.js"


def load_panel_source() -> str:
    return PANEL_JS.read_text(encoding="utf-8")


def assert_has_snippets(testcase, source: str, snippets: list[str]) -> None:
    for snippet in snippets:
        testcase.assertIn(snippet, source)
