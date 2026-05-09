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
    async def test_prefers_tolerant_automatic_alias_match_for_common_name_variant(self):
        html = """
        <html><body><table class="table"><tbody>
          <tr>
            <td><a href="/en/strain/sensi-amnesia-xxl-automatic">Sensi Amnesia XXL Automatic</a></td>
            <td>Sensi Seeds</td>
            <td>Hybrid</td>
            <td>10-11 weeks</td>
          </tr>
          <tr>
            <td><a href="/en/strain/amnesia-lemon">Amnesia Lemon</a></td>
            <td>Sensi Seeds</td>
            <td>Hybrid</td>
            <td>9-10 weeks</td>
          </tr>
        </tbody></table></body></html>
        """
        session = _FakeSession([_FakeResponse(200, html)])

        results = await provider.async_search_cultivar("Sensi Seeds", "Amnesia Haze XXL Auto", session=session)

        self.assertEqual(results[0].name, "Sensi Amnesia XXL Automatic")

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


class NormalizeImageContextValueTest(unittest.TestCase):
    def test_normalizes_non_string_attribute_values(self):
        self.assertEqual(provider._normalize_image_context_value(None), "")
        self.assertEqual(provider._normalize_image_context_value(" hero "), "hero")
        self.assertEqual(
            provider._normalize_image_context_value(["gallery", "featured", ""]),
            "gallery featured",
        )
        self.assertEqual(provider._normalize_image_context_value(123), "123")


class BuildImageContextTest(unittest.TestCase):
    def test_includes_ancestor_container_context(self):
        class _Node:
            def __init__(self, name, attrs=None, text="", parent=None):
                self.name = name
                self._attrs = attrs or {}
                self._text = text
                self.parent = parent

            def get(self, key, default=None):
                return self._attrs.get(key, default)

            def get_text(self, _separator=" ", strip=False):
                return self._text.strip() if strip else self._text

        article = _Node("article", {"class": ["strain-profile"], "id": "cultivar-main"}, "Runtz Layer Cake")
        figure = _Node("figure", {"class": ["hero-image"]}, parent=article)
        image = _Node(
            "img",
            {"alt": "Featured photo", "class": ["gallery-photo"], "id": "hero-shot"},
            parent=figure,
        )

        context = provider._build_image_context(image)

        self.assertIn("strain-profile", context)
        self.assertIn("cultivar-main", context)
        self.assertIn("Runtz Layer Cake", context)


