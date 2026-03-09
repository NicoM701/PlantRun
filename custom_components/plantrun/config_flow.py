"""Config flow for PlantRun integration."""
import logging
from datetime import datetime
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant, callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from .const import ALLOWED_METRIC_TYPES, DOMAIN, METRIC_TYPE_CAMERA

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


from .providers_seedfinder import async_search_cultivar
from .models import CultivarSnapshot, RunData

class PlantRunOptionsFlowHandler(config_entries.OptionsFlow):
    """Handle options flow for PlantRun wizard."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        self.plantrun_config_entry = config_entry
        self._action = None
        self._target_run_id = None
        
        # State carried between steps for run creation
        self._create_friendly_name: str | None = None
        self._create_planted_date: str | None = None
        self._create_seedfinder_breeder: str | None = None
        self._create_seedfinder_strain: str | None = None
        self._create_seedfinder_results: list[CultivarSnapshot] | None = None

    @property
    def _storage(self):
        """Return the storage instance attached to this config entry."""
        runtime_data = getattr(self.plantrun_config_entry, "runtime_data", None)
        if isinstance(runtime_data, dict) and runtime_data.get("storage") is not None:
            return runtime_data["storage"]

        domain_data = getattr(getattr(self, "hass", None), "data", {}).get(DOMAIN, {})
        entry_data = domain_data.get(self.plantrun_config_entry.entry_id)
        if isinstance(entry_data, dict):
            return entry_data.get("storage")
        return None

    def _get_runs_dict(self, *, include_ended: bool = True):
        """Get a dict of run_id -> human-friendly run label."""
        runs = {}
        if not hasattr(self, "hass") or DOMAIN not in self.hass.data:
            return runs
        storage = self._storage
        if not storage:
            return runs
        for run in storage.runs:
            if not include_ended and run.status != "active":
                continue
            status_label = "active" if run.status == "active" else "ended"
            runs[run.id] = f"{run.friendly_name} ({status_label}, {run.id[-6:]})"
        return runs

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> FlowResult:
        """Manage the options - Step 1: Base Menu."""
        if self._storage is None:
            return self.async_abort(reason="integration_not_ready")

        if user_input is not None:
            self._action = user_input["action"]
            if self._action == "create_run":
                return await self.async_step_create_run_start()
            elif self._action == "manage_run":
                return await self.async_step_manage_run()

        actions = {
            "create_run": "Start a New Grow Run",
            "manage_run": "Manage an Existing Run"
        }

        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema({
                vol.Required("action"): vol.In(actions)
            }),
        )

    # --- BRANCH A: STAR NEW RUN ---

    async def async_step_create_run_start(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Step 1 of Run Creation: Name and optional Cultivar search."""
        if user_input is not None:
            self._create_friendly_name = user_input["friendly_name"]
            
            # Handle Date or String depending on HA version
            p_date = user_input.get("planted_date")
            if p_date:
                self._create_planted_date = str(p_date)
            else:
                self._create_planted_date = None
                
            breeder = user_input.get("cultivar_breeder", "").strip()
            strain = user_input.get("cultivar_strain", "").strip()
            
            self._create_seedfinder_breeder = breeder
            self._create_seedfinder_strain = strain
            self._create_seedfinder_results = []
            
            if breeder and strain:
                # Silently query SeedFinder using specific Breeder and Strain
                results = await async_search_cultivar(breeder, strain)
                if results:
                    self._create_seedfinder_results = results
            
            return await self.async_step_create_run_details()

        return self.async_show_form(
            step_id="create_run_start",
            data_schema=vol.Schema({
                vol.Required("friendly_name"): str,
                vol.Optional("planted_date"): selector.DateSelector(),
                vol.Optional("cultivar_breeder"): str,
                vol.Optional("cultivar_strain"): str,
            }),
        )

    async def async_step_create_run_details(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Step 2 of Run Creation: Pick SeedFinder result and bind sensors."""
        storage = self._storage
        if storage is None:
            return self.async_abort(reason="integration_not_ready")

        if user_input is not None:
            # 1) Deterministically create and persist a specific run object.
            new_run = RunData(
                friendly_name=self._create_friendly_name or "Unnamed Run",
                start_time="",
                planted_date=self._create_planted_date,
            )
            # Keep service-compatible start_time format.
            new_run.start_time = datetime.utcnow().isoformat()

            await storage.async_add_run(new_run)
            await storage.async_set_active_run_id(new_run.id)

            # 2) Assign cultivar if selected.
            selected_cultivar_name = user_input.get("cultivar_result", "None")
            if selected_cultivar_name != "None" and self._create_seedfinder_results:
                for cv in self._create_seedfinder_results:
                    if cv.name == selected_cultivar_name:
                        new_run.cultivar = cv
                        break

            if new_run.cultivar:
                await storage.async_update_run(new_run)

            # 3) Bind sensors explicitly to the created run id.
            metrics_map = {
                "temperature_sensor": "temperature",
                "humidity_sensor": "humidity",
                "soil_moisture_sensor": "soil_moisture",
                "conductivity_sensor": "conductivity",
                "light_sensor": "light",
                "energy_sensor": "energy",
            }

            for field, metric in metrics_map.items():
                sensor_id = user_input.get(field)
                if sensor_id:
                    bind_data = {
                        "run_id": new_run.id,
                        "metric_type": metric,
                        "sensor_id": sensor_id,
                    }
                    await self.hass.services.async_call(DOMAIN, "add_binding", bind_data)

            return self.async_create_entry(title="", data={})

        schema_dict = {}
        
        # Populate cultivar dropdown if we found matches
        if self._create_seedfinder_results:
            cv_options = {"None": "Do not set cultivar"}
            for cv in self._create_seedfinder_results:
                cv_options[cv.name] = f"{cv.name} by {cv.breeder}"
            schema_dict[vol.Optional("cultivar_result", default="None")] = vol.In(cv_options)
        else:
            schema_dict[vol.Optional("cultivar_result", default="None (No search matches)")] = vol.In({"None (No search matches)": "Skip"})

        # Add optional sensor selectors
        sensor_selector = selector.EntitySelector(selector.EntitySelectorConfig(domain=["sensor", "camera"]))
        schema_dict[vol.Optional("temperature_sensor")] = sensor_selector
        schema_dict[vol.Optional("humidity_sensor")] = sensor_selector
        schema_dict[vol.Optional("soil_moisture_sensor")] = sensor_selector
        schema_dict[vol.Optional("conductivity_sensor")] = sensor_selector
        schema_dict[vol.Optional("light_sensor")] = sensor_selector
        schema_dict[vol.Optional("energy_sensor")] = sensor_selector

        return self.async_show_form(
            step_id="create_run_details",
            data_schema=vol.Schema(schema_dict)
        )

    # --- BRANCH B: MANAGE EXISTING RUN ---

    async def async_step_manage_run(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Step 1 of Management: Select the run."""
        runs = self._get_runs_dict(include_ended=True)
        if not runs:
            return self.async_abort(reason="no_runs")

        if user_input is not None:
            self._target_run_id = user_input["run_id"]
            return await self.async_step_manage_action()

        return self.async_show_form(
            step_id="manage_run",
            data_schema=vol.Schema({
                vol.Required("run_id"): vol.In(runs)
            })
        )

    async def async_step_manage_action(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        """Step 2 of Management: Select the action to perform."""
        if user_input is not None:
            sub_action = user_input["action"]
            if sub_action == "add_phase":
                return await self.async_step_add_phase()
            elif sub_action == "add_note":
                return await self.async_step_add_note()
            elif sub_action == "add_binding":
                return await self.async_step_add_binding()
            elif sub_action == "end_run":
                return await self.async_step_end_run()

        actions = {
            "add_phase": "Change Phase",
            "add_note": "Add Log Note",
            "add_binding": "Add Sensor/Camera Binding",
            "end_run": "End this Run"
        }

        return self.async_show_form(
            step_id="manage_action",
            data_schema=vol.Schema({
                vol.Required("action"): vol.In(actions)
            })
        )

    async def async_step_add_phase(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        if user_input is not None:
            run_data = {"run_id": self._target_run_id, "phase_name": user_input["phase_name"]}
            await self.hass.services.async_call(DOMAIN, "add_phase", run_data)
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
                vol.Required("phase_name"): vol.In(phases)
            })
        )

    async def async_step_add_note(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        if user_input is not None:
            run_data = {"run_id": self._target_run_id, "text": user_input["text"]}
            await self.hass.services.async_call(DOMAIN, "add_note", run_data)
            return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="add_note",
            data_schema=vol.Schema({
                vol.Required("text"): str
            })
        )

    async def async_step_add_binding(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        errors: dict[str, str] = {}

        if user_input is not None:
            if user_input["metric_type"] == METRIC_TYPE_CAMERA:
                errors["metric_type"] = "camera_not_supported"
            else:
                run_data = {
                    "run_id": self._target_run_id,
                    "metric_type": user_input["metric_type"],
                    "sensor_id": user_input["sensor_id"],
                }
                await self.hass.services.async_call(DOMAIN, "add_binding", run_data)
                return self.async_create_entry(title="", data={})

        metrics = {
            "temperature": "Temperature",
            "humidity": "Humidity",
            "soil_moisture": "Soil Moisture",
            "conductivity": "Conductivity",
            "light": "Light",
            "energy": "Energy",
            "water": "Water",
            "camera": "Camera (currently unsupported in sensor-only model)",
        }
        return self.async_show_form(
            step_id="add_binding",
            data_schema=vol.Schema(
                {
                    vol.Required("metric_type"): vol.In({metric: metrics[metric] for metric in ALLOWED_METRIC_TYPES}),
                    vol.Required("sensor_id"): selector.EntitySelector(
                        selector.EntitySelectorConfig(domain=["sensor", "camera"])
                    ),
                }
            ),
            errors=errors,
        )

    async def async_step_end_run(self, user_input: dict[str, Any] | None = None) -> FlowResult:
        if user_input is not None:
            if user_input.get("confirm"):
                run_data = {"run_id": self._target_run_id}
                await self.hass.services.async_call(DOMAIN, "end_run", run_data)
            return self.async_create_entry(title="", data={})

        return self.async_show_form(
            step_id="end_run",
            data_schema=vol.Schema({
                vol.Required("confirm", default=False): bool
            })
        )
