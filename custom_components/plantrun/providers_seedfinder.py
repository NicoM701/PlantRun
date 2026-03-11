"""SeedFinder API provider for PlantRun."""
import logging
import re
from dataclasses import dataclass
from typing import Any

import aiohttp
from bs4 import BeautifulSoup

from .models import CultivarSnapshot

_LOGGER = logging.getLogger(__name__)

def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")

def _norm(value: str) -> str:
    return " ".join(value.strip().lower().split())

def _score_match(query_species: str, row_species: str, prefer_automatic: bool = False) -> int:
    q = _norm(query_species)
    r = _norm(row_species)
    if not q or not r:
        return 0

    if q == r:
        base = 100
    elif q in r or r in q:
        base = 70
    else:
        q_tokens = set(q.split())
        r_tokens = set(r.split())
        overlap = len(q_tokens & r_tokens)
        base = overlap * 10

    if prefer_automatic and ("auto" in r or "automatic" in r):
        base += 35

    return base


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
    if not match:
        return None

    start = float(match.group("start"))
    end = float(match.group("end") or start)
    midpoint = (start + end) / 2
    unit = match.group("unit")

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

async def async_search_cultivar(
    breeder: str,
    strain: str,
    *,
    session: aiohttp.ClientSession | None = None,
) -> list[CultivarSnapshot]:
    """Search for a cultivar on SeedFinder using the robust breeder scrape."""
    results = []
    
    species = strain.strip()
    breeder = breeder.strip()
    if not species or not breeder:
        return results

    try:
        breeder_slug = _slug(breeder)
        breeder_urls = [
            f"https://seedfinder.eu/en/database/breeder/{breeder_slug}/",
            f"https://seedfinder.eu/de/database/breeder/{breeder_slug}/",
        ]

        breeder_html = None
        if session is None:
            async with aiohttp.ClientSession() as owned_session:
                return await async_search_cultivar(
                    breeder,
                    strain,
                    session=owned_session,
                )

        for breeder_url in breeder_urls:
            async with session.get(breeder_url, timeout=20) as response:
                if response.status == 200:
                    breeder_html = await response.text()
                    break

        if not breeder_html:
            _LOGGER.warning("SeedFinder breeder page not found for %s", breeder)
            return results

        breeder_soup = BeautifulSoup(breeder_html, "html.parser")
        table = breeder_soup.find("table", class_="table")
        if not table or not table.find("tbody"):
            _LOGGER.warning("No strain table found for breeder %s", breeder)
            return results

        scored_rows = []
        for row in table.find("tbody").find_all("tr"):
            cells = row.find_all("td")
            if not cells:
                continue
            anchor = cells[0].find("a")
            if not anchor:
                continue
            score = _score_match(species, anchor.get_text(strip=True))
            if score > 0:
                scored_rows.append((score, cells, anchor))

        if not scored_rows:
            _LOGGER.warning("Strain '%s' not found for breeder '%s'", species, breeder)
            return results

        # We only need a small snapshot for config flows/services.
        scored_rows.sort(key=lambda item: item[0], reverse=True)
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

    except Exception as err:
        _LOGGER.error("Error searching SeedFinder: %s", err)
        
    return results


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
            part for part in (image.get("alt") or "", image.get("title") or "", image.get("class") or "", image.get("id") or "") if part
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
