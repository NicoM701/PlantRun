(() => {
  const TAG = "plantrun-dashboard-panel";
  const DOMAIN = "plantrun";
  const METRICS = [
    ["temperature", "Temperature", "mdi:thermometer"],
    ["humidity", "Humidity", "mdi:water-percent"],
    ["soil_moisture", "Soil moisture", "mdi:sprout"],
    ["conductivity", "Conductivity", "mdi:flash-triangle"],
    ["light", "Light", "mdi:white-balance-sunny"],
    ["energy", "Energy", "mdi:lightning-bolt"],
    ["water", "Water", "mdi:water"],
  ];
  const STAGES = ["Seedling", "Vegetative", "Flowering", "Harvest"];
  const STORAGE = {
    theme: "plantrun.ui.theme",
    sound: "plantrun.ui.sound",
  };
  const THEME_QUERY = "(prefers-color-scheme: light)";

  if (customElements.get(TAG)) return;
  customElements.get("ha-panel-lovelace");

  const shared = () => {
    const existing = window.PlantRunShared || {};
    const escapeHtml =
      existing.escapeHtml ||
      ((value) =>
        String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;"));
    const formatDate = (value) => {
      if (!value) return "Not set";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    };
    const daysBetween = (start, end = new Date()) => {
      const date = new Date(start);
      if (Number.isNaN(date.getTime())) return 0;
      return Math.max(0, Math.floor((new Date(end).getTime() - date.getTime()) / 86400000));
    };
    const stageKey = (run) => {
      const phase = String(run?.phases?.at?.(-1)?.name || "seedling").toLowerCase();
      if (phase.includes("flower")) return "flower";
      if (phase.includes("veg")) return "veg";
      if (phase.includes("harvest")) return "harvest";
      return "seedling";
    };
    const icon = (name) => `<ha-icon icon="${escapeHtml(name)}"></ha-icon>`;
    window.PlantRunShared = { ...existing, escapeHtml, formatDate, daysBetween, stageKey, icon };
    return window.PlantRunShared;
  };
  const S = shared();

  class PlantRunDashboardPanel extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._runs = [];
      this._summaries = {};
      this._activeRunId = "";
      this._selectedRunId = "";
      this._filter = "active";
      this._loading = true;
      this._error = "";
      this._wizardOpen = false;
      this._wizardStep = 1;
      this._wizard = this._blankWizard();
      this._suggestions = [];
      this._searchNonce = 0;
      this._searchTimer = 0;
      this._bindingDraft = null;
      this._detailDraft = null;
      this._noteDraft = "";
      this._phaseDraft = "Vegetative";
      this._pressState = {};
      this._theme = localStorage.getItem(STORAGE.theme) || (window.matchMedia?.(THEME_QUERY).matches ? "light" : "dark");
      this._sound = localStorage.getItem(STORAGE.sound) === "on";
      this._audio = null;
      this._refreshing = false;
      this._didLoad = false;
      this._boundClick = (event) => this._handleClick(event);
      this._boundInput = (event) => this._handleInput(event);
      this._boundChange = (event) => this._handleChange(event);
      this._boundKeydown = (event) => this._handleKeydown(event);
      this._boundPointerDown = (event) => this._handlePointerDown(event);
      this._boundPointerUp = (event) => this._handlePointerUp(event);
      this._boundPointerCancel = (event) => this._handlePointerCancel(event);
    }

    set hass(value) {
      this._hass = value;
      if (!this._didLoad) {
        this._didLoad = true;
        this._refreshRuns();
      } else {
        this._refreshLiveSensorText();
      }
    }

    connectedCallback() {
      this.shadowRoot.addEventListener("click", this._boundClick);
      this.shadowRoot.addEventListener("input", this._boundInput);
      this.shadowRoot.addEventListener("change", this._boundChange);
      this.shadowRoot.addEventListener("keydown", this._boundKeydown);
      this.shadowRoot.addEventListener("pointerdown", this._boundPointerDown);
      this.shadowRoot.addEventListener("pointerup", this._boundPointerUp);
      this.shadowRoot.addEventListener("pointercancel", this._boundPointerCancel);
      this.render();
    }

    disconnectedCallback() {
      this.shadowRoot.removeEventListener("click", this._boundClick);
      this.shadowRoot.removeEventListener("input", this._boundInput);
      this.shadowRoot.removeEventListener("change", this._boundChange);
      this.shadowRoot.removeEventListener("keydown", this._boundKeydown);
      this.shadowRoot.removeEventListener("pointerdown", this._boundPointerDown);
      this.shadowRoot.removeEventListener("pointerup", this._boundPointerUp);
      this.shadowRoot.removeEventListener("pointercancel", this._boundPointerCancel);
      window.clearTimeout(this._searchTimer);
      Object.values(this._pressState).forEach((state) => window.clearTimeout(state.timer));
    }

    _blankWizard() {
      return {
        friendly_name: "",
        planted_date: new Date().toISOString().slice(0, 10),
        target_days: "",
        breeder: "",
        cultivar_name: "",
        selected_cultivar: null,
        bindings: [{ metric_type: "temperature", sensor_id: "" }],
      };
    }

    _resolvedTheme() {
      return this._theme === "light" ? "light" : "dark";
    }

    _derivedTargetDays(cultivar = this._wizard.selected_cultivar) {
      const flowerWindow = Number(cultivar?.flower_window_days);
      if (Number.isFinite(flowerWindow) && flowerWindow > 0) {
        return String(Math.round(flowerWindow + 35));
      }
      return "";
    }

    _focusWizardPrimaryField() {
      window.requestAnimationFrame(() => {
        this.shadowRoot.querySelector("[data-wizard-field=\"friendly_name\"]")?.focus();
      });
    }

    async _refreshRuns({ keepSelection = true } = {}) {
      if (!this._hass || this._refreshing) return;
      this._refreshing = true;
      this._loading = true;
      this._error = "";
      this.render();
      try {
        const payload = await this._hass.callWS({ type: "plantrun/get_runs" });
        this._runs = Array.isArray(payload?.runs) ? payload.runs : [];
        this._activeRunId = payload?.active_run_id || "";
        const ids = new Set(this._runs.map((run) => run.id));
        if (!keepSelection || !ids.has(this._selectedRunId)) {
          this._selectedRunId = this._activeRunId || this._runs[0]?.id || "";
        }
        await Promise.all(
          this._runs.map(async (run) => {
            try {
              this._summaries[run.id] = await this._hass.callWS({ type: "plantrun/get_run_summary", run_id: run.id });
            } catch (_err) {
              this._summaries[run.id] = {};
            }
          })
        );
      } catch (err) {
        this._error = err?.message || "PlantRun is not loaded yet.";
      } finally {
        this._loading = false;
        this._refreshing = false;
        this.render();
      }
    }

    _filteredRuns() {
      if (this._filter === "all") return this._runs;
      return this._runs.filter((run) => (this._filter === "ended" ? run.status === "ended" : run.status !== "ended"));
    }

    _selectedRun() {
      return this._runs.find((run) => run.id === this._selectedRunId) || this._runs[0] || null;
    }

    _sensorEntities() {
      const states = this._hass?.states || {};
      return Object.keys(states)
        .filter((entityId) => entityId.startsWith("sensor."))
        .sort((a, b) => this._entityName(a).localeCompare(this._entityName(b)));
    }

    _entityName(entityId) {
      const state = this._hass?.states?.[entityId];
      return state?.attributes?.friendly_name || entityId;
    }

    _entityState(entityId) {
      const state = this._hass?.states?.[entityId];
      if (!state) return "Unavailable";
      const unit = state.attributes?.unit_of_measurement || "";
      return `${state.state}${unit ? ` ${unit}` : ""}`;
    }

    _metricLabel(metricType) {
      return METRICS.find(([value]) => value === metricType)?.[1] || metricType;
    }

    _metricIcon(metricType) {
      return METRICS.find(([value]) => value === metricType)?.[2] || "mdi:chart-line";
    }

    _targetDaysForRun(run) {
      const fromConfig = Number(run?.base_config?.target_days || run?.base_config?.estimated_duration_days);
      if (Number.isFinite(fromConfig) && fromConfig > 0) return Math.round(fromConfig);
      const flowerWindow = Number(run?.cultivar?.flower_window_days);
      if (Number.isFinite(flowerWindow) && flowerWindow > 0) return Math.round(flowerWindow + 35);
      return 90;
    }

    _progress(run) {
      const days = S.daysBetween(run?.planted_date || run?.start_time);
      const target = this._targetDaysForRun(run);
      return Math.min(100, Math.round((days / Math.max(target, 1)) * 100));
    }

    _haEntityPicker(value, selectorName = "sensor_id") {
      const options = this._sensorEntities()
        .map(
          (entityId) =>
            `<option value="${S.escapeHtml(entityId)}" ${entityId === value ? "selected" : ""}>${S.escapeHtml(
              `${this._entityName(entityId)} (${entityId})`
            )}</option>`
        )
        .join("");
      return `
        <ha-selector
          class="ha-entity-selector"
          data-ha-selector="${S.escapeHtml(selectorName)}"
          data-value="${S.escapeHtml(value || "")}">
        </ha-selector>
        <select class="entity-fallback" data-select-fallback="${S.escapeHtml(selectorName)}">
          <option value="">Choose a Home Assistant sensor entity</option>
          ${options}
        </select>
      `;
    }

    _hydrateHaSelectors() {
      this.shadowRoot.querySelectorAll("ha-selector[data-ha-selector]").forEach((selector) => {
        const name = selector.dataset.haSelector;
        selector.hass = this._hass;
        selector.selector = { entity: { domain: "sensor" } };
        selector.value = selector.dataset.value || "";
        selector.addEventListener("value-changed", (event) => {
          this._setEntitySelectorValue(name, event.detail?.value || "");
        });
      });
    }

    _setEntitySelectorValue(name, value) {
      const fallback = this.shadowRoot.querySelector(`[data-select-fallback="${CSS.escape(name)}"]`);
      if (fallback) fallback.value = value;
      if (name.startsWith("wizard_binding_")) {
        const index = Number(name.replace("wizard_binding_", ""));
        const bindings = [...this._wizard.bindings];
        bindings[index] = { ...bindings[index], sensor_id: value };
        this._wizard.bindings = bindings;
      } else if (this._bindingDraft) {
        this._bindingDraft = { ...this._bindingDraft, sensor_id: value };
      }
    }

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
      return runs
        .map((run) => {
          const selected = run.id === this._selectedRunId;
          const progress = this._progress(run);
          const days = S.daysBetween(run.planted_date || run.start_time);
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
    }

    _renderSensorTile(run, binding) {
      const entityId = binding.sensor_id;
      const history = Array.isArray(run.sensor_history?.[binding.metric_type]) ? run.sensor_history[binding.metric_type] : [];
      const latest = this._entityState(entityId);
      const points = history.slice(-14);
      const max = Math.max(...points.map((point) => Number(point.value)).filter(Number.isFinite), 1);
      const bars = points
        .map((point) => {
          const value = Number(point.value);
          const height = Number.isFinite(value) ? Math.max(10, Math.round((value / max) * 48)) : 10;
          return `<span style="height:${height}px"></span>`;
        })
        .join("");
      return `
        <article class="sensor-tile" data-sensor-tile data-run-id="${S.escapeHtml(run.id)}" data-entity-id="${S.escapeHtml(entityId)}">
          <div class="sensor-head">
            <span>${S.icon(this._metricIcon(binding.metric_type))}</span>
            <button class="icon-button danger" data-action="remove-binding" data-run-id="${S.escapeHtml(run.id)}" data-binding-id="${S.escapeHtml(binding.id)}" type="button" title="Remove binding">${S.icon("mdi:trash-can-outline")}</button>
          </div>
          <strong>${S.escapeHtml(this._metricLabel(binding.metric_type))}</strong>
          <span class="sensor-state" data-live-entity="${S.escapeHtml(entityId)}">${S.escapeHtml(latest)}</span>
          <small>${S.escapeHtml(this._entityName(entityId))}</small>
          <div class="spark">${bars || "<span></span><span></span><span></span>"}</div>
        </article>
      `;
    }

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
      const days = S.daysBetween(run.planted_date || run.start_time);
      const target = this._targetDaysForRun(run);
      const bindings = Array.isArray(run.bindings) ? run.bindings : [];
      const phases = Array.isArray(run.phases) ? run.phases : [];
      const notes = Array.isArray(run.notes) ? run.notes : [];
      return `
        <section class="detail">
          <div class="hero ${S.stageKey(run)}">
            <div class="hero-copy">
              <span class="eyebrow">${S.escapeHtml(run.status || "active")} · day ${days}</span>
              <h1>${S.escapeHtml(run.friendly_name || "Unnamed run")}</h1>
              <p>${S.escapeHtml(run.cultivar?.name || "Cultivar not set")}${run.cultivar?.breeder ? ` by ${S.escapeHtml(run.cultivar.breeder)}` : ""}</p>
            </div>
            <div class="hero-actions">
              <button class="ghost" data-action="refresh" type="button">${S.icon("mdi:refresh")} Refresh</button>
              <button class="ghost" data-action="edit-run" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:pencil")} Edit</button>
              <button class="primary" data-action="open-binding" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:link-variant-plus")} Bind sensor</button>
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
              <p class="hint">Tap a sensor for run history. Long press opens the Home Assistant entity.</p>
              <div class="sensor-grid">
                ${bindings.length ? bindings.map((binding) => this._renderSensorTile(run, binding)).join("") : `<div class="empty-inline">No sensor bindings yet.</div>`}
              </div>
            </section>

            <section class="panel-block">
              <div class="block-head">
                <div><span class="eyebrow">Phase timeline</span><h2>Growth stages</h2></div>
              </div>
              <div class="phase-list">
                ${phases
                  .map(
                    (phase, index) => `
                      <div class="phase-item">
                        <span>${index + 1}</span>
                        <div><strong>${S.escapeHtml(phase.name)}</strong><small>${S.escapeHtml(S.formatDate(phase.start_time))}</small></div>
                      </div>`
                  )
                  .join("")}
              </div>
              <div class="inline-form">
                <select data-phase-draft>
                  ${STAGES.map((stage) => `<option value="${stage}" ${stage === this._phaseDraft ? "selected" : ""}>${stage}</option>`).join("")}
                </select>
                <button class="ghost" data-action="add-phase" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:timeline-plus")} Add</button>
              </div>
            </section>

            <section class="panel-block notes-block">
              <div class="block-head"><div><span class="eyebrow">Notes</span><h2>Grow log</h2></div></div>
              <div class="note-list">
                ${notes
                  .slice()
                  .reverse()
                  .map((note) => `<article class="note"><p>${S.escapeHtml(note.text)}</p><small>${S.escapeHtml(S.formatDate(note.timestamp))}</small></article>`)
                  .join("") || `<div class="empty-inline">No notes yet.</div>`}
              </div>
              <div class="inline-form">
                <input data-note-draft value="${S.escapeHtml(this._noteDraft)}" placeholder="Capture today's change" />
                <button class="primary" data-action="add-note" data-run-id="${S.escapeHtml(run.id)}" type="button">${S.icon("mdi:plus")} Add</button>
              </div>
            </section>
          </div>
        </section>
      `;
    }

    _renderWizard() {
      if (!this._wizardOpen) return "";
      return `
        <div class="overlay">
          <button class="overlay-backdrop" data-action="close-wizard" type="button" aria-label="Close new run dialog"></button>
          <section class="modal" data-modal-card>
            <header>
              <div><span class="eyebrow">Step ${this._wizardStep} of 3</span><h2>New run</h2></div>
              <button class="icon-button" data-action="close-wizard" type="button" title="Close">${S.icon("mdi:close")}</button>
            </header>
            ${this._wizardStep === 1 ? this._renderWizardBasics() : this._wizardStep === 2 ? this._renderWizardCultivar() : this._renderWizardSensors()}
            <footer>
              <button class="ghost" data-action="wizard-back" type="button" ${this._wizardStep === 1 ? "disabled" : ""}>Back</button>
              <button class="primary" data-action="${this._wizardStep === 3 ? "create-run" : "wizard-next"}" type="button">${this._wizardStep === 3 ? "Create run" : "Next"}</button>
            </footer>
          </section>
        </div>
      `;
    }

    _renderWizardBasics() {
      return `
        <div class="form-grid">
          <label><span>Run name</span><input data-wizard-field="friendly_name" value="${S.escapeHtml(this._wizard.friendly_name)}" placeholder="Tent A · Spring run" autocomplete="off" /></label>
          <label><span>Planted date</span><input data-wizard-field="planted_date" value="${S.escapeHtml(this._wizard.planted_date)}" type="date" /></label>
        </div>
        <p class="hint">Keep step 1 dead simple. Name it, set the plant date, move on.</p>
      `;
    }

    _renderWizardCultivar() {
      const targetDays = this._wizard.target_days || this._derivedTargetDays();
      return `
        <div class="form-grid">
          <label><span>Breeder</span><input data-wizard-field="breeder" value="${S.escapeHtml(this._wizard.breeder)}" placeholder="Breeder" autocomplete="off" /></label>
          <label class="search-field"><span>Cultivar / strain</span>
            <input data-wizard-field="cultivar_name" data-cultivar-input value="${S.escapeHtml(this._wizard.cultivar_name)}" placeholder="Start typing to search SeedFinder" autocomplete="off" />
            <div class="suggestions" data-suggestions>${this._suggestionMarkup()}</div>
          </label>
        </div>
        <p class="hint">Estimated total run duration: <strong>${S.escapeHtml(targetDays || "Will be derived from SeedFinder when available")}</strong></p>
      `;
    }

    _renderWizardSensors() {
      const rows = this._wizard.bindings
        .map(
          (binding, index) => `
            <div class="binding-edit-row">
              <select data-wizard-binding-metric="${index}">
                ${METRICS.map(([value, label]) => `<option value="${value}" ${binding.metric_type === value ? "selected" : ""}>${label}</option>`).join("")}
              </select>
              ${this._haEntityPicker(binding.sensor_id, `wizard_binding_${index}`)}
              <button class="icon-button danger" data-action="remove-wizard-binding" data-index="${index}" type="button" title="Remove">${S.icon("mdi:minus")}</button>
            </div>`
        )
        .join("");
      return `
        <div class="binding-editor">
          ${rows}
          <button class="ghost" data-action="add-wizard-binding" type="button">${S.icon("mdi:plus")} Add another sensor</button>
        </div>
      `;
    }

    _suggestionMarkup() {
      return this._suggestions
        .map(
          (item, index) => `
            <button data-action="choose-cultivar" data-index="${index}" type="button" @mousedown=${"(e) => e.preventDefault()"}>
              <strong>${S.escapeHtml(item.name || item.strain || "Unknown cultivar")}</strong>
              <span>${S.escapeHtml(item.breeder || this._wizard.breeder || "SeedFinder")}</span>
            </button>`
        )
        .join("");
    }

    _renderBindingModal() {
      if (!this._bindingDraft) return "";
      return `
        <div class="overlay">
          <button class="overlay-backdrop" data-action="close-binding" type="button" aria-label="Close binding dialog"></button>
          <section class="modal compact" data-modal-card>
            <header>
              <div><span class="eyebrow">Sensor binding</span><h2>${this._bindingDraft.binding_id ? "Edit binding" : "Add binding"}</h2></div>
              <button class="icon-button" data-action="close-binding" type="button" title="Close">${S.icon("mdi:close")}</button>
            </header>
            <div class="form-grid">
              <label><span>Metric</span>
                <select data-binding-metric>
                  ${METRICS.map(([value, label]) => `<option value="${value}" ${this._bindingDraft.metric_type === value ? "selected" : ""}>${label}</option>`).join("")}
                </select>
              </label>
              <label><span>Home Assistant sensor entity</span>${this._haEntityPicker(this._bindingDraft.sensor_id, "binding_sensor")}</label>
            </div>
            <footer>
              <button class="ghost" data-action="close-binding" type="button">Cancel</button>
              <button class="primary" data-action="save-binding" type="button">Save binding</button>
            </footer>
          </section>
        </div>
      `;
    }

    _renderEditModal() {
      if (!this._detailDraft) return "";
      return `
        <div class="overlay">
          <button class="overlay-backdrop" data-action="close-edit" type="button" aria-label="Close edit dialog"></button>
          <section class="modal compact" data-modal-card>
            <header>
              <div><span class="eyebrow">Run details</span><h2>Edit run</h2></div>
              <button class="icon-button" data-action="close-edit" type="button" title="Close">${S.icon("mdi:close")}</button>
            </header>
            <div class="form-grid">
              <label><span>Name</span><input data-detail-field="friendly_name" value="${S.escapeHtml(this._detailDraft.friendly_name)}" /></label>
              <label><span>Planted date</span><input data-detail-field="planted_date" value="${S.escapeHtml(this._detailDraft.planted_date || "")}" type="date" /></label>
              <label><span>Dry yield (g)</span><input data-detail-field="dry_yield_grams" value="${S.escapeHtml(this._detailDraft.dry_yield_grams ?? "")}" type="number" min="0" step="0.1" /></label>
              <label class="wide"><span>Summary</span><textarea data-detail-field="notes_summary">${S.escapeHtml(this._detailDraft.notes_summary || "")}</textarea></label>
            </div>
            <footer>
              <button class="ghost" data-action="close-edit" type="button">Cancel</button>
              <button class="primary" data-action="save-run" type="button">Save</button>
            </footer>
          </section>
        </div>
      `;
    }

    _brandMark() {
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path class="sprout-stem" d="M12 21V10" />
          <path class="sprout-left" d="M7 12c0-3.2 2.2-5.7 5-6 0 3.2-2.2 5.7-5 6Z" />
          <path class="sprout-right" d="M17 12c0-3.2-2.2-5.7-5-6 0 3.2 2.2 5.7 5 6Z" />
          <path d="M8 21h8" opacity=".72" />
        </svg>
      `;
    }

    render() {
      const themeMode = this._resolvedTheme();
      this.shadowRoot.innerHTML = `
        <style>${this._styles()}</style>
        <div class="app theme-${S.escapeHtml(themeMode)}">
        <div class="shell">
          <header class="topbar">
            <div class="brand"><span class="brand-mark" aria-hidden="true">${this._brandMark()}</span><div><strong>PlantRun</strong><span>Home Assistant grow cockpit</span></div></div>
            <nav>
              ${["active", "ended", "all"].map((filter) => `<button class="${this._filter === filter ? "active" : ""}" data-action="filter" data-filter="${filter}" type="button">${filter}</button>`).join("")}
            </nav>
            <div class="top-actions">
              <button class="icon-button animated" data-action="toggle-theme" type="button" title="Theme">${S.icon(themeMode === "light" ? "mdi:weather-night" : "mdi:white-balance-sunny")}</button>
              <button class="icon-button animated" data-action="toggle-sound" type="button" title="Sound">${S.icon(this._sound ? "mdi:volume-high" : "mdi:volume-off")}</button>
              <button class="primary" data-action="open-wizard" type="button">${S.icon("mdi:plus")} New run</button>
            </div>
          </header>
          <main>
            <aside class="sidebar">${this._renderRunList()}</aside>
            ${this._renderDetail()}
          </main>
        </div>
        
        ${this._renderWizard()}
        ${this._renderBindingModal()}
        ${this._renderEditModal()}
        </div>
      `;
      this._hydrateHaSelectors();
    }

    _handleClick(event) {
      const target = event.target.closest("[data-action]");
      if (!target || !this.shadowRoot.contains(target)) return;
      event.preventDefault();
      const action = target.dataset.action;
      this._clickSound();
      if (action === "filter") {
        this._filter = target.dataset.filter;
        this.render();
      } else if (action === "select-run") {
        this._selectedRunId = target.dataset.runId;
        this._detailDraft = null;
        this.render();
      } else if (action === "refresh") {
        this._refreshRuns();
      } else if (action === "open-wizard") {
        this._wizardOpen = true;
        this._wizardStep = 1;
        this._wizard = this._blankWizard();
        this._suggestions = [];
        this.render();
        this._focusWizardPrimaryField();
      } else if (action === "close-wizard") {
        this._wizardOpen = false;
        this.render();
      } else if (action === "wizard-next") {
        this._wizardStep = Math.min(3, this._wizardStep + 1);
        this.render();
      } else if (action === "wizard-back") {
        this._wizardStep = Math.max(1, this._wizardStep - 1);
        this.render();
      } else if (action === "add-wizard-binding") {
        this._wizard.bindings = [...this._wizard.bindings, { metric_type: "temperature", sensor_id: "" }];
        this.render();
      } else if (action === "remove-wizard-binding") {
        this._wizard.bindings = this._wizard.bindings.filter((_binding, index) => index !== Number(target.dataset.index));
        this.render();
      } else if (action === "choose-cultivar") {
        this._chooseCultivar(Number(target.dataset.index));
      } else if (action === "create-run") {
        this._createRun();
      } else if (action === "open-binding") {
        this._openBinding(target.dataset.runId);
      } else if (action === "close-binding") {
        this._bindingDraft = null;
        this.render();
      } else if (action === "save-binding") {
        this._saveBinding();
      } else if (action === "remove-binding") {
        this._removeBinding(target.dataset.runId, target.dataset.bindingId);
      } else if (action === "add-phase") {
        this._addPhase(target.dataset.runId);
      } else if (action === "add-note") {
        this._addNote(target.dataset.runId);
      } else if (action === "edit-run") {
        this._openEditRun(target.dataset.runId);
      } else if (action === "close-edit") {
        this._detailDraft = null;
        this.render();
      } else if (action === "save-run") {
        this._saveRun();
      } else if (action === "toggle-theme") {
        this._theme = this._resolvedTheme() === "dark" ? "light" : "dark";
        localStorage.setItem(STORAGE.theme, this._theme);
        this.render();
      } else if (action === "toggle-sound") {
        this._sound = !this._sound;
        localStorage.setItem(STORAGE.sound, this._sound ? "on" : "off");
        this.render();
      }
    }

    _handleInput(event) {
      const target = event.target;
      if (target.matches("[data-wizard-field]")) {
        const field = target.dataset.wizardField;
        this._wizard = { ...this._wizard, [field]: target.value };
        if (field === "breeder" || field === "cultivar_name") {
          this._wizard.selected_cultivar = null;
          this._wizard.target_days = "";
          this._scheduleCultivarSearch();
        }
      } else if (target.matches("[data-note-draft]")) {
        this._noteDraft = target.value;
      } else if (target.matches("[data-detail-field]")) {
        this._detailDraft = { ...this._detailDraft, [target.dataset.detailField]: target.value };
      }
    }

    _handleChange(event) {
      const target = event.target;
      if (target.matches("[data-select-fallback]")) {
        this._setEntitySelectorValue(target.dataset.selectFallback, target.value);
      } else if (target.matches("[data-wizard-binding-metric]")) {
        const index = Number(target.dataset.wizardBindingMetric);
        const bindings = [...this._wizard.bindings];
        bindings[index] = { ...bindings[index], metric_type: target.value };
        this._wizard.bindings = bindings;
      } else if (target.matches("[data-binding-metric]") && this._bindingDraft) {
        this._bindingDraft = { ...this._bindingDraft, metric_type: target.value };
      } else if (target.matches("[data-phase-draft]")) {
        this._phaseDraft = target.value;
      }
    }

    _handleKeydown(event) {
      if (!event.target.matches("[data-cultivar-input]")) return;
      if ((event.key === "Enter" || event.key === "Tab") && this._suggestions.length) {
        event.preventDefault();
        this._chooseCultivar(0);
      } else if (event.key === "Escape") {
        this._suggestions = [];
        this._renderSuggestionsOnly();
      }
    }

    _handlePointerDown(event) {
      if (event.target.closest("button, input, select, textarea, ha-selector")) return;
      const tile = event.target.closest("[data-sensor-tile]");
      if (!tile) return;
      const key = `${tile.dataset.runId}:${tile.dataset.entityId}`;
      const current = this._pressState[key];
      if (current?.timer) window.clearTimeout(current.timer);
      this._pressState[key] = {
        longPressTriggered: false,
        timer: window.setTimeout(() => {
          this._pressState[key].longPressTriggered = true;
          this._openEntity(tile.dataset.entityId);
        }, 550),
      };
    }

    _handlePointerUp(event) {
      if (event.target.closest("button, input, select, textarea, ha-selector")) return;
      const tile = event.target.closest("[data-sensor-tile]");
      if (!tile) return;
      const key = `${tile.dataset.runId}:${tile.dataset.entityId}`;
      const state = this._pressState[key];
      if (!state) return;
      window.clearTimeout(state.timer);
      const wasLongPress = !!state.longPressTriggered;
      delete this._pressState[key];
      if (!wasLongPress) this._openRunHistory(tile.dataset.runId, tile.dataset.entityId);
    }

    _handlePointerCancel(event) {
      if (event.target.closest("button, input, select, textarea, ha-selector")) return;
      const tile = event.target.closest("[data-sensor-tile]");
      if (!tile) return;
      const key = `${tile.dataset.runId}:${tile.dataset.entityId}`;
      const state = this._pressState[key];
      if (state?.timer) window.clearTimeout(state.timer);
      delete this._pressState[key];
    }

    _scheduleCultivarSearch() {
      window.clearTimeout(this._searchTimer);
      const query = this._wizard.cultivar_name.trim();
      const breeder = this._wizard.breeder.trim();
      if (query.length < 2 || breeder.length < 2) {
        this._searchNonce += 1;
        this._suggestions = [];
        this._renderSuggestionsOnly();
        return;
      }
      this._searchTimer = window.setTimeout(() => this._searchCultivarSuggestions(), 260);
    }

    async _searchCultivarSuggestions() {
      const requestNonce = ++this._searchNonce;
      try {
        const response = await fetch("/api/plantrun/search_cultivar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ breeder: this._wizard.breeder, query: this._wizard.cultivar_name }),
        });
        const payload = await response.json();
        if (requestNonce !== this._searchNonce) return;
        this._suggestions = Array.isArray(payload?.results) ? payload.results : [];
      } catch (_err) {
        if (requestNonce !== this._searchNonce) return;
        this._suggestions = [];
      }
      this._renderSuggestionsOnly();
    }

    _renderSuggestionsOnly() {
      const box = this.shadowRoot.querySelector("[data-suggestions]");
      if (box) box.innerHTML = this._suggestionMarkup();
    }

    _chooseCultivar(index) {
      const item = this._suggestions[index];
      if (!item) return;
      this._wizard = {
        ...this._wizard,
        breeder: item.breeder || this._wizard.breeder,
        cultivar_name: item.name || item.strain || this._wizard.cultivar_name,
        target_days: this._derivedTargetDays(item),
        selected_cultivar: item,
      };
      this._suggestions = [];
      this.render();
    }

    async _createRun() {
      if (!this._hass || !this._wizard.friendly_name.trim()) return;
      const knownRunIds = new Set(this._runs.map((run) => run.id));
      const name = this._wizard.friendly_name.trim();
      await this._hass.callService(DOMAIN, "create_run", {
        friendly_name: name,
        planted_date: this._wizard.planted_date || undefined,
      });
      await this._refreshRuns({ keepSelection: false });
      const run = this._resolveNewlyCreatedRun(name, knownRunIds);
      if (!run) return;
      this._selectedRunId = run.id;
      const targetDays = Number(this._wizard.target_days);
      if (Number.isFinite(targetDays) && targetDays > 0) {
        await this._hass.callService(DOMAIN, "update_run", {
          run_id: run.id,
          base_config: {
            target_days: targetDays,
          },
        });
      }
      if (this._wizard.cultivar_name.trim()) {
        await this._hass.callService(DOMAIN, "set_cultivar", {
          run_id: run.id,
          cultivar_name: this._wizard.cultivar_name.trim(),
          breeder: this._wizard.breeder.trim(),
          strain: this._wizard.selected_cultivar?.name || this._wizard.cultivar_name.trim(),
        });
      }
      for (const binding of this._wizard.bindings) {
        if (binding.metric_type && binding.sensor_id) {
          await this._hass.callService(DOMAIN, "add_binding", {
            run_id: run.id,
            metric_type: binding.metric_type,
            sensor_id: binding.sensor_id,
          });
        }
      }
      this._wizardOpen = false;
      await this._refreshRuns();
    }

    _resolveNewlyCreatedRun(name, previousRunIds = new Set()) {
      const newlyDiscovered = this._runs.filter((run) => !previousRunIds.has(run.id));
      return newlyDiscovered[0] || this._runs.find((run) => run.friendly_name === name) || null;
    }

    _openBinding(runId) {
      this._bindingDraft = { run_id: runId, binding_id: "", metric_type: "temperature", sensor_id: "" };
      this.render();
    }

    async _saveBinding() {
      if (!this._hass || !this._bindingDraft?.sensor_id) return;
      await this._hass.callService(DOMAIN, this._bindingDraft.binding_id ? "update_binding" : "add_binding", {
        run_id: this._bindingDraft.run_id,
        binding_id: this._bindingDraft.binding_id || undefined,
        metric_type: this._bindingDraft.metric_type,
        sensor_id: this._bindingDraft.sensor_id,
      });
      this._bindingDraft = null;
      await this._refreshRuns();
    }

    async _removeBinding(runId, bindingId) {
      if (!this._hass || !bindingId) return;
      await this._hass.callService(DOMAIN, "remove_binding", { run_id: runId, binding_id: bindingId });
      await this._refreshRuns();
    }

    async _addPhase(runId) {
      if (!this._hass || !this._phaseDraft) return;
      await this._hass.callService(DOMAIN, "add_phase", { run_id: runId, phase_name: this._phaseDraft });
      await this._refreshRuns();
    }

    async _addNote(runId) {
      const text = this._noteDraft.trim();
      if (!this._hass || !text) return;
      await this._hass.callService(DOMAIN, "add_note", { run_id: runId, text });
      this._noteDraft = "";
      await this._refreshRuns();
    }

    _openEditRun(runId) {
      const run = this._runs.find((item) => item.id === runId);
      if (!run) return;
      this._detailDraft = {
        run_id: run.id,
        friendly_name: run.friendly_name || "",
        planted_date: run.planted_date || "",
        dry_yield_grams: run.dry_yield_grams ?? "",
        notes_summary: run.notes_summary || "",
      };
      this.render();
    }

    async _saveRun() {
      const draft = this._detailDraft;
      if (!this._hass || !draft) return;
      await this._hass.callService(DOMAIN, "update_run", {
        run_id: draft.run_id,
        friendly_name: draft.friendly_name,
        planted_date: draft.planted_date || null,
        notes_summary: draft.notes_summary || null,
        dry_yield_grams: draft.dry_yield_grams === "" ? null : Number(draft.dry_yield_grams),
      });
      this._detailDraft = null;
      await this._refreshRuns();
    }

    _openEntity(entityId) {
      this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
    }

    _openRunHistory(runId, entityId) {
      this._selectedRunId = runId;
      const tile = this.shadowRoot.querySelector(`[data-entity-id="${CSS.escape(entityId)}"]`);
      tile?.classList.add("pulse");
      window.setTimeout(() => tile?.classList.remove("pulse"), 520);
    }

    _refreshLiveSensorText() {
      this.shadowRoot.querySelectorAll("[data-live-entity]").forEach((node) => {
        node.textContent = this._entityState(node.dataset.liveEntity);
      });
    }

    _clickSound() {
      if (!this._sound) return;
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        this._audio = this._audio || new Ctx();
        const osc = this._audio.createOscillator();
        const gain = this._audio.createGain();
        gain.gain.setValueAtTime(0.0001, this._audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.035, this._audio.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, this._audio.currentTime + 0.075);
        osc.frequency.value = 520;
        osc.connect(gain).connect(this._audio.destination);
        osc.start();
        osc.stop(this._audio.currentTime + 0.08);
      } catch (_err) {
        this._sound = false;
      }
    }

    _styles() {
      return `
        :host { display:block; min-height:100%; color:var(--primary-text-color,#e8ece8); font-family:var(--primary-font-family, system-ui, sans-serif); position:relative; }
        * { box-sizing:border-box; }
        button, input, select, textarea { font:inherit; }
        button { cursor:pointer; }
        .app.theme-dark {
          --primary-background-color:#111415;
          --card-background-color:#1b1f20;
          --primary-text-color:#edf2ec;
          --secondary-text-color:#9ca69d;
          --divider-color:#51605a;
          --success-color:#55d66a;
          color-scheme:dark;
        }
        .app.theme-light {
          --primary-background-color:#eef4ee;
          --card-background-color:#f7faf6;
          --primary-text-color:#18211a;
          --secondary-text-color:#627162;
          --divider-color:#b5c3b6;
          --success-color:#41c85f;
          color-scheme:light;
        }
        .shell { min-height:100vh; padding:18px; background:
          radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--success-color,#2fc46b) 18%, transparent), transparent 32%),
          linear-gradient(180deg, color-mix(in srgb, var(--card-background-color,#171b1c) 92%, #123021), var(--primary-background-color,#111416)); }
        .topbar { display:grid; grid-template-columns:minmax(220px,1fr) auto minmax(220px,1fr); align-items:center; gap:16px; max-width:1480px; margin:0 auto 14px; }
        .brand, .top-actions, nav, .hero-actions, .block-head, .inline-form, .sensor-head { display:flex; align-items:center; gap:10px; }
        .brand { min-width:0; }
        .brand-mark, .plant-mark { display:grid; place-items:center; width:42px; height:42px; border-radius:14px; background:color-mix(in srgb, var(--success-color,#31c76b) 18%, var(--card-background-color,#1b2020)); color:var(--success-color,#31c76b); box-shadow:inset 0 1px rgba(255,255,255,.16); overflow:hidden; }
        .brand-mark svg { width:22px; height:22px; overflow:visible; }
        .brand-mark .sprout-stem, .brand-mark .sprout-left, .brand-mark .sprout-right { transform-origin:center; transition:transform .35s cubic-bezier(.2,.9,.2,1), opacity .25s ease; }
        .brand:hover .brand-mark .sprout-left { transform:rotate(-12deg) translate(-1px, -1px); }
        .brand:hover .brand-mark .sprout-right { transform:rotate(12deg) translate(1px, -1px); }
        .brand:hover .brand-mark .sprout-stem { transform:translateY(-1px) scaleY(1.04); }
        .brand strong { display:block; font-size:19px; }
        .brand span:last-child, .hint, small, .run-row-main span, .eyebrow { color:var(--secondary-text-color,#98a29a); }
        nav { justify-content:center; padding:4px; border-radius:999px; background:color-mix(in srgb, var(--card-background-color,#1f2424) 82%, transparent); border:1px solid color-mix(in srgb, var(--divider-color,#4b5551) 55%, transparent); }
        nav button { border:0; border-radius:999px; padding:8px 16px; background:transparent; color:var(--secondary-text-color,#98a29a); text-transform:capitalize; }
        nav button.active { color:var(--primary-text-color,#fff); background:color-mix(in srgb, var(--primary-text-color,#fff) 10%, transparent); }
        .top-actions { justify-content:flex-end; }
        main { max-width:1480px; margin:0 auto; display:grid; grid-template-columns:330px minmax(0,1fr); gap:14px; }
        .sidebar, .detail, .panel-block, .modal { border:1px solid color-mix(in srgb, var(--divider-color,#4b5551) 55%, transparent); background:color-mix(in srgb, var(--card-background-color,#1c2121) 88%, transparent); box-shadow:0 18px 50px rgba(0,0,0,.18); backdrop-filter:blur(18px); }
        .sidebar { min-height:calc(100vh - 100px); border-radius:26px; padding:10px; display:flex; flex-direction:column; gap:8px; }
        .run-row { width:100%; border:0; display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:12px; text-align:left; padding:12px; border-radius:18px; background:transparent; color:inherit; transition:transform .18s ease, background .18s ease; }
        .run-row:hover { transform:translateY(-1px); background:color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent); }
        .run-row.selected { background:color-mix(in srgb, var(--success-color,#31c76b) 16%, transparent); }
        .run-row-main { min-width:0; }
        .run-row-main strong, .run-row-main span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block; }
        .stage-dot { width:12px; height:32px; border-radius:999px; background:#7fdb83; box-shadow:0 0 20px rgba(88,210,116,.45); }
        .stage-dot.veg { background:#35b968; } .stage-dot.flower { background:#d9b45d; } .stage-dot.harvest { background:#b98d68; }
        .ring { --progress:0; display:grid; place-items:center; width:48px; height:48px; border-radius:50%; font-size:11px; font-weight:700; background:conic-gradient(var(--success-color,#31c76b) calc(var(--progress) * 1%), color-mix(in srgb, var(--divider-color,#52605a) 50%, transparent) 0); position:relative; }
        .ring:after { content:""; position:absolute; inset:5px; border-radius:inherit; background:var(--card-background-color,#1c2121); z-index:-0; }
        .ring { isolation:isolate; }
        .detail { min-height:calc(100vh - 100px); border-radius:30px; padding:14px; overflow:hidden; }
        .hero { position:relative; min-height:245px; border-radius:24px; padding:26px; display:flex; justify-content:space-between; gap:24px; overflow:hidden; background:linear-gradient(135deg, color-mix(in srgb, var(--success-color,#31c76b) 20%, #101615), color-mix(in srgb, var(--card-background-color,#202524) 90%, #223928)); }
        .hero.flower { background:linear-gradient(135deg, rgba(95,73,34,.72), color-mix(in srgb, var(--card-background-color,#202524) 92%, #2b2416)); }
        .hero h1 { margin:8px 0; font-size:clamp(32px,4vw,64px); line-height:.95; letter-spacing:0; max-width:780px; }
        .hero p { margin:0; color:color-mix(in srgb, var(--primary-text-color,#fff) 72%, transparent); font-size:16px; }
        .hero-actions { align-self:flex-start; flex-wrap:wrap; justify-content:flex-end; z-index:1; }
        .stage-glyph { position:absolute; right:18px; bottom:-34px; color:rgba(255,255,255,.09); --mdc-icon-size:210px; transform:rotate(-8deg); pointer-events:none; }
        .stat-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin:12px 0; }
        .stat-grid div { padding:16px; border-radius:18px; background:color-mix(in srgb, var(--primary-text-color,#fff) 6%, transparent); }
        .stat-grid span { display:block; color:var(--secondary-text-color,#98a29a); font-size:12px; margin-bottom:4px; }
        .stat-grid strong { font-size:20px; }
        .content-grid { display:grid; grid-template-columns:1.15fr .85fr; gap:12px; align-items:start; }
        .panel-block { border-radius:22px; padding:16px; }
        .panel-block h2, .modal h2 { margin:2px 0 0; font-size:18px; }
        .eyebrow { text-transform:uppercase; letter-spacing:.12em; font-size:11px; font-weight:800; }
        .sensor-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(185px,1fr)); gap:10px; margin-top:10px; }
        .sensor-tile { border-radius:20px; padding:14px; background:color-mix(in srgb, var(--primary-text-color,#fff) 5%, transparent); border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 38%, transparent); transition:transform .18s ease, border-color .18s ease; user-select:none; touch-action:manipulation; }
        .sensor-tile:hover, .sensor-tile.pulse { transform:translateY(-2px); border-color:color-mix(in srgb, var(--success-color,#31c76b) 52%, transparent); }
        .sensor-tile strong, .sensor-tile small, .sensor-state { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .sensor-state { margin-top:8px; font-size:24px; font-weight:800; }
        .spark { height:54px; display:flex; align-items:end; gap:4px; margin-top:12px; }
        .spark span { flex:1; min-width:4px; border-radius:999px 999px 4px 4px; background:linear-gradient(180deg, var(--success-color,#31c76b), rgba(49,199,107,.22)); }
        .phase-list, .note-list, .binding-editor { display:grid; gap:8px; }
        .phase-item { display:grid; grid-template-columns:32px minmax(0,1fr); gap:10px; align-items:center; padding:10px; border-radius:16px; background:color-mix(in srgb, var(--primary-text-color,#fff) 5%, transparent); }
        .phase-item > span { display:grid; place-items:center; width:32px; height:32px; border-radius:50%; background:color-mix(in srgb, var(--success-color,#31c76b) 18%, transparent); }
        .note { padding:12px; border-radius:16px; background:color-mix(in srgb, var(--primary-text-color,#fff) 5%, transparent); }
        .note p { margin:0 0 8px; }
        .notes-block { grid-column:1 / -1; }
        .empty-panel, .empty-detail, .empty-inline { display:grid; place-items:center; align-content:center; gap:12px; min-height:220px; text-align:center; color:var(--secondary-text-color,#98a29a); padding:22px; }
        .empty-inline { min-height:130px; border:1px dashed color-mix(in srgb, var(--divider-color,#52605a) 60%, transparent); border-radius:18px; }
        button.primary, button.ghost, .icon-button { border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 55%, transparent); min-height:38px; border-radius:14px; display:inline-flex; align-items:center; justify-content:center; gap:8px; color:inherit; transition:transform .16s ease, background .16s ease, border-color .16s ease; }
        button.primary { background:var(--success-color,#31c76b); color:#07110b; border-color:transparent; font-weight:800; padding:0 15px; }
        button.ghost { background:color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent); padding:0 13px; }
        .icon-button { width:38px; background:color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent); padding:0; }
        button:hover { transform:translateY(-1px); }
        button:disabled { opacity:.45; cursor:not-allowed; transform:none; }
        .danger { color:var(--error-color,#ef5350); }
        .animated ha-icon { transition:transform .28s cubic-bezier(.2,.8,.2,1); }
        .animated:hover ha-icon { transform:rotate(-18deg) scale(1.08); }
        input, select, textarea { width:100%; border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 55%, transparent); border-radius:14px; min-height:42px; padding:10px 12px; background:color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent); color:inherit; outline:none; }
        textarea { min-height:90px; resize:vertical; }
        input:focus, select:focus, textarea:focus { border-color:var(--success-color,#31c76b); box-shadow:0 0 0 3px color-mix(in srgb, var(--success-color,#31c76b) 18%, transparent); }
        .overlay { position:absolute; inset:0; z-index:20; display:grid; place-items:center; padding:22px; }
        .overlay-backdrop { position:absolute; inset:0; border:0; background:rgba(0,0,0,.34); backdrop-filter:blur(8px); }
        .modal { width:min(760px,100%); max-height:min(820px,calc(100vh - 44px)); overflow:auto; border-radius:26px; padding:18px; }
        .modal.compact { width:min(560px,100%); }
        .modal, .detail, .sidebar, .panel-block { position:relative; z-index:1; }
        .modal header, .modal footer { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .modal footer { margin-top:16px; justify-content:flex-end; }
        .form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:16px; }
        label { display:grid; gap:7px; color:var(--secondary-text-color,#98a29a); font-size:13px; font-weight:700; }
        label input, label select, label textarea, label .ha-entity-selector { color:var(--primary-text-color,#fff); font-weight:500; }
        label.wide, .search-field { grid-column:1 / -1; }
        .suggestions { display:grid; gap:6px; }
        .suggestions button { border:0; border-radius:14px; padding:10px 12px; background:color-mix(in srgb, var(--success-color,#31c76b) 12%, transparent); color:inherit; text-align:left; display:grid; gap:2px; }
        .binding-edit-row { display:grid; grid-template-columns:160px minmax(0,1fr) 38px; gap:8px; align-items:center; }
        .entity-fallback { display:none; }
        .ha-entity-selector:not(:defined) + .entity-fallback { display:block; }
        .ha-entity-selector:not(:defined) { display:none; }
        @media (max-width: 960px) {
          .shell { padding:10px; }
          .topbar, main, .content-grid, .stat-grid { grid-template-columns:1fr; }
          nav { order:3; width:100%; }
          .top-actions { justify-content:flex-start; flex-wrap:wrap; }
          .sidebar, .detail { min-height:auto; }
          .hero { min-height:220px; flex-direction:column; }
          .form-grid, .binding-edit-row { grid-template-columns:1fr; }
        }
      `;
    }
  }

  customElements.define(TAG, PlantRunDashboardPanel);
})();
