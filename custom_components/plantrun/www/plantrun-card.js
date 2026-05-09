(() => {
  const TAG = "plantrun-card";

  if (customElements.get(TAG)) return;

  const ensureShared = () => {
    const existing = window.PlantRunShared || {};
    const escapeHtml =
      existing.escapeHtml ||
      ((value) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;"));
    const daysBetween =
      existing.daysBetween ||
      ((start) => {
        const date = new Date(start);
        if (Number.isNaN(date.getTime())) return 0;
        return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
      });
    const icon = existing.icon || ((name) => `<ha-icon icon="${escapeHtml(name)}"></ha-icon>`);
    window.PlantRunShared = { ...existing, escapeHtml, daysBetween, icon };
    return window.PlantRunShared;
  };
  const S = ensureShared();

  class PlantRunCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._config = { type: "custom:plantrun-card", run_id: "<run_id>", compact: false, title: "" };
      this._run = null;
      this._summary = {};
      this._loading = false;
      this._loadedRunId = "";
      this._requestNonce = 0;
      this._lastSensorSignature = "";
      this._boundClick = (event) => this._handleClick(event);
    }

    static getConfigElement() {
      return document.createElement("plantrun-card-editor");
    }

    static getStubConfig() {
      return { type: "custom:plantrun-card", run_id: "<run_id>" };
    }

    setConfig(config) {
      this._config = { ...this._config, ...config };
      this._loadedRunId = "";
      this._fetchRunData();
      this.render();
    }

    set hass(value) {
      this._hass = value;
      const runId = this._normalizeRunId(this._config.run_id);
      if (runId && runId !== this._loadedRunId) {
        this._fetchRunData();
        return;
      }
      const signature = this._sensorSignature();
      if (signature !== this._lastSensorSignature) {
        this._lastSensorSignature = signature;
        this._refreshSensorText();
      }
    }

    connectedCallback() {
      this.shadowRoot.addEventListener("click", this._boundClick);
      this.render();
    }

    disconnectedCallback() {
      this.shadowRoot.removeEventListener("click", this._boundClick);
    }

    getCardSize() {
      return this._config.compact ? 3 : 5;
    }

    _normalizeRunId(value) {
      const normalized = String(value || "").trim();
      if (!normalized || normalized.includes("<run_id") || normalized === "your_run_id") return "";
      return normalized;
    }

    async _fetchRunData() {
      const runId = this._normalizeRunId(this._config.run_id);
      if (!this._hass || !runId || this._loading) return;
      const requestNonce = ++this._requestNonce;
      this._loading = true;
      this.render();
      try {
        const [runPayload, summary] = await Promise.all([
          this._hass.callWS({ type: "plantrun/get_run", run_id: runId }),
          this._hass.callWS({ type: "plantrun/get_run_summary", run_id: runId }),
        ]);
        if (requestNonce !== this._requestNonce) return;
        this._run = runPayload?.run || null;
        this._summary = summary || {};
        this._loadedRunId = runId;
      } catch (_err) {
        if (requestNonce !== this._requestNonce) return;
        this._run = null;
        this._summary = {};
        this._loadedRunId = "";
      } finally {
        if (requestNonce === this._requestNonce) {
          this._loading = false;
          this.render();
        }
      }
    }

    _sensorSignature() {
      const bindings = this._run?.bindings || [];
      return bindings.map((binding) => `${binding.sensor_id}:${this._hass?.states?.[binding.sensor_id]?.state}`).join("|");
    }

    _entityState(entityId) {
      const state = this._hass?.states?.[entityId];
      if (!state) return "Unavailable";
      const unit = state.attributes?.unit_of_measurement || "";
      return `${state.state}${unit ? ` ${unit}` : ""}`;
    }

    _entityName(entityId) {
      return this._hass?.states?.[entityId]?.attributes?.friendly_name || entityId;
    }

    _metricLabel(metric) {
      return (
        {
          temperature: "Temperature",
          humidity: "Humidity",
          soil_moisture: "Soil moisture",
          conductivity: "Conductivity",
          light: "Light",
          energy: "Energy",
          water: "Water",
        }[metric] || metric
      );
    }

    _metricIcon(metric) {
      return (
        {
          temperature: "mdi:thermometer",
          humidity: "mdi:water-percent",
          soil_moisture: "mdi:sprout",
          conductivity: "mdi:flash-triangle",
          light: "mdi:white-balance-sunny",
          energy: "mdi:lightning-bolt",
          water: "mdi:water",
        }[metric] || "mdi:chart-line"
      );
    }

    _targetDays() {
      const run = this._run;
      const configured = Number(run?.base_config?.target_days || run?.base_config?.estimated_duration_days);
      if (Number.isFinite(configured) && configured > 0) return Math.round(configured);
      const flowerWindow = Number(run?.cultivar?.flower_window_days);
      return Number.isFinite(flowerWindow) && flowerWindow > 0 ? Math.round(flowerWindow + 35) : 90;
    }

    _progress() {
      const days = S.daysBetween(this._run?.planted_date || this._run?.start_time);
      return Math.min(100, Math.round((days / Math.max(this._targetDays(), 1)) * 100));
    }

    _bindingMarkup() {
      const bindings = this._run?.bindings || [];
      if (!bindings.length) return `<div class="empty">No bound sensors</div>`;
      return bindings
        .slice(0, this._config.compact ? 2 : 4)
        .map(
          (binding) => `
            <button class="sensor" data-entity-id="${S.escapeHtml(binding.sensor_id)}" type="button">
              <span class="chip-icon ${binding.metric_type === "soil_moisture" ? "moisture" : S.escapeHtml(binding.metric_type)}">${S.icon(this._metricIcon(binding.metric_type))}</span>
              <span><strong>${S.escapeHtml(this._metricLabel(binding.metric_type))}</strong><small>${S.escapeHtml(this._entityName(binding.sensor_id))}</small></span>
              <b data-live-entity="${S.escapeHtml(binding.sensor_id)}">${S.escapeHtml(this._entityState(binding.sensor_id))}</b>
            </button>`
        )
        .join("");
    }

    _handleClick(event) {
      const sensor = event.target.closest("[data-entity-id]");
      if (!sensor) return;
      this.dispatchEvent(
        new CustomEvent("hass-more-info", {
          detail: { entityId: sensor.dataset.entityId },
          bubbles: true,
          composed: true,
        })
      );
    }

    _refreshSensorText() {
      this.shadowRoot.querySelectorAll("[data-live-entity]").forEach((node) => {
        node.textContent = this._entityState(node.dataset.liveEntity);
      });
    }

    render() {
      const runId = this._normalizeRunId(this._config.run_id);
      const title = this._config.title || this._run?.friendly_name || "PlantRun";
      const days = S.daysBetween(this._run?.planted_date || this._run?.start_time);
      this.shadowRoot.innerHTML = `
        <style>
          :host { display:block; font-family:var(--primary-font-family, system-ui, sans-serif); color:var(--primary-text-color,#ecf1ec); }
          ha-card { overflow:hidden; border-radius:24px; background:linear-gradient(145deg, color-mix(in srgb, var(--card-background-color,#1d2221) 94%, #183520), var(--card-background-color,#1d2221)); border:1px solid color-mix(in srgb, var(--divider-color,#53605a) 55%, transparent); box-shadow:0 18px 42px rgba(0,0,0,.18); }
          .card { padding:18px; display:grid; gap:14px; }
          header { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
          .title { min-width:0; }
          h2 { margin:0; font-size:22px; line-height:1.05; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
          p, small, .empty { color:var(--secondary-text-color,#9aa49d); }
          p { margin:6px 0 0; }
          .progress { display:grid; place-items:center; width:58px; height:58px; border-radius:50%; font-weight:800; background:conic-gradient(var(--success-color,#31c76b) calc(var(--progress) * 1%), color-mix(in srgb, var(--divider-color,#53605a) 50%, transparent) 0); box-shadow:inset 0 0 0 6px color-mix(in srgb, var(--card-background-color,#1d2221) 92%, transparent); }
          .stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; }
          .stats div { padding:12px; border-radius:16px; background:color-mix(in srgb, var(--primary-text-color,#fff) 8%, transparent); }
          .stats span { display:block; font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--secondary-text-color,#9aa49d); }
          .stats strong { display:block; margin-top:4px; font-size:17px; }
          .sensors { display:grid; gap:8px; }
          .sensor { width:100%; min-height:54px; border:1px solid color-mix(in srgb, var(--divider-color,#53605a) 48%, transparent); border-radius:17px; background:color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent); color:inherit; display:grid; grid-template-columns:38px minmax(0,1fr) auto; gap:10px; align-items:center; padding:8px 10px; text-align:left; transition:transform .16s ease, border-color .16s ease, box-shadow .16s ease; }
          .sensor:hover { transform:translateY(-1px); border-color:color-mix(in srgb, var(--success-color,#31c76b) 50%, transparent); box-shadow:0 10px 24px rgba(0,0,0,.12); }
          .sensor span:not(.chip-icon), .sensor strong, .sensor small { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block; }
          .sensor b { font-size:15px; }
          .chip-icon { display:grid; place-items:center; width:38px; height:38px; border-radius:14px; background:color-mix(in srgb, var(--success-color,#31c76b) 18%, transparent); color:var(--success-color,#31c76b); }
          .chip-icon.moisture { color:#2f84d6; background:rgba(47,132,214,.16); }
          .placeholder, .empty { min-height:120px; display:grid; place-items:center; text-align:center; padding:20px; }
          @media (prefers-color-scheme: light) {
            ha-card {
              background:linear-gradient(145deg, #ffffff, color-mix(in srgb, var(--card-background-color,#f7faf6) 96%, #e3eee1));
              border-color:color-mix(in srgb, var(--divider-color,#b5c3b6) 78%, white);
              box-shadow:0 18px 42px rgba(40,69,44,.1);
            }
            .stats div, .sensor {
              background:#ffffff;
              border-color:color-mix(in srgb, var(--divider-color,#b5c3b6) 70%, white);
            }
            .progress {
              box-shadow:inset 0 0 0 6px rgba(255,255,255,.96);
            }
          }
          .compact .stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .compact .optional { display:none; }
        </style>
        <ha-card>
          <div class="card ${this._config.compact ? "compact" : ""}">
            ${
              !runId
                ? `<div class="placeholder">Choose a PlantRun run in the card editor.</div>`
                : this._loading && !this._run
                  ? `<div class="placeholder">Loading PlantRun...</div>`
                  : !this._run
                    ? `<div class="placeholder">Run not found.</div>`
                    : `
                      <header>
                        <div class="title">
                          <h2>${S.escapeHtml(title)}</h2>
                          <p>${S.escapeHtml(this._run.cultivar?.name || "Cultivar not set")}</p>
                        </div>
                        <div class="progress" style="--progress:${this._progress()}">${this._progress()}%</div>
                      </header>
                      <div class="stats">
                        <div><span>Day</span><strong>${days}</strong></div>
                        <div><span>Target</span><strong>${this._targetDays()}</strong></div>
                        <div class="optional"><span>Cost</span><strong>${S.escapeHtml(this._summary?.energy_cost_display || this._summary?.energy_cost || "—")}</strong></div>
                      </div>
                      <div class="sensors">${this._bindingMarkup()}</div>
                    `
            }
          </div>
        </ha-card>
      `;
    }
  }

  customElements.define(TAG, PlantRunCard);
})();
