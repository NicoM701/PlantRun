"""SeedFinder API provider for PlantRun."""
import logging
import re
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
        r"\s*(?P<unit>days?|d|weeks?|w)\b"
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


async def async_fetch_cultivar_image_url(
    detail_url: str,
    *,
    session: aiohttp.ClientSession | None = None,
) -> str | None:
    """Fetch a cultivar image URL from a SeedFinder detail page when available."""
    if not detail_url:
        return None

    try:
        if session is None:
            async with aiohttp.ClientSession() as owned_session:
                return await async_fetch_cultivar_image_url(detail_url, session=owned_session)

        async with session.get(detail_url, timeout=20) as response:
            if response.status != 200:
                return None
            html = await response.text()
    except Exception as err:
        _LOGGER.debug("Cultivar image fetch failed for %s: %s", detail_url, err)
        return None

    soup = BeautifulSoup(html, "html.parser")

    og_image = soup.find("meta", attrs={"property": "og:image"})
    if og_image and og_image.get("content"):
        return og_image["content"]

    tw_image = soup.find("meta", attrs={"name": "twitter:image"})
    if tw_image and tw_image.get("content"):
        return tw_image["content"]

    image = soup.select_one("img[src*='seedfinder'], img[src*='strain']")
    if image and image.get("src"):
        src = image["src"]
        if src.startswith("http"):
            return src
        return f"https://seedfinder.eu{src}" if src.startswith("/") else None

    return None
