"""SeedFinder API provider for PlantRun."""
import logging
import re
import time
from dataclasses import dataclass
from typing import Any

import aiohttp
from bs4 import BeautifulSoup

from .models import CultivarSnapshot

_LOGGER = logging.getLogger(__name__)
_BREEDER_PAGE_CACHE_TTL_SECONDS = 300
_BREEDER_PAGE_CACHE: dict[tuple[object, str], tuple[float, str]] = {}


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def _norm(value: str) -> str:
    return " ".join(value.strip().lower().split())


def _canonical_tokens(value: str) -> list[str]:
    normalized = _norm(value)
    if not normalized:
        return []

    alias_map = {
        "automatic": "auto",
        "autoflower": "auto",
        "autoflowering": "auto",
        "feminized": "fem",
        "feminised": "fem",
        "xxxl": "xxl",
    }
    stopwords = {"strain", "seeds", "seed", "the", "by"}
    collapsed = re.sub(r"[^a-z0-9]+", " ", normalized)
    tokens: list[str] = []
    for raw_token in collapsed.split():
        token = alias_map.get(raw_token, raw_token)
        if token in stopwords:
            continue
        tokens.append(token)
    return tokens


def _score_match(query_species: str, row_species: str, prefer_automatic: bool = False) -> int:
    q = _norm(query_species)
    r = _norm(row_species)
    if not q or not r:
        return 0

    q_tokens = _canonical_tokens(query_species)
    r_tokens = _canonical_tokens(row_species)
    q_set = set(q_tokens)
    r_set = set(r_tokens)

    if q == r:
        base = 100
    elif q in r or r in q:
        base = 70
    else:
        overlap = len(q_set & r_set)
        base = overlap * 14

        if overlap:
            ordered_hits = sum(1 for index, token in enumerate(q_tokens[:3]) if token in r_set and r_tokens.index(token) <= index + 1)
            base += ordered_hits * 10

            missing = len([token for token in q_tokens if token not in r_set])
            base -= missing * 4

        for token in q_set - r_set:
            if any(candidate.startswith(token[:4]) or token.startswith(candidate[:4]) for candidate in r_set if len(candidate) >= 4 and len(token) >= 4):
                base += 4

    if q_tokens and r_tokens and q_tokens[0] == r_tokens[0]:
        base += 12
    elif q_tokens and q_tokens[0] in r_set:
        base += 8

    if prefer_automatic and ("auto" in r_tokens or "auto" in q_tokens):
        base += 35

    if "auto" in q_tokens and "auto" in r_tokens:
        base += 18

    return max(base, 0)


def parse_flower_window_days(raw_value: str | None) -> int | None:
    """Parse a SeedFinder flowering duration string into midpoint days."""
    if not raw_value:
        return None

    normalized = " ".join(str(raw_value).strip().lower().split())
    if not normalized:
        return None

    normalized = normalized.replace("–", "-").replace("—", "-")
    normalized = normalized.replace(",", ".")
    pattern = re.compile(
        r"(?:(?:~|about|approx(?:\.|imately)?|ca\.?|around)\s*)?"
        r"(?P<start>\d+(?:\.\d+)?)"
        r"(?:\s*(?:-|to)\s*(?P<end>\d+(?:\.\d+)?))?"
        r"\s*(?P<unit>days?|d|weeks?|w|tage?|wochen?)\b"
    )

    match = pattern.search(normalized)
    if match:
        start = float(match.group("start"))
        end = float(match.group("end") or start)
        midpoint = (start + end) / 2
        unit = match.group("unit")
    else:
        unit_match = re.search(r"\b(days?|d|weeks?|w|tage?|wochen?)\b", normalized)
        numbers = [float(value) for value in re.findall(r"\d+(?:\.\d+)?", normalized)]
        if not unit_match or not numbers:
            return None
        start = numbers[0]
        end = numbers[1] if len(numbers) > 1 else start
        midpoint = (start + end) / 2
        unit = unit_match.group(1)

    if unit.startswith("w"):
        midpoint *= 7

    parsed = int(round(midpoint))
    return parsed if parsed > 0 else None


