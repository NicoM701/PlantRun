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
  const CANONICAL_STAGES = ["Seedling", "Vegetative", "Flowering", "Harvested"];
  const METRIC_ENTITY_HINTS = {
    temperature: { deviceClasses: ["temperature"], units: ["°c", "°f", "c", "f"] },
    humidity: { deviceClasses: ["humidity"], units: ["%"] },
    soil_moisture: { deviceClasses: ["moisture", "humidity"], units: ["%"] },
    conductivity: { deviceClasses: ["conductivity"], units: ["ms/cm", "µs/cm", "us/cm", "ec"] },
    light: { deviceClasses: ["illuminance", "irradiance"], units: ["lx", "lux", "ppfd", "dli", "µmol/m²/s", "umol/m²/s"] },
    energy: { deviceClasses: ["energy", "power"], units: ["kwh", "wh", "w", "kw"] },
    water: { deviceClasses: ["volume", "water"], units: ["l", "ml", "gal"] },
  };
  const STORAGE = {
    theme: "plantrun.ui.theme",
    sound: "plantrun.ui.sound",
  };
  const THEME_QUERY = "(prefers-color-scheme: light)";
  // Experimental Home Assistant native history deeplink hack.
  // HA's more-info history dialog is hard-coded to ~24h and does not accept
  // an injected run window. The full /history panel does accept start/end
  // query params, so we route there when we have enough context.
  const EXPERIMENTAL_NATIVE_HISTORY_DEEPLINK = true;

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
    const formatDateTime = (value) => {
      if (!value) return "Not set";
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
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
    window.PlantRunShared = { ...existing, escapeHtml, formatDate, formatDateTime, daysBetween, stageKey, icon };
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
      this._suggestionCache = new Map();
      this._lastSearchKey = "";
      this._searchNonce = 0;
      this._searchTimer = 0;
      this._bindingDraft = null;
      this._detailDraft = null;
      this._noteEditor = null;
      this._noteDeleteConfirm = null;
      this._historyInspector = null;
      this._phaseConfirm = null;
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
      this._boundMouseDown = (event) => this._handleMouseDown(event);
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
      this.shadowRoot.addEventListener("mousedown", this._boundMouseDown);
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
      this.shadowRoot.removeEventListener("mousedown", this._boundMouseDown);
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

    _entityMatchesMetric(entityId, metricType) {
      if (!entityId?.startsWith("sensor.")) return false;
      const hints = METRIC_ENTITY_HINTS[metricType];
      if (!hints) return true;
      const state = this._hass?.states?.[entityId];
      const attrs = state?.attributes || {};
      const deviceClass = String(attrs.device_class || "").toLowerCase();
      const unit = String(attrs.unit_of_measurement || attrs.native_unit_of_measurement || "").toLowerCase();
      const name = `${entityId} ${attrs.friendly_name || ""}`.toLowerCase();
      if (hints.deviceClasses.some((value) => deviceClass === value)) return true;
      if (hints.units.some((value) => unit.includes(value))) return true;
      return hints.deviceClasses.some((value) => name.includes(value.replace("_", " ")));
    }

    _sensorEntitiesForMetric(metricType) {
      const all = this._sensorEntities();
      return all.filter((entityId) => this._entityMatchesMetric(entityId, metricType));
    }

    _entitySelectorConfig(metricType) {
      const includeEntities = this._sensorEntitiesForMetric(metricType);
      const currentValue = this._bindingDraft?.metric_type === metricType ? this._bindingDraft?.sensor_id : "";
      if (currentValue && !includeEntities.includes(currentValue)) includeEntities.push(currentValue);
      if (includeEntities.length) {
        return { entity: { domain: "sensor", include_entities: includeEntities } };
      }
      return { entity: { domain: "sensor", include_entities: [] } };
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

    _haEntityPicker(value, selectorName = "sensor_id", metricType = "temperature") {
      const filteredEntities = this._sensorEntitiesForMetric(metricType);
      const options = [...filteredEntities]
        .concat(value && !filteredEntities.includes(value) ? [value] : [])
        .map(
          (entityId) =>
            `<option value="${S.escapeHtml(entityId)}" ${entityId === value ? "selected" : ""}>${S.escapeHtml(
              `${this._entityName(entityId)} (${entityId})`
            )}</option>`
        )
        .join("");
      const currentSelectionHint = value && !filteredEntities.includes(value)
        ? `<p class="field-hint warning">Currently selected sensor no longer matches this metric filter. Choose a compatible sensor to save changes.</p>`
        : `<p class="field-hint">Only compatible Home Assistant sensors are shown for this metric.</p>`;
      return `
        <ha-selector
          class="ha-entity-selector"
          data-ha-selector="${S.escapeHtml(selectorName)}"
          data-metric-type="${S.escapeHtml(metricType)}"
          data-value="${S.escapeHtml(value || "")}">
        </ha-selector>
        <select class="entity-fallback" data-select-fallback="${S.escapeHtml(selectorName)}">
          <option value="">${filteredEntities.length ? "Choose a compatible Home Assistant sensor" : "No compatible Home Assistant sensors found"}</option>
          ${options}
        </select>
        ${currentSelectionHint}
      `;
    }

    _hydrateHaSelectors() {
      this.shadowRoot.querySelectorAll("ha-selector[data-ha-selector]").forEach((selector) => {
        const name = selector.dataset.haSelector;
        const metricType = selector.dataset.metricType || "temperature";
        selector.hass = this._hass;
        selector.selector = this._entitySelectorConfig(metricType);
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
      const history = this._bindingHistory(run, binding);
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
      const historyLabel = history.length ? `${history.length} stored sample${history.length === 1 ? "" : "s"}` : "No stored samples yet";
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
          <div class="spark">${bars || "<span></span><span></span><span></span>"}</div>
          <div class="sensor-meta"><span>${S.escapeHtml(historyLabel)}</span><span>${S.icon("mdi:gesture-tap-button")} Run window</span></div>
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
              <p class="hint">Tap a sensor to inspect its run window. Long press opens the Home Assistant entity.</p>
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
              <p class="hint">Tap a phase to move the run forward. PlantRun keeps one canonical timeline.</p>
            </section>

            <section class="panel-block notes-block">
              <div class="block-head"><div><span class="eyebrow">Notes</span><h2>Grow log</h2></div></div>
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
              ${this._haEntityPicker(binding.sensor_id, `wizard_binding_${index}`, binding.metric_type)}
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
      if (this._suggestions.length === 1 && this._suggestions[0]?.name === "Refreshing results…") {
        return `<div class="suggestion-state">Refreshing results…</div>`;
      }
      return this._suggestions
        .map(
          (item, index) => `
            <button data-action="choose-cultivar" data-index="${index}" data-prevent-mousedown type="button">
              <strong>${S.escapeHtml(item.name || item.strain || "Unknown cultivar")}</strong>
              <span>${S.escapeHtml(item.breeder || this._wizard.breeder || "SeedFinder")}</span>
            </button>`
        )
        .join("");
    }

    _detailSuggestionMarkup() {
      if (this._detailDraft?.cultivar_searching) {
        return `<div class="suggestion-state">Refreshing results…</div>`;
      }
      return (this._detailDraft?.suggestions || [])
        .map(
          (item, index) => `
            <button data-action="choose-detail-cultivar" data-index="${index}" data-prevent-mousedown type="button">
              <strong>${S.escapeHtml(item.name || item.strain || "Unknown cultivar")}</strong>
              <span>${S.escapeHtml(item.breeder || this._detailDraft?.breeder || "SeedFinder")}</span>
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
              <label><span>Home Assistant sensor entity</span>${this._haEntityPicker(this._bindingDraft.sensor_id, "binding_sensor", this._bindingDraft.metric_type)}</label>
            </div>
            <footer>
              <button class="ghost" data-action="close-binding" type="button">Cancel</button>
              <button class="primary" data-action="save-binding" type="button">Save binding</button>
            </footer>
          </section>
        </div>
      `;
    }

    _renderNoteModal() {
      if (!this._noteEditor) return "";
      return `
        <div class="overlay">
          <button class="overlay-backdrop" data-action="close-note-edit" type="button" aria-label="Close note dialog"></button>
          <section class="modal compact" data-modal-card>
            <header>
              <div><span class="eyebrow">Grow log</span><h2>Edit note</h2></div>
              <button class="icon-button" data-action="close-note-edit" type="button" title="Close">${S.icon("mdi:close")}</button>
            </header>
            <div class="form-grid">
              <label class="wide"><span>Note</span><textarea data-note-edit-text rows="5">${S.escapeHtml(this._noteEditor.text || "")}</textarea></label>
            </div>
            <footer>
              <button class="ghost" data-action="close-note-edit" type="button">Cancel</button>
              <button class="primary" data-action="save-note-edit" type="button">Save note</button>
            </footer>
          </section>
        </div>
      `;
    }

    _renderDeleteNoteConfirm() {
      if (!this._noteDeleteConfirm) return "";
      return `
        <div class="overlay">
          <button class="overlay-backdrop" data-action="close-note-delete" type="button" aria-label="Close delete note dialog"></button>
          <section class="modal compact" data-modal-card>
            <header>
              <div><span class="eyebrow">Grow log</span><h2>Delete note?</h2></div>
              <button class="icon-button" data-action="close-note-delete" type="button" title="Close">${S.icon("mdi:close")}</button>
            </header>
            <p class="confirm-copy">This removes the note from this run log.</p>
            <footer>
              <button class="ghost" data-action="close-note-delete" type="button">Cancel</button>
              <button class="danger" data-action="delete-note" type="button">Delete</button>
            </footer>
          </section>
        </div>
      `;
    }

    _renderEditModal() {
      if (!this._detailDraft) return "";
      const targetDays = this._detailDraft.target_days || this._derivedTargetDays(this._detailDraft.selected_cultivar);
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
              <label><span>Breeder</span><input data-detail-field="breeder" value="${S.escapeHtml(this._detailDraft.breeder || "")}" placeholder="Breeder" autocomplete="off" /></label>
              <label class="wide search-field"><span>Cultivar / strain</span>
                <input data-detail-field="cultivar_name" data-detail-cultivar-input value="${S.escapeHtml(this._detailDraft.cultivar_name || "")}" placeholder="Start typing to search SeedFinder" autocomplete="off" />
                <div class="suggestions" data-detail-suggestions>${this._detailSuggestionMarkup()}</div>
              </label>
              <label><span>Dry yield (g)</span><input data-detail-field="dry_yield_grams" value="${S.escapeHtml(this._detailDraft.dry_yield_grams ?? "")}" type="number" min="0" step="0.1" /></label>
              <label class="wide"><span>Summary</span><textarea data-detail-field="notes_summary">${S.escapeHtml(this._detailDraft.notes_summary || "")}</textarea></label>
            </div>
            <p class="hint">Estimated total run duration: <strong>${S.escapeHtml(targetDays || "Will be derived from SeedFinder when available")}</strong></p>
            <footer>
              <button class="ghost" data-action="close-edit" type="button">Cancel</button>
              <button class="primary" data-action="save-run" type="button">Save</button>
            </footer>
          </section>
        </div>
      `;
    }

    _bindingHistory(run, binding) {
      return Array.isArray(run?.sensor_history?.[binding?.metric_type]) ? run.sensor_history[binding.metric_type] : [];
    }

    _historyWindow(run) {
      const started = run?.planted_date || run?.start_time;
      const phases = Array.isArray(run?.phases) ? [...run.phases].reverse() : [];
      const endedPhase = phases.find((phase) => String(phase?.name || "").toLowerCase().includes("harvest"));
      return {
        start: started,
        end: endedPhase?.start_time || new Date().toISOString(),
      };
    }

    _fallbackHistoryContext(run, binding, entityId) {
      const windowInfo = this._historyWindow(run);
      const sourceExists = !!this._hass?.states?.[entityId];
      return {
        binding_id: binding?.id || "",
        entity_id: entityId,
        metric_type: binding?.metric_type || "sensor",
        run_id: run?.id || "",
        run_start: windowInfo.start,
        run_end: windowInfo.end,
        stored_run_end: run?.end_time || null,
        binding_status: sourceExists ? "bound" : "orphaned",
        orphaned: !sourceExists,
        error: sourceExists ? null : "source_entity_missing",
      };
    }

    _renderHistoryInspector() {
      const panel = this._historyInspector;
      if (!panel) return "";
      const run = this._runs.find((item) => item.id === panel.run_id);
      const binding = run?.bindings?.find((item) => item.id === panel.binding_id || item.sensor_id === panel.entity_id);
      const context = panel.context || this._fallbackHistoryContext(run, binding, panel.entity_id);
      const history = this._bindingHistory(run, binding).slice(-24);
      const summary = context.orphaned
        ? "This binding is orphaned right now because the linked Home Assistant sensor no longer exists."
        : history.length
          ? `Showing ${history.length} stored PlantRun sample${history.length === 1 ? "" : "s"} inside this run window.`
          : "No stored PlantRun samples yet for this linked sensor in the current run window.";
      const points = history
        .map((point) => {
          const value = Number(point.value);
          const label = Number.isFinite(value) ? `${value}` : "—";
          const timestamp = point.timestamp || point.recorded_at || point.time || "";
          return `<div class="history-row"><span>${S.escapeHtml(label)}</span><small>${S.escapeHtml(S.formatDate(timestamp))}</small></div>`;
        })
        .join("");
      return `
        <div class="overlay">
          <button class="overlay-backdrop" data-action="close-history" type="button" aria-label="Close run window inspector"></button>
          <section class="modal compact history-modal" data-modal-card>
            <header>
              <div><span class="eyebrow">Run window</span><h2>${S.escapeHtml(this._entityName(panel.entity_id))}</h2></div>
              <button class="icon-button" data-action="close-history" type="button" title="Close">${S.icon("mdi:close")}</button>
            </header>
            <div class="history-summary">
              <strong>${S.escapeHtml(this._metricLabel(context.metric_type || binding?.metric_type || "sensor"))}</strong>
              <p>${S.escapeHtml(summary)}</p>
              <div class="history-window-pill"><span>${S.icon("mdi:calendar-range")} ${S.escapeHtml(S.formatDate(context.run_start))}</span><span>${S.icon("mdi:arrow-right")}</span><span>${S.escapeHtml(S.formatDate(context.run_end))}</span></div>
              <div class="history-status ${context.orphaned ? "orphaned" : "bound"}">${S.escapeHtml(context.orphaned ? "Binding orphaned — sensor missing in Home Assistant" : "Binding healthy — linked Home Assistant sensor resolved")}</div>
              <p class="hint">PlantRun now tries an experimental Home Assistant history-panel deeplink for this run window. It can preload entity + start/end in the native History panel, but HA more-info still cannot be forced to this exact range.</p>
              ${panel.loading ? `<p class="hint">Loading recorder context…</p>` : ""}
              ${panel.error ? `<p class="hint error-text">${S.escapeHtml(panel.error)}</p>` : ""}
            </div>
            <div class="history-list">${points || `<div class="empty-inline">No stored samples captured yet.</div>`}</div>
            <footer>
              <button class="ghost" data-action="open-history-entity" data-entity-id="${S.escapeHtml(panel.entity_id)}" type="button">${S.icon("mdi:open-in-app")} Open entity details</button>
              <button class="ghost" data-action="open-native-history" data-entity-id="${S.escapeHtml(panel.entity_id)}" type="button">${S.icon("mdi:chart-timeline-variant")} Open native history</button>
              <button class="primary" data-action="close-history" type="button">Done</button>
            </footer>
          </section>
        </div>
      `;
    }

    _brandMark() {
      return `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
          <path class="sprout-stem" d="M12 21V11.5" />
          <path class="sprout-left" d="M11.8 11.7C8.1 12 5.4 9.3 5.2 5.4c3.8-.1 6.5 2.4 6.6 6.3Z" />
          <path class="sprout-right" d="M12.2 13c.1-4 3-6.8 6.6-6.8.2 3.8-2.2 6.9-6.2 7.1Z" />
          <path class="sprout-leaf" d="M12 14.2c-2.3.3-4.1 2.4-4.1 5.1 2.8.1 4.6-1.7 4.8-4.4" />
          <path class="sprout-leaf accent" d="M12.1 15.3c2.1-.2 4.2 1.3 5 3.8-2.4.9-4.5.1-5.7-2" />
          <path d="M8 21h8" opacity=".72" />
        </svg>
      `;
    }

    _renderPhaseConfirmModal() {
      const pending = this._phaseConfirm;
      if (!pending) return "";
      return `
        <div class="overlay" role="dialog" aria-modal="true" aria-label="Confirm phase change">
          <button class="overlay-backdrop" data-action="close-phase-confirm" type="button" aria-label="Close phase change confirmation"></button>
          <section class="modal compact phase-confirm-modal">
            <header>
              <div><span class="eyebrow">Phase confirmation</span><h2>Move run forward?</h2></div>
              <button class="icon-button" data-action="close-phase-confirm" type="button" title="Close">${S.icon("mdi:close")}</button>
            </header>
            <div class="history-summary">
              <p><strong>${S.escapeHtml(pending.run_name)}</strong> will change from <strong>${S.escapeHtml(pending.current_phase)}</strong> to <strong>${S.escapeHtml(pending.next_phase)}</strong>.</p>
              <p class="hint">PlantRun keeps one canonical timeline. Confirm here to move the run forward.</p>
            </div>
            <footer>
              <button class="ghost" data-action="close-phase-confirm" type="button">Cancel</button>
              <button class="primary" data-action="confirm-phase-change" type="button">Confirm phase change</button>
            </footer>
          </section>
        </div>
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
        ${this._renderNoteModal()}
        ${this._renderDeleteNoteConfirm()}
        ${this._renderEditModal()}
        ${this._renderHistoryInspector()}
        ${this._renderPhaseConfirmModal()}
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
      } else if (action === "choose-detail-cultivar") {
        this._chooseDetailCultivar(Number(target.dataset.index));
      } else if (action === "create-run") {
        this._createRun();
      } else if (action === "open-binding") {
        this._openBinding(target.dataset.runId);
      } else if (action === "edit-binding") {
        this._openBinding(target.dataset.runId, target.dataset.bindingId);
      } else if (action === "close-binding") {
        this._bindingDraft = null;
        this.render();
      } else if (action === "save-binding") {
        this._saveBinding();
      } else if (action === "remove-binding") {
        this._removeBinding(target.dataset.runId, target.dataset.bindingId);
      } else if (action === "select-phase") {
        this._phaseDraft = target.dataset.phase;
        this._addPhase(target.dataset.runId);
      } else if (action === "close-phase-confirm") {
        this._phaseConfirm = null;
        this.render();
      } else if (action === "confirm-phase-change") {
        this._confirmPhaseChange();
      } else if (action === "add-note") {
        this._addNote(target.dataset.runId);
      } else if (action === "edit-note") {
        this._openNoteEditor(target.dataset.noteId);
      } else if (action === "close-note-edit") {
        this._noteEditor = null;
        this.render();
      } else if (action === "save-note-edit") {
        this._saveNoteEdit();
      } else if (action === "confirm-delete-note") {
        this._openNoteDeleteConfirm(target.dataset.noteId);
      } else if (action === "close-note-delete") {
        this._noteDeleteConfirm = null;
        this.render();
      } else if (action === "delete-note") {
        this._deleteNote();
      } else if (action === "edit-run") {
        this._openEditRun(target.dataset.runId);
      } else if (action === "close-edit") {
        this._detailDraft = null;
        this.render();
      } else if (action === "save-run") {
        this._saveRun();
      } else if (action === "close-history") {
        this._historyInspector = null;
        this.render();
      } else if (action === "open-history-entity") {
        this._openEntity(target.dataset.entityId);
      } else if (action === "open-native-history") {
        if (!this._openNativeHistory(this._historyInspector?.context)) this._openEntity(target.dataset.entityId);
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
      } else if (target.matches("[data-note-edit-text]") && this._noteEditor) {
        this._noteEditor = { ...this._noteEditor, text: target.value };
      } else if (target.matches("[data-detail-field]")) {
        this._detailDraft = { ...this._detailDraft, [target.dataset.detailField]: target.value };
        if (target.dataset.detailField === "breeder" || target.dataset.detailField === "cultivar_name") {
          this._detailDraft.selected_cultivar = null;
          this._detailDraft.target_days = "";
          this._scheduleDetailCultivarSearch();
        }
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
        this.render();
      } else if (target.matches("[data-binding-metric]") && this._bindingDraft) {
        this._bindingDraft = { ...this._bindingDraft, metric_type: target.value };
        this.render();
      }
    }

    _handleKeydown(event) {
      if (!event.target.matches("[data-cultivar-input], [data-detail-cultivar-input]")) return;
      const detailInput = event.target.matches("[data-detail-cultivar-input]");
      const suggestions = detailInput ? this._detailDraft?.suggestions || [] : this._suggestions;
      if ((event.key === "Enter" || event.key === "Tab") && suggestions.length) {
        event.preventDefault();
        detailInput ? this._chooseDetailCultivar(0) : this._chooseCultivar(0);
      } else if (event.key === "Escape") {
        if (detailInput) {
          this._detailDraft = { ...this._detailDraft, suggestions: [] };
          this._renderDetailSuggestionsOnly();
        } else {
          this._suggestions = [];
          this._renderSuggestionsOnly();
        }
      }
    }

    _handleMouseDown(event) {
      if (!event.target.closest("[data-prevent-mousedown]")) return;
      event.preventDefault();
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
        this._lastSearchKey = "";
        this._suggestions = [];
        this._renderSuggestionsOnly();
        return;
      }
      const searchKey = `${breeder.toLowerCase()}::${query.toLowerCase()}`;
      if (searchKey === this._lastSearchKey) return;
      this._suggestions = [{ name: "Refreshing results…", breeder: "SeedFinder" }];
      this._renderSuggestionsOnly();
      this._searchTimer = window.setTimeout(() => this._searchCultivarSuggestions(), 260);
    }

    _scheduleDetailCultivarSearch() {
      window.clearTimeout(this._searchTimer);
      const query = this._detailDraft?.cultivar_name?.trim?.() || "";
      const breeder = this._detailDraft?.breeder?.trim?.() || "";
      if (query.length < 2 || breeder.length < 2) {
        this._detailDraft = { ...this._detailDraft, suggestions: [], cultivar_searching: false };
        this._renderDetailSuggestionsOnly();
        return;
      }
      this._detailDraft = { ...this._detailDraft, cultivar_searching: true };
      this._renderDetailSuggestionsOnly();
      this._searchTimer = window.setTimeout(() => this._searchDetailCultivarSuggestions(), 180);
    }

    async _searchCultivarSuggestions() {
      const breeder = this._wizard.breeder.trim();
      const query = this._wizard.cultivar_name.trim();
      const searchKey = `${breeder.toLowerCase()}::${query.toLowerCase()}`;
      this._lastSearchKey = searchKey;
      if (this._suggestionCache.has(searchKey)) {
        this._suggestions = this._suggestionCache.get(searchKey) || [];
        this._renderSuggestionsOnly();
        return;
      }
      const requestNonce = ++this._searchNonce;
      try {
        const payload = await this._hass.callWS({
          type: "plantrun/search_cultivar",
          breeder,
          query,
        });
        if (requestNonce !== this._searchNonce) return;
        this._suggestions = Array.isArray(payload?.results) ? payload.results : [];
        this._suggestionCache.set(searchKey, this._suggestions);
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

    _renderDetailSuggestionsOnly() {
      const box = this.shadowRoot.querySelector("[data-detail-suggestions]");
      if (box) box.innerHTML = this._detailSuggestionMarkup();
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

    async _searchDetailCultivarSuggestions() {
      const breeder = this._detailDraft?.breeder?.trim?.() || "";
      const query = this._detailDraft?.cultivar_name?.trim?.() || "";
      const searchKey = `${breeder.toLowerCase()}::${query.toLowerCase()}`;
      if (this._suggestionCache.has(searchKey)) {
        this._detailDraft = { ...this._detailDraft, suggestions: this._suggestionCache.get(searchKey) || [], cultivar_searching: false };
        this._renderDetailSuggestionsOnly();
        return;
      }
      try {
        const payload = await this._hass.callWS({ type: "plantrun/search_cultivar", breeder, query });
        const suggestions = Array.isArray(payload?.results) ? payload.results : [];
        this._suggestionCache.set(searchKey, suggestions);
        this._detailDraft = { ...this._detailDraft, suggestions, cultivar_searching: false };
      } catch (_err) {
        this._detailDraft = { ...this._detailDraft, suggestions: [], cultivar_searching: false };
      }
      this._renderDetailSuggestionsOnly();
    }

    _chooseDetailCultivar(index) {
      const item = this._detailDraft?.suggestions?.[index];
      if (!item) return;
      this._detailDraft = {
        ...this._detailDraft,
        breeder: item.breeder || this._detailDraft.breeder,
        cultivar_name: item.name || item.strain || this._detailDraft.cultivar_name,
        target_days: this._derivedTargetDays(item),
        selected_cultivar: item,
        suggestions: [],
        cultivar_searching: false,
      };
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

    _openBinding(runId, bindingId = "") {
      const run = this._runs.find((item) => item.id === runId);
      const binding = run?.bindings?.find((item) => item.id === bindingId);
      this._bindingDraft = binding
        ? { run_id: runId, binding_id: binding.id || "", metric_type: binding.metric_type || "temperature", sensor_id: binding.sensor_id || "" }
        : { run_id: runId, binding_id: "", metric_type: "temperature", sensor_id: "" };
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
      const run = this._runs.find((item) => item.id === runId);
      const nextPhase = this._phaseDraft === "Harvest" ? "Harvested" : this._phaseDraft;
      const current = run?.phases?.at?.(-1)?.name;
      if (current === nextPhase) return;
      this._phaseConfirm = {
        run_id: runId,
        run_name: run?.friendly_name || "this run",
        current_phase: current || "Not started",
        next_phase: nextPhase,
      };
      this.render();
    }

    async _confirmPhaseChange() {
      const pending = this._phaseConfirm;
      if (!this._hass || !pending?.run_id || !pending?.next_phase) return;
      this._phaseConfirm = null;
      this.render();
      await this._hass.callService(DOMAIN, "add_phase", { run_id: pending.run_id, phase_name: pending.next_phase });
      await this._refreshRuns();
    }

    async _addNote(runId) {
      const text = this._noteDraft.trim();
      if (!this._hass || !text) return;
      await this._hass.callService(DOMAIN, "add_note", { run_id: runId, text });
      this._noteDraft = "";
      await this._refreshRuns();
    }

    _openNoteEditor(noteId) {
      const run = this._selectedRun();
      const note = run?.notes?.find((item) => item.id === noteId);
      if (!run || !note) return;
      this._noteEditor = { run_id: run.id, note_id: note.id, text: note.text || "" };
      this.render();
    }

    _openNoteDeleteConfirm(noteId) {
      const run = this._selectedRun();
      const note = run?.notes?.find((item) => item.id === noteId);
      if (!run || !note) return;
      this._noteDeleteConfirm = { run_id: run.id, note_id: note.id };
      this.render();
    }

    async _saveNoteEdit() {
      const draft = this._noteEditor;
      const text = draft?.text?.trim?.() || "";
      if (!this._hass || !draft?.run_id || !draft?.note_id || !text) return;
      await this._hass.callService(DOMAIN, "update_note", { run_id: draft.run_id, note_id: draft.note_id, text });
      this._noteEditor = null;
      await this._refreshRuns();
    }

    async _deleteNote() {
      const draft = this._noteDeleteConfirm;
      if (!this._hass || !draft?.run_id || !draft?.note_id) return;
      await this._hass.callService(DOMAIN, "delete_note", { run_id: draft.run_id, note_id: draft.note_id });
      this._noteDeleteConfirm = null;
      await this._refreshRuns();
    }

    _openEditRun(runId) {
      const run = this._runs.find((item) => item.id === runId);
      if (!run) return;
      this._detailDraft = {
        run_id: run.id,
        friendly_name: run.friendly_name || "",
        planted_date: run.planted_date || "",
        breeder: run.cultivar?.breeder === "Unknown (Manual Entry)" ? "" : run.cultivar?.breeder || "",
        cultivar_name: run.cultivar?.name || "",
        target_days: this._targetDaysForRun(run),
        selected_cultivar: null,
        suggestions: [],
        cultivar_searching: false,
        dry_yield_grams: run.dry_yield_grams ?? "",
        notes_summary: run.notes_summary || "",
      };
      this.render();
    }

    async _saveRun() {
      const draft = this._detailDraft;
      if (!this._hass || !draft) return;
      try {
        const targetDays = Number(draft.target_days || this._derivedTargetDays(draft.selected_cultivar));
        await this._hass.callService(DOMAIN, "update_run", {
          run_id: draft.run_id,
          friendly_name: draft.friendly_name,
          planted_date: draft.planted_date || null,
          notes_summary: draft.notes_summary || null,
          dry_yield_grams: draft.dry_yield_grams === "" ? null : Number(draft.dry_yield_grams),
          ...(Number.isFinite(targetDays) && targetDays > 0
            ? {
                base_config: {
                  ...(this._runs.find((item) => item.id === draft.run_id)?.base_config || {}),
                  target_days: targetDays,
                },
              }
            : {}),
        });
        if (draft.cultivar_name?.trim()) {
          await this._hass.callService(DOMAIN, "set_cultivar", {
            run_id: draft.run_id,
            cultivar_name: draft.cultivar_name.trim(),
            breeder: draft.breeder?.trim?.() || "",
            strain: draft.selected_cultivar?.name || draft.cultivar_name.trim(),
          });
        }
        this._detailDraft = null;
        await this._refreshRuns();
      } catch (err) {
        this._error = err?.message || "Unable to save run changes.";
        this.render();
      }
    }

    _openEntity(entityId) {
      this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
    }

    _openNativeHistory(context) {
      if (!EXPERIMENTAL_NATIVE_HISTORY_DEEPLINK || !context?.entity_id || !context?.run_start) return false;
      const end = context.run_end || context.stored_run_end || context.run_window?.effective_end;
      if (!end) return false;
      const params = new URLSearchParams({
        entity_id: context.entity_id,
        start_date: context.run_start,
        end_date: end,
        back: "1",
      });
      // Best-effort HA frontend hack: the history panel reads these query params
      // on first render, so we navigate there directly and let the built-in page
      // own the chart UI from that point.
      window.history.pushState(null, "", `/history?${params.toString()}`);
      window.dispatchEvent(new CustomEvent("location-changed", { detail: { replace: false } }));
      return true;
    }

    async _openRunHistory(runId, entityId) {
      this._selectedRunId = runId;
      const run = this._runs.find((item) => item.id === runId);
      const binding = run?.bindings?.find((item) => item.sensor_id === entityId);
      const fallbackContext = this._fallbackHistoryContext(run, binding, entityId);
      const selector = `[data-sensor-tile][data-entity-id="${CSS.escape(entityId)}"]`;
      const tile = this.shadowRoot.querySelector(selector);
      tile?.classList.add("pulse");
      window.setTimeout(() => tile?.classList.remove("pulse"), 520);

      if (!this._hass || !binding?.id) {
        this._historyInspector = {
          run_id: runId,
          entity_id: entityId,
          binding_id: binding?.id || "",
          loading: false,
          error: "",
          context: fallbackContext,
        };
        this.render();
        return;
      }
      try {
        const payload = await this._hass.callWS({
          type: "plantrun/get_run_binding_history_context",
          run_id: runId,
          binding_id: binding.id,
        });
        const context = payload?.context || fallbackContext;
        if (this._openNativeHistory(context)) return;
        this._historyInspector = {
          run_id: runId,
          entity_id: entityId,
          binding_id: binding.id,
          loading: false,
          error: "",
          context,
        };
      } catch (err) {
        this._historyInspector = {
          run_id: runId,
          entity_id: entityId,
          binding_id: binding.id,
          loading: false,
          error: err?.message || "Unable to load run-window history context.",
          context: fallbackContext,
        };
      }
      this.render();
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
          --surface-strong:#232928;
          --surface-soft:#1c2221;
          --surface-raised:#28302e;
          --border-strong:#6d7a73;
          color-scheme:dark;
        }
        .app.theme-light {
          --primary-background-color:#e6ede5;
          --card-background-color:#f8fbf6;
          --primary-text-color:#18211a;
          --secondary-text-color:#516250;
          --divider-color:#aab9aa;
          --success-color:#2f9c4d;
          --surface-strong:#ffffff;
          --surface-soft:#eef3eb;
          --surface-raised:#f3f7f1;
          --border-strong:#97a997;
          --hero-text:#102114;
          --hero-muted:#274430;
          color-scheme:light;
        }
        .shell { min-height:100vh; padding:18px; background:
          radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--success-color,#2fc46b) 18%, transparent), transparent 32%),
          linear-gradient(180deg, color-mix(in srgb, var(--card-background-color,#171b1c) 92%, #123021), var(--primary-background-color,#111416)); }
        .app.theme-light .shell { background:
          radial-gradient(circle at 12% 0%, rgba(80, 170, 95, .18), transparent 34%),
          radial-gradient(circle at 100% 0%, rgba(255,255,255,.7), transparent 28%),
          linear-gradient(180deg, #f5f9f3 0%, var(--primary-background-color,#e6ede5) 56%, #dde8dc 100%); }
        .topbar { display:grid; grid-template-columns:minmax(220px,1fr) auto minmax(220px,1fr); align-items:center; gap:16px; max-width:1480px; margin:0 auto 14px; }
        .brand, .top-actions, nav, .hero-actions, .block-head, .inline-form, .sensor-head { display:flex; align-items:center; gap:10px; }
        .brand { min-width:0; }
        .brand-mark, .plant-mark { display:grid; place-items:center; width:42px; height:42px; border-radius:14px; background:color-mix(in srgb, var(--success-color,#31c76b) 18%, var(--card-background-color,#1b2020)); color:var(--success-color,#31c76b); box-shadow:inset 0 1px rgba(255,255,255,.16); overflow:hidden; }
        .brand-mark svg { width:22px; height:22px; overflow:visible; }
        .brand-mark .sprout-stem, .brand-mark .sprout-left, .brand-mark .sprout-right, .brand-mark .sprout-leaf { transform-origin:center; transition:transform .35s cubic-bezier(.2,.9,.2,1), opacity .25s ease; }
        .brand:hover .brand-mark .sprout-left { transform:rotate(-12deg) translate(-1px, -1px); }
        .brand:hover .brand-mark .sprout-right { transform:rotate(12deg) translate(1px, -1px); }
        .brand:hover .brand-mark .sprout-stem { transform:translateY(-1px) scaleY(1.04); }
        .brand:hover .brand-mark .sprout-leaf { transform:translateY(-1px) scale(1.04); }
        .brand-mark .accent { opacity:.72; }
        .brand strong { display:block; font-size:19px; }
        .brand span:last-child, .hint, small, .run-row-main span, .eyebrow { color:var(--secondary-text-color,#98a29a); }
        nav { justify-content:center; padding:4px; border-radius:999px; background:color-mix(in srgb, var(--card-background-color,#1f2424) 82%, transparent); border:1px solid color-mix(in srgb, var(--divider-color,#4b5551) 55%, transparent); }
        nav button { border:0; border-radius:999px; padding:8px 16px; background:transparent; color:var(--secondary-text-color,#98a29a); text-transform:capitalize; }
        nav button.active { color:var(--primary-text-color,#fff); background:color-mix(in srgb, var(--primary-text-color,#fff) 10%, transparent); }
        .top-actions { justify-content:flex-end; }
        main { max-width:1480px; margin:0 auto; display:grid; grid-template-columns:330px minmax(0,1fr); gap:14px; }
        .sidebar, .detail, .panel-block, .modal { border:1px solid color-mix(in srgb, var(--divider-color,#4b5551) 55%, transparent); background:color-mix(in srgb, var(--card-background-color,#1c2121) 88%, transparent); box-shadow:0 18px 50px rgba(0,0,0,.18); backdrop-filter:blur(18px); }
        .app.theme-light .sidebar, .app.theme-light .detail, .app.theme-light .panel-block, .app.theme-light .modal { background:rgba(255,255,255,.92); border-color:color-mix(in srgb, var(--border-strong,#97a997) 72%, white); }
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
        .hero { position:relative; min-height:245px; border-radius:24px; padding:24px; display:flex; justify-content:space-between; gap:20px; overflow:hidden; background:linear-gradient(135deg, color-mix(in srgb, var(--success-color,#31c76b) 20%, #101615), color-mix(in srgb, var(--card-background-color,#202524) 90%, #223928)); }
        .hero.flower { background:linear-gradient(135deg, rgba(95,73,34,.72), color-mix(in srgb, var(--card-background-color,#202524) 92%, #2b2416)); }
        .app.theme-light .hero { background:linear-gradient(135deg, #d9efdc 0%, #edf7ee 48%, #e3efe2 100%); color:var(--hero-text,#102114); border:1px solid rgba(116, 149, 118, .28); box-shadow:inset 0 1px rgba(255,255,255,.9); }
        .app.theme-light .hero.flower { background:linear-gradient(135deg, #f1e3c8 0%, #faf4e9 52%, #ecdfc1 100%); }
        .hero h1 { margin:8px 0; font-size:clamp(32px,4vw,64px); line-height:.95; letter-spacing:0; max-width:780px; }
        .hero p { margin:0; color:color-mix(in srgb, var(--primary-text-color,#fff) 72%, transparent); font-size:16px; }
        .app.theme-light .hero p, .app.theme-light .hero .eyebrow { color:var(--hero-muted,#274430); }
        .hero-actions { align-self:flex-start; flex-wrap:wrap; justify-content:flex-end; z-index:1; }
        .stage-glyph { position:absolute; right:18px; bottom:-34px; color:rgba(255,255,255,.09); --mdc-icon-size:210px; transform:rotate(-8deg); pointer-events:none; }
        .app.theme-light .stage-glyph { color:rgba(41, 86, 51, .14); }
        .stat-grid { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin:12px 0; }
        .stat-grid div { padding:15px 16px; border-radius:18px; background:color-mix(in srgb, var(--primary-text-color,#fff) 6%, transparent); }
        .app.theme-light .stat-grid div { background:rgba(255,255,255,.78); border:1px solid rgba(126, 150, 127, .18); }
        .stat-grid span { display:block; color:var(--secondary-text-color,#98a29a); font-size:12px; margin-bottom:4px; }
        .stat-grid strong { font-size:20px; }
        .content-grid { display:grid; grid-template-columns:1.15fr .85fr; gap:16px; align-items:start; margin-top:14px; }
        .panel-block { border-radius:22px; padding:18px; }
        .panel-block h2, .modal h2 { margin:2px 0 0; font-size:18px; }
        .eyebrow { text-transform:uppercase; letter-spacing:.12em; font-size:11px; font-weight:800; }
        .sensor-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(185px,1fr)); gap:10px; margin-top:10px; }
        .sensor-tile { border-radius:20px; padding:14px; background:linear-gradient(180deg, color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent), color-mix(in srgb, var(--primary-text-color,#fff) 4%, transparent)); border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 38%, transparent); transition:transform .18s ease, border-color .18s ease, box-shadow .18s ease; user-select:none; touch-action:manipulation; box-shadow:inset 0 1px rgba(255,255,255,.06); }
        .app.theme-light .sensor-tile { background:linear-gradient(180deg, #ffffff 0%, var(--surface-raised,#f3f7f1) 100%); border-color:rgba(126, 150, 127, .26); box-shadow:0 10px 24px rgba(40, 69, 44, .08), inset 0 1px rgba(255,255,255,.95); }
        .sensor-tile:hover, .sensor-tile.pulse { transform:translateY(-2px); border-color:color-mix(in srgb, var(--success-color,#31c76b) 52%, transparent); box-shadow:0 14px 28px rgba(0,0,0,.16), inset 0 1px rgba(255,255,255,.08); }
        .app.theme-light .sensor-tile:hover, .app.theme-light .sensor-tile.pulse { box-shadow:0 16px 30px rgba(40, 69, 44, .13), inset 0 1px rgba(255,255,255,.95); }
        .metric-badge { display:grid; place-items:center; width:34px; height:34px; border-radius:12px; background:color-mix(in srgb, var(--success-color,#31c76b) 16%, transparent); color:var(--success-color,#31c76b); }
        .sensor-tile strong, .sensor-tile small, .sensor-state { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .sensor-state { margin-top:8px; font-size:24px; font-weight:800; }
        .sensor-meta { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:10px; color:var(--secondary-text-color,#98a29a); font-size:12px; }
        .sensor-meta span:last-child { display:inline-flex; align-items:center; gap:5px; }
        .spark { height:54px; display:flex; align-items:end; gap:4px; margin-top:12px; }
        .spark span { flex:1; min-width:4px; border-radius:999px 999px 4px 4px; background:linear-gradient(180deg, var(--success-color,#31c76b), rgba(49,199,107,.22)); }
        .phase-list, .binding-editor { display:grid; gap:12px; }
        .note-list { display:grid; gap:14px; margin-top:10px; }
        .phase-stepper { display:grid; gap:10px; margin-top:6px; }
        .phase-step { width:100%; display:grid; grid-template-columns:38px minmax(0,1fr); gap:12px; align-items:center; padding:12px 14px; border-radius:18px; border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 45%, transparent); background:color-mix(in srgb, var(--primary-text-color,#fff) 5%, transparent); color:inherit; text-align:left; }
        .app.theme-light .phase-step, .app.theme-light .note { border-color:rgba(126, 150, 127, .24); box-shadow:0 6px 16px rgba(40, 69, 44, .05); }
        .phase-step span { display:grid; place-items:center; width:38px; height:38px; border-radius:50%; font-weight:800; background:color-mix(in srgb, var(--primary-text-color,#fff) 9%, transparent); }
        .app.theme-light .phase-step span { background:#eef4ec; color:#294232; }
        .phase-step.done span, .phase-step.current span { background:color-mix(in srgb, var(--success-color,#31c76b) 22%, transparent); color:var(--success-color,#31c76b); }
        .phase-step.current { border-color:color-mix(in srgb, var(--success-color,#31c76b) 45%, transparent); box-shadow:0 0 0 1px color-mix(in srgb, var(--success-color,#31c76b) 24%, transparent); }
        .phase-step small { display:block; margin-top:3px; color:var(--secondary-text-color,#98a29a); }
        .note { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:14px; align-items:start; padding:18px 18px 16px; border-radius:22px; background:color-mix(in srgb, var(--primary-text-color,#fff) 5%, transparent); }
        .note-copy { display:grid; gap:10px; }
        .note p { margin:0; line-height:1.55; white-space:pre-wrap; }
        .note small { display:block; }
        .note-actions { display:flex; gap:8px; }
        .notes-block { grid-column:1 / -1; margin-top:4px; }
        .empty-panel, .empty-detail, .empty-inline { display:grid; place-items:center; align-content:center; gap:12px; min-height:220px; text-align:center; color:var(--secondary-text-color,#98a29a); padding:22px; }
        .empty-inline { min-height:130px; border:1px dashed color-mix(in srgb, var(--divider-color,#52605a) 60%, transparent); border-radius:18px; }
        button.primary, button.ghost, .icon-button { border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 55%, transparent); min-height:38px; border-radius:14px; display:inline-flex; align-items:center; justify-content:center; gap:8px; color:inherit; transition:transform .16s ease, background .16s ease, border-color .16s ease, box-shadow .16s ease; }
        button.primary { background:linear-gradient(180deg, color-mix(in srgb, var(--success-color,#31c76b) 88%, white 12%), var(--success-color,#31c76b)); color:#07110b; border-color:transparent; font-weight:800; padding:0 15px; box-shadow:0 10px 24px rgba(49,199,107,.22); }
        button.ghost { background:color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent); padding:0 13px; }
        .icon-button { width:38px; background:color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent); padding:0; }
        .app.theme-light button.ghost, .app.theme-light .icon-button, .app.theme-light input, .app.theme-light select, .app.theme-light textarea, .app.theme-light .history-row, .app.theme-light .history-window-pill, .app.theme-light .phase-step, .app.theme-light .note, .app.theme-light .run-row:hover { background:var(--surface-strong,#fff); }
        .app.theme-light button.ghost, .app.theme-light .icon-button, .app.theme-light input, .app.theme-light select, .app.theme-light textarea { border-color:rgba(126, 150, 127, .32); color:var(--primary-text-color,#18211a); box-shadow:0 4px 14px rgba(40, 69, 44, .06); }
        .app.theme-light .hero-actions button.ghost, .app.theme-light .hero-actions .icon-button { background:rgba(255,255,255,.86); border-color:rgba(116, 149, 118, .34); }
        .app.theme-light nav { background:var(--surface-soft,#edf3ec); }
        .app.theme-light nav button { color:#41523f; }
        .app.theme-light nav button.active, .app.theme-light .run-row.selected { background:color-mix(in srgb, var(--success-color,#41c85f) 18%, var(--surface-strong,#fff)); color:#19341f; }
        .app.theme-light .panel-block, .app.theme-light .detail, .app.theme-light .sidebar, .app.theme-light .modal { box-shadow:0 14px 34px rgba(44,70,51,.08); }
        button:hover { transform:translateY(-1px); }
        button:disabled { opacity:.45; cursor:not-allowed; transform:none; }
        .danger { color:var(--error-color,#ef5350); }
        .animated ha-icon { transition:transform .28s cubic-bezier(.2,.8,.2,1); }
        .animated:hover ha-icon { transform:rotate(-18deg) scale(1.08); }
        input, select, textarea { width:100%; border:1px solid color-mix(in srgb, var(--divider-color,#52605a) 55%, transparent); border-radius:14px; min-height:42px; padding:10px 12px; background:var(--surface-strong, color-mix(in srgb, var(--primary-text-color,#fff) 7%, transparent)); color:var(--primary-text-color,#fff); outline:none; }
        select, option, optgroup { background:var(--surface-strong,#232928); color:var(--primary-text-color,#edf2ec); }
        select:hover, textarea:hover, input:hover { border-color:color-mix(in srgb, var(--success-color,#31c76b) 28%, var(--divider-color,#52605a)); }
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
        .app.theme-light label input, .app.theme-light label select, .app.theme-light label textarea, .app.theme-light label .ha-entity-selector { color:var(--primary-text-color,#18211a); }
        .field-hint { margin:6px 2px 0; color:var(--secondary-text-color,#98a29a); font-size:12px; font-weight:600; }
        .field-hint.warning { color:#f4b25e; }
        label.wide, .search-field { grid-column:1 / -1; }
        .suggestions { display:grid; gap:6px; }
        .suggestion-state { padding:10px 12px; border-radius:14px; background:color-mix(in srgb, var(--success-color,#31c76b) 10%, transparent); color:var(--secondary-text-color,#98a29a); font-size:13px; font-weight:700; }
        .suggestions button { border:0; border-radius:14px; padding:10px 12px; background:color-mix(in srgb, var(--success-color,#31c76b) 12%, transparent); color:inherit; text-align:left; display:grid; gap:2px; transition:transform .14s ease, background .14s ease; }
        .suggestions button:hover { transform:translateY(-1px); background:color-mix(in srgb, var(--success-color,#31c76b) 18%, transparent); }
        .binding-edit-row { display:grid; grid-template-columns:160px minmax(0,1fr) 38px; gap:10px; align-items:center; }
        .confirm-copy { margin:16px 0 0; color:var(--secondary-text-color,#98a29a); line-height:1.5; }
        .history-modal { display:grid; gap:14px; }
        .history-summary { display:grid; gap:8px; }
        .phase-confirm-modal { display:grid; gap:16px; }
        .history-summary p { margin:0; }
        .history-window-pill { display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:10px 12px; border-radius:14px; background:color-mix(in srgb, var(--primary-text-color,#fff) 6%, transparent); }
        .app.theme-light .history-window-pill { border:1px solid rgba(126, 150, 127, .22); }
        .history-window-pill span { display:inline-flex; align-items:center; gap:6px; }
        .history-status { display:inline-flex; align-items:center; width:max-content; max-width:100%; padding:7px 10px; border-radius:999px; font-size:12px; font-weight:700; }
        .history-status.bound { background:rgba(49,199,107,.12); color:var(--success-color,#31c76b); }
        .history-status.orphaned { background:rgba(255,167,38,.14); color:#f4b25e; }
        .error-text { color:#f4b25e; }
        .history-list { display:grid; gap:8px; max-height:280px; overflow:auto; }
        .history-modal footer { display:flex; flex-wrap:wrap; gap:10px; }
        .history-row { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:11px 12px; border-radius:14px; background:color-mix(in srgb, var(--primary-text-color,#fff) 5%, transparent); }
        .entity-fallback { display:none; }
        .entity-fallback, .ha-entity-selector { background:var(--surface-strong,#232928); color:var(--primary-text-color,#edf2ec); }
        .app.theme-light .entity-fallback, .app.theme-light .ha-entity-selector, .app.theme-light select, .app.theme-light option, .app.theme-light optgroup { background:var(--surface-strong,#fff); color:var(--primary-text-color,#18211a); }
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
