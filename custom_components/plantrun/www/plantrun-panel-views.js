import { CANONICAL_STAGES } from "./plantrun-panel-domain.js?v=0.5.0";

const stageIcon = (stage) => {
  const value = String(stage || "").toLowerCase();
  if (value.includes("flower")) return "mdi:flower";
  if (value.includes("dry")) return "mdi:weather-windy";
  if (value.includes("cur")) return "mdi:archive-outline";
  if (value.includes("harvest")) return "mdi:basket-outline";
  if (value.includes("veg")) return "mdi:leaf";
  return "mdi:sprout";
};

const dateOnly = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

export function createPanelViewMethods(S) {
  return {
    _phasePlan(run) {
      const configured = run?.base_config?.phase_plan;
      return Array.isArray(configured) && configured.length ? configured : CANONICAL_STAGES;
    },

    _plantObjects(run) {
      const plants = run?.base_config?.plants;
      if (!Array.isArray(plants)) return [];
      return plants
        .map((plant, index) => {
          if (typeof plant === "string") {
            const name = plant.trim();
            return name ? { id: `legacy-${index}`, name, last_watered: "" } : null;
          }
          if (!plant || typeof plant !== "object") return null;
          const name = String(plant.name || "").trim();
          return name ? { ...plant, id: String(plant.id || `legacy-${index}`), name } : null;
        })
        .filter(Boolean);
    },

    _plants(run) {
      return this._plantObjects(run).map((plant) => plant.name);
    },

    _wateringState(run, plant) {
      const interval = Math.max(1, Number(plant.watering_interval_days || run?.base_config?.watering_interval_days || 3));
      if (!plant.last_watered) {
        return { key: "setup", label: "Not logged yet", detail: "Log the first watering", daysLeft: null };
      }
      const elapsed = S.daysBetween(plant.last_watered, new Date());
      const daysLeft = interval - elapsed;
      if (daysLeft < 0) return { key: "attention", label: "Check today", detail: `${Math.abs(daysLeft)}d past schedule`, daysLeft };
      if (daysLeft === 0) return { key: "attention", label: "Due today", detail: "Watering scheduled", daysLeft };
      if (daysLeft === 1) return { key: "soon", label: "Tomorrow", detail: "Watering coming up", daysLeft };
      return { key: "good", label: "On schedule", detail: `Water in ${daysLeft} days`, daysLeft };
    },

    _runSignals(run) {
      const bindings = Array.isArray(run?.bindings) ? run.bindings : [];
      const unavailable = bindings.filter((binding) => !this._hass?.states?.[binding.sensor_id]);
      const progress = this._progress(run);
      const plants = this._plantObjects(run);
      const duePlants = plants.filter((plant) => this._wateringState(run, plant).key === "attention");
      if (run.status === "ended") return { key: "complete", label: "Completed", detail: run.end_time ? S.formatDate(run.end_time) : "Archived" };
      if (duePlants.length) return { key: "attention", label: "Needs attention", detail: `${duePlants.length} watering ${duePlants.length === 1 ? "check" : "checks"}` };
      if (unavailable.length) return { key: "attention", label: "Sensor offline", detail: `${unavailable.length} unavailable` };
      if (progress >= 100) return { key: "soon", label: "Review cycle", detail: "Expected duration reached" };
      if (!bindings.length) return { key: "setup", label: "Setup", detail: "No sensors linked" };
      return { key: "good", label: "On track", detail: "No action due" };
    },

    _attentionItems() {
      return this._runs
        .filter((run) => run.status !== "ended")
        .map((run) => ({ run, signal: this._runSignals(run) }))
        .filter(({ signal }) => signal.key === "attention" || signal.key === "soon");
    },

    _renderAttention() {
      if (!this._layout.show_attention) return "";
      const items = this._attentionItems();
      return `<section class="focus-section">
        <div class="section-heading compact-heading"><div><span class="eyebrow">Today</span><h2>${items.length ? "Worth a look" : "Everything is calm"}</h2></div><span class="section-caption">Only useful signals, never decorative alerts.</span></div>
        ${items.length ? `<div class="attention-row">${items.map(({ run, signal }) => `<button class="attention-card ${signal.key}" data-action="select-run" data-run-id="${S.escapeHtml(run.id)}" type="button"><span class="signal-icon">${S.icon(signal.key === "attention" ? "mdi:water-alert-outline" : "mdi:calendar-clock-outline")}</span><span><strong>${S.escapeHtml(run.friendly_name)}</strong><small>${S.escapeHtml(signal.detail)}</small></span>${S.icon("mdi:arrow-right")}</button>`).join("")}</div>` : `<div class="calm-banner"><span>${S.icon("mdi:check-circle-outline")}</span><div><strong>No urgent items</strong><small>PlantRun will surface overdue watering, offline sensors and runs that reached their expected duration.</small></div></div>`}
      </section>`;
    },

    _renderRunList() {
      const runs = this._filteredRuns();
      if (this._loading) return `<div class="empty-panel">${S.icon("mdi:loading")}<strong>Opening your garden…</strong></div>`;
      if (this._error) return `<div class="empty-panel error">${S.escapeHtml(this._error)}</div>`;
      if (!runs.length) return `<div class="empty-panel"><div class="plant-mark">${S.icon("mdi:sprout")}</div><strong>No runs here yet</strong><span>Your first cultivation journal starts with only a name and date.</span><button class="primary" data-action="open-wizard" type="button">${S.icon("mdi:plus")} Start a run</button></div>`;
      return `<div class="run-gallery layout-${S.escapeHtml(this._layout.card_layout)}">${runs.map((run) => {
        const progress = this._progress(run);
        const days = S.daysBetween(run.planted_date || run.start_time, run.end_time || new Date());
        const current = run.phases?.at?.(-1)?.name || "Seedling";
        const plants = this._plantObjects(run);
        const signal = this._runSignals(run);
        return `<button class="run-card ${S.stageKey(run)}${run.image_url ? " has-image" : ""}" ${this._heroMediaStyle(run)} data-action="select-run" data-run-id="${S.escapeHtml(run.id)}" type="button">
          <span class="run-image"><span class="run-art" aria-hidden="true">${S.icon(stageIcon(current))}</span><span class="phase-pill">${S.icon(stageIcon(current))} ${S.escapeHtml(current)}</span><span class="ring" style="--progress:${progress}">${progress}%</span></span>
          <span class="run-card-copy"><span class="status-line ${signal.key}"><i></i>${S.escapeHtml(signal.label)}</span><strong>${S.escapeHtml(run.friendly_name || "Unnamed run")}</strong><span>${S.escapeHtml(run.cultivar?.name || "Cultivar not set")}</span><small>Day ${days} · ${plants.length || "No"} ${plants.length === 1 ? "plant" : "plants"}</small></span>
          <span class="run-card-foot"><span>${S.escapeHtml(signal.detail)}</span>${S.icon("mdi:arrow-right")}</span>
        </button>`;
      }).join("")}</div>`;
    },

    _renderPlantCards() {
      if (!this._layout.show_plants || this._filter === "ended") return "";
      const entries = this._runs.filter((run) => run.status !== "ended").flatMap((run) => this._plantObjects(run).map((plant) => ({ run, plant })));
      if (!entries.length) return "";
      return `<section class="plant-section"><div class="section-heading compact-heading"><div><span class="eyebrow">Plants</span><h2>Care at a glance</h2></div><span class="section-caption">Watering is a journal entry, not a guessed health score.</span></div><div class="plant-grid">${entries.map(({ run, plant }) => {
        const state = this._wateringState(run, plant);
        return `<article class="plant-card ${state.key}"><button class="plant-open" data-action="select-run" data-run-id="${S.escapeHtml(run.id)}" type="button"><span class="plant-avatar" ${this._heroMediaStyle(run)}>${run.image_url ? "" : S.icon("mdi:flower-tulip-outline")}</span><span class="plant-copy"><small>${S.escapeHtml(run.friendly_name)}</small><strong>${S.escapeHtml(plant.name)}</strong><span>${S.escapeHtml(state.detail)}</span></span></button><button class="water-action" data-action="water-plant" data-run-id="${S.escapeHtml(run.id)}" data-plant-id="${S.escapeHtml(plant.id)}" type="button" title="Log watering for ${S.escapeHtml(plant.name)}">${S.icon("mdi:watering-can-outline")} <span>Watered</span></button></article>`;
      }).join("")}</div></section>`;
    },

    _renderOverview() {
      const active = this._runs.filter((run) => run.status !== "ended");
      return `<section class="overview-screen">
        <div class="welcome-row"><div><span class="eyebrow">Cultivation companion</span><h1>${active.length ? "Good evening. Your garden is ready." : "Start a calmer grow journal."}</h1><p>${active.length ? `${active.length} active ${active.length === 1 ? "run" : "runs"}. PlantRun keeps care, phases and Recorder context together.` : "Create a run, name your plants and connect the sensors you already own in Home Assistant."}</p></div><button class="primary large" data-action="open-wizard" type="button">${S.icon("mdi:plus")} New run</button></div>
        ${this._renderAttention()}
        ${this._renderPlantCards()}
        <section class="runs-section"><div class="section-heading"><div><span class="eyebrow">Runs</span><h2>${this._filter === "ended" ? "Completed" : this._filter === "all" ? "All journals" : "In progress"}</h2></div><div class="segmented" aria-label="Filter runs">${["active", "ended", "all"].map((filter) => `<button class="${this._filter === filter ? "active" : ""}" data-action="filter" data-filter="${filter}" type="button">${filter === "ended" ? "Archive" : filter}</button>`).join("")}</div></div>${this._renderRunList()}</section>
      </section>`;
    },

    _renderSensorTile(run, binding) {
      const entityId = binding.sensor_id;
      const available = !!this._hass?.states?.[entityId];
      return `<article class="sensor-tile ${available ? "available" : "unavailable"}" data-sensor-tile data-run-id="${S.escapeHtml(run.id)}" data-entity-id="${S.escapeHtml(entityId)}" data-binding-id="${S.escapeHtml(binding.id || "")}" tabindex="0" role="button" aria-label="Open ${S.escapeHtml(this._metricLabel(binding.metric_type))} history">
        <div class="sensor-head"><span class="metric-badge">${S.icon(this._metricIcon(binding.metric_type))}</span><span class="live-dot">${available ? "Live" : "Unavailable"}</span>${run.status === "ended" ? "" : `<div class="sensor-actions"><button class="icon-button" data-action="edit-binding" data-run-id="${S.escapeHtml(run.id)}" data-binding-id="${S.escapeHtml(binding.id)}" type="button" title="Edit binding">${S.icon("mdi:pencil")}</button><button class="icon-button danger" data-action="remove-binding" data-run-id="${S.escapeHtml(run.id)}" data-binding-id="${S.escapeHtml(binding.id)}" type="button" title="Remove binding">${S.icon("mdi:trash-can-outline")}</button></div>`}</div>
        <small>${S.escapeHtml(this._metricLabel(binding.metric_type))}</small><span class="sensor-state" data-live-entity="${S.escapeHtml(entityId)}">${S.escapeHtml(this._entityState(entityId))}</span><strong>${S.escapeHtml(this._entityName(entityId))}</strong>
        <div class="recorder-link"><span>${S.icon("mdi:database-clock-outline")} Recorder history</span><strong>Run window ${S.icon("mdi:arrow-top-right")}</strong></div>
      </article>`;
    },

    _renderPhaseRail(run) {
      const phases = Array.isArray(run.phases) ? run.phases : [];
      const plan = [...this._phasePlan(run)];
      const currentName = String(phases.at(-1)?.name || plan[0] || "Seedling");
      if (!plan.some((stage) => String(stage).toLowerCase() === currentName.toLowerCase())) plan.push(currentName);
      const currentIndex = Math.max(0, plan.findIndex((stage) => String(stage).toLowerCase() === currentName.toLowerCase()));
      return `<div class="phase-rail" role="list">${plan.map((stage, index) => {
        const phase = [...phases].reverse().find((item) => String(item.name).toLowerCase() === String(stage).toLowerCase());
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        const canChange = run.status !== "ended";
        return `<button class="phase-step ${state}" ${canChange ? `data-action="select-phase" data-run-id="${S.escapeHtml(run.id)}" data-phase="${S.escapeHtml(stage)}"` : "disabled"} type="button"><span class="phase-node">${state === "done" ? S.icon("mdi:check") : S.icon(stageIcon(stage))}</span><strong>${S.escapeHtml(stage)}</strong><small>${phase?.start_time ? S.formatDate(phase.start_time) : state === "current" ? "Current" : "Next"}</small></button>`;
      }).join("")}</div>`;
    },

    _renderCompletedSummary(run, days, plants) {
      return `<section class="completion-card"><span class="completion-mark">${S.icon("mdi:check-decagram-outline")}</span><div><span class="eyebrow">Run complete</span><h2>${days} days, fully documented.</h2><p>${S.escapeHtml(run.notes_summary || "This run is archived read-only. Use Correct archive only when stored details need a correction.")}</p><div class="completion-facts"><span><small>Plants</small><strong>${plants.length}</strong></span><span><small>Dry yield</small><strong>${run.dry_yield_grams == null ? "—" : `${run.dry_yield_grams} g`}</strong></span><span><small>Notes</small><strong>${run.notes?.length || 0}</strong></span></div></div><button class="ghost" data-action="edit-run" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:pencil-outline")} Correct archive</button></section>`;
    },

    _renderWorkspaceNav(run) {
      const tabs = [["overview", "Overview", "mdi:sprout-outline"], ["climate", "Climate", "mdi:thermometer"], ["journal", "Journal", "mdi:notebook-outline"]];
      return `<nav class="workspace-nav" aria-label="Run sections">${tabs.map(([key, label, icon]) => `<button class="${this._workspaceTab === key ? "active" : ""}" data-action="workspace-tab" data-tab="${key}" type="button">${S.icon(icon)} ${label}</button>`).join("")}</nav>`;
    },

    _renderWorkspaceOverview(run, bindings, notes, plants) {
      const current = run.phases?.at?.(-1)?.name || "Seedling";
      return `<section class="workspace-content"><section class="phase-band"><div class="block-head"><div><span class="eyebrow">Lifecycle</span><h2>${S.escapeHtml(current)}</h2></div><span class="subtle-copy">Every change becomes part of the permanent timeline.</span></div>${this._renderPhaseRail(run)}${run.status === "ended" ? "" : `<div class="custom-phase-control"><label><span>Advance to a custom phase</span><input data-custom-phase value="${S.escapeHtml(this._customPhaseDraft)}" placeholder="Drying, Flush, Week 4…" autocomplete="off" /></label><button class="ghost" data-action="add-custom-phase" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:arrow-right")} Advance</button></div>`}</section><div class="overview-columns"><section class="quiet-card"><span class="eyebrow">Plants</span><h2>${plants.length ? plants.map((plant) => S.escapeHtml(plant.name)).join(" · ") : "No plants named"}</h2><p>${bindings.length} linked ${bindings.length === 1 ? "sensor" : "sensors"} · ${notes.length} journal ${notes.length === 1 ? "entry" : "entries"}</p></section><section class="quiet-card"><span class="eyebrow">Next step</span><h2>${S.escapeHtml(this._runSignals(run).label)}</h2><p>${S.escapeHtml(this._runSignals(run).detail)}</p></section></div></section>`;
    },

    _renderWorkspaceClimate(run, bindings) {
      return `<section class="intelligence-block"><div class="block-head"><div><span class="eyebrow">Live from Home Assistant</span><h2>Climate & substrate</h2></div>${run.status === "ended" ? "" : `<button class="ghost" data-action="open-binding" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:link-variant-plus")} Bind sensor</button>`}</div><p class="hint">Values are live. Selecting a metric opens Recorder for exactly this run window; PlantRun does not draw invented trend lines.</p><div class="sensor-grid">${bindings.length ? bindings.map((binding) => this._renderSensorTile(run, binding)).join("") : `<div class="empty-inline">${S.icon("mdi:access-point")}<strong>No sensors linked</strong><span>Connect temperature, moisture, light, energy or another compatible sensor.</span></div>`}</div></section>`;
    },

    _renderWorkspaceJournal(run, notes) {
      return `<section class="journal-block"><div class="block-head"><div><span class="eyebrow">Journal</span><h2>Notes & moments</h2></div>${run.status === "ended" ? "" : `<button class="primary compact-button" data-action="add-note" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:plus")} Add note</button>`}</div><div class="note-list">${notes.slice().reverse().map((note) => `<article class="note"><span class="note-marker"></span><div class="note-copy"><small>${S.escapeHtml(S.formatDateTime(note.timestamp))}</small><p>${S.escapeHtml(note.text)}</p></div>${run.status === "ended" ? "" : `<div class="note-actions"><button class="icon-button" data-action="edit-note" data-note-id="${S.escapeHtml(note.id)}" type="button" title="Edit note">${S.icon("mdi:pencil")}</button><button class="icon-button danger" data-action="confirm-delete-note" data-note-id="${S.escapeHtml(note.id)}" type="button" title="Delete note">${S.icon("mdi:trash-can-outline")}</button></div>`}</article>`).join("") || `<div class="empty-inline">No notes yet. Add the first observation.</div>`}</div></section>`;
    },

    _renderDetail() {
      const run = this._runs.find((item) => item.id === this._selectedRunId) || this._selectedRun();
      if (!run) return `<section class="empty-detail"><div class="plant-mark">${S.icon("mdi:leaf")}</div><h2>PlantRun</h2><p>Create a run to start tracking phases, notes, and sensor history.</p></section>`;
      const days = S.daysBetween(run.planted_date || run.start_time, run.end_time || new Date());
      const bindings = Array.isArray(run.bindings) ? run.bindings : [];
      const notes = Array.isArray(run.notes) ? run.notes : [];
      const plants = this._plantObjects(run);
      const current = run.phases?.at?.(-1)?.name || "Seedling";
      const progress = this._progress(run);
      return `<section class="workspace-screen"><button class="back-link" data-action="show-overview" type="button">${S.icon("mdi:arrow-left")} Garden</button><div class="workspace-hero ${S.stageKey(run)}${run.image_url ? " has-image" : ""}" ${this._heroMediaStyle(run)}><div class="hero-copy"><span class="phase-pill">${S.icon(stageIcon(current))} ${S.escapeHtml(current)}</span><h1>${S.escapeHtml(run.friendly_name || "Unnamed run")}</h1><p>${S.escapeHtml(run.cultivar?.name || "Cultivar not set")}${run.cultivar?.breeder ? ` · ${S.escapeHtml(run.cultivar.breeder)}` : ""}</p><div class="plant-chips">${(plants.length ? plants : [{ name: "Plants not named" }]).map((plant) => `<span>${S.icon("mdi:flower-tulip-outline")} ${S.escapeHtml(plant.name)}</span>`).join("")}</div></div><div class="hero-progress"><span class="progress-orbit" style="--progress:${progress}"><strong>${progress}%</strong><small>Day ${days} of ${this._targetDaysForRun(run)}</small></span></div><div class="hero-actions">${run.status === "ended" ? "" : `<button class="ghost" data-action="edit-run" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:tune-variant")} Details</button><button class="ghost finish-action" data-action="open-end-run" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:check-circle-outline")} Finish</button>`}</div></div>${run.status === "ended" ? this._renderCompletedSummary(run, days, plants) : ""}${this._renderWorkspaceNav(run)}${this._workspaceTab === "climate" ? this._renderWorkspaceClimate(run, bindings) : this._workspaceTab === "journal" ? this._renderWorkspaceJournal(run, notes) : this._renderWorkspaceOverview(run, bindings, notes, plants)}</section>`;
    },

    _renderPersonalizeModal() {
      if (!this._personalizeOpen) return "";
      const options = [["show_attention", "Today signals", "Overdue watering, sensors and cycle timing"], ["show_plants", "Plant care", "Quick watering actions per plant"]];
      return `<div class="overlay" role="dialog" aria-modal="true" aria-label="Personalize PlantRun"><button class="overlay-backdrop" data-action="close-personalize" type="button" aria-label="Close personalization"></button><section class="modal personalize-modal" data-modal-card><header><div><span class="eyebrow">Your view</span><h2>Make PlantRun yours</h2></div><button class="icon-button" data-action="close-personalize" type="button" aria-label="Close">${S.icon("mdi:close")}</button></header><div class="preference-group"><span class="field-title">Run cards</span><div class="layout-choice"><button class="${this._layout.card_layout === "grid" ? "active" : ""}" data-action="set-card-layout" data-layout="grid" type="button">${S.icon("mdi:view-grid-outline")} Grid</button><button class="${this._layout.card_layout === "list" ? "active" : ""}" data-action="set-card-layout" data-layout="list" type="button">${S.icon("mdi:view-list-outline")} List</button></div></div><div class="preference-list">${options.map(([key, title, copy]) => `<button data-action="toggle-layout-section" data-section="${key}" type="button"><span><strong>${title}</strong><small>${copy}</small></span><span class="toggle-visual ${this._layout[key] ? "on" : ""}" aria-label="${this._layout[key] ? "Shown" : "Hidden"}"><i></i></span></button>`).join("")}</div><footer><button class="primary" data-action="close-personalize" type="button">Done</button></footer></section></div>`;
    }
  };
}
