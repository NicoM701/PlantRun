(() => {
  const TAG = "plantrun-card-editor";
  const PLACEHOLDERS = ["<run_id>", "your_run_id"];

  if (customElements.get(TAG)) return;

  class PlantRunCardEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._config = { type: "custom:plantrun-card", run_id: "<run_id>", title: "", compact: false };
      this._runs = [];
      this._loading = false;
      this._loaded = false;
      this._boundChange = (event) => this._handleChange(event);
      this._boundInput = (event) => this._handleInput(event);
    }

    set hass(value) {
      this._hass = value;
      if (!this._loaded) {
        this._loaded = true;
        this._loadRuns();
      }
      this.render();
    }

    setConfig(config) {
      this._config = { ...this._config, ...config };
      this.render();
    }

    connectedCallback() {
      this.shadowRoot.addEventListener("change", this._boundChange);
      this.shadowRoot.addEventListener("input", this._boundInput);
      this.render();
    }

    disconnectedCallback() {
      this.shadowRoot.removeEventListener("change", this._boundChange);
      this.shadowRoot.removeEventListener("input", this._boundInput);
    }

    async _loadRuns() {
      if (!this._hass || this._loading) return;
      this._loading = true;
      this.render();
      try {
        const payload = await this._hass.callWS({ type: "plantrun/get_runs" });
        this._runs = Array.isArray(payload?.runs) ? payload.runs : [];
      } catch (_err) {
        this._runs = [];
      } finally {
        this._loading = false;
        this.render();
      }
    }

    _emitConfig(patch) {
      this._config = { ...this._config, ...patch };
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: this._config },
          bubbles: true,
          composed: true,
        })
      );
    }

    _escape(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    _runOptions() {
      const placeholderOptions = PLACEHOLDERS.map(
        (value) => `<option value="${this._escape(value)}" ${this._config.run_id === value ? "selected" : ""}>${this._escape(value)}</option>`
      );
      const runOptions = this._runs.map((run) => {
        const suffix = run?.id ? run.id.slice(-6) : "------";
        return `<option value="${this._escape(run.id)}" ${this._config.run_id === run.id ? "selected" : ""}>${this._escape(
          `${run.friendly_name || "Unnamed run"} (${suffix})`
        )}</option>`;
      });
      return [...placeholderOptions, ...runOptions].join("");
    }

    _handleChange(event) {
      const target = event.target;
      if (target.matches("#run-id")) {
        this._emitConfig({ run_id: target.value });
      } else if (target.matches("#compact")) {
        this._emitConfig({ compact: target.checked });
      }
    }

    _handleInput(event) {
      const target = event.target;
      if (target.matches("#title")) {
        this._emitConfig({ title: target.value });
      }
    }

    render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host { display:block; color:var(--primary-text-color,#e8ece8); font-family:var(--primary-font-family, system-ui, sans-serif); }
          .editor { display:grid; gap:14px; padding:8px 0; }
          label { display:grid; gap:7px; font-size:13px; font-weight:700; color:var(--secondary-text-color,#98a29a); }
          input, select { width:100%; min-height:42px; border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 55%, transparent); border-radius:14px; padding:10px 12px; background:var(--card-background-color,#1d2221); color:var(--primary-text-color,#fff); outline:none; }
          input:focus, select:focus { border-color:var(--success-color,#31c76b); }
          .toggle { display:flex; align-items:center; justify-content:space-between; gap:12px; border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 55%, transparent); border-radius:14px; padding:12px; background:var(--card-background-color,#1d2221); }
          .toggle input { width:auto; min-height:auto; }
          .hint { color:var(--secondary-text-color,#98a29a); font-size:12px; line-height:1.35; }
        </style>
        <div class="editor">
          <label>Run
            <select id="run-id">${this._runOptions()}</select>
          </label>
          <div class="hint">${this._loading ? "Loading PlantRun runs..." : "Choose an existing PlantRun run. Placeholder IDs are ignored until replaced."}</div>
          <label>Title override
            <input id="title" value="${this._escape(this._config.title || "")}" placeholder="Optional card title" />
          </label>
          <label class="toggle">
            <span>Compact layout</span>
            <input id="compact" type="checkbox" ${this._config.compact ? "checked" : ""} />
          </label>
        </div>
      `;
    }
  }

  customElements.define(TAG, PlantRunCardEditor);
})();
