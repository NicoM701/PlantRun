const HaPanelLovelace = customElements.get("ha-panel-lovelace");

if (!HaPanelLovelace) {
  throw new Error("PlantRun panel requires Home Assistant's frontend runtime.");
}

const LitElement = Object.getPrototypeOf(HaPanelLovelace);
const html = LitElement.prototype.html;
const css = LitElement.prototype.css;

const PHASES = ["Seedling", "Vegetative", "Flowering", "Harvest"];

class PlantRunDashboardPanel extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _runs: { type: Array },
      _activeRunId: { type: String },
      _filter: { type: String },
      _expandedRunId: { type: String },
      _loading: { type: Boolean },
      _error: { type: String },
      _setupForm: { type: Object },
      _newNotes: { type: Object },
      _editNotes: { type: Object },
      _collapsedNotes: { type: Object },
      _cultivarSuggestions: { type: Array },
      _highlightedCultivarSuggestion: { type: Number },
    };
  }

  constructor() {
    super();
    this._runs = [];
    this._activeRunId = "";
    this._filter = "all";
    this._expandedRunId = "";
    this._loading = true;
    this._error = "";
    this._refreshInterval = null;
    this._setupForm = {
      friendly_name: "",
      planted_date: "",
      cultivar_name: "",
      breeder: "",
      strain: "",
      grow_space: "",
      target_days: "",
      medium: "",
    };
    this._newNotes = {};
    this._editNotes = {};
    this._collapsedNotes = {};
    this._cultivarSuggestions = [];
    this._highlightedCultivarSuggestion = -1;
  }

  connectedCallback() {
    super.connectedCallback();
    this._refreshRuns();
    this._refreshInterval = window.setInterval(() => this._refreshRuns(), 10000);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._refreshInterval) {
      window.clearInterval(this._refreshInterval);
      this._refreshInterval = null;
    }
  }

  static get styles() {
    return css`
      :host {
        --bg: #0c1009;
        --bg-surface: #111810;
        --bg-card: #151d13;
        --bg-card-h: #192218;
        --bg-elevated: #1d2b1b;
        --border: rgba(80, 130, 60, 0.16);
        --border-hi: rgba(120, 190, 90, 0.28);
        --g-deep: #1e4018;
        --g-mid: #3d7a34;
        --g-bright: #78c860;
        --g-glow: rgba(120, 200, 90, 0.13);
        --amber: #dfa040;
        --rose: #c07070;
        --t1: #d0e8c8;
        --t2: #7aa870;
        --t3: #4a6840;
        --t4: #304828;
        display: block;
        color: var(--t1);
        background: var(--bg);
        min-height: 100vh;
        font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      .app {
        max-width: 1140px;
        margin: 0 auto;
        padding: 0 24px 64px;
      }
      .hdr {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 24px 0;
        border-bottom: 1px solid var(--border);
        gap: 12px;
      }
      .hdr-l {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .logo {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--g-deep), var(--g-mid));
        display: grid;
        place-items: center;
      }
      .hdr-title {
        font-family: "Fraunces", Georgia, serif;
        font-size: 24px;
      }
      .hdr-title em {
        color: var(--g-bright);
        font-style: normal;
      }
      .hdr-sub {
        color: var(--t3);
        font-size: 11px;
      }
      .tabs {
        display: flex;
        gap: 4px;
        background: var(--bg-surface);
        border: 1px solid var(--border);
        border-radius: 999px;
        padding: 4px;
      }
      .tab {
        border: 0;
        background: transparent;
        color: var(--t3);
        padding: 7px 14px;
        border-radius: 999px;
        cursor: pointer;
      }
      .tab.on {
        background: var(--g-deep);
        color: var(--g-bright);
      }
      .filters {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 18px 0 22px;
        gap: 10px;
        flex-wrap: wrap;
      }
      .stats {
        color: var(--t3);
        font-size: 11px;
      }
      .btn {
        border: 1px solid var(--border);
        background: var(--bg-elevated);
        color: var(--t1);
        border-radius: 999px;
        padding: 9px 14px;
        font-family: inherit;
        cursor: pointer;
      }
      .btn.primary {
        background: linear-gradient(135deg, var(--g-deep), var(--g-mid));
        border-color: var(--border-hi);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
        gap: 18px;
      }
      .card {
        border: 1px solid var(--border);
        border-radius: 18px;
        overflow: hidden;
        background: var(--bg-card);
      }
      .thumb {
        height: 160px;
        background: linear-gradient(135deg, #182716, #0e150d);
        position: relative;
      }
      .thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: brightness(0.85);
      }
      .thumb-fallback {
        height: 100%;
        display: grid;
        place-items: center;
        color: var(--t2);
        font-size: 12px;
      }
      .thumb-badges {
        position: absolute;
        top: 10px;
        left: 12px;
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .badge {
        font-size: 10px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: rgba(15, 23, 13, 0.72);
        color: var(--t2);
        padding: 4px 10px;
      }
      .badge.active {
        color: var(--g-bright);
        border-color: var(--border-hi);
      }
      .badge.ended {
        color: var(--t3);
      }
      .card-body {
        padding: 14px 16px 16px;
      }
      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 10px;
      }
      .strain-name {
        font-family: "Fraunces", Georgia, serif;
        font-size: 18px;
      }
      .strain-meta {
        color: var(--t3);
        font-size: 10px;
      }
      .expand-btn {
        border: 1px solid var(--border);
        color: var(--t2);
        background: var(--bg-elevated);
        border-radius: 50%;
        width: 28px;
        height: 28px;
        cursor: pointer;
      }
      .sensors {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin: 12px 0;
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: var(--bg-elevated);
        padding: 5px 9px;
        font-size: 10px;
        color: var(--t2);
      }
      .chip.sensor {
        cursor: pointer;
      }
      .chip.sensor:hover {
        border-color: var(--border-hi);
      }
      .chip .val {
        color: var(--t1);
      }
      .expanded {
        border-top: 1px solid var(--border);
        margin-top: 12px;
        padding-top: 12px;
      }
      .sensor-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .sg-cell {
        border-radius: 10px;
        border: 1px solid var(--border);
        background: var(--bg-elevated);
        padding: 10px;
      }
      .sg-cell.clickable {
        cursor: pointer;
      }
      .sg-cell.clickable:hover {
        border-color: var(--border-hi);
      }
      .sg-label {
        color: var(--t3);
        font-size: 9px;
        text-transform: uppercase;
      }
      .sg-val {
        margin-top: 4px;
        font-size: 17px;
      }
      .run-age {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-top: 14px;
        margin-bottom: 8px;
        padding: 14px 16px;
        border: 1px solid var(--border-hi);
        border-radius: 14px;
        background: linear-gradient(135deg, rgba(120, 200, 90, 0.2), rgba(30, 64, 24, 0.95));
        box-shadow: 0 0 0 1px rgba(120, 200, 90, 0.08), 0 12px 26px rgba(0, 0, 0, 0.22);
      }
      .run-age-label {
        color: var(--t2);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .run-age-day {
        font-family: "Fraunces", Georgia, serif;
        font-size: 28px;
        line-height: 1;
        color: #f2ffe8;
      }
      .run-age-total {
        color: var(--t1);
        font-size: 13px;
        text-align: right;
      }
      .phase-title {
        margin-top: 14px;
        margin-bottom: 8px;
        font-size: 10px;
        color: var(--t3);
      }
      .phase-line {
        display: flex;
        gap: 0;
        margin-bottom: 12px;
      }
      .phase-step {
        flex: 1;
        text-align: center;
        position: relative;
      }
      .phase-step:not(:last-child)::after {
        content: "";
        position: absolute;
        height: 2px;
        background: var(--border);
        top: 7px;
        left: 50%;
        right: -50%;
      }
      .phase-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 2px solid var(--border);
        background: var(--bg-elevated);
        margin: 0 auto 4px;
        cursor: pointer;
      }
      .phase-step.done .phase-dot {
        border-color: var(--g-mid);
        background: var(--g-mid);
      }
      .phase-step.current .phase-dot {
        border-color: var(--g-bright);
        background: var(--g-bright);
      }
      .phase-name {
        color: var(--t3);
        font-size: 9px;
      }
      .phase-step.current .phase-name {
        color: var(--g-bright);
      }
      .notes {
        margin-top: 10px;
        display: grid;
        gap: 8px;
      }
      .notes-panel {
        margin-top: 12px;
        border: 1px solid var(--border);
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.02);
        overflow: hidden;
      }
      .notes-toggle {
        width: 100%;
        border: 0;
        background: transparent;
        color: inherit;
        padding: 10px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        cursor: pointer;
        text-align: left;
      }
      .notes-toggle-main {
        min-width: 0;
        display: grid;
        gap: 4px;
      }
      .notes-label-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .notes-label {
        font-size: 10px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--t2);
      }
      .notes-stack {
        color: var(--t3);
        font-size: 10px;
      }
      .notes-preview {
        min-width: 0;
        color: var(--t1);
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .notes-body {
        padding: 0 12px 12px;
        border-top: 1px solid var(--border);
      }
      .note {
        border: 1px solid var(--border);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.03);
        padding: 10px;
        font-size: 11px;
      }
      .note-ts {
        font-size: 9px;
        color: var(--t4);
        margin-bottom: 4px;
      }
      .row {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .input,
      .textarea,
      .select {
        width: 100%;
        border: 1px solid var(--border);
        background: #10170f;
        color: var(--t1);
        border-radius: 10px;
        padding: 9px 10px;
        font-family: inherit;
      }
      .textarea {
        min-height: 74px;
      }
      .mini {
        padding: 6px 8px;
        border: 1px solid var(--border);
        border-radius: 8px;
        color: var(--t2);
        background: var(--bg-elevated);
        font-size: 10px;
        cursor: pointer;
      }
      .mini.danger {
        color: var(--rose);
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 10px;
      }
      .field {
        flex: 1 1 240px;
        min-width: 240px;
      }
      .field-label {
        display: block;
        margin-bottom: 4px;
        color: var(--t2);
        font-size: 11px;
      }
      .suggest-wrap {
        position: relative;
      }
      .suggest-list {
        position: absolute;
        z-index: 5;
        left: 0;
        right: 0;
        top: calc(100% + 4px);
        margin: 0;
        padding: 6px;
        list-style: none;
        border: 1px solid var(--border-hi);
        border-radius: 10px;
        background: var(--bg-elevated);
      }
      .suggest-item {
        width: 100%;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: var(--t1);
        text-align: left;
        font-family: inherit;
        font-size: 11px;
        padding: 7px 8px;
        cursor: pointer;
      }
      .suggest-item:hover,
      .suggest-item.on {
        background: var(--g-glow);
      }
      .setup {
        max-width: 760px;
        border: 1px solid var(--border);
        background: var(--bg-card);
        border-radius: 16px;
        padding: 16px;
      }
      .setup h3 {
        font-family: "Fraunces", Georgia, serif;
        margin: 0 0 8px;
      }
      .hint {
        color: var(--t3);
        font-size: 11px;
      }
      .loading,
      .error,
      .empty {
        padding: 18px;
        border-radius: 12px;
        border: 1px solid var(--border);
        background: var(--bg-card);
      }
      @media (max-width: 760px) {
        .app {
          padding: 0 14px 40px;
        }
        .sensor-grid {
          grid-template-columns: 1fr 1fr;
        }
      }
    `;
  }

  render() {
    if (this._loading) {
      return html`<div class="app"><div class="loading">Loading PlantRun dashboard...</div></div>`;
    }
    if (this._error) {
      return html`<div class="app"><div class="error">${this._error}</div></div>`;
    }

    if (!this._runs.length) {
      return html`<div class="app">${this._renderHeader(true)}${this._renderSetup()}</div>`;
    }

    const visibleRuns = this._runs.filter((run) => {
      if (this._filter === "all") return true;
      if (this._filter === "active") return run.status === "active";
      if (this._filter === "done") return run.status === "ended";
      return run.status === this._filter;
    });

    return html`
      <div class="app">
        ${this._renderHeader(false)}
        <div class="filters">
          <div class="tabs">
            ${this._tab("all", "All Runs")}
            ${this._tab("active", "Active")}
            ${this._tab("done", "Finished")}
          </div>
          <div class="stats">${this._runs.filter((r) => r.status === "active").length} active · ${this._runs.filter((r) => r.status !== "active").length} inactive</div>
        </div>
        <div class="grid">
          ${visibleRuns.map((run) => this._renderRunCard(run))}
        </div>
      </div>
    `;
  }

  _renderHeader(empty) {
    return html`
      <header class="hdr">
        <div class="hdr-l">
          <div class="logo">🌿</div>
          <div>
            <div class="hdr-title">Plant<em>Run</em></div>
            <div class="hdr-sub">Home Assistant sidebar dashboard</div>
          </div>
        </div>
        ${!empty ? html`<button class="btn primary" @click=${() => (this._expandedRunId = "__new__")}>+ New Run</button>` : null}
      </header>
      ${this._expandedRunId === "__new__" ? this._renderSetup() : null}
    `;
  }

  _renderSetup() {
    return html`
      <section class="setup">
        <h3>Initialize your first run</h3>
        <p class="hint">Create the run basics first. Cultivar is shown on the run and also used as the default SeedFinder lookup strain when Strain is left blank.</p>
        <div class="row">
          <div class="field">
            <label class="field-label">Run name</label>
            <input class="input" .value=${this._setupForm.friendly_name} placeholder="Example: Tent A · Spring 2026" @input=${(e) => this._setSetup("friendly_name", e.target.value)} />
          </div>
          <div class="field">
            <label class="field-label">Planted date</label>
            <input class="input" type="date" .value=${this._setupForm.planted_date} @input=${(e) => this._setSetup("planted_date", e.target.value)} />
          </div>
        </div>
        <div class="row">
          <div class="field suggest-wrap">
            <label class="field-label">Cultivar</label>
            <input
              class="input"
              .value=${this._setupForm.cultivar_name}
              placeholder="Cultivar name (display + default lookup strain)"
              @input=${(e) => this._onCultivarInput(e)}
              @keydown=${(e) => this._onCultivarKeydown(e)}
              autocomplete="off"
              aria-label="Cultivar"
            />
            ${this._cultivarSuggestions.length
              ? html`<ul class="suggest-list" role="listbox" aria-label="Cultivar suggestions">
                  ${this._cultivarSuggestions.map(
                    (name, index) => html`<li>
                      <button
                        class="suggest-item ${this._highlightedCultivarSuggestion === index ? "on" : ""}"
                        type="button"
                        @click=${() => this._applyCultivarSuggestion(name)}
                      >
                        ${name}
                      </button>
                    </li>`,
                  )}
                </ul>`
              : null}
          </div>
          <div class="field">
            <label class="field-label">Breeder</label>
            <input class="input" .value=${this._setupForm.breeder} placeholder="Optional SeedFinder hint" @input=${(e) => this._setSetup("breeder", e.target.value)} />
          </div>
          <div class="field">
            <label class="field-label">Strain</label>
            <input class="input" .value=${this._setupForm.strain} placeholder="Optional SeedFinder hint" @input=${(e) => this._setSetup("strain", e.target.value)} />
          </div>
        </div>
        <p class="hint">Tip: Breeder + Strain provide the most precise SeedFinder lookup. If Strain is blank and Breeder is set, Cultivar is used as the lookup strain.</p>
        <div class="row">
          <div class="field">
            <label class="field-label" for="setup-grow-space">Grow space</label>
            <input
              id="setup-grow-space"
              class="input"
              .value=${this._setupForm.grow_space}
              placeholder="Tent, room, closet, box"
              @input=${(e) => this._setSetup("grow_space", e.target.value)}
            />
            <div class="hint">Where the plant is growing: the container or location.</div>
          </div>
          <div class="field">
            <label class="field-label" for="setup-medium">Root medium</label>
            <input
              id="setup-medium"
              class="input"
              .value=${this._setupForm.medium}
              placeholder="Soil, coco, hydro, rockwool"
              @input=${(e) => this._setSetup("medium", e.target.value)}
            />
            <div class="hint">What the roots grow in, not the tent or room.</div>
          </div>
          <div class="field">
            <label class="field-label" for="setup-target-days">Target days</label>
            <input
              id="setup-target-days"
              class="input"
              type="number"
              .value=${this._setupForm.target_days}
              placeholder="Target days"
              @input=${(e) => this._setSetup("target_days", e.target.value)}
            />
          </div>
        </div>
        <div class="actions">
          <button class="btn primary" @click=${this._submitSetup}>Create run</button>
          ${this._runs.length ? html`<button class="btn" @click=${() => (this._expandedRunId = "")}>Cancel</button>` : null}
        </div>
      </section>
    `;
  }

  _renderRunCard(run) {
    const expanded = this._expandedRunId === run.id;
    const currentPhase = run.phases?.length ? run.phases[run.phases.length - 1].name : "None";
    const showHarvestFields = this._hasReachedPostHarvest(run);
    const runAgeDays = this._runAgeDays(run.start_time, run.end_time);
    const sensorRows = this._sensorRows(run);
    const availableSensors = sensorRows.filter((s) => s.available);
    const unavailableCount = sensorRows.length - availableSensors.length;
    const imageUrl = run.image_url || run.cultivar?.image_url || "";
    const imageSource = run.image_url ? run.image_source || "custom" : run.cultivar?.image_url ? "seedfinder (fallback)" : "placeholder";
    const notes = (run.notes || []).slice().reverse();
    const latestNote = notes[0];
    const notesCollapsed = this._notesCollapsed(run.id);
    const extraNotesCount = latestNote ? Math.max(notes.length - 1, 0) : 0;

    return html`
      <article class="card">
        <div class="thumb">
          ${imageUrl ? html`<img src=${imageUrl} alt=${run.friendly_name} />` : html`<div class="thumb-fallback">No image yet</div>`}
          <div class="thumb-badges">
            <span class="badge ${run.status === "active" ? "active" : "ended"}">${run.status}</span>
            <span class="badge">${currentPhase}</span>
            <span class="badge">image: ${imageSource}</span>
          </div>
        </div>
        <div class="card-body">
          <div class="card-top">
            <div>
              <div class="strain-name">${run.cultivar?.name || run.friendly_name}</div>
              <div class="strain-meta">${run.friendly_name} · started ${this._shortDate(run.start_time)}</div>
            </div>
            <button class="expand-btn" @click=${() => this._toggleExpand(run.id)}>${expanded ? "▴" : "▾"}</button>
          </div>

          <div class="sensors">
            ${availableSensors.length
              ? availableSensors.map(
                  (sensor) => html`<button class="chip sensor" @click=${() => this._openEntity(sensor.entity_id)}><span>${sensor.icon}</span><span class="val">${sensor.state}</span><span>${sensor.unit || ""}</span></button>`,
                )
              : html`<span class="chip">No live sensors</span>`}
            ${unavailableCount ? html`<span class="chip">${unavailableCount} unavailable</span>` : null}
          </div>

          ${expanded
            ? html`
                <div class="expanded">
                  <div class="sensor-grid">
                    ${availableSensors.length
                      ? availableSensors.map(
                          (sensor) => html`
                            <div class="sg-cell clickable" @click=${() => this._openEntity(sensor.entity_id)}>
                              <div class="sg-label">${sensor.name}</div>
                              <div class="sg-val">${sensor.state}</div>
                              <div class="sg-label">${sensor.unit || "no unit"}</div>
                            </div>
                          `,
                        )
                      : html`<div class="sg-cell"><div class="sg-label">Sensors</div><div class="sg-val">No data</div><div class="sg-label">Bind entities to populate</div></div>`}
                  </div>

                  ${runAgeDays
                    ? html`
                        <div class="run-age">
                          <div>
                            <div class="run-age-label">Days Running</div>
                            <div class="run-age-day">Day ${runAgeDays}</div>
                          </div>
                          <div class="run-age-total">${runAgeDays} ${runAgeDays === 1 ? "day" : "days"} running</div>
                        </div>
                      `
                    : null}

                  <div class="phase-title">Growth phase (click dot to request change)</div>
                  <div class="phase-line">
                    ${PHASES.map((phase) => {
                      const idx = PHASES.indexOf(phase);
                      const cur = PHASES.findIndex((x) => x.toLowerCase() === String(currentPhase).toLowerCase());
                      const klass = idx < cur ? "done" : idx === cur ? "current" : "";
                      return html`<div class="phase-step ${klass}"><button class="phase-dot" @click=${() => this._requestPhaseChange(run, phase)} title="Switch to ${phase}"></button><div class="phase-name">${phase}</div></div>`;
                    })}
                  </div>

                  <div class="notes-panel">
                    <button class="notes-toggle" @click=${() => this._toggleNotes(run.id)}>
                      <div class="notes-toggle-main">
                        <div class="notes-label-row">
                          <span class="notes-label">Notes</span>
                          <span class="notes-stack">${notes.length}${extraNotesCount ? html` (+${extraNotesCount} earlier)` : null}</span>
                        </div>
                        <div class="notes-preview">${latestNote ? latestNote.text : "No notes yet. Add one below."}</div>
                      </div>
                      <span>${notesCollapsed ? "▾" : "▴"}</span>
                    </button>
                    ${notesCollapsed
                      ? null
                      : html`<div class="notes-body"><div class="notes">${notes.length
                        ? notes.map((note) => this._renderNote(run, note))
                        : html`<div class="note"><div class="note-ts">No notes yet</div>Add one below.</div>`}</div></div>`}
                  </div>

                  ${notesCollapsed
                    ? null
                    : html`<div class="actions">
                        <textarea
                          class="textarea"
                          placeholder="Add note"
                          .value=${this._newNotes[run.id] || ""}
                          @input=${(e) => this._setNewNote(run.id, e.target.value)}
                        ></textarea>
                        <button class="mini" @click=${() => this._addNote(run.id)}>Add note</button>
                        ${showHarvestFields
                          ? html`
                              <input class="input" type="number" placeholder="Dry yield (g)" .value=${run.dry_yield_grams ?? ""} @change=${(e) => this._changeYield(run.id, e.target.value)} />
                              <div class="field">
                                <label class="field-label" for="notes-summary-${run.id}">Summary (optional)</label>
                                <input
                                  id="notes-summary-${run.id}"
                                  class="input"
                                  placeholder="Example: Strong terpene profile, steady finish, 84g dried"
                                  .value=${run.notes_summary || ""}
                                  @change=${(e) => this._updateRun(run.id, { notes_summary: e.target.value })}
                                />
                                <div class="hint">Optional short recap of the run for quick scanning later.</div>
                              </div>
                            `
                          : html`<div class="hint">Dry yield and recap fields unlock from Harvest onward.</div>`}
                        <input class="input" type="file" accept="image/png,image/jpeg,image/webp" @change=${(e) => this._uploadImage(run.id, e)} />
                        ${run.cultivar?.image_url
                          ? html`<button class="mini" @click=${() => this._setSeedfinderImage(run.id, run.cultivar.image_url)}>Use SeedFinder image</button>`
                          : null}
                        <button class="mini danger" @click=${() => this._endRun(run.id)}>Finish run</button>
                      </div>`}
                </div>
              `
            : null}
        </div>
      </article>
    `;
  }

  _renderNote(run, note) {
    const editKey = `${run.id}:${note.id}`;
    const editValue = this._editNotes[editKey];
    return html`
      <div class="note">
        <div class="note-ts">${this._shortDateTime(note.timestamp)}</div>
        ${typeof editValue === "string"
          ? html`
              <textarea class="textarea" .value=${editValue} @input=${(e) => this._setEditNote(editKey, e.target.value)}></textarea>
              <div class="actions">
                <button class="mini" @click=${() => this._saveEditNote(run.id, note.id, editKey)}>Save</button>
                <button class="mini" @click=${() => this._cancelEditNote(editKey)}>Cancel</button>
              </div>
            `
          : html`
              <div>${note.text}</div>
              <div class="actions">
                <button class="mini" @click=${() => this._startEditNote(run.id, note)}>Edit</button>
                <button class="mini danger" @click=${() => this._deleteNote(run.id, note.id)}>Delete</button>
              </div>
            `}
      </div>
    `;
  }

  _tab(value, label) {
    return html`<button class="tab ${this._filter === value ? "on" : ""}" @click=${() => (this._filter = value)}>${label}</button>`;
  }

  _toggleExpand(runId) {
    this._expandedRunId = this._expandedRunId === runId ? "" : runId;
  }

  _toggleNotes(runId) {
    this._collapsedNotes = {
      ...this._collapsedNotes,
      [runId]: !this._notesCollapsed(runId),
    };
  }

  _notesCollapsed(runId) {
    return this._collapsedNotes[runId] !== false;
  }

  _hasReachedPostHarvest(run) {
    const phases = Array.isArray(run?.phases) ? run.phases : [];
    return phases.some((phase) => this._isPostHarvestPhase(phase?.name));
  }

  _isPostHarvestPhase(phaseName) {
    const phase = String(phaseName || "").trim().toLowerCase();
    return ["harvest", "drying", "curing"].includes(phase);
  }

  _sensorRows(run) {
    const bindings = run.bindings || [];
    return bindings.map((binding) => {
      const entity = this.hass?.states?.[binding.sensor_id];
      const state = entity?.state;
      const unavailable = !entity || state === "unknown" || state === "unavailable";
      const name = this._titleCase(binding.metric_type || "metric");
      return {
        metric_type: binding.metric_type,
        entity_id: binding.sensor_id,
        name,
        state: unavailable ? "—" : state,
        unit: unavailable ? "" : entity.attributes.unit_of_measurement,
        available: !unavailable,
        icon: this._metricIcon(binding.metric_type),
      };
    });
  }

  _openEntity(entityId) {
    const event = new CustomEvent("hass-more-info", {
      bubbles: true,
      composed: true,
      detail: { entityId },
    });
    this.dispatchEvent(event);
  }

  _changeYield(runId, rawValue) {
    const trimmed = String(rawValue ?? "").trim();
    if (!trimmed) {
      this._updateRun(runId, { dry_yield_grams: 0 });
      return;
    }
    const value = Number(trimmed);
    if (Number.isNaN(value)) return;
    this._updateRun(runId, { dry_yield_grams: value });
  }

  async _refreshRuns() {
    if (!this.hass) return;
    try {
      const payload = await this.hass.callWS({ type: "plantrun/get_runs" });
      this._runs = payload.runs || [];
      this._activeRunId = payload.active_run_id || "";
      this._error = "";
    } catch (err) {
      this._error = `Unable to load PlantRun data: ${err?.message || err}`;
    } finally {
      this._loading = false;
    }
  }

  async _submitSetup() {
    const name = this._setupForm.friendly_name.trim();
    if (!name) {
      this._toast("Run name is required.");
      return;
    }

    try {
      await this.hass.callService("plantrun", "create_run", {
        friendly_name: name,
        ...(this._setupForm.planted_date ? { planted_date: this._setupForm.planted_date } : {}),
      });
      await this._refreshRuns();
      const run = this._runs.find((r) => r.friendly_name === name) || this._runs[this._runs.length - 1];
      if (!run) return;

      if (this._setupForm.cultivar_name.trim()) {
        await this.hass.callService("plantrun", "set_cultivar", {
          run_id: run.id,
          cultivar_name: this._setupForm.cultivar_name.trim(),
          ...(this._setupForm.breeder.trim() ? { breeder: this._setupForm.breeder.trim() } : {}),
          ...(this._setupForm.strain.trim() ? { strain: this._setupForm.strain.trim() } : {}),
        });
      }

      await this.hass.callService("plantrun", "update_run", {
        run_id: run.id,
        base_config: {
          grow_space: this._setupForm.grow_space,
          target_days: this._setupForm.target_days,
          medium: this._setupForm.medium,
        },
      });

      this._expandedRunId = run.id;
      this._cultivarSuggestions = [];
      this._highlightedCultivarSuggestion = -1;
      this._toast("Run initialized.");
      await this._refreshRuns();
    } catch (err) {
      this._toast(`Setup failed: ${err?.message || err}`);
    }
  }

  async _requestPhaseChange(run, phaseName) {
    const currentPhase = run.phases?.length ? run.phases[run.phases.length - 1].name : "None";
    if (String(currentPhase).toLowerCase() === String(phaseName).toLowerCase()) {
      return;
    }

    const first = window.confirm(`Request phase change: ${currentPhase} -> ${phaseName}?`);
    if (!first) return;
    const second = window.confirm(`Confirm phase update for run \"${run.friendly_name}\" to \"${phaseName}\".`);
    if (!second) return;

    try {
      await this.hass.callService("plantrun", "add_phase", { run_id: run.id, phase_name: phaseName });
      this._toast(`Phase changed to ${phaseName}.`);
      await this._refreshRuns();
    } catch (err) {
      this._toast(`Phase change failed: ${err?.message || err}`);
    }
  }

  async _addNote(runId) {
    const text = (this._newNotes[runId] || "").trim();
    if (!text) return;
    try {
      await this.hass.callService("plantrun", "add_note", { run_id: runId, text });
      this._newNotes = { ...this._newNotes, [runId]: "" };
      await this._refreshRuns();
    } catch (err) {
      this._toast(`Add note failed: ${err?.message || err}`);
    }
  }

  _startEditNote(runId, note) {
    const key = `${runId}:${note.id}`;
    this._editNotes = { ...this._editNotes, [key]: note.text };
  }

  _cancelEditNote(key) {
    const next = { ...this._editNotes };
    delete next[key];
    this._editNotes = next;
  }

  async _saveEditNote(runId, noteId, key) {
    const text = (this._editNotes[key] || "").trim();
    if (!text) return;
    try {
      await this.hass.callService("plantrun", "update_note", { run_id: runId, note_id: noteId, text });
      this._cancelEditNote(key);
      await this._refreshRuns();
      this._toast("Note updated.");
    } catch (err) {
      this._toast(`Update failed: ${err?.message || err}`);
    }
  }

  async _deleteNote(runId, noteId) {
    if (!window.confirm("Delete this note?")) return;
    if (!window.confirm("This action is destructive. Confirm note deletion.")) return;
    try {
      await this.hass.callService("plantrun", "delete_note", { run_id: runId, note_id: noteId });
      await this._refreshRuns();
      this._toast("Note deleted.");
    } catch (err) {
      this._toast(`Delete failed: ${err?.message || err}`);
    }
  }

  async _endRun(runId) {
    if (!window.confirm("Finish this run?")) return;
    if (!window.confirm("Final confirmation: mark run as ended.")) return;
    try {
      await this.hass.callService("plantrun", "end_run", { run_id: runId });
      await this._refreshRuns();
      this._toast("Run finished.");
    } catch (err) {
      this._toast(`Finish failed: ${err?.message || err}`);
    }
  }

  async _updateRun(runId, patch) {
    try {
      await this.hass.callService("plantrun", "update_run", { run_id: runId, ...patch });
      await this._refreshRuns();
    } catch (err) {
      this._toast(`Update failed: ${err?.message || err}`);
    }
  }

  async _uploadImage(runId, event) {
    const file = event.target?.files?.[0];
    if (!file) return;
    const base64 = await this._fileToDataUrl(file);
    if (!base64) return;

    try {
      await this.hass.callService("plantrun", "set_run_image", {
        run_id: runId,
        image_data: base64,
        file_name: file.name,
      });
      await this._refreshRuns();
      this._toast("Image uploaded.");
    } catch (err) {
      this._toast(`Upload failed: ${err?.message || err}`);
    }
  }

  async _setSeedfinderImage(runId, imageUrl) {
    try {
      await this.hass.callService("plantrun", "set_run_image", {
        run_id: runId,
        image_url: imageUrl,
        image_source: "seedfinder",
      });
      await this._refreshRuns();
      this._toast("Using SeedFinder image.");
    } catch (err) {
      this._toast(`Image update failed: ${err?.message || err}`);
    }
  }

  _fileToDataUrl(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  _onCultivarInput(event) {
    const value = event?.target?.value ?? "";
    this._setSetup("cultivar_name", value);
    this._refreshCultivarSuggestions(value);
  }

  _onCultivarKeydown(event) {
    if (!this._cultivarSuggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      this._highlightedCultivarSuggestion = Math.min(
        this._highlightedCultivarSuggestion + 1,
        this._cultivarSuggestions.length - 1,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      this._highlightedCultivarSuggestion = Math.max(this._highlightedCultivarSuggestion - 1, 0);
      return;
    }
    if (event.key === "Enter" && this._highlightedCultivarSuggestion >= 0) {
      event.preventDefault();
      this._applyCultivarSuggestion(this._cultivarSuggestions[this._highlightedCultivarSuggestion]);
    }
  }

  _refreshCultivarSuggestions(rawQuery) {
    const query = String(rawQuery || "").trim().toLowerCase();
    if (!query) {
      this._cultivarSuggestions = [];
      this._highlightedCultivarSuggestion = -1;
      return;
    }

    const seen = new Set();
    const matches = [];
    for (const run of this._runs || []) {
      const candidate = String(run?.cultivar?.name || "").trim();
      if (!candidate) continue;
      const key = candidate.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      if (!key.includes(query) || key === query) continue;
      matches.push(candidate);
      if (matches.length >= 6) break;
    }

    this._cultivarSuggestions = matches;
    this._highlightedCultivarSuggestion = matches.length ? 0 : -1;
  }

  _applyCultivarSuggestion(name) {
    this._setSetup("cultivar_name", name);
    this._cultivarSuggestions = [];
    this._highlightedCultivarSuggestion = -1;
  }

  _setSetup(field, value) {
    this._setupForm = { ...this._setupForm, [field]: value };
  }

  _setNewNote(runId, value) {
    this._newNotes = { ...this._newNotes, [runId]: value };
  }

  _setEditNote(key, value) {
    this._editNotes = { ...this._editNotes, [key]: value };
  }

  _shortDate(input) {
    if (!input) return "unknown";
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return input;
    return date.toLocaleDateString();
  }

  _shortDateTime(input) {
    if (!input) return "";
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return input;
    return date.toLocaleString();
  }

  _runAgeDays(startInput, endInput) {
    if (!startInput) return 0;
    const start = new Date(startInput);
    if (Number.isNaN(start.getTime())) return 0;
    const end = endInput ? new Date(endInput) : new Date();
    const endTime = Number.isNaN(end.getTime()) ? Date.now() : end.getTime();
    const diffMs = endTime - start.getTime();
    if (diffMs <= 0) return 1;
    return Math.floor(diffMs / 86400000) + 1;
  }

  _titleCase(raw) {
    return String(raw || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  }

  _metricIcon(metricType) {
    const key = String(metricType || "").toLowerCase();
    if (key.includes("temp")) return "🌡";
    if (key.includes("humid")) return "💧";
    if (key.includes("light")) return "☀️";
    if (key.includes("soil") || key.includes("moist")) return "💧";
    if (key.includes("energy") || key.includes("power")) return "⚡";
    return "●";
  }

  _toast(message) {
    const event = new CustomEvent("hass-notification", {
      bubbles: true,
      composed: true,
      detail: { message },
    });
    this.dispatchEvent(event);
  }
}

customElements.define("plantrun-dashboard-panel", PlantRunDashboardPanel);
