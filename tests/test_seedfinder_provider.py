import importlib.util
import sys
import types
import unittest
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
PLANTRUN_DIR = ROOT / "custom_components" / "plantrun"


def _load_module(module_name: str, path: Path):
    spec = importlib.util.spec_from_file_location(module_name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


custom_components = types.ModuleType("custom_components")
custom_components.__path__ = [str(ROOT / "custom_components")]
sys.modules.setdefault("custom_components", custom_components)

plantrun_pkg = types.ModuleType("custom_components.plantrun")
plantrun_pkg.__path__ = [str(PLANTRUN_DIR)]
sys.modules["custom_components.plantrun"] = plantrun_pkg

aiohttp_stub = types.ModuleType("aiohttp")


class _ClientSession:
    pass


aiohttp_stub.ClientSession = _ClientSession
sys.modules.setdefault("aiohttp", aiohttp_stub)

bs4_stub = types.ModuleType("bs4")


class _Tag:
    def __init__(self, element):
        self._element = element

    def find(self, name=None, class_=None, attrs=None):
        attrs = attrs or {}
        for child in self._element.iter():
            if child is self._element:
                continue
            if name is not None and child.tag != name:
                continue
            if class_ is not None and child.attrib.get("class") != class_:
                continue
            if any(child.attrib.get(key) != value for key, value in attrs.items()):
                continue
            return _Tag(child)
        return None

    def find_all(self, name):
        return [_Tag(child) for child in self._element.iter() if child is not self._element and child.tag == name]

    def get_text(self, separator="", strip=False):
        text = separator.join(part for part in self._element.itertext())
        return " ".join(text.split()) if strip else text

    def get(self, key, default=None):
        return self._element.attrib.get(key, default)

    def select_one(self, _selector):
        return None


class _BeautifulSoup(_Tag):
    def __init__(self, html, _parser):
        wrapped = f"<root>{html}</root>"
        super().__init__(ET.fromstring(wrapped))


bs4_stub.BeautifulSoup = _BeautifulSoup
sys.modules.setdefault("bs4", bs4_stub)

models = _load_module("custom_components.plantrun.models", PLANTRUN_DIR / "models.py")
provider = _load_module(
    "custom_components.plantrun.providers_seedfinder",
    PLANTRUN_DIR / "providers_seedfinder.py",
)


class _FakeResponse:
    def __init__(self, status: int, text: str) -> None:
        self.status = status
        self._text = text

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def text(self) -> str:
        return self._text


class _FakeSession:
    def __init__(self, responses):
        self._responses = list(responses)
        self.requested_urls = []

    def get(self, url, timeout=20):
        self.requested_urls.append((url, timeout))
        if not self._responses:
            raise AssertionError("Unexpected request without prepared response.")
        return self._responses.pop(0)


class ParseFlowerWindowDaysTest(unittest.TestCase):
    def test_parses_supported_flower_window_formats(self):
        cases = {
            "55-65 days": 60,
            "8-9 weeks": 60,
            "~60 days": 60,
            "about 10 weeks": 70,
            "70 days": 70,
            "flowering time: 56 - 63 days": 60,
            "55-65 tage": 60,
            "8-9 wochen": 60,
        }

        for raw_value, expected in cases.items():
            with self.subTest(raw_value=raw_value):
                self.assertEqual(provider.parse_flower_window_days(raw_value), expected)

    def test_returns_none_for_unparseable_values(self):
        for raw_value in (None, "", "fast", "unknown", "indoor/outdoor"):
            with self.subTest(raw_value=raw_value):
                self.assertIsNone(provider.parse_flower_window_days(raw_value))


class AsyncSearchCultivarTest(unittest.IsolatedAsyncioTestCase):
    async def test_maps_flower_window_days_from_breeder_row(self):
        html = """
        <html>
          <body>
            <table class="table">
              <tbody>
                <tr>
                  <td><a href="/en/strain/runtz-layer-cake">Runtz Layer Cake</a></td>
                  <td>Barney's Farm</td>
                  <td>Mostly Indica</td>
                  <td>8-9 weeks</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
        """
        session = _FakeSession([_FakeResponse(200, html)])

        results = await provider.async_search_cultivar(
            "Barney's Farm",
            "Runtz Layer Cake",
            session=session,
        )

        self.assertEqual(len(results), 1)
        self.assertIsInstance(results[0], models.CultivarSnapshot)
        self.assertEqual(results[0].name, "Runtz Layer Cake")
        self.assertEqual(results[0].breeder, "Barney's Farm")
        self.assertEqual(results[0].flower_window_days, 60)
        self.assertEqual(
            results[0].detail_url,
            "https://seedfinder.eu/en/strain/runtz-layer-cake",
        )

    async def test_leaves_flower_window_days_none_when_row_has_no_duration(self):
        html = """
        <html>
          <body>
            <table class="table">
              <tbody>
                <tr>
                  <td><a href="/en/strain/runtz-layer-cake">Runtz Layer Cake</a></td>
                  <td>Barney's Farm</td>
                  <td>Mostly Indica</td>
                  <td>popular</td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
        """
        session = _FakeSession([_FakeResponse(200, html)])

        results = await provider.async_search_cultivar(
            "Barney's Farm",
            "Runtz Layer Cake",
            session=session,
        )

        self.assertEqual(results[0].flower_window_days, None)


if __name__ == "__main__":
    unittest.main()
