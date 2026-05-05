(() => {
  const TAG_NAME = "plantrun-card-editor";
  const PLACEHOLDER_OPTIONS = ["<run_id>", "your_run_id"];

  if (customElements.get(TAG_NAME)) {
    return;
  }

  class PlantRunCardEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._config = { type: "custom:plantrun-card", run_id: "<run_id>", title: "" };
      this._runs = [];
      this._loading = false;
    }

    set hass(value) {
      this._hass = value;
      this._loadRuns();
      this.render();
    }

    setConfig(config) {
      this._config = {
        type: "custom:plantrun-card",
        run_id: "<run_id>",
        title: "",
        ...config,
      };
      this.render();
    }

    async _loadRuns() {
      if (!this._hass || this._loading) {
        return;
      }
      this._loading = true;
      try {
        const payload = await this._hass.callWS({ type: "plantrun/get_runs" });
        this._runs = Array.isArray(payload?.runs) ? payload.runs : [];
      } catch (_error) {
        this._runs = [];
      } finally {
        this._loading = false;
        this.render();
      }
    }

    _emitConfig(nextConfig) {
      this._config = { ...this._config, ...nextConfig };
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: this._config },
          bubbles: true,
          composed: true,
        })
      );
      this.render();
    }

    _runOptions() {
      const dynamicOptions = this._runs.map((run) => {
        const suffix = run?.id ? run.id.slice(-6) : "------";
        return `<option value="${this._escape(run.id)}">${this._escape(
          `${run.friendly_name || "Unnamed Run"} (${suffix})`
        )}</option>`;
      });
      const placeholderOptions = PLACEHOLDER_OPTIONS.map(
        (value) => `<option value="${this._escape(value)}">${this._escape(value)}</option>`
      );
      return [...placeholderOptions, ...dynamicOptions].join("");
    }

    _escape(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    _bindEvents() {
      const runSelect = this.shadowRoot.querySelector("#run-id");
      const titleInput = this.shadowRoot.querySelector("#title");
      const compactToggle = this.shadowRoot.querySelector("#compact");

      if (runSelect) {
        runSelect.value = this._config.run_id || "<run_id>";
        runSelect.addEventListener("change", (event) => {
          this._emitConfig({ run_id: event.target.value });
        });
      }
      if (titleInput) {
        titleInput.value = this._config.title || "";
        titleInput.addEventListener("input", (event) => {
          this._emitConfig({ title: event.target.value });
        });
      }
      if (compactToggle) {
        compactToggle.checked = !!this._config.compact;
        compactToggle.addEventListener("change", (event) => {
          this._emitConfig({ compact: !!event.target.checked });
        });
      }
    }

    render() {
      const loading = this._loading ? "Loading runs…" : "Pick a run discovered by PlantRun.";
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: var(--primary-font-family, system-ui, sans-serif);
            color: var(--primary-text-color, #e8edf5);
          }
          .editor {
            display: grid;
            gap: 14px;
            padding: 8px 0;
          }
          .field {
            display: grid;
            gap: 6px;
          }
          label {
            font-size: 0.82rem;
            font-weight: 700;
            letter-spacing: 0.02em;
          }
          input,
          select {
            width: 100%;
            box-sizing: border-box;
            border: 1px solid color-mix(in srgb, var(--divider-color, #5c6670) 55%, transparent);
            border-radius: 12px;
            padding: 12px 13px;
            background: var(--card-background-color, rgba(20, 24, 30, 0.88));
            color: inherit;
          }
          .hint {
            font-size: 0.78rem;
            opacity: 0.72;
            line-height: 1.4;
          }
          .toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 13px;
            border-radius: 12px;
            border: 1px solid color-mix(in srgb, var(--divider-color, #5c6670) 55%, transparent);
            background: var(--card-background-color, rgba(20, 24, 30, 0.88));
          }
        </style>
        <div class="editor">
          <div class="field">
            <label for="run-id">Run</label>
            <select id="run-id">${this._runOptions()}</select>
            <div class="hint">${this._escape(loading)}</div>
          </div>
          <div class="field">
            <label for="title">Card title override</label>
            <input id="title" type="text" placeholder="Optional custom title" />
          </div>
          <label class="toggle" for="compact">
            <span>Compact layout</span>
            <input id="compact" type="checkbox" />
          </label>
        </div>
      `;
      this._bindEvents();
    }
  }

  customElements.define(TAG_NAME, PlantRunCardEditor);
})();
