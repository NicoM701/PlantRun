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

async def async_search_cultivar(breeder: str, strain: str) -> list[CultivarSnapshot]:
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
        async with aiohttp.ClientSession() as session:
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

            # Get top matches (max 5)
            scored_rows.sort(key=lambda item: item[0], reverse=True)
            for _, cells, anchor in scored_rows[:5]:
                match_name = anchor.get_text(strip=True)
                match_breeder = cells[1].get_text(strip=True) if len(cells) > 1 else breeder
                
                # We could fetch detail page here to get flower_time, but for the wizard 
                # a snapshot with just name/breeder is enough for now to avoid 5 slow requests.
                results.append(
                    CultivarSnapshot(
                        name=match_name,
                        breeder=match_breeder,
                        flower_window_days=None
                    )
                )

    except Exception as err:
        _LOGGER.error("Error searching SeedFinder: %s", err)
        
    return results
