const DOMAIN = "plantrun";

/**
 * Stable Home Assistant transport boundary for the PlantRun panel.
 *
 * Keeping websocket commands and service calls here makes the panel a UI client
 * instead of a second copy of the integration protocol. It also gives tests and
 * future frontends one small surface to mock.
 */
export class PlantRunApi {
  constructor(hass = null) {
    this.hass = hass;
  }

  setHass(hass) {
    this.hass = hass;
  }

  _requireHass() {
    if (!this.hass) throw new Error("Home Assistant is not connected yet.");
    return this.hass;
  }

  async getRuns() {
    return this._requireHass().callWS({ type: "plantrun/get_runs" });
  }

  async getRunSummary(runId) {
    return this._requireHass().callWS({ type: "plantrun/get_run_summary", run_id: runId });
  }

  async searchCultivar(breeder, query) {
    return this._requireHass().callWS({ type: "plantrun/search_cultivar", breeder, query });
  }

  async getBindingHistoryContext(runId, bindingId) {
    return this._requireHass().callWS({
      type: "plantrun/get_run_binding_history_context",
      run_id: runId,
      binding_id: bindingId || "",
    });
  }

  async callService(service, data = {}) {
    return this._requireHass().callService(DOMAIN, service, data);
  }
}
