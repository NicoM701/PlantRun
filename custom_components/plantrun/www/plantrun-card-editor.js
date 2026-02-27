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
        this._config = config;
    }

    render() {
        if (!this.hass || !this._config) {
            return html``;
        }

        // Find all runs from the proxy sensors
        const runs = new Set();
        Object.keys(this.hass.states).forEach((entity_id) => {
            if (entity_id.startsWith("sensor.plantrun_status_")) {
                runs.add({
                    id: entity_id.replace("sensor.plantrun_status_", ""),
                    name: this.hass.states[entity_id].attributes.friendly_name || entity_id
                });
            }
        });

        return html`
      <div class="card-config">
        <paper-input
          label="Run ID"
          .value="${this._config.run_id}"
          .configValue="${"run_id"}"
          @value-changed="${this._valueChanged}"
        ></paper-input>
        <div class="helper-text">
          Available Runs:
          <ul>
            ${Array.from(runs).map(run => html`<li>${run.name}: <code>${run.id}</code></li>`)}
          </ul>
        </div>
      </div>
    `;
    }

    _valueChanged(ev) {
        if (!this._config || !this.hass) {
            return;
        }
        const target = ev.target;
        if (this[`_${target.configValue}`] === target.value) {
            return;
        }
        if (target.configValue) {
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
      .helper-text {
        font-size: 12px;
        color: var(--secondary-text-color);
        margin-top: 8px;
      }
      ul {
        margin-top: 4px;
        padding-left: 16px;
      }
    `;
    }
}

customElements.define("plantrun-card-editor", PlantRunCardEditor);
