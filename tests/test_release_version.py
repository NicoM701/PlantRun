import json
import re
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANIFEST_PATH = ROOT / "custom_components" / "plantrun" / "manifest.json"
WWW = ROOT / "custom_components" / "plantrun" / "www"
PANEL_JS_FILES = (
    WWW / "plantrun-panel.js",
    WWW / "plantrun-panel-views.js",
    WWW / "plantrun-panel-dialogs.js",
)


def manifest_version() -> str:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))["version"]


class ReleaseVersionConsistencyTests(unittest.TestCase):
    def test_manifest_version_is_present(self):
        version = manifest_version()
        self.assertRegex(version, r"^\d+\.\d+\.\d+$")

    def test_panel_modules_use_manifest_cache_key(self):
        version = manifest_version()
        pattern = re.compile(rf'\?v={re.escape(version)}(["\'])')
        for path in PANEL_JS_FILES:
            source = path.read_text(encoding="utf-8")
            self.assertTrue(
                pattern.search(source),
                f"{path.name} must import sibling modules with ?v={version}",
            )

    def test_frontend_harness_matches_manifest(self):
        version = manifest_version()
        harness = (ROOT / "tests" / "frontend_harness.html").read_text(encoding="utf-8")
        self.assertIn(f'version: "{version}"', harness)

    def test_readme_opens_with_current_version(self):
        version = manifest_version()
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        self.assertIn(f"Version {version} is the current release", readme)

    def test_roadmap_current_truth_mentions_release_tag(self):
        version = manifest_version()
        roadmap = (ROOT / "docs" / "ROADMAP.md").read_text(encoding="utf-8")
        self.assertIn(f"`v{version}`", roadmap)

    def test_changelog_leads_with_current_version(self):
        version = manifest_version()
        changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
        self.assertRegex(changelog, rf"^# Changelog\n\n## {re.escape(version)}\n")


if __name__ == "__main__":
    unittest.main()
