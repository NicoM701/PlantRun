"""SeedFinder provider for cultivar lookup (best-effort scraping)."""

from __future__ import annotations

import re
from urllib.parse import quote, urljoin, urlparse
from typing import Any

from aiohttp import ClientSession
from bs4 import BeautifulSoup
from homeassistant.exceptions import HomeAssistantError


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def _breeder_path(value: str) -> str:
    """SeedFinder breeder URLs commonly use percent-encoded path values."""
    return quote(value.strip().lower().replace(" ", "-"), safe="")


def _normalize_seedfinder_url(base_url: str, candidate_url: str) -> str:
    url = urljoin(base_url, candidate_url)
    parsed_url = urlparse(url)
    if parsed_url.scheme not in {"http", "https"} or parsed_url.netloc not in {
        "seedfinder.eu",
        "www.seedfinder.eu",
    }:
        raise HomeAssistantError("SeedFinder returned an unsupported detail URL")
    return url


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


async def fetch_cultivar_profile(
    session: ClientSession,
    species: str,
    breeder: str,
    prefer_automatic: bool = False,
) -> dict[str, Any]:
    """Fetch cultivar details from seedfinder breeder + strain pages."""
    species = species.strip()
    breeder = breeder.strip()
    if not species or not breeder:
        raise HomeAssistantError("species and breeder are required")

    breeder_slug = _breeder_path(breeder)
    breeder_urls = [
        f"https://seedfinder.eu/en/database/breeder/{breeder_slug}/",
        f"https://seedfinder.eu/de/database/breeder/{breeder_slug}/",
    ]

    breeder_html = None
    last_status = None
    for breeder_url in breeder_urls:
        try:
            async with session.get(breeder_url, timeout=20) as response:
                last_status = response.status
                if response.status == 200:
                    breeder_html = await response.text()
                    break
        except Exception as exc:  # noqa: BLE001
            raise HomeAssistantError(f"SeedFinder request failed for breeder page: {exc}") from exc

    if not breeder_html:
        raise HomeAssistantError(f"SeedFinder breeder page failed ({last_status})")

    breeder_soup = BeautifulSoup(breeder_html, "html.parser")
    table = breeder_soup.find("table", class_="table")
    if not table or not table.find("tbody"):
        raise HomeAssistantError(f"No strain table found for breeder {breeder}")

    scored_rows: list[tuple[int, list, Any]] = []
    for row in table.find("tbody").find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue
        anchor = cells[0].find("a")
        if not anchor:
            continue
        score = _score_match(
            species,
            anchor.get_text(strip=True),
            prefer_automatic=prefer_automatic,
        )
        if score > 0:
            scored_rows.append((score, cells, anchor))

    if not scored_rows:
        raise HomeAssistantError(f"Strain '{species}' not found for breeder '{breeder}'")

    scored_rows.sort(key=lambda item: item[0], reverse=True)
    _, cells, anchor = scored_rows[0]

    detail_url = anchor.get("href")
    if not detail_url:
        raise HomeAssistantError("SeedFinder detail URL missing")
    detail_url = _normalize_seedfinder_url("https://seedfinder.eu", detail_url)

    try:
        async with session.get(detail_url, timeout=20) as response:
            if response.status != 200:
                raise HomeAssistantError(f"SeedFinder detail page failed ({response.status})")
            detail_html = await response.text()
    except Exception as exc:  # noqa: BLE001
        if isinstance(exc, HomeAssistantError):
            raise
        raise HomeAssistantError(f"SeedFinder request failed for detail page: {exc}") from exc

    detail_soup = BeautifulSoup(detail_html, "html.parser")

    description_parts: list[str] = []
    for h2 in detail_soup.find_all("h2")[:3]:
        p = h2.find_next("p")
        if p:
            description_parts.append(f"{h2.get_text(strip=True)}\n{p.get_text(' ', strip=True)}")

    image_url = None
    for img in detail_soup.find_all("img"):
        src = img.get("src") or img.get("data-src")
        if not src:
            continue
        candidate = urljoin(detail_url, src)
        parsed_img = urlparse(candidate)
        if parsed_img.scheme in {"http", "https"} and "seedfinder" in parsed_img.netloc:
            image_url = candidate
            break

    return {
        "cultivar_id": f"seedfinder:{_slug(breeder)}:{_slug(anchor.get_text(strip=True))}",
        "provider": "seedfinder",
        "species": anchor.get_text(strip=True),
        "breeder": cells[1].get_text(strip=True) if len(cells) > 1 else breeder,
        "flower_time": cells[2].get_text(strip=True) if len(cells) > 2 else None,
        "plant_type": cells[3].get_text(strip=True) if len(cells) > 3 else None,
        "feminized": cells[4].get_text(strip=True) if len(cells) > 4 else None,
        "source_url": detail_url,
        "description": "\n\n".join(description_parts) if description_parts else None,
        "image_url": image_url,
    }
