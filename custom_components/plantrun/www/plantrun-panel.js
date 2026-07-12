import { PlantRunApi } from "./plantrun-panel-api.js?v=0.6.0";
import { createPanelDialogMethods } from "./plantrun-panel-dialogs.js?v=0.6.0";
import { createPanelViewMethods } from "./plantrun-panel-views.js?v=0.6.0";
import {
  METRICS,
  METRIC_ENTITY_HINTS,
  daysBetween,
  progressForRun,
  stageKey,
  targetDaysForRun,
} from "./plantrun-panel-domain.js?v=0.6.0";
import { panelStyles } from "./plantrun-panel-styles.js?v=0.6.0";

(() => {
  const TAG = "plantrun-dashboard-panel";
  const DOMAIN = "plantrun";
  const STORAGE = {
    theme: "plantrun.ui.theme",
    sound: "plantrun.ui.sound",
    density: "plantrun.ui.density",
    layout: "plantrun.ui.layout.v2",
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
      this._api = new PlantRunApi();
      this._runs = [];
      this._summaries = {};
      this._activeRunId = "";
      this._selectedRunId = "";
      this._filter = "active";
      this._screen = "overview";
      this._workspaceTab = "overview";
      this._loading = true;
      this._error = "";
      this._wizardOpen = false;
      this._wizardStep = 1;
      this._wizardError = "";
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
      this._historyNonce = 0;
      this._phaseConfirm = null;
      this._endRunConfirm = null;
      this._phaseDraft = "Vegetative";
      this._customPhaseDraft = "";
      this._pressState = {};
      this._theme = localStorage.getItem(STORAGE.theme) || (window.matchMedia?.(THEME_QUERY).matches ? "light" : "dark");
      this._density = localStorage.getItem(STORAGE.density) === "compact" ? "compact" : "comfortable";
      this._sound = localStorage.getItem(STORAGE.sound) === "on";
      this._personalizeOpen = false;
      this._layout = this._loadLayout();
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
      this._api.setHass(value);
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
        plants: [""],
        phase_plan: ["Seedling", "Vegetative", "Flowering", "Harvested"],
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
        const payload = await this._api.getRuns();
        this._runs = Array.isArray(payload?.runs) ? payload.runs : [];
        this._activeRunId = payload?.active_run_id || "";
        const ids = new Set(this._runs.map((run) => run.id));
        if (!keepSelection || !ids.has(this._selectedRunId)) {
          this._selectedRunId = this._activeRunId || this._runs[0]?.id || "";
        }
        await Promise.all(
          this._runs.map(async (run) => {
            try {
              this._summaries[run.id] = await this._api.getRunSummary(run.id);
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
      const visibleRuns = this._filteredRuns();
      return visibleRuns.find((run) => run.id === this._selectedRunId) || visibleRuns[0] || null;
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
      return targetDaysForRun(run);
    }

    _loadLayout() {
      const fallback = { card_layout: "grid", show_attention: true, show_plants: true };
      try {
        return { ...fallback, ...JSON.parse(localStorage.getItem(STORAGE.layout) || "{}") };
      } catch (_err) {
        return fallback;
      }
    }

    _saveLayout() {
      localStorage.setItem(STORAGE.layout, JSON.stringify(this._layout));
    }

    _newPlantId() {
      return globalThis.crypto?.randomUUID?.() || `plant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    _progress(run) {
      return progressForRun(run);
    }

    _heroMediaStyle(run) {
      if (!run?.image_url) return "";
      const safeUrl = String(run.image_url).replace(/'/g, "%27").replace(/"/g, "&quot;");
      return `style="--hero-image:url('${safeUrl}')"`;
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
        ? `<p class="field-hint warning">This sensor no longer matches the selected metric.</p>`
        : "";
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



    render() {
      const themeMode = this._resolvedTheme();
      this.shadowRoot.innerHTML = `
        <style>${this._styles()}</style>
        <div class="app theme-${S.escapeHtml(themeMode)} density-${S.escapeHtml(this._density)}">
        <div class="shell">
          <header class="topbar">
            <button class="brand" data-action="show-overview" type="button"><span class="brand-mark" aria-hidden="true">${this._brandMark()}</span><div><strong>PlantRun</strong><span>Grow with context</span></div></button>
            <div class="top-actions">
              <button class="icon-button animated personalize-button" data-action="open-personalize" type="button" title="Personalize view" aria-label="Personalize view">${S.icon("mdi:tune-variant")}</button>
              <button class="icon-button animated" data-action="toggle-theme" type="button" title="Switch to ${themeMode === "light" ? "dark" : "light"} mode">${S.icon(themeMode === "light" ? "mdi:weather-night" : "mdi:white-balance-sunny")}</button>
              <button class="icon-button animated" data-action="toggle-sound" type="button" title="Sound">${S.icon(this._sound ? "mdi:volume-high" : "mdi:volume-off")}</button>
              <button class="primary" data-action="open-wizard" type="button">${S.icon("mdi:plus")} New run</button>
            </div>
          </header>
          <main>${this._screen === "workspace" ? this._renderDetail() : this._renderOverview()}</main>
        </div>
        
        ${this._renderWizard()}
        ${this._renderBindingModal()}
        ${this._renderNoteModal()}
        ${this._renderDeleteNoteConfirm()}
        ${this._renderEditModal()}
        ${this._renderHistoryInspector()}
        ${this._renderPhaseConfirmModal()}
        ${this._renderEndRunModal()}
        ${this._renderPersonalizeModal()}
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
        const visibleRuns = this._filteredRuns();
        if (!visibleRuns.some((run) => run.id === this._selectedRunId)) {
          this._selectedRunId = visibleRuns[0]?.id || "";
        }
        this._screen = "overview";
        this.render();
      } else if (action === "select-run") {
        this._selectedRunId = target.dataset.runId;
        this._screen = "workspace";
        this._workspaceTab = "overview";
        this._detailDraft = null;
        this.render();
      } else if (action === "show-overview") {
        this._screen = "overview";
        this.render();
      } else if (action === "workspace-tab") {
        this._workspaceTab = target.dataset.tab || "overview";
        this.render();
      } else if (action === "refresh") {
        this._refreshRuns();
      } else if (action === "open-wizard") {
        this._wizardOpen = true;
        this._wizardStep = 1;
        this._wizardError = "";
        this._wizard = this._blankWizard();
        this._suggestions = [];
        this.render();
        this._focusWizardPrimaryField();
      } else if (action === "close-wizard") {
        this._wizardOpen = false;
        this.render();
      } else if (action === "wizard-next") {
        if (this._wizardStep === 1 && !this._wizard.friendly_name.trim()) {
          this._wizardError = "Give this run a name before continuing.";
          this.render();
          this._focusWizardPrimaryField();
          return;
        }
        this._wizardError = "";
        this._wizardStep = Math.min(4, this._wizardStep + 1);
        this.render();
      } else if (action === "wizard-back") {
        this._wizardError = "";
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
      } else if (action === "add-custom-phase") {
        this._phaseDraft = this._customPhaseDraft.trim();
        this._addPhase(target.dataset.runId);
      } else if (action === "close-phase-confirm") {
        this._phaseConfirm = null;
        this.render();
      } else if (action === "confirm-phase-change") {
        this._confirmPhaseChange();
      } else if (action === "open-end-run") {
        const run = this._runs.find((item) => item.id === target.dataset.runId);
        if (run) this._endRunConfirm = { run_id: run.id, run_name: run.friendly_name || "this run", dry_yield_grams: run.dry_yield_grams ?? "" };
        this.render();
      } else if (action === "add-wizard-plant") {
        this._wizard.plants = [...this._wizard.plants, ""];
        this.render();
      } else if (action === "remove-wizard-plant") {
        this._wizard.plants = this._wizard.plants.filter((_plant, index) => index !== Number(target.dataset.index));
        if (!this._wizard.plants.length) this._wizard.plants = [""];
        this.render();
      } else if (action === "add-wizard-phase") {
        const input = this.shadowRoot.querySelector("[data-wizard-new-phase]");
        const phase = input?.value?.trim?.();
        if (phase && !this._wizard.phase_plan.some((item) => item.toLowerCase() === phase.toLowerCase())) {
          this._wizard.phase_plan = [...this._wizard.phase_plan, phase];
          this.render();
        }
      } else if (action === "remove-wizard-phase") {
        if (this._wizard.phase_plan.length > 1) this._wizard.phase_plan = this._wizard.phase_plan.filter((_phase, index) => index !== Number(target.dataset.index));
        this.render();
      } else if (action === "close-end-run") {
        this._endRunConfirm = null;
        this.render();
      } else if (action === "confirm-end-run") {
        this._finishRun();
      } else if (action === "water-plant") {
        this._logWatering(target.dataset.runId, target.dataset.plantId);
      } else if (action === "add-note") {
        this._openNewNoteEditor(target.dataset.runId);
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
        this._historyNonce += 1;
        this._historyInspector = null;
        this.render();
      } else if (action === "open-history-entity") {
        this._openEntity(target.dataset.entityId);
      } else if (action === "open-native-history") {
        if (!this._openNativeHistory(this._historyInspector?.context)) this._openEntity(target.dataset.entityId);
      } else if (action === "open-personalize") {
        this._personalizeOpen = true;
        this.render();
      } else if (action === "close-personalize") {
        this._personalizeOpen = false;
        this.render();
      } else if (action === "set-card-layout") {
        this._layout = { ...this._layout, card_layout: target.dataset.layout === "list" ? "list" : "grid" };
        this._saveLayout();
        this.render();
      } else if (action === "toggle-layout-section") {
        const section = target.dataset.section;
        if (section && Object.prototype.hasOwnProperty.call(this._layout, section)) {
          this._layout = { ...this._layout, [section]: !this._layout[section] };
          this._saveLayout();
        }
        this.render();
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
        if (field === "friendly_name" && target.value.trim()) {
          this._wizardError = "";
          this.shadowRoot.querySelector(".form-error")?.remove();
        }
        if (field === "breeder" || field === "cultivar_name") {
          this._wizard.selected_cultivar = null;
          this._wizard.target_days = "";
          this._scheduleCultivarSearch();
        }
      } else if (target.matches("[data-wizard-plant]")) {
        const plants = [...this._wizard.plants];
        plants[Number(target.dataset.wizardPlant)] = target.value;
        this._wizard.plants = plants;
      } else if (target.matches("[data-end-run-yield]") && this._endRunConfirm) {
        this._endRunConfirm = { ...this._endRunConfirm, dry_yield_grams: target.value };
      } else if (target.matches("[data-custom-phase]")) {
        this._customPhaseDraft = target.value;
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
      const sensorTile = event.target.closest?.("[data-sensor-tile]");
      if (sensorTile && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        this._openRunHistory(sensorTile.dataset.runId, sensorTile.dataset.entityId);
        return;
      }
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
        const payload = await this._api.searchCultivar(breeder, query);
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
        const payload = await this._api.searchCultivar(breeder, query);
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
      await this._api.callService("create_run", {
        friendly_name: name,
        planted_date: this._wizard.planted_date || undefined,
      });
      await this._refreshRuns({ keepSelection: false });
      const run = this._resolveNewlyCreatedRun(name, knownRunIds);
      if (!run) return;
      this._selectedRunId = run.id;
      this._screen = "workspace";
      const targetDays = Number(this._wizard.target_days);
      const baseConfig = {
        plants: this._wizard.plants.map((plant) => plant.trim()).filter(Boolean).map((name) => ({ id: this._newPlantId(), name, last_watered: "" })),
        phase_plan: this._wizard.phase_plan.map((phase) => phase.trim()).filter(Boolean),
        watering_interval_days: 3,
      };
      if (Number.isFinite(targetDays) && targetDays > 0) {
        baseConfig.target_days = targetDays;
      }
      await this._api.callService("update_run", {
        run_id: run.id,
        base_config: baseConfig,
      });
      if (this._wizard.cultivar_name.trim()) {
        await this._api.callService("set_cultivar", {
          run_id: run.id,
          cultivar_name: this._wizard.cultivar_name.trim(),
          breeder: this._wizard.breeder.trim(),
          strain: this._wizard.selected_cultivar?.name || this._wizard.cultivar_name.trim(),
        });
      }
      for (const binding of this._wizard.bindings) {
        if (binding.metric_type && binding.sensor_id) {
          await this._api.callService("add_binding", {
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
      await this._api.callService(this._bindingDraft.binding_id ? "update_binding" : "add_binding", {
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
      await this._api.callService("remove_binding", { run_id: runId, binding_id: bindingId });
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
      await this._api.callService("add_phase", { run_id: pending.run_id, phase_name: pending.next_phase });
      this._customPhaseDraft = "";
      await this._refreshRuns();
    }

    async _finishRun() {
      const pending = this._endRunConfirm;
      if (!this._hass || !pending?.run_id) return;
      this._endRunConfirm = null;
      this.render();
      const yieldValue = pending.dry_yield_grams === "" ? null : Number(pending.dry_yield_grams);
      if (yieldValue !== null && Number.isFinite(yieldValue)) {
        await this._api.callService("update_run", { run_id: pending.run_id, dry_yield_grams: yieldValue });
      }
      await this._api.callService("end_run", { run_id: pending.run_id });
      this._filter = "ended";
      this._selectedRunId = pending.run_id;
      await this._refreshRuns();
    }

    async _logWatering(runId, plantId) {
      const run = this._runs.find((item) => item.id === runId);
      if (!this._hass || !run || run.status === "ended") return;
      const plants = this._plantObjects(run);
      const plant = plants.find((item) => item.id === plantId);
      if (!plant) return;
      const today = new Date().toISOString();
      const updatedPlants = plants.map((item) => item.id === plantId ? { ...item, last_watered: today } : item);
      await this._api.callService("update_run", {
        run_id: run.id,
        base_config: { ...(run.base_config || {}), plants: updatedPlants },
      });
      await this._api.callService("add_note", { run_id: run.id, text: `Watered ${plant.name}` });
      await this._refreshRuns();
    }

    _openNewNoteEditor(runId) {
      if (!runId) return;
      this._noteEditor = { run_id: runId, note_id: "", text: "" };
      this.render();
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
      if (!this._hass || !draft?.run_id || !text) return;
      if (draft.note_id) {
        await this._api.callService("update_note", { run_id: draft.run_id, note_id: draft.note_id, text });
      } else {
        await this._api.callService("add_note", { run_id: draft.run_id, text });
      }
      this._noteEditor = null;
      await this._refreshRuns();
    }

    async _deleteNote() {
      const draft = this._noteDeleteConfirm;
      if (!this._hass || !draft?.run_id || !draft?.note_id) return;
      await this._api.callService("delete_note", { run_id: draft.run_id, note_id: draft.note_id });
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
        plants_text: this._plantObjects(run).map((plant) => plant.name).join(", "),
        watering_interval_days: Math.max(1, Number(run.base_config?.watering_interval_days || 3)),
        phase_plan_text: this._phasePlan(run).join(", "),
      };
      this.render();
    }

    async _saveRun() {
      const draft = this._detailDraft;
      if (!this._hass || !draft) return;
      try {
        const targetDays = Number(draft.target_days || this._derivedTargetDays(draft.selected_cultivar));
        const existingRun = this._runs.find((item) => item.id === draft.run_id);
        const existingPlants = this._plantObjects(existingRun);
        const plantNames = String(draft.plants_text || "").split(",").map((item) => item.trim()).filter(Boolean);
        const plants = plantNames.map((name) => {
          const existing = existingPlants.find((plant) => plant.name.toLowerCase() === name.toLowerCase());
          return existing ? { ...existing, name } : { id: this._newPlantId(), name, last_watered: "" };
        });
        await this._api.callService("update_run", {
          run_id: draft.run_id,
          friendly_name: draft.friendly_name,
          planted_date: draft.planted_date || null,
          notes_summary: draft.notes_summary || null,
          dry_yield_grams: draft.dry_yield_grams === "" ? null : Number(draft.dry_yield_grams),
          base_config: {
            ...(existingRun?.base_config || {}),
            ...(Number.isFinite(targetDays) && targetDays > 0 ? { target_days: targetDays, } : {}),
            plants,
            watering_interval_days: Math.max(1, Number(draft.watering_interval_days || 3)),
            phase_plan: String(draft.phase_plan_text || "").split(",").map((item) => item.trim()).filter(Boolean),
          },
        });
        if (draft.cultivar_name?.trim()) {
          await this._api.callService("set_cultivar", {
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
      const requestNonce = ++this._historyNonce;
      this._selectedRunId = runId;
      const run = this._runs.find((item) => item.id === runId);
      const binding = run?.bindings?.find((item) => item.sensor_id === entityId);
      const fallbackContext = this._fallbackHistoryContext(run, binding, entityId);
      const selector = `[data-sensor-tile][data-entity-id="${CSS.escape(entityId)}"]`;
      const tile = this.shadowRoot.querySelector(selector);
      tile?.classList.add("pulse");
      window.setTimeout(() => tile?.classList.remove("pulse"), 520);

      this._historyInspector = {
        run_id: runId,
        entity_id: entityId,
        binding_id: binding?.id || "",
        loading: true,
        error: "",
        context: fallbackContext,
        points: [],
      };
      this.render();

      let context = fallbackContext;
      try {
        if (this._hass && binding?.id) {
          const payload = await this._api.getBindingHistoryContext(runId, binding.id);
          context = payload?.context || fallbackContext;
        }
        const points = await this._api.getRecorderHistory(entityId, context.run_start, context.run_end);
        if (requestNonce !== this._historyNonce || !this._historyInspector) return;
        this._historyInspector = { ...this._historyInspector, loading: false, context, points };
      } catch (err) {
        if (requestNonce !== this._historyNonce || !this._historyInspector) return;
        this._historyInspector = { ...this._historyInspector, loading: false, context, error: err?.message || "Recorder history could not be loaded.", points: [] };
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
      return panelStyles;
    }
  }

  Object.assign(
    PlantRunDashboardPanel.prototype,
    createPanelViewMethods(S),
    createPanelDialogMethods(S),
  );
  customElements.define(TAG, PlantRunDashboardPanel);
})();
