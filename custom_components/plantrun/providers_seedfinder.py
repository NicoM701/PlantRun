"""SeedFinder provider for cultivar lookup (best-effort scraping)."""

from __future__ import annotations

import re
from typing import Any

from aiohttp import ClientSession
from bs4 import BeautifulSoup
from homeassistant.exceptions import HomeAssistantError


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


async def fetch_cultivar_profile(
    session: ClientSession, species: str, breeder: str
) -> dict[str, Any]:
    """Fetch cultivar details from seedfinder breeder + strain pages."""
    species = species.strip()
    breeder = breeder.strip()
    if not species or not breeder:
        raise HomeAssistantError("species and breeder are required")

    breeder_slug = _slug(breeder)
    breeder_url = f"https://seedfinder.eu/en/database/breeder/{breeder_slug}/"

    async with session.get(breeder_url, timeout=20) as response:
        if response.status != 200:
            raise HomeAssistantError(f"SeedFinder breeder page failed ({response.status})")
        breeder_html = await response.text()

    breeder_soup = BeautifulSoup(breeder_html, "html.parser")
    table = breeder_soup.find("table", class_="table")
    if not table or not table.find("tbody"):
        raise HomeAssistantError(f"No strain table found for breeder {breeder}")

    target_row = None
    for row in table.find("tbody").find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue
        anchor = cells[0].find("a")
        if not anchor:
            continue
        strain_name = anchor.get_text(strip=True)
        if strain_name.lower() == species.lower():
            target_row = (cells, anchor)
            break

    if not target_row:
        raise HomeAssistantError(f"Strain '{species}' not found for breeder '{breeder}'")

    cells, anchor = target_row
    detail_url = anchor.get("href")
    if not detail_url:
        raise HomeAssistantError("SeedFinder detail URL missing")

    async with session.get(detail_url, timeout=20) as response:
        if response.status != 200:
            raise HomeAssistantError(f"SeedFinder detail page failed ({response.status})")
        detail_html = await response.text()

    detail_soup = BeautifulSoup(detail_html, "html.parser")

    description_parts: list[str] = []
    for h2 in detail_soup.find_all("h2")[:3]:
        p = h2.find_next("p")
        if p:
            description_parts.append(f"{h2.get_text(strip=True)}\n{p.get_text(' ', strip=True)}")

    image_url = None
    for img in detail_soup.find_all("img"):
        src = img.get("src") or img.get("data-src")
        if src and "seedfinder" in src and src.startswith("http"):
            image_url = src
            break

    return {
        "cultivar_id": f"seedfinder:{_slug(breeder)}:{_slug(species)}",
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
