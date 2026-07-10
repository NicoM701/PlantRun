"""PlantRun sidebar panel registration and module cache identity."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from homeassistant.components import frontend
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

from .const import DOMAIN

PANEL_URL_PATH = "plantrun-dashboard"
PANEL_TITLE = "PlantRun"
PANEL_ICON = "mdi:sprout"
PANEL_ELEMENT_NAME = "plantrun-dashboard-panel"
PANEL_STATIC_URL = "/plantrun_frontend"

_COMPONENT_PATH = Path(__file__).parent
_MANIFEST_VERSION = json.loads(
    (_COMPONENT_PATH / "manifest.json").read_text(encoding="utf-8")
)["version"]
_PANEL_SCRIPT_PATH = _COMPONENT_PATH / "www" / "plantrun-panel.js"
_PANEL_MODULE_PATHS = tuple(sorted(_PANEL_SCRIPT_PATH.parent.glob("plantrun-panel*.js")))
_PANEL_MODULE_FINGERPRINT = hashlib.sha256(
    "|".join(
        f"{path.name}:{path.stat().st_mtime_ns}:{path.stat().st_size}"
        for path in _PANEL_MODULE_PATHS
    ).encode()
).hexdigest()[:12]
_PANEL_SCRIPT_CACHE_KEY = f"{_MANIFEST_VERSION}-{_PANEL_MODULE_FINGERPRINT}"
PANEL_MODULE_URL = f"{PANEL_STATIC_URL}/plantrun-panel.js?v={_PANEL_SCRIPT_CACHE_KEY}"
PANEL_JS_URL = PANEL_MODULE_URL


async def async_register_panel(hass: HomeAssistant) -> None:
    """Register the PlantRun static module directory and sidebar panel once."""
    domain_data: dict[str, Any] = hass.data.setdefault(DOMAIN, {})
    if not domain_data.get("_static_registered"):
        local_path = hass.config.path("custom_components/plantrun/www")
        if hasattr(hass.http, "async_register_static_paths"):
            await hass.http.async_register_static_paths(
                [StaticPathConfig(PANEL_STATIC_URL, local_path, cache_headers=False)]
            )
        else:
            hass.http.register_static_path(
                PANEL_STATIC_URL,
                local_path,
                cache_headers=False,
            )
        domain_data["_static_registered"] = True

    if domain_data.get("_panel_registered"):
        return

    frontend.async_register_built_in_panel(
        hass,
        "custom",
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        frontend_url_path=PANEL_URL_PATH,
        config={
            "_panel_custom": {
                "name": PANEL_ELEMENT_NAME,
                "embed_iframe": False,
                "trust_external": False,
                "module_url": PANEL_MODULE_URL,
                "js_url": PANEL_JS_URL,
            }
        },
        require_admin=False,
    )
    domain_data["_panel_registered"] = True


def async_unregister_panel(hass: HomeAssistant) -> None:
    """Remove the sidebar panel when the final PlantRun entry unloads."""
    domain_data = hass.data.get(DOMAIN, {})
    if not domain_data.get("_panel_registered"):
        return
    frontend.async_remove_panel(hass, PANEL_URL_PATH)
    domain_data["_panel_registered"] = False