class AsyncFetchCultivarImageTest(unittest.IsolatedAsyncioTestCase):
    async def test_prefers_strain_specific_image_over_generic_logo(self):
        html = """
        <html>
          <head>
            <meta property="og:image" content="https://seedfinder.eu/assets/logo.png" />
          </head>
          <body>
            <img src="/images/strains/runtz-layer-cake-photo.jpg" alt="Runtz Layer Cake flower" />
          </body>
        </html>
        """
        session = _FakeSession([_FakeResponse(200, html)])

        selected = await provider.async_fetch_cultivar_image(
            "https://seedfinder.eu/en/strain/runtz-layer-cake",
            "Runtz Layer Cake",
            session=session,
        )

        self.assertEqual(
            selected.url,
            "https://seedfinder.eu/images/strains/runtz-layer-cake-photo.jpg",
        )
        self.assertEqual(selected.source_kind, "strain_specific")
        self.assertEqual(selected.confidence, "high")

    async def test_uses_generic_fallback_with_low_confidence_when_needed(self):
        html = """
        <html>
          <head>
            <meta property="og:image" content="https://seedfinder.eu/assets/default-logo.jpg" />
          </head>
        </html>
        """
        session = _FakeSession([_FakeResponse(200, html)])

        selected = await provider.async_fetch_cultivar_image(
            "https://seedfinder.eu/en/strain/unknown",
            "Unknown",
            session=session,
        )

        self.assertEqual(selected.url, "https://seedfinder.eu/assets/default-logo.jpg")
        self.assertEqual(selected.source_kind, "generic_fallback")
        self.assertEqual(selected.confidence, "low")

    async def test_handles_list_like_class_attributes_in_image_context(self):
        original = provider.BeautifulSoup

        class _ImageTag:
            def __init__(self, src, attrs, parent=None):
                self._src = src
                self._attrs = attrs
                self.parent = parent

            def get(self, key, default=None):
                if key == "src":
                    return self._src
                return self._attrs.get(key, default)

        class _Node:
            def __init__(self, name, attrs=None, text="", parent=None):
                self.name = name
                self._attrs = attrs or {}
                self._text = text
                self.parent = parent

            def get(self, key, default=None):
                return self._attrs.get(key, default)

            def get_text(self, _separator=" ", strip=False):
                return self._text.strip() if strip else self._text

        class _Soup:
            def __init__(self, _html, _parser):
                article = _Node(
                    "article",
                    {"class": ["strain-gallery"], "id": "cultivar-main"},
                    "Runtz Layer Cake",
                )
                figure = _Node("figure", {"class": ["featured-photo"]}, parent=article)
                self._images = [
                    _ImageTag(
                        "/images/strains/runtz-layer-cake-photo.jpg",
                        {
                            "alt": "Featured photo",
                            "title": "Featured photo",
                            "class": ["gallery", "strain-photo"],
                            "id": "hero-image",
                        },
                        parent=figure,
                    )
                ]

            def find_all(self, name):
                if name == "meta":
                    return []
                if name == "img":
                    return self._images
                return []

        provider.BeautifulSoup = _Soup
        try:
            session = _FakeSession([_FakeResponse(200, "<html></html>")])
            selected = await provider.async_fetch_cultivar_image(
                "https://seedfinder.eu/en/strain/runtz-layer-cake",
                "Runtz Layer Cake",
                session=session,
            )
        finally:
            provider.BeautifulSoup = original

        self.assertEqual(
            selected.url,
            "https://seedfinder.eu/images/strains/runtz-layer-cake-photo.jpg",
        )
        self.assertEqual(selected.source_kind, "strain_specific")
        self.assertEqual(selected.confidence, "high")

    async def test_prefers_main_content_hero_image_over_header_logo_with_name_hint(self):
        original = provider.BeautifulSoup

        class _Node:
            def __init__(self, name, attrs=None, text="", parent=None):
                self.name = name
                self._attrs = attrs or {}
                self._text = text
                self.parent = parent

            def get(self, key, default=None):
                return self._attrs.get(key, default)

            def get_text(self, _separator=" ", strip=False):
                return self._text.strip() if strip else self._text

        class _ImageTag(_Node):
            def __init__(self, src, attrs=None, parent=None):
                super().__init__("img", attrs=attrs, parent=parent)
                self._src = src

            def get(self, key, default=None):
                if key == "src":
                    return self._src
                return super().get(key, default)

        class _MetaTag:
            def __init__(self, attrs):
                self._attrs = attrs

            def get(self, key, default=None):
                return self._attrs.get(key, default)

        class _Soup:
            def __init__(self, _html, _parser):
                header = _Node("header", {"class": ["site-header", "logo-wrap"]}, "Runtz Layer Cake")
                main = _Node("main", {"class": ["strain-detail", "entry-content"], "id": "main-content"}, "Runtz Layer Cake")
                hero = _Node("figure", {"class": ["hero-image", "featured-photo"]}, parent=main)
                self._metas = [
                    _MetaTag(
                        {
                            "property": "og:image",
                            "content": "https://seedfinder.eu/assets/runtz-layer-cake-logo.png",
                        }
                    )
                ]
                self._images = [
                    _ImageTag(
                        "/uploads/strains/runtz-layer-cake-hero.jpg",
                        {"alt": "Cultivar hero"},
                        parent=hero,
                    ),
                    _ImageTag(
                        "/assets/runtz-layer-cake-logo.png",
                        {"alt": "Runtz Layer Cake logo"},
                        parent=header,
                    ),
                ]

            def find_all(self, name):
                if name == "meta":
                    return self._metas
                if name == "img":
                    return self._images
                return []

        provider.BeautifulSoup = _Soup
        try:
            session = _FakeSession([_FakeResponse(200, "<html></html>")])
            selected = await provider.async_fetch_cultivar_image(
                "https://seedfinder.eu/en/strain/runtz-layer-cake",
                "Runtz Layer Cake",
                session=session,
            )
        finally:
            provider.BeautifulSoup = original

        self.assertEqual(
            selected.url,
            "https://seedfinder.eu/uploads/strains/runtz-layer-cake-hero.jpg",
        )
        self.assertEqual(selected.source_kind, "strain_specific")


if __name__ == "__main__":
    unittest.main()
