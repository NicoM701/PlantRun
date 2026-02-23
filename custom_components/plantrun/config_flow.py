"""Config flow for PlantRun."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult

from .const import BINDABLE_SENSOR_KEYS, DATA_MANAGER, DOMAIN, PHASES

CONF_NAME = "name"
CONF_ELECTRICITY_PRICE = "electricity_price_per_kwh"
CONF_BACKUP_MODE = "backup_mode"
CONF_SETUP_MODE = "setup_mode"
CONF_INITIAL_RUN_NAME = "initial_run_name"
CONF_INITIAL_STARTED_AT = "initial_started_at"
CONF_INITIAL_PHASE = "initial_phase"


class PlantRunConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle PlantRun config flow."""

    VERSION = 1

    def __init__(self) -> None:
        self._base_input: dict[str, Any] = {}

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Handle initial setup."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            self._base_input = user_input
            setup_mode = user_input.get(CONF_SETUP_MODE, "none")
            if setup_mode in ("new", "import"):
                return await self.async_step_initial_run()
            return self.async_create_entry(title=user_input[CONF_NAME], data=user_input)

        schema = vol.Schema(
            {
                vol.Required(CONF_NAME, default="PlantRun"): str,
                vol.Optional(CONF_ELECTRICITY_PRICE, default=0.30): vol.Coerce(float),
                vol.Optional(CONF_BACKUP_MODE, default="off"): vol.In(["off", "daily", "hourly"]),
                vol.Optional(CONF_SETUP_MODE, default="none"): vol.In(["none", "new", "import"]),
            }
        )
        return self.async_show_form(step_id="user", data_schema=schema)

    async def async_step_initial_run(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Optional run wizard during setup."""
        setup_mode = self._base_input.get(CONF_SETUP_MODE, "none")

        if user_input is not None:
            data = {
                **self._base_input,
                CONF_INITIAL_RUN_NAME: user_input[CONF_INITIAL_RUN_NAME],
                CONF_INITIAL_STARTED_AT: user_input.get(CONF_INITIAL_STARTED_AT),
                CONF_INITIAL_PHASE: user_input.get(CONF_INITIAL_PHASE, "growth"),
                "initial_run_mode": setup_mode,
            }
            return self.async_create_entry(title=data[CONF_NAME], data=data)

        started_help = "Optional ISO datetime (e.g. 2026-02-22T12:00:00+00:00)."
        if setup_mode == "import":
            started_help = "Required ISO datetime for import (e.g. 2026-02-22T12:00:00+00:00)."

        schema = vol.Schema(
            {
                vol.Required(CONF_INITIAL_RUN_NAME): str,
                vol.Optional(CONF_INITIAL_STARTED_AT): str,
                vol.Optional(CONF_INITIAL_PHASE, default="growth"): vol.In(PHASES),
            }
        )
        return self.async_show_form(
            step_id="initial_run",
            data_schema=schema,
            description_placeholders={"started_help": started_help, "setup_mode": setup_mode},
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry):
        return PlantRunOptionsFlow(config_entry)


class PlantRunOptionsFlow(config_entries.OptionsFlow):
    """Handle PlantRun options + quick UX actions."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self.config_entry = config_entry
        self._pending_options: dict[str, Any] = {}

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        options = self.config_entry.options

        if user_input is not None:
            if user_input.pop("open_binding_wizard", False):
                self._pending_options = user_input
                return await self.async_step_bindings()
            return self.async_create_entry(title="", data=user_input)

        schema = vol.Schema(
            {
                vol.Optional(
                    CONF_ELECTRICITY_PRICE,
                    default=options.get(
                        CONF_ELECTRICITY_PRICE,
                        self.config_entry.data.get(CONF_ELECTRICITY_PRICE, 0.30),
                    ),
                ): vol.Coerce(float),
                vol.Optional(
                    CONF_BACKUP_MODE,
                    default=options.get(
                        CONF_BACKUP_MODE,
                        self.config_entry.data.get(CONF_BACKUP_MODE, "off"),
                    ),
                ): vol.In(["off", "daily", "hourly"]),
                vol.Optional("open_binding_wizard", default=False): bool,
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)

    async def async_step_bindings(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """UI helper for run sensor bindings."""
        manager = self.hass.data.get(DOMAIN, {}).get(DATA_MANAGER)
        if manager is None:
            return self.async_abort(reason="not_ready")

        runs = manager.list_runs()
        if not runs:
            return self.async_abort(reason="no_runs")

        run_options = {r["id"]: f"{r.get('display_id')} ({r.get('name')})" for r in runs}

        if user_input is not None:
            run_id = user_input["run_id"]
            for key in BINDABLE_SENSOR_KEYS:
                entity_id = user_input.get(key)
                if entity_id:
                    await manager.bind_sensor_to_run(
                        binding_key=key,
                        entity_id=entity_id,
                        run_id=run_id,
                        use_active_run=False,
                    )
            return self.async_create_entry(
                title="", data=self._pending_options or self.config_entry.options
            )

        schema_fields: dict[Any, Any] = {
            vol.Required("run_id"): vol.In(run_options),
        }

        for key in BINDABLE_SENSOR_KEYS:
            schema_fields[vol.Optional(key)] = str

        return self.async_show_form(step_id="bindings", data_schema=vol.Schema(schema_fields))
