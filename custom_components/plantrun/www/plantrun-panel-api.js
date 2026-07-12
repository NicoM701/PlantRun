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

  async getRecorderHistory(entityId, start, end) {
    const hass = this._requireHass();
    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();
    const query = new URLSearchParams({
      filter_entity_id: entityId,
      end_time: endIso,
      minimal_response: "true",
      no_attributes: "true",
      significant_changes_only: "true",
    });
    const payload = await hass.callApi("GET", `history/period/${encodeURIComponent(startIso)}?${query.toString()}`);
    const rows = Array.isArray(payload?.[0]) ? payload[0] : [];
    const points = rows
      .map((row) => ({
        value: Number(row?.state),
        timestamp: row?.last_changed || row?.last_updated || row?.last_reported || "",
      }))
      .filter((point) => Number.isFinite(point.value) && !Number.isNaN(new Date(point.timestamp).getTime()));
    if (points.length <= 260) return points;
    const stride = Math.ceil(points.length / 260);
    const sampled = points.filter((_point, index) => index % stride === 0);
    if (sampled.at(-1)?.timestamp !== points.at(-1)?.timestamp) sampled.push(points.at(-1));
    return sampled;
  }

  async callService(service, data = {}) {
    return this._requireHass().callService(DOMAIN, service, data);
  }
}
