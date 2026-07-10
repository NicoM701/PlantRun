import { CANONICAL_STAGES } from "./plantrun-panel-domain.js";

export function createPanelViewMethods(S) {
  return {
    _renderRunList() {
      const runs = this._filteredRuns();
      if (this._loading) return `<div class="empty-panel">Loading runs...</div>`;
      if (this._error) return `<div class="empty-panel error">${S.escapeHtml(this._error)}</div>`;
      if (!runs.length) {
        return `
          <div class="empty-panel">
            <div class="plant-mark">${S.icon("mdi:sprout")}</div>
            <strong>No ${this._filter === "all" ? "" : this._filter} runs</strong>
            <span>Start a run and PlantRun will keep the grow log organized.</span>
            <button class="primary" data-action="open-wizard" type="button">${S.icon("mdi:plus")} New run</button>
          </div>
        `;
      }
      return `<div class="run-list-head"><div><span class="eyebrow">${this._filter === "ended" ? "Archive" : "Runs"}</span><strong>${runs.length} ${runs.length === 1 ? "run" : "runs"}</strong></div><button class="icon-button" data-action="open-wizard" type="button" title="New run">${S.icon("mdi:plus")}</button></div>` + runs
        .map((run) => {
          const selected = run.id === this._selectedRunId;
          const progress = this._progress(run);
          const days = S.daysBetween(run.planted_date || run.start_time, run.end_time || new Date());
          return `
            <button class="run-row ${selected ? "selected" : ""}" data-action="select-run" data-run-id="${S.escapeHtml(run.id)}" type="button">
              <span class="stage-dot ${S.stageKey(run)}"></span>
              <span class="run-row-main">
                <strong>${S.escapeHtml(run.friendly_name || "Unnamed run")}</strong>
                <span>${S.escapeHtml(run.cultivar?.name || "Cultivar not set")} · day ${days}</span>
              </span>
              <span class="ring" style="--progress:${progress}">${progress}%</span>
            </button>
          `;
        })
        .join("");
    },

    _renderSensorTile(run, binding) {
      const entityId = binding.sensor_id;
      const latest = this._entityState(entityId);
      return `
        <article class="sensor-tile" data-sensor-tile data-run-id="${S.escapeHtml(run.id)}" data-entity-id="${S.escapeHtml(entityId)}" data-binding-id="${S.escapeHtml(binding.id || "")}">
          <div class="sensor-head">
            <span class="metric-badge">${S.icon(this._metricIcon(binding.metric_type))}</span>
            <button class="icon-button" data-action="edit-binding" data-run-id="${S.escapeHtml(run.id)}" data-binding-id="${S.escapeHtml(binding.id)}" type="button" title="Edit binding">${S.icon("mdi:pencil")}</button>
            <button class="icon-button danger" data-action="remove-binding" data-run-id="${S.escapeHtml(run.id)}" data-binding-id="${S.escapeHtml(binding.id)}" type="button" title="Remove binding">${S.icon("mdi:trash-can-outline")}</button>
          </div>
          <strong>${S.escapeHtml(this._metricLabel(binding.metric_type))}</strong>
          <span class="sensor-state" data-live-entity="${S.escapeHtml(entityId)}">${S.escapeHtml(latest)}</span>
          <small>${S.escapeHtml(this._entityName(entityId))}</small>
          <div class="recorder-link"><span>${S.icon("mdi:chart-timeline-variant-shimmer")} Home Assistant Recorder</span><strong>Open run chart ${S.icon("mdi:arrow-top-right")}</strong></div>
        </article>
      `;
    },

    _renderDetail() {
      const run = this._selectedRun();
      if (!run) {
        return `
          <section class="detail empty-detail">
            <div class="plant-mark">${S.icon("mdi:leaf")}</div>
            <h2>PlantRun</h2>
            <p>Create a run to start tracking phases, notes, and sensor history.</p>
          </section>
        `;
      }
      const days = S.daysBetween(run.planted_date || run.start_time, run.end_time || new Date());
      const target = this._targetDaysForRun(run);
      const bindings = Array.isArray(run.bindings) ? run.bindings : [];
      const phases = Array.isArray(run.phases) ? run.phases : [];
      const notes = Array.isArray(run.notes) ? run.notes : [];
      return `
        <section class="detail">
          <div class="hero ${S.stageKey(run)}${run.image_url ? " has-image" : ""}" ${this._heroMediaStyle(run)}>
            <div class="hero-copy">
              <span class="eyebrow">${S.escapeHtml(run.status || "active")} · day ${days}</span>
              <h1>${S.escapeHtml(run.friendly_name || "Unnamed run")}</h1>
              <p>${S.escapeHtml(run.cultivar?.name || "Cultivar not set")}${run.cultivar?.breeder ? ` by ${S.escapeHtml(run.cultivar.breeder)}` : ""}</p>
            </div>
            <div class="hero-actions">
              <button class="ghost" data-action="refresh" type="button">${S.icon("mdi:refresh")} Refresh</button>
              <button class="ghost" data-action="edit-run" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:pencil")} Edit</button>
              <button class="primary" data-action="open-binding" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:link-variant-plus")} Bind sensor</button>
              ${run.status === "ended" ? "" : `<button class="ghost finish-action" data-action="open-end-run" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:check-circle-outline")} Finish run</button>`}
            </div>
            <div class="stage-glyph">${S.icon(S.stageKey(run) === "flower" ? "mdi:flower" : S.stageKey(run) === "veg" ? "mdi:leaf" : "mdi:sprout")}</div>
          </div>

          <div class="stat-grid">
            <div><span>Target</span><strong>${target} days</strong></div>
            <div><span>Progress</span><strong>${this._progress(run)}%</strong></div>
            <div><span>Started</span><strong>${S.escapeHtml(S.formatDate(run.planted_date || run.start_time))}</strong></div>
            <div><span>Yield</span><strong>${run.dry_yield_grams ?? "—"} g</strong></div>
          </div>

          <div class="content-grid">
            <section class="panel-block">
              <div class="block-head">
                <div><span class="eyebrow">Sensors</span><h2>Live bindings</h2></div>
                <button class="icon-button" data-action="open-binding" data-run-id="${S.escapeHtml(run.id)}" type="button" title="Add binding">${S.icon("mdi:plus")}</button>
              </div>
              <p class="hint">Tap a metric to open its Home Assistant Recorder chart for exactly this run. Sensor history stays in Home Assistant.</p>
              <div class="sensor-grid">
                ${bindings.length ? bindings.map((binding) => this._renderSensorTile(run, binding)).join("") : `<div class="empty-inline">No sensor bindings yet.</div>`}
              </div>
            </section>

            <section class="panel-block">
              <div class="block-head">
                <div><span class="eyebrow">Phase timeline</span><h2>Phase</h2></div>
              </div>
              <div class="phase-stepper" role="list">
                ${CANONICAL_STAGES.map((stage, index) => {
                  const currentPhaseName = String(phases.at(-1)?.name || "seedling").toLowerCase();
                  const normalizedCurrentPhase = currentPhaseName === "harvest" ? "harvested" : currentPhaseName;
                  const currentIndex = Math.max(0, CANONICAL_STAGES.findIndex((item) => item.toLowerCase() === normalizedCurrentPhase));
                  const stateClass = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
                  const phase = phases.find((item) => String(item.name || "").toLowerCase() === stage.toLowerCase());
                  return `<button class="phase-step ${stateClass}" data-action="select-phase" data-run-id="${S.escapeHtml(run.id)}" data-phase="${S.escapeHtml(stage)}" type="button"><span>${index + 1}</span><div><strong>${S.escapeHtml(stage)}</strong><small>${S.escapeHtml(phase?.start_time ? S.formatDate(phase.start_time) : index < currentIndex ? "Completed" : index === currentIndex ? "Current phase" : "Not started")}</small></div></button>`;
                }).join("")}
              </div>
              <div class="custom-phase-control">
                <label><span>Custom phase</span><input data-custom-phase value="${S.escapeHtml(this._customPhaseDraft)}" placeholder="e.g. Drying, Flush or Week 4" autocomplete="off" /></label>
                <button class="ghost" data-action="add-custom-phase" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:plus")} Add phase</button>
              </div>
              <p class="hint">Use a quick stage above or add your own phase. Every change is appended to the run timeline.</p>
            </section>

            <section class="panel-block notes-block">
              <div class="block-head">
                <div><span class="eyebrow">Notes</span><h2>Grow log</h2></div>
                <button class="icon-button animated" data-action="add-note" data-run-id="${S.escapeHtml(run.id)}" type="button" title="New note">${S.icon("mdi:plus")}</button>
              </div>
              <div class="note-list">
                ${notes
                  .slice()
                  .reverse()
                  .map((note) => `
                    <article class="note">
                      <div class="note-copy">
                        <p>${S.escapeHtml(note.text)}</p>
                        <small>${S.escapeHtml(S.formatDateTime(note.timestamp))}</small>
                      </div>
                      <div class="note-actions">
                        <button class="icon-button" data-action="edit-note" data-note-id="${S.escapeHtml(note.id)}" type="button" title="Edit note">${S.icon("mdi:pencil")}</button>
                        <button class="icon-button danger" data-action="confirm-delete-note" data-note-id="${S.escapeHtml(note.id)}" type="button" title="Delete note">${S.icon("mdi:trash-can-outline")}</button>
                      </div>
                    </article>`)
                  .join("") || `<div class="empty-inline">No notes yet. Tap + to add the first one.</div>`}
              </div>
            </section>
          </div>
        </section>
      `;
    }
  };
}

