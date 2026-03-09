import { LitElement, html, css } from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

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
        <p class="hint">Dashboard starts empty. Create a run with seed/date/base config. Yield and additional details remain editable later.</p>
        <div class="row">
          <input class="input" .value=${this._setupForm.friendly_name} placeholder="Run name" @input=${(e) => this._setSetup("friendly_name", e.target.value)} />
          <input class="input" type="date" .value=${this._setupForm.planted_date} @input=${(e) => this._setSetup("planted_date", e.target.value)} />
        </div>
        <div class="row">
          <input class="input" .value=${this._setupForm.cultivar_name} placeholder="Cultivar / Seed" @input=${(e) => this._setSetup("cultivar_name", e.target.value)} />
          <input class="input" .value=${this._setupForm.breeder} placeholder="Breeder (optional)" @input=${(e) => this._setSetup("breeder", e.target.value)} />
          <input class="input" .value=${this._setupForm.strain} placeholder="Strain (optional)" @input=${(e) => this._setSetup("strain", e.target.value)} />
        </div>
        <div class="row">
          <input class="input" .value=${this._setupForm.grow_space} placeholder="Grow space / tent" @input=${(e) => this._setSetup("grow_space", e.target.value)} />
          <input class="input" .value=${this._setupForm.medium} placeholder="Medium" @input=${(e) => this._setSetup("medium", e.target.value)} />
          <input class="input" type="number" .value=${this._setupForm.target_days} placeholder="Target days" @input=${(e) => this._setSetup("target_days", e.target.value)} />
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
    const sensorRows = this._sensorRows(run);
    const availableSensors = sensorRows.filter((s) => s.available);
    const unavailableCount = sensorRows.length - availableSensors.length;
    const imageUrl = run.image_url || run.cultivar?.image_url || "";
    const imageSource = run.image_url ? run.image_source || "custom" : run.cultivar?.image_url ? "seedfinder (fallback)" : "placeholder";

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

                  <div class="phase-title">Growth phase (click dot to request change)</div>
                  <div class="phase-line">
                    ${PHASES.map((phase) => {
                      const idx = PHASES.indexOf(phase);
                      const cur = PHASES.findIndex((x) => x.toLowerCase() === String(currentPhase).toLowerCase());
                      const klass = idx < cur ? "done" : idx === cur ? "current" : "";
                      return html`<div class="phase-step ${klass}"><button class="phase-dot" @click=${() => this._requestPhaseChange(run, phase)} title="Switch to ${phase}"></button><div class="phase-name">${phase}</div></div>`;
                    })}
                  </div>

                  <div class="notes">
                    ${(run.notes || []).length
                      ? run.notes
                          .slice()
                          .reverse()
                          .map((note) => this._renderNote(run, note))
                      : html`<div class="note"><div class="note-ts">No notes yet</div>Add one below.</div>`}
                  </div>

                  <div class="actions">
                    <textarea
                      class="textarea"
                      placeholder="Add note"
                      .value=${this._newNotes[run.id] || ""}
                      @input=${(e) => this._setNewNote(run.id, e.target.value)}
                    ></textarea>
                    <button class="mini" @click=${() => this._addNote(run.id)}>Add note</button>
                    <input class="input" type="number" placeholder="Dry yield (g)" .value=${run.dry_yield_grams ?? ""} @change=${(e) => this._changeYield(run.id, e.target.value)} />
                    <input class="input" placeholder="Summary" .value=${run.notes_summary || ""} @change=${(e) => this._updateRun(run.id, { notes_summary: e.target.value })} />
                    <input class="input" type="file" accept="image/png,image/jpeg,image/webp" @change=${(e) => this._uploadImage(run.id, e)} />
                    ${run.cultivar?.image_url
                      ? html`<button class="mini" @click=${() => this._setSeedfinderImage(run.id, run.cultivar.image_url)}>Use SeedFinder image</button>`
                      : null}
                    <button class="mini danger" @click=${() => this._endRun(run.id)}>Finish run</button>
                  </div>
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

  _titleCase(raw) {
    return String(raw || "").replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
  }

  _metricIcon(metricType) {
    const key = String(metricType || "").toLowerCase();
    if (key.includes("temp")) return "🌡";
    if (key.includes("humid")) return "💧";
    if (key.includes("light")) return "☀️";
    if (key.includes("soil") || key.includes("moist")) return "🪴";
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