def _extract_flower_window_days(cells: list[Any]) -> int | None:
    """Return the first parseable flowering duration from a breeder result row."""
    for cell in cells[2:]:
        value = parse_flower_window_days(cell.get_text(" ", strip=True))
        if value is not None:
            return value

    for cell in cells:
        value = parse_flower_window_days(cell.get_text(" ", strip=True))
        if value is not None:
            return value

    return None


def _breeder_urls(breeder: str) -> list[str]:
    breeder_slug = _slug(breeder)
    return [
        f"https://seedfinder.eu/en/database/breeder/{breeder_slug}/",
        f"https://seedfinder.eu/de/database/breeder/{breeder_slug}/",
    ]


async def _async_fetch_breeder_html(
    breeder: str,
    *,
    session: aiohttp.ClientSession,
) -> str | None:
    """Fetch one breeder page with short-lived HTML caching."""
    cache_key = (session, _slug(breeder))
    cached = _BREEDER_PAGE_CACHE.get(cache_key)
    now = time.monotonic()
    if cached and now - cached[0] < _BREEDER_PAGE_CACHE_TTL_SECONDS:
        return cached[1]

    for breeder_url in _breeder_urls(breeder):
        async with session.get(breeder_url, timeout=20) as response:
            if response.status != 200:
                continue
            breeder_html = await response.text()
            _BREEDER_PAGE_CACHE[cache_key] = (now, breeder_html)
            return breeder_html

    return None


def _collect_scored_matches(
    breeder_html: str,
    breeder: str,
    query: str,
) -> list[CultivarSnapshot]:
    """Parse breeder HTML and return top scored cultivar matches."""
    breeder_soup = BeautifulSoup(breeder_html, "html.parser")
    table = breeder_soup.find("table", class_="table")
    if not table or not table.find("tbody"):
        _LOGGER.warning("No strain table found for breeder %s", breeder)
        return []

    scored_rows = []
    for row in table.find("tbody").find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue
        anchor = cells[0].find("a")
        if not anchor:
            continue
        match_name = anchor.get_text(strip=True)
        score = _score_match(query, match_name)
        if score <= 0:
            continue
        scored_rows.append((score, cells, anchor))

    if not scored_rows:
        return []

    scored_rows.sort(key=lambda item: item[0], reverse=True)
    results: list[CultivarSnapshot] = []
    for _, cells, anchor in scored_rows[:5]:
        match_name = anchor.get_text(strip=True)
        match_breeder = cells[1].get_text(strip=True) if len(cells) > 1 else breeder
        detail_url = anchor.get("href")
        flower_window_days = _extract_flower_window_days(cells)
        if detail_url and detail_url.startswith("/"):
            detail_url = f"https://seedfinder.eu{detail_url}"

        results.append(
            CultivarSnapshot(
                name=match_name,
                breeder=match_breeder,
                flower_window_days=flower_window_days,
                detail_url=detail_url,
            )
        )
    return results


async def async_search_cultivar_by_query(
    breeder: str,
    query: str,
    *,
    session: aiohttp.ClientSession | None = None,
) -> list[CultivarSnapshot]:
    """Search cultivars for a breeder using scored top-5 matching."""
    breeder = breeder.strip()
    query = query.strip()
    if not breeder or not query:
        return []

    try:
        if session is None:
            async with aiohttp.ClientSession() as owned_session:
                return await async_search_cultivar_by_query(
                    breeder,
                    query,
                    session=owned_session,
                )

        breeder_html = await _async_fetch_breeder_html(breeder, session=session)
        if not breeder_html:
            _LOGGER.debug("SeedFinder breeder page not found for %s", breeder)
            return []

        results = _collect_scored_matches(breeder_html, breeder, query)
        if not results:
            _LOGGER.debug("Strain '%s' not found for breeder '%s'", query, breeder)
        return results
    except Exception as err:
        _LOGGER.error("Error searching SeedFinder: %s", err)
        return []


async def async_search_cultivar(
    breeder: str,
    strain: str,
    *,
    session: aiohttp.ClientSession | None = None,
) -> list[CultivarSnapshot]:
    """Search for a cultivar on SeedFinder using the robust breeder scrape."""
    return await async_search_cultivar_by_query(
        breeder,
        strain,
        session=session,
    )


