import {
    LitElement,
    html,
    css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class PlantRunCardEditor extends LitElement {
    static get properties() {
        return {
            hass: { type: Object },
            _config: { type: Object },
        };
    }

    setConfig(config) {
        this._config = config || {};
    }

    _getAvailableRuns() {
        if (!this.hass) {
            return [];
        }

        return Object.values(this.hass.states)
            .filter((state) => state.entity_id.startsWith("sensor.plantrun_status_"))
            .map((state) => {
                const id = state.entity_id.replace("sensor.plantrun_status_", "");
                const friendlyName = state.attributes.friendly_name || state.entity_id;
                return {
                    id,
                    name: friendlyName.replace(/ Status$/, ""),
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }

    render() {
        if (!this.hass) {
            return html``;
        }

        const runs = this._getAvailableRuns();

        return html`
      <div class="card-config">
        <label for="plantrun-run-select">Discovered run</label>
        <select
          id="plantrun-run-select"
          .value="${this._config.run_id || ""}"
          .configValue="${"run_id"}"
          @change="${this._valueChanged}"
        >
          <option value="">${runs.length ? "Use first discovered run" : "No runs discovered"}</option>
          ${runs.map((run) => html`<option value="${run.id}">${run.name} (${run.id})</option>`)}
        </select>

        <paper-input
          label="Run ID (manual override)"
          .value="${this._config.run_id || ""}"
          .configValue="${"run_id"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>

        <div class="helper-text">
          ${runs.length
            ? html`Select a discovered run or enter a run ID manually.`
            : html`No <code>sensor.plantrun_status_*</code> entities were found yet. You can still enter a run ID manually.`}
        </div>
      </div>
    `;
    }

    _valueChanged(ev) {
        if (!this.hass || !this._config) {
            return;
        }
        const target = ev.target;
        if (!target?.configValue) {
            return;
        }
        if (this._config[target.configValue] === target.value) {
            return;
        }

        if (target.value === "") {
            const tmpConfig = { ...this._config };
            delete tmpConfig[target.configValue];
            this._config = tmpConfig;
        } else {
            this._config = {
                ...this._config,
                [target.configValue]: target.value,
            };
        }

        const event = new Event("config-changed", {
            bubbles: true,
            composed: true,
        });
        event.detail = { config: this._config };
        this.dispatchEvent(event);
    }

    static get styles() {
        return css`
      .card-config {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      label {
        font-size: 14px;
        font-weight: 500;
      }
      select {
        padding: 8px;
        border-radius: 6px;
        border: 1px solid var(--divider-color);
        background: var(--card-background-color);
        color: var(--primary-text-color);
      }
      .helper-text {
        font-size: 12px;
        color: var(--secondary-text-color);
      }
    `;
    }
}

customElements.define("plantrun-card-editor", PlantRunCardEditor);
