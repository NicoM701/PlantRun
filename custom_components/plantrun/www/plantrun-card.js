import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

import "./plantrun-card-editor.js";

class PlantRunCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
    };
  }

  static getConfigElement() {
    return document.createElement("plantrun-card-editor");
  }

  static getStubConfig() {
    return { run_id: "example_run_id" };
  }

  static get styles() {
    return css`
      :host {
        display: block;
      }
      ha-card {
        padding: 24px;
        background: transparent;
        color: var(--primary-text-color, #FFF);
        border: none;
        box-shadow: none;
        font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
      }
      .title-container {
        text-align: center;
        margin-bottom: 24px;
      }
      .title {
        font-size: 32px;
        font-weight: 700;
        letter-spacing: -0.5px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .subtitle {
        font-size: 14px;
        color: var(--secondary-text-color, #aaa);
        margin-top: 4px;
      }
      
      /* Chip Row Layouts */
      .chip-row {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px;
        margin-bottom: 32px;
      }

      /* Premium Chip Style */
      .chip {
        display: flex;
        align-items: center;
        background: rgba(40, 40, 40, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 24px;
        padding: 10px 20px;
        gap: 12px;
        transition: all 0.2s ease;
      }
      .chip:hover {
        background: rgba(60, 60, 60, 0.9);
        border-color: rgba(255, 255, 255, 0.15);
      }
      .chip-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--primary-color, #03a9f4);
      }
      /* Specific Icon colors matching user screenshot */
      .chip-icon.temp { color: #f44336; }
      .chip-icon.humidity { color: #607d8b; }
      .chip-icon.energy { color: #2196f3; }
      .chip-icon.light { color: #ffeb3b; }
      
      .chip-content {
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .chip-label {
        font-size: 11px;
        color: var(--secondary-text-color, #999);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 2px;
      }
      .chip-value {
        font-size: 16px;
        font-weight: 600;
        color: var(--primary-text-color, #FFF);
      }

      /* Plant / Run Details Rows */
      .details-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 32px;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 16px;
      }
      .detail-name {
        font-size: 18px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .detail-value {
        font-size: 18px;
        font-weight: 500;
        color: var(--primary-color, #03a9f4);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      /* Action Buttons at Bottom */
      .action-row {
        display: flex;
        justify-content: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .action-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        background: rgba(20, 20, 20, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        padding: 16px 24px;
        cursor: pointer;
        transition: all 0.2s ease;
        flex: 1;
        min-width: 200px;
        max-width: 300px;
      }
      .action-btn:hover {
        background: rgba(40, 40, 40, 0.8);
        border-color: rgba(255, 255, 255, 0.1);
      }
      .action-btn.end {
        border-color: rgba(244, 67, 54, 0.2);
      }
      .action-btn.end:hover {
        background: rgba(244, 67, 54, 0.1);
        border-color: rgba(244, 67, 54, 0.4);
      }
      .action-icon {
        background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.15);
        color: var(--primary-color, #03a9f4);
        padding: 8px;
        border-radius: 50%;
        display: flex;
      }
      .action-btn.end .action-icon {
        background: rgba(244, 67, 54, 0.15);
        color: #f44336;
      }
      .action-text {
        display: flex;
        flex-direction: column;
      }
      .action-title {
        font-size: 14px;
        font-weight: 600;
      }
      .action-subtitle {
        font-size: 12px;
        color: var(--secondary-text-color, #999);
      }

      .error {
        color: var(--error-color, #f44336);
        padding: 16px;
        background: rgba(244, 67, 54, 0.1);
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: center;
      }
    `;
  }

  setConfig(config) {
    if (!config.run_id) {
      throw new Error("You need to define a run_id for PlantRun");
    }
    this.config = config;
  }

  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    const runId = this.config.run_id;
    const statusSensor = this.hass.states[`sensor.plantrun_status_${runId}`];
    const phaseSensor = this.hass.states[`sensor.plantrun_active_phase_${runId}`];
    const cultivarSensor = this.hass.states[`sensor.plantrun_cultivar_${runId}`];

    if (!statusSensor) {
      return html`
        <ha-card>
          <div class="error">
            <ha-icon icon="mdi:alert-circle"></ha-icon>
            Run ID "${runId}" not found or sensors not yet initialized.
          </div>
        </ha-card>
      `;
    }

    // Find proxy sensors dynamically
    const proxySensors = Object.values(this.hass.states).filter(
      (state) =>
        state.entity_id.startsWith("sensor.plantrun_") &&
        state.entity_id.endsWith(`_${runId}`) &&
        !["status", "active_phase", "cultivar"].some(skip => state.entity_id.includes(skip))
    ).map(state => {
      // Best effort icon/color mapping based on string matching
      const id = state.entity_id.toLowerCase();
      let icon = state.attributes.icon || "mdi:chart-bell-curve-cumulative";
      let colorClass = "";

      if (id.includes("temp")) { icon = "mdi:thermometer"; colorClass = "temp"; }
      else if (id.includes("humid")) { icon = "mdi:water-percent"; colorClass = "humidity"; }
      else if (id.includes("energy") || id.includes("power")) { icon = "mdi:flash"; colorClass = "energy"; }
      else if (id.includes("light") || id.includes("bright")) { icon = "mdi:white-balance-sunny"; colorClass = "light"; }
      else if (id.includes("moist") || id.includes("water")) { icon = "mdi:watering-can"; colorClass = "humidity"; }
      else if (id.includes("door") || id.includes("tür")) { icon = state.state.toLowerCase() === "open" ? "mdi:door-open" : "mdi:door-closed"; }

      return { ...state, _icon: icon, _colorClass: colorClass };
    });

    const isRunning = statusSensor.state === "active";
    const runName = statusSensor.attributes.friendly_name?.replace(" Status", "") || "GrowZelt Steuerung";

    return html`
      <ha-card>
        <div class="title-container">
          <div class="title">
            ${runName}
          </div>
          ${cultivarSensor ? html`
            <div class="subtitle">
              ${cultivarSensor.state} ${cultivarSensor.attributes.breeder ? `(${cultivarSensor.attributes.breeder})` : ""}
            </div>
          ` : ""}
        </div>

        <div class="chip-row">
          ${proxySensors.map(
      (sensor) => html`
              <div class="chip">
                <div class="chip-icon ${sensor._colorClass}">
                  <ha-icon icon="${sensor._icon}"></ha-icon>
                </div>
                <div class="chip-content">
                  <div class="chip-label">
                    ${sensor.attributes.friendly_name?.replace(`_${runId}`, '') || "Metric"}
                  </div>
                  <div class="chip-value">
                    ${sensor.state} ${sensor.attributes.unit_of_measurement || ""}
                  </div>
                </div>
              </div>
            `
    )}
        </div>

        <div class="details-list">
          <div class="detail-row">
            <div class="detail-name">
              <ha-icon icon="mdi:cannabis"></ha-icon> Current Phase
            </div>
            <div class="detail-value">
              <ha-icon icon="mdi:sprout"></ha-icon> ${phaseSensor ? phaseSensor.state : "N/A"}
            </div>
          </div>
          <div class="detail-row">
            <div class="detail-name">
              <ha-icon icon="mdi:cannabis"></ha-icon> Run Status
            </div>
            <div class="detail-value">
              <ha-icon icon="${isRunning ? 'mdi:play-circle' : 'mdi:stop-circle'}"></ha-icon> ${statusSensor.state}
            </div>
          </div>
        </div>

        ${isRunning ? html`
          <div class="action-row">
            <div class="action-btn" @click="${this._changePhase}">
              <div class="action-icon">
                <ha-icon icon="mdi:update"></ha-icon>
              </div>
              <div class="action-text">
                <div class="action-title">Change Phase</div>
                <div class="action-subtitle">Enter next stage</div>
              </div>
            </div>

            <div class="action-btn" @click="${this._addNote}">
              <div class="action-icon">
                <ha-icon icon="mdi:notebook-edit"></ha-icon>
              </div>
              <div class="action-text">
                <div class="action-title">Add Note</div>
                <div class="action-subtitle">Log an event</div>
              </div>
            </div>

            <div class="action-btn end" @click="${this._endRun}">
              <div class="action-icon">
                <ha-icon icon="mdi:power"></ha-icon>
              </div>
              <div class="action-text">
                <div class="action-title">End Run</div>
                <div class="action-subtitle">Lock timeline</div>
              </div>
            </div>
          </div>
        ` : ""}
      </ha-card>
    `;
  }

  _changePhase() {
    const newPhase = prompt("Enter new phase name (e.g., Vegetative, Flowering, Harvest):");
    if (newPhase) {
      this.hass.callService("plantrun", "add_phase", {
        run_id: this.config.run_id,
        phase_name: newPhase,
      });
    }
  }

  _addNote() {
    const text = prompt("Enter your note:");
    if (text) {
      this.hass.callService("plantrun", "add_note", {
        run_id: this.config.run_id,
        text: text,
      });
    }
  }

  _endRun() {
    if (confirm("Are you sure you want to end this run? This will lock the current phase timespan.")) {
      this.hass.callService("plantrun", "end_run", {
        run_id: this.config.run_id,
      });
    }
  }
}

customElements.define("plantrun-card", PlantRunCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "plantrun-card",
  name: "PlantRun Tracker Card",
  preview: true,
  description: "A premium card to display and interact with your active PlantRun.",
});
