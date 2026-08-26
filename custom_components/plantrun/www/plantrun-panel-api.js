/**
 * The complete transport interface used by the sidebar application.
 *
 * Mutations return the updated PlantRun state. Callers never have to know
 * which records were touched or issue follow-up reads to repair local state.
 */
export class PlantRunApi {
  constructor(hass = null) {
    this.hass = hass;
  }

  setHass(hass) {
    this.hass = hass;
  }

  _requireHass() {
    if (!this.hass) throw new Error("Home Assistant ist noch nicht verbunden.");
    return this.hass;
  }

  async getState() {
    return this._requireHass().callWS({ type: "plantrun/get_state" });
  }

  async command(command, payload = {}) {
    return this._requireHass().callWS({
      type: "plantrun/command",
      command,
      payload,
    });
  }

  async searchCultivar(breeder, query) {
    return this._requireHass().callWS({
      type: "plantrun/search_cultivar",
      breeder: String(breeder || "").trim(),
      query: String(query || "").trim(),
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
    const response = await hass.callApi(
      "GET",
      `history/period/${encodeURIComponent(startIso)}?${query.toString()}`,
    );
    const rows = Array.isArray(response?.[0]) ? response[0] : [];
    const points = rows
      .map((row) => ({
        value: Number(row?.state),
        timestamp: row?.last_changed || row?.last_updated || "",
      }))
      .filter((point) => Number.isFinite(point.value) && Number.isFinite(Date.parse(point.timestamp)));
    if (points.length <= 300) return points;
    const stride = Math.ceil(points.length / 300);
    const sampled = points.filter((_point, index) => index % stride === 0);
    if (sampled.at(-1)?.timestamp !== points.at(-1)?.timestamp) sampled.push(points.at(-1));
    return sampled;
  }
}
