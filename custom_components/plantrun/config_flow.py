"""Config flow for PlantRun integration."""
import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant, callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class PlantRunConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for PlantRun."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Handle the initial step. Only one instance of the integration is allowed."""
        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")

        if user_input is not None:
            return self.async_create_entry(title="PlantRun Tracking", data=user_input)

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({}),
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: config_entries.ConfigEntry) -> config_entries.OptionsFlow:
        """Create the options flow."""
        return PlantRunOptionsFlowHandler(config_entry)


class PlantRunOptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for PlantRun wizard."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.config_entry = config_entry

    @property
    def _storage(self):
        """Return the storage instance attached to this config entry."""
        # Using hass.data provides robust access to our integration's data
        return self.hass.data[DOMAIN][self.config_entry.entry_id]["storage"]

    def _get_active_runs_dict(self):
        """Get a dict of run_id -> friendly_name for active runs."""
        runs = {}
        if not hasattr(self, "hass") or DOMAIN not in self.hass.data:
            return runs
            
        storage = self._storage
        if not storage:
            return runs
            
        for run in storage.runs:
            if run.status == "active":
                runs[run.id] = f"{run.friendly_name} ({run.id[-6:]})"
        return runs

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the options."""
        if user_input is not None:
            action = user_input["action"]
            if action == "create_run":
                return await self.async_step_create_run()
            elif action == "add_phase":
                return await self.async_step_add_phase()
            elif action == "add_note":
                return await self.async_step_add_note()
            elif action == "set_cultivar":
                return await self.async_step_set_cultivar()
            elif action == "add_binding":
                return await self.async_step_add_binding()

        actions = {
            "create_run": "Start New Run",
            "add_phase": "Change Phase",
            "add_note": "Add Log Note",
            "set_cultivar": "Set Cultivar (SeedFinder)",
            "add_binding": "Bind Sensor/Camera"
        }

        # Simplest Selector pattern to avoid HA 500 errors
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Required("action"): vol.In(actions)
            }),
        )

    async def async_step_create_run(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Handle creating a new run via the UI."""
        if user_input is not None:
            await self.hass.services.async_call(DOMAIN, "create_run", user_input)
            return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="create_run",
            data_schema=vol.Schema({
                vol.Required("friendly_name"): str,
            }),
        )

    async def async_step_add_phase(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Handle changing phase via the UI."""
        runs = self._get_active_runs_dict()
        if not runs:
            return self.async_abort(reason="no_active_runs")

        if user_input is not None:
            await self.hass.services.async_call(DOMAIN, "add_phase", user_input)
            return self.async_create_entry(title="", data={})

        phases = {
            "Seedling": "Seedling", 
            "Vegetative": "Vegetative", 
            "Flowering": "Flowering", 
            "Drying": "Drying", 
            "Curing": "Curing"
        }
        return self.async_show_form(
            step_id="add_phase",
            data_schema=vol.Schema({
                vol.Required("run_id"): vol.In(runs),
                vol.Required("phase_name"): vol.In(phases),
            }),
        )

    async def async_step_add_note(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Handle adding a note to a run via the UI."""
        runs = self._get_active_runs_dict()
        if not runs:
            return self.async_abort(reason="no_active_runs")

        if user_input is not None:
            await self.hass.services.async_call(DOMAIN, "add_note", user_input)
            return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="add_note",
            data_schema=vol.Schema({
                vol.Required("run_id"): vol.In(runs),
                vol.Required("text"): str,
            }),
        )

    async def async_step_set_cultivar(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Handle setting cultivar directly from UI."""
        runs = self._get_active_runs_dict()
        if not runs:
            return self.async_abort(reason="no_active_runs")

        if user_input is not None:
            self.hass.async_create_task(
                self.hass.services.async_call(DOMAIN, "set_cultivar", user_input)
            )
            return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="set_cultivar",
            data_schema=vol.Schema({
                vol.Required("run_id"): vol.In(runs),
                vol.Required("cultivar_name"): str,
            }),
        )

    async def async_step_add_binding(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Handle binding a sensor directly from UI."""
        runs = self._get_active_runs_dict()
        if not runs:
            return self.async_abort(reason="no_active_runs")

        if user_input is not None:
            await self.hass.services.async_call(DOMAIN, "add_binding", user_input)
            return self.async_create_entry(title="", data={})

        metrics = {
            "temperature": "Temperature", 
            "humidity": "Humidity", 
            "soil_moisture": "Soil Moisture", 
            "energy": "Energy", 
            "water": "Water", 
            "camera": "Camera"
        }
        return self.async_show_form(
            step_id="add_binding",
            data_schema=vol.Schema({
                vol.Required("run_id"): vol.In(runs),
                vol.Required("metric_type"): vol.In(metrics),
                vol.Required("sensor_id"): selector.EntitySelector(
                    selector.EntitySelectorConfig(domain=["sensor", "camera"])
                ),
            }),
        )