@dataclass
class ImageSelection:
    """Resolved cultivar image candidate with ranking metadata."""

    url: str | None
    confidence: str
    source_kind: str


def _is_generic_image_hint(value: str) -> bool:
    lowered = value.lower()
    return any(
        token in lowered
        for token in ("logo", "icon", "avatar", "banner", "header", "placeholder", "default")
    )


def _score_image_candidate(url: str, cultivar_name: str, context: str) -> tuple[int, bool]:
    normalized_url = url.lower()
    normalized_name = _norm(cultivar_name)
    name_tokens = [token for token in normalized_name.split() if len(token) > 2]

    score = 20
    for token in name_tokens:
        if token in normalized_url:
            score += 25

    lowered_context = context.lower()
    for token in name_tokens:
        if token in lowered_context:
            score += 15

    has_strain_hint = any(token in normalized_url for token in ("strain", "cultivar", "genetics", "variety"))
    if has_strain_hint:
        score += 15

    is_generic = _is_generic_image_hint(normalized_url) or _is_generic_image_hint(lowered_context)
    if is_generic:
        score -= 40

    return score, is_generic


def _normalize_image_context_value(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (list, tuple, set)):
        return " ".join(
            part.strip() for part in (str(item) for item in value) if part and part.strip()
        )
    return str(value).strip()


def _normalize_image_url(raw_url: str | None) -> str | None:
    if not raw_url:
        return None
    if raw_url.startswith("http"):
        return raw_url
    if raw_url.startswith("/"):
        return f"https://seedfinder.eu{raw_url}"
    return None


async def async_fetch_cultivar_image(
    detail_url: str,
    cultivar_name: str,
    *,
    session: aiohttp.ClientSession | None = None,
) -> ImageSelection:
    """Fetch and rank cultivar image candidates from a SeedFinder detail page."""
    if not detail_url:
        return ImageSelection(url=None, confidence="none", source_kind="missing")

    try:
        if session is None:
            async with aiohttp.ClientSession() as owned_session:
                return await async_fetch_cultivar_image(detail_url, cultivar_name, session=owned_session)

        async with session.get(detail_url, timeout=20) as response:
            if response.status != 200:
                return ImageSelection(url=None, confidence="none", source_kind="http_error")
            html = await response.text()
    except Exception as err:
        _LOGGER.debug("Cultivar image fetch failed for %s: %s", detail_url, err)
        return ImageSelection(url=None, confidence="none", source_kind="fetch_error")

    soup = BeautifulSoup(html, "html.parser")

    candidates: list[tuple[int, bool, str]] = []
    seen: set[str] = set()

    for meta in soup.find_all("meta"):
        prop = (meta.get("property") or meta.get("name") or "").strip().lower()
        if prop not in {"og:image", "twitter:image"}:
            continue
        normalized = _normalize_image_url(meta.get("content"))
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        score, generic = _score_image_candidate(normalized, cultivar_name, prop)
        candidates.append((score + 10, generic, normalized))

    for image in soup.find_all("img"):
        normalized = _normalize_image_url(image.get("src"))
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        context = " ".join(
            part
            for part in (
                _normalize_image_context_value(image.get("alt")),
                _normalize_image_context_value(image.get("title")),
                _normalize_image_context_value(image.get("class")),
                _normalize_image_context_value(image.get("id")),
            )
            if part
        )
        score, generic = _score_image_candidate(normalized, cultivar_name, context)
        candidates.append((score, generic, normalized))

    if not candidates:
        return ImageSelection(url=None, confidence="none", source_kind="missing")

    candidates.sort(key=lambda item: item[0], reverse=True)
    score, is_generic, url = candidates[0]
    confidence = "high" if score >= 60 and not is_generic else "low"
    source_kind = "strain_specific" if not is_generic else "generic_fallback"
    return ImageSelection(url=url, confidence=confidence, source_kind=source_kind)


async def async_fetch_cultivar_image_url(
    detail_url: str,
    *,
    session: aiohttp.ClientSession | None = None,
) -> str | None:
    """Compatibility wrapper returning only the selected image URL."""
    selection = await async_fetch_cultivar_image(detail_url, "", session=session)
    return selection.url
