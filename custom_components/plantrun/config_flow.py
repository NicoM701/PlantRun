"""Config flow for PlantRun."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult

from .const import DOMAIN

CONF_NAME = "name"
CONF_ELECTRICITY_PRICE = "electricity_price_per_kwh"
CONF_BACKUP_MODE = "backup_mode"


class PlantRunConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle PlantRun config flow."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Handle initial setup."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(title=user_input[CONF_NAME], data=user_input)

        schema = vol.Schema(
            {
                vol.Required(CONF_NAME, default="PlantRun"): str,
                vol.Optional(CONF_ELECTRICITY_PRICE, default=0.30): vol.Coerce(float),
                vol.Optional(CONF_BACKUP_MODE, default="off"): vol.In(["off", "daily", "hourly"]),
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry):
        return PlantRunOptionsFlow(config_entry)


class PlantRunOptionsFlow(config_entries.OptionsFlow):
    """Handle PlantRun options."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self.config_entry = config_entry

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        if user_input is not None:
            return self.async_create_entry(title="", data=user_input)

        options = self.config_entry.options
        schema = vol.Schema(
            {
                vol.Optional(
                    CONF_ELECTRICITY_PRICE,
                    default=options.get(CONF_ELECTRICITY_PRICE, self.config_entry.data.get(CONF_ELECTRICITY_PRICE, 0.30)),
                ): vol.Coerce(float),
                vol.Optional(
                    CONF_BACKUP_MODE,
                    default=options.get(CONF_BACKUP_MODE, self.config_entry.data.get(CONF_BACKUP_MODE, "off")),
                ): vol.In(["off", "daily", "hourly"]),
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)
