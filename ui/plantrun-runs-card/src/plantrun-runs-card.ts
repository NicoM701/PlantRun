import type { PlantRunCardConfig, PlantRunRow, PlantRunServiceResponse } from "./types";

type HomeAssistantLike = {
  callService: (domain: string, service: string, data?: Record<string, unknown>) => Promise<unknown>;
};

const DEFAULT_TITLE = "PlantRun Runs";

export class PlantRunRunsCard extends HTMLElement {
  private _hass: HomeAssistantLike | null = null;
  private _config: PlantRunCardConfig = { type: "custom:plantrun-runs-card" };
  private _runs: PlantRunRow[] = [];
  private _error: string | null = null;
  private _loading = false;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config: PlantRunCardConfig): void {
    if (!config || config.type !== "custom:plantrun-runs-card") {
      throw new Error("Invalid config: type must be custom:plantrun-runs-card");
    }
    this._config = { ...this._config, ...config };
    this.render();
  }

  set hass(hass: HomeAssistantLike) {
    this._hass = hass;
    if (!this._loading && this._runs.length === 0) {
      void this.refresh();
    }
  }

  getCardSize(): number {
    const rowCount = Math.max(2, Math.min(this._runs.length, this._config.maxRows ?? 5));
    return rowCount + 1;
  }

  async refresh(): Promise<void> {
    if (!this._hass) {
      return;
    }

    this._loading = true;
    this._error = null;
    this.render();

    try {
      const response = (await this._hass.callService("plantrun", "list_runs", {})) as PlantRunServiceResponse;
      this._runs = (response?.runs ?? []).slice(0, this._config.maxRows ?? 20);
    } catch (err) {
      this._error = err instanceof Error ? err.message : "Failed to load PlantRun runs";
      this._runs = [];
    } finally {
      this._loading = false;
      this.render();
    }
  }

  private render(): void {
    if (!this.shadowRoot) {
      return;
    }

    const title = this._config.title ?? DEFAULT_TITLE;
    const rows = this._runs
      .map(
        (run) => `
          <tr>
            <td>${run.display_id}</td>
            <td>${run.run_name}</td>
            <td>${run.phase}</td>
            <td>${run.active ? "Active" : "Ended"}</td>
            <td>${run.started_at}</td>
          </tr>
        `
      )
      .join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: var(--primary-font-family, sans-serif);
        }
        .card {
          border-radius: 16px;
          border: 1px solid rgba(120, 120, 120, 0.25);
          background: linear-gradient(160deg, rgba(246, 252, 248, 0.96), rgba(236, 246, 241, 0.94));
          padding: 16px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        h3 {
          margin: 0;
          font-size: 1rem;
        }
        button {
          border: 1px solid rgba(70, 120, 85, 0.35);
          background: rgba(255, 255, 255, 0.85);
          border-radius: 10px;
          padding: 4px 8px;
          cursor: pointer;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.86rem;
        }
        td, th {
          border-bottom: 1px solid rgba(120, 120, 120, 0.16);
          padding: 6px 4px;
          text-align: left;
        }
        .error {
          color: #a12222;
          font-weight: 600;
        }
        .chart-placeholder {
          margin-top: 12px;
          padding: 12px;
          border: 1px dashed rgba(80, 120, 80, 0.4);
          border-radius: 12px;
          font-size: 0.82rem;
        }
      </style>
      <div class="card">
        <div class="header">
          <h3>${title}</h3>
          <button id="refresh-btn">Refresh</button>
        </div>
        ${
          this._loading
            ? "<div>Loading runs...</div>"
            : this._error
            ? `<div class=\"error\">${this._error}</div>`
            : `
            <table>
              <thead>
                <tr><th>ID</th><th>Run</th><th>Phase</th><th>Status</th><th>Started</th></tr>
              </thead>
              <tbody>${rows || "<tr><td colspan=\"5\">No runs available</td></tr>"}</tbody>
            </table>
            <div class="chart-placeholder">
              Chart scaffold: wire line/area chart component to PlantRun metric entities for the selected run.
            </div>
          `
        }
      </div>
    `;

    const refreshButton = this.shadowRoot.getElementById("refresh-btn");
    refreshButton?.addEventListener("click", () => {
      void this.refresh();
    });
  }
}
