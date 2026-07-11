import { CANONICAL_STAGES } from "./plantrun-panel-domain.js?v=0.4.1";

const stageIcon = (stage) => {
  const value = String(stage || "").toLowerCase();
  if (value.includes("flower")) return "mdi:flower";
  if (value.includes("dry")) return "mdi:weather-windy";
  if (value.includes("cur")) return "mdi:archive-outline";
  if (value.includes("harvest")) return "mdi:basket-outline";
  if (value.includes("veg")) return "mdi:leaf";
  return "mdi:sprout";
};

export function createPanelViewMethods(S) {
  return {
    _phasePlan(run) {
      const configured = run?.base_config?.phase_plan;
      return Array.isArray(configured) && configured.length ? configured : CANONICAL_STAGES;
    },

    _plants(run) {
      const plants = run?.base_config?.plants;
      return Array.isArray(plants) ? plants.filter(Boolean) : [];
    },

    _renderRunList() {
      const runs = this._filteredRuns();
      if (this._loading) return `<div class="empty-panel">${S.icon("mdi:loading")}<strong>Opening your garden…</strong></div>`;
      if (this._error) return `<div class="empty-panel error">${S.escapeHtml(this._error)}</div>`;
      if (!runs.length) {
        return `<div class="empty-panel"><div class="plant-mark">${S.icon("mdi:sprout")}</div><strong>No ${this._filter === "all" ? "" : this._filter} runs yet</strong><span>Your first cultivation journal starts with only a name and date.</span><button class="primary" data-action="open-wizard" type="button">${S.icon("mdi:plus")} Start a run</button></div>`;
      }
      return `<div class="run-gallery">${runs.map((run) => {
        const progress = this._progress(run);
        const days = S.daysBetween(run.planted_date || run.start_time, run.end_time || new Date());
        const current = run.phases?.at?.(-1)?.name || "Seedling";
        const plants = this._plants(run);
        return `<button class="run-card ${S.stageKey(run)}${run.image_url ? " has-image" : ""}" ${this._heroMediaStyle(run)} data-action="select-run" data-run-id="${S.escapeHtml(run.id)}" type="button">
          <span class="run-art" aria-hidden="true">${S.icon(stageIcon(current))}</span>
          <span class="run-card-top"><span class="phase-pill">${S.icon(stageIcon(current))} ${S.escapeHtml(current)}</span><span class="ring" style="--progress:${progress}">${progress}%</span></span>
          <span class="run-card-copy"><small>Day ${days}${plants.length ? ` · ${plants.length} ${plants.length === 1 ? "plant" : "plants"}` : ""}</small><strong>${S.escapeHtml(run.friendly_name || "Unnamed run")}</strong><span>${S.escapeHtml(run.cultivar?.name || "Cultivar not set")}</span></span>
          <span class="run-card-foot"><span>${S.escapeHtml(plants.slice(0, 2).join(" · ") || "Open workspace")}</span>${S.icon("mdi:arrow-right")}</span>
        </button>`;
      }).join("")}</div>`;
    },

    _renderOverview() {
      const active = this._runs.filter((run) => run.status !== "ended");
      const ended = this._runs.filter((run) => run.status === "ended");
      const current = active[0];
      return `<section class="overview-screen">
        <div class="welcome-row">
          <div><span class="eyebrow">Cultivation journal</span><h1>${active.length ? "Your garden is growing." : "Make the whole run visible."}</h1><p>${active.length ? `${active.length} active ${active.length === 1 ? "run" : "runs"}, kept calm and easy to scan.` : "Track phases, plants, notes and Home Assistant sensor history in one quiet workspace."}</p></div>
          <button class="primary large" data-action="open-wizard" type="button">${S.icon("mdi:plus")} New run</button>
        </div>
        <div class="overview-strip">
          <div class="overview-stat"><span>Active runs</span><strong>${active.length}</strong><small>${active.length ? "Growing now" : "Ready when you are"}</small></div>
          <div class="overview-stat accent"><span>Current phase</span><strong>${S.escapeHtml(current?.phases?.at?.(-1)?.name || "—")}</strong><small>${current ? S.escapeHtml(current.friendly_name) : "No active run"}</small></div>
          <div class="overview-stat"><span>Journal entries</span><strong>${this._runs.reduce((sum, run) => sum + (run.notes?.length || 0), 0)}</strong><small>Across every run</small></div>
          <div class="overview-stat"><span>Completed</span><strong>${ended.length}</strong><small>In your archive</small></div>
        </div>
        <div class="section-heading"><div><span class="eyebrow">My plants</span><h2>${this._filter === "ended" ? "Completed runs" : this._filter === "all" ? "All runs" : "Active runs"}</h2></div><div class="segmented">${["active", "ended", "all"].map((filter) => `<button class="${this._filter === filter ? "active" : ""}" data-action="filter" data-filter="${filter}" type="button">${filter === "ended" ? "Archive" : filter}</button>`).join("")}</div></div>
        ${this._renderRunList()}
      </section>`;
    },

    _renderSensorTile(run, binding) {
      const entityId = binding.sensor_id;
      return `<article class="sensor-tile" data-sensor-tile data-run-id="${S.escapeHtml(run.id)}" data-entity-id="${S.escapeHtml(entityId)}" data-binding-id="${S.escapeHtml(binding.id || "")}">
        <div class="sensor-head"><span class="metric-badge">${S.icon(this._metricIcon(binding.metric_type))}</span><span class="live-dot">Live</span><div class="sensor-actions"><button class="icon-button" data-action="edit-binding" data-run-id="${S.escapeHtml(run.id)}" data-binding-id="${S.escapeHtml(binding.id)}" type="button" title="Edit binding">${S.icon("mdi:pencil")}</button><button class="icon-button danger" data-action="remove-binding" data-run-id="${S.escapeHtml(run.id)}" data-binding-id="${S.escapeHtml(binding.id)}" type="button" title="Remove binding">${S.icon("mdi:trash-can-outline")}</button></div></div>
        <small>${S.escapeHtml(this._metricLabel(binding.metric_type))}</small><span class="sensor-state" data-live-entity="${S.escapeHtml(entityId)}">${S.escapeHtml(this._entityState(entityId))}</span><strong>${S.escapeHtml(this._entityName(entityId))}</strong>
        <div class="mini-curve" aria-hidden="true"><svg viewBox="0 0 160 42" preserveAspectRatio="none"><path d="M0 34 C25 29, 35 35, 58 25 S92 27, 112 15 S142 18,160 5"/><path class="fill" d="M0 34 C25 29, 35 35, 58 25 S92 27, 112 15 S142 18,160 5 V42 H0Z"/></svg></div>
        <div class="recorder-link"><span>${S.icon("mdi:database-clock-outline")} Home Assistant Recorder</span><strong>Open run chart ${S.icon("mdi:arrow-top-right")}</strong></div>
      </article>`;
    },

    _renderPhaseRail(run) {
      const phases = Array.isArray(run.phases) ? run.phases : [];
      const plan = this._phasePlan(run);
      const currentName = String(phases.at(-1)?.name || plan[0] || "Seedling");
      let currentIndex = plan.findIndex((stage) => String(stage).toLowerCase() === currentName.toLowerCase());
      if (currentIndex < 0) currentIndex = Math.max(0, plan.length - 1);
      return `<div class="phase-rail" role="list">${plan.map((stage, index) => {
        const phase = phases.find((item) => String(item.name).toLowerCase() === String(stage).toLowerCase());
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        return `<button class="phase-step ${state}" data-action="select-phase" data-run-id="${S.escapeHtml(run.id)}" data-phase="${S.escapeHtml(stage)}" type="button"><span class="phase-node">${state === "done" ? S.icon("mdi:check") : S.icon(stageIcon(stage))}</span><strong>${S.escapeHtml(stage)}</strong><small>${phase?.start_time ? S.formatDate(phase.start_time) : state === "current" ? "Current" : "Next"}</small></button>`;
      }).join("")}</div>`;
    },

    _renderDetail() {
      const run = this._runs.find((item) => item.id === this._selectedRunId) || this._selectedRun();
      if (!run) return `<section class="empty-detail"><div class="plant-mark">${S.icon("mdi:leaf")}</div><h2>PlantRun</h2><p>Create a run to start tracking phases, notes, and sensor history.</p></section>`;
      const days = S.daysBetween(run.planted_date || run.start_time, run.end_time || new Date());
      const bindings = Array.isArray(run.bindings) ? run.bindings : [];
      const notes = Array.isArray(run.notes) ? run.notes : [];
      const plants = this._plants(run);
      const current = run.phases?.at?.(-1)?.name || "Seedling";
      return `<section class="workspace-screen">
        <button class="back-link" data-action="show-overview" type="button">${S.icon("mdi:arrow-left")} All runs</button>
        <div class="workspace-hero ${S.stageKey(run)}${run.image_url ? " has-image" : ""}" ${this._heroMediaStyle(run)}>
          <div class="hero-copy"><span class="phase-pill">${S.icon(stageIcon(current))} ${S.escapeHtml(current)}</span><h1>${S.escapeHtml(run.friendly_name || "Unnamed run")}</h1><p>${S.escapeHtml(run.cultivar?.name || "Cultivar not set")}${run.cultivar?.breeder ? ` · ${S.escapeHtml(run.cultivar.breeder)}` : ""}</p><div class="plant-chips">${(plants.length ? plants : ["Plants not named"]).map((plant) => `<span>${S.icon("mdi:flower-tulip-outline")} ${S.escapeHtml(plant)}</span>`).join("")}</div></div>
          <div class="hero-progress"><span class="progress-orbit" style="--progress:${this._progress(run)}"><strong>${this._progress(run)}%</strong><small>Day ${days} of ${this._targetDaysForRun(run)}</small></span></div>
          <div class="hero-actions"><button class="ghost" data-action="edit-run" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:tune-variant")} Customize</button><button class="icon-button" data-action="refresh" type="button" title="Refresh">${S.icon("mdi:refresh")}</button>${run.status === "ended" ? "" : `<button class="ghost finish-action" data-action="open-end-run" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:check-circle-outline")} Finish</button>`}</div>
          <span class="stage-glyph" aria-hidden="true">${S.icon(stageIcon(current))}</span>
        </div>
        <section class="phase-band"><div class="block-head"><div><span class="eyebrow">Lifecycle</span><h2>Phase</h2></div><span class="subtle-copy">Every change becomes part of the permanent timeline.</span></div>${this._renderPhaseRail(run)}<div class="custom-phase-control"><label><span>Advance to a custom phase</span><input data-custom-phase value="${S.escapeHtml(this._customPhaseDraft)}" placeholder="Drying, Flush, Week 4…" autocomplete="off" /></label><button class="ghost" data-action="add-custom-phase" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:arrow-right")} Advance</button></div></section>
        <div class="workspace-grid">
          <section class="intelligence-block"><div class="block-head"><div><span class="eyebrow">Live intelligence</span><h2>Climate & substrate</h2></div><button class="ghost" data-action="open-binding" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:link-variant-plus")} Bind sensor</button></div><p class="hint">Tap a metric to open its Home Assistant Recorder chart for exactly this run. Sensor history stays in Home Assistant.</p><div class="sensor-grid">${bindings.length ? bindings.map((binding) => this._renderSensorTile(run, binding)).join("") : `<div class="empty-inline">${S.icon("mdi:access-point")}<strong>No live sensors yet</strong><span>Connect temperature, moisture, light, energy or another compatible sensor.</span></div>`}</div></section>
          <section class="journal-block"><div class="block-head"><div><span class="eyebrow">Journal</span><h2>Notes & moments</h2></div><button class="primary compact-button" data-action="add-note" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:plus")} Add</button></div><div class="note-list">${notes.slice().reverse().map((note) => `<article class="note"><span class="note-marker"></span><div class="note-copy"><small>${S.escapeHtml(S.formatDateTime(note.timestamp))}</small><p>${S.escapeHtml(note.text)}</p></div><div class="note-actions"><button class="icon-button" data-action="edit-note" data-note-id="${S.escapeHtml(note.id)}" type="button" title="Edit note">${S.icon("mdi:pencil")}</button><button class="icon-button danger" data-action="confirm-delete-note" data-note-id="${S.escapeHtml(note.id)}" type="button" title="Delete note">${S.icon("mdi:trash-can-outline")}</button></div></article>`).join("") || `<div class="empty-inline">No notes yet. Add the first observation.</div>`}</div></section>
        </div>
      </section>`;
    }
  };
}
