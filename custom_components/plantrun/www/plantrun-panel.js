import { PlantRunApi } from "./plantrun-panel-api.js?v=0.7.0";
import { createPanelDialogMethods } from "./plantrun-panel-dialogs.js?v=0.7.0";
import {
  bindingForMetric,
  bindingsFor,
  currentStage,
  dateTimeLocal,
  entityIdFor,
  isArchived,
  normalizeState,
  plantName,
  runEnd,
  runName,
  runStart,
  stagePlan,
  toIso,
} from "./plantrun-panel-domain.js?v=0.7.0";
import { panelStyles } from "./plantrun-panel-styles.js?v=0.7.0";
import { createPanelViewMethods } from "./plantrun-panel-views.js?v=0.7.0";

(() => {
  const TAG = "plantrun-dashboard-panel";
  const THEME_KEY = "plantrun.theme.v3";
  const MODULE_CACHE_KEY = new URL(import.meta.url).searchParams.get("v") || "";
  customElements.get("ha-panel-lovelace");
  if (customElements.get(TAG)) return;

  class PlantRunDashboardPanel extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._api = new PlantRunApi();
      this._state = normalizeState({});
      this._loading = true;
      this._busy = false;
      this._loaded = false;
      this._error = "";
      this._toast = "";
      this._theme = localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
      this._screen = "overview";
      this._selectedRunId = "";
      this._selectedMetric = "soil_moisture";
      this._historyPoints = [];
      this._historyLoading = false;
      this._historyNonce = 0;
      this._createOpen = false;
      this._createStep = 1;
      this._createDraft = this._blankCreateDraft();
      this._dialogError = "";
      this._cultivarResults = [];
      this._cultivarPreview = null;
      this._cultivarSearching = false;
      this._searchNonce = 0;
      this._searchTimer = 0;
      this._journalEditorOpen = false;
      this._journalDraft = this._blankJournalDraft();
      this._journalFileBusy = false;
      this._versionPeek = false;
      this._journalPlantFilter = "";
      this._journalTypeFilter = "";
      this._stageDraft = null;
      this._bindingEditorOpen = false;
      this._bindingDraft = this._blankBindingDraft();
      this._archiveRunId = "";
      this._deleteRunId = "";
      this._deleteConfirmation = "";
      this._deleteJournalDraft = null;
      this._boundClick = (event) => this._handleClick(event);
      this._boundInput = (event) => this._handleInput(event);
      this._boundChange = (event) => this._handleChange(event);
      this._boundKeydown = (event) => this._handleKeydown(event);
      this._boundContextMenu = (event) => this._handleContextMenu(event);
      this._boundPointerOut = (event) => this._handlePointerOut(event);
    }

    set hass(value) {
      this._hass = value;
      this._api.setHass(value);
      if (!this._loaded) {
        this._loaded = true;
        this._loadState();
      } else if (this.isConnected) {
        this.render();
      }
    }

    connectedCallback() {
      this.shadowRoot.addEventListener("click", this._boundClick);
      this.shadowRoot.addEventListener("input", this._boundInput);
      this.shadowRoot.addEventListener("change", this._boundChange);
      this.shadowRoot.addEventListener("keydown", this._boundKeydown);
      this.shadowRoot.addEventListener("contextmenu", this._boundContextMenu);
      this.shadowRoot.addEventListener("pointerout", this._boundPointerOut);
      this.render();
    }

    disconnectedCallback() {
      this.shadowRoot.removeEventListener("click", this._boundClick);
      this.shadowRoot.removeEventListener("input", this._boundInput);
      this.shadowRoot.removeEventListener("change", this._boundChange);
      this.shadowRoot.removeEventListener("keydown", this._boundKeydown);
      this.shadowRoot.removeEventListener("contextmenu", this._boundContextMenu);
      this.shadowRoot.removeEventListener("pointerout", this._boundPointerOut);
      window.clearTimeout(this._searchTimer);
    }

    _blankCreateDraft() {
      return {
        plant_name: "",
        nickname: "",
        strain: "",
        breeder: "",
        container: "",
        substrate: "",
        light_schedule: "",
        planted_at: dateTimeLocal(),
        initial_stage: "Germination",
        stage_plan: ["Germination", "Seedling", "Vegetative", "Flowering", "Harvested"],
        selected_cultivar: null,
        duration: { min_days: "", max_days: "", meaning: "", start_event: "", source: "", original_text: "" },
        bindings: [],
      };
    }

    _blankJournalDraft(runId = "") {
      return { entry_id: "", run_id: runId, entry_type: "free_text", text: "", occurred_at: dateTimeLocal(), details: {}, sensor_snapshot: {}, attachments: [] };
    }

    _blankBindingDraft(runId = "") {
      return { run_id: runId, owner_type: "plant", metric_type: "soil_moisture", entity_id: "" };
    }

    _activeTent() {
      return this._state.tents.find((tent) => String(tent.id) === String(this._state.active_tent_id)) || this._state.tents[0] || null;
    }

    _selectedRun() {
      return this._state.runs.find((run) => String(run.id) === String(this._selectedRunId)) || null;
    }

    _brandFromEvent(event) {
      return event.composedPath?.().find((node) => node?.classList?.contains("rail-brand")) || null;
    }

    _versionInfo() {
      const [moduleVersion, ...buildParts] = MODULE_CACHE_KEY.split("-");
      return {
        version: String(this._state?.version || moduleVersion || "dev"),
        build: buildParts.join("-"),
      };
    }

    _versionLabel() {
      return `v${this._versionInfo().version}`;
    }

    _versionBuildLabel() {
      const build = this._versionInfo().build;
      return build ? `Build ${build.slice(0, 8)}` : "Entwicklungsstand";
    }

    _handleContextMenu(event) {
      const brand = this._brandFromEvent(event);
      if (!brand) return;
      event.preventDefault();
      this._versionPeek = true;
      brand.classList.add("version-peek");
      brand.setAttribute("aria-label", `PlantRun ${this._versionLabel()}`);
      brand.querySelector(".brand-version")?.setAttribute("aria-hidden", "false");
    }

    _handlePointerOut(event) {
      if (!this._versionPeek) return;
      const brand = this._brandFromEvent(event);
      if (!brand) return;
      const relatedTarget = event.relatedTarget;
      if (relatedTarget && brand.contains?.(relatedTarget)) return;
      this._versionPeek = false;
      brand.classList.remove("version-peek");
      brand.setAttribute("aria-label", "PlantRun Startseite");
      brand.querySelector(".brand-version")?.setAttribute("aria-hidden", "true");
    }

    _runName(run) {
      return runName(run);
    }

    async _loadState() {
      if (!this._hass) return;
      this._loading = true;
      this._error = "";
      this.render();
      try {
        this._applyState(await this._api.getState());
      } catch (error) {
        this._error = error?.message || "Home Assistant hat keinen PlantRun-Zustand geliefert.";
      } finally {
        this._loading = false;
        this.render();
      }
    }

    _applyState(response) {
      this._state = normalizeState(response);
      if (!this._state.runs.some((run) => run.id === this._selectedRunId)) {
        this._selectedRunId = this._state.runs.find((run) => !isArchived(run))?.id || this._state.runs[0]?.id || "";
      }
    }

    async _command(command, payload, successMessage = "Gespeichert") {
      if (this._busy) return null;
      this._busy = true;
      this._dialogError = "";
      this.render();
      try {
        const response = await this._api.command(command, payload);
        this._applyState(response);
        this._toast = successMessage;
        window.setTimeout(() => {
          this._toast = "";
          if (this.isConnected) this.render();
        }, 2800);
        return response;
      } catch (error) {
        const message = error?.message || "PlantRun konnte die Änderung nicht speichern.";
        this._dialogError = message;
        this._toast = message;
        return null;
      } finally {
        this._busy = false;
        this.render();
      }
    }

    _entityDisplay(entityId) {
      if (!entityId) return { value: "–", raw: NaN, status: "Nicht zugeordnet" };
      const state = this._hass?.states?.[entityId];
      if (!state || ["unknown", "unavailable"].includes(state.state)) return { value: "Nicht verfügbar", raw: NaN, status: "Sensor nicht verfügbar" };
      const unit = state.attributes?.unit_of_measurement || "";
      return { value: `${state.state}${unit ? ` ${unit}` : ""}`, raw: state.state, status: "Aktuell" };
    }

    _sensorOptions(metric, selected = "") {
      const hints = {
        soil_moisture: ["moisture", "%", "soil"],
        temperature: ["temperature", "°c", "temp"],
        humidity: ["humidity", "%"],
        light: ["illuminance", "lx", "light"],
        energy: ["energy", "kwh", "wh"],
      }[metric] || [];
      return Object.entries(this._hass?.states || {})
        .filter(([entityId, state]) => {
          if (!entityId.startsWith("sensor.")) return false;
          if (entityId === selected) return true;
          const attrs = state?.attributes || {};
          const haystack = `${entityId} ${attrs.friendly_name || ""} ${attrs.device_class || ""} ${attrs.unit_of_measurement || ""}`.toLowerCase();
          return hints.some((hint) => haystack.includes(hint));
        })
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([entityId, state]) => `<option value="${this._escape(entityId)}" ${entityId === selected ? "selected" : ""}>${this._escape(state.attributes?.friendly_name || entityId)}</option>`)
        .join("");
    }

    _escape(value) {
      const span = document.createElement("span");
      span.textContent = String(value ?? "");
      return span.innerHTML;
    }

    _entryTypeLabel(value) {
      const normalized = String(value || "").toLowerCase();
      return normalized === "water" ? "Gießen" : normalized === "stage_change" ? "Phase geändert" : normalized === "inspect" ? "Prüfung" : normalized === "harvest" ? "Ernte" : normalized === "planting" ? "Einpflanzen" : normalized === "lighting" ? "Licht" : "Freitext";
    }

    async _loadMetricHistory() {
      const run = this._selectedRun();
      if (!run) return;
      const binding = bindingForMetric(run, this._activeTent(), this._selectedMetric);
      const entityId = entityIdFor(binding);
      const nonce = ++this._historyNonce;
      this._historyPoints = [];
      if (!entityId) {
        this._historyLoading = false;
        this.render();
        return;
      }
      this._historyLoading = true;
      this.render();
      try {
        const points = await this._api.getRecorderHistory(entityId, binding?.started_at || runStart(run), binding?.ended_at || runEnd(run));
        if (nonce !== this._historyNonce) return;
        this._historyPoints = points;
      } catch (error) {
        if (nonce !== this._historyNonce) return;
        this._historyPoints = [];
        this._toast = error?.message || "Recorder-Verlauf konnte nicht geladen werden.";
      } finally {
        if (nonce === this._historyNonce) {
          this._historyLoading = false;
          this.render();
        }
      }
    }

    _openCreate() {
      this._createOpen = true;
      this._createStep = 1;
      this._createDraft = this._blankCreateDraft();
      this._cultivarResults = [];
      this._cultivarPreview = null;
      this._dialogError = "";
      this.render();
      window.requestAnimationFrame(() => this.shadowRoot.querySelector("[data-cultivar-search]")?.focus());
    }

    _openJournalEditor(runId, entry = null) {
      const fallbackRunId = runId || this._selectedRunId || this._state.runs.find((run) => !isArchived(run))?.id || this._state.runs[0]?.id || "";
      this._journalDraft = entry ? {
        entry_id: entry.id,
        run_id: fallbackRunId,
        entry_type: entry.entry_type || "free_text",
        text: entry.text || "",
        occurred_at: dateTimeLocal(entry.occurred_at || entry.created_at),
        details: entry.details || {},
        sensor_snapshot: entry.sensor_snapshot || {},
        attachments: Array.isArray(entry.attachments) ? entry.attachments.map((attachment) => ({ ...attachment })) : [],
      } : this._blankJournalDraft(fallbackRunId);
      this._journalEditorOpen = true;
      this.render();
      window.requestAnimationFrame(() => this.shadowRoot.querySelector("[data-journal-field=\"text\"]")?.focus());
    }

    _openBindingEditor(runId = this._selectedRunId) {
      this._bindingDraft = this._blankBindingDraft(runId);
      this._bindingEditorOpen = true;
      this._dialogError = "";
      this.render();
    }

    _closeDialogs() {
      this._createOpen = false;
      this._journalEditorOpen = false;
      this._stageDraft = null;
      this._bindingEditorOpen = false;
      this._archiveRunId = "";
      this._deleteRunId = "";
      this._deleteConfirmation = "";
      this._deleteJournalDraft = null;
      this._dialogError = "";
      this.render();
    }

    _handleClick(event) {
      const action = event.target.closest("[data-action]");
      if (!action || !this.shadowRoot.contains(action)) return;
      event.preventDefault();
      const name = action.dataset.action;
      if (name === "navigate") {
        this._screen = action.dataset.screen || "overview";
        this.render();
      } else if (name === "open-run") {
        this._selectedRunId = action.dataset.runId;
        this._screen = "run";
        this._selectedMetric = "soil_moisture";
        this.render();
        this._loadMetricHistory();
      } else if (name === "reload") {
        this._loadState();
      } else if (name === "toggle-theme") {
        this._theme = this._theme === "dark" ? "light" : "dark";
        localStorage.setItem(THEME_KEY, this._theme);
        this.render();
      } else if (name === "open-create") {
        this._openCreate();
      } else if (name === "close-dialog" || name === "close-journal-editor") {
        this._closeDialogs();
      } else if (name === "create-next") {
        this._advanceCreate();
      } else if (name === "create-back") {
        this._createStep = Math.max(1, this._createStep - 1);
        this._dialogError = "";
        this.render();
      } else if (name === "submit-create") {
        this._submitCreate();
      } else if (name === "preview-cultivar") {
        this._previewCultivar(Number(action.dataset.index));
      } else if (name === "apply-cultivar") {
        this._applyCultivarPreview();
      } else if (name === "manual-cultivar") {
        this._createDraft.selected_cultivar = null;
        this._cultivarPreview = null;
        this._cultivarResults = [];
        this.render();
      } else if (name === "add-create-binding") {
        this._createDraft.bindings.push({ metric_type: "soil_moisture", entity_id: "", owner_type: "plant" });
        this.render();
      } else if (name === "remove-create-binding") {
        this._createDraft.bindings.splice(Number(action.dataset.index), 1);
        this.render();
      } else if (name === "open-journal-editor") {
        this._openJournalEditor(action.dataset.runId);
      } else if (name === "set-journal-type") {
        this._journalDraft.entry_type = action.dataset.entryType;
        this.render();
      } else if (name === "remove-journal-attachment") {
        const index = Number(action.dataset.index);
        if (Number.isInteger(index) && index >= 0) {
          this._journalDraft.attachments.splice(index, 1);
          this.render();
        }
      } else if (name === "set-plant-cover") {
        this._setPlantCover(action.dataset.runId, action.dataset.attachmentId);
      } else if (name === "clear-plant-cover") {
        this._setPlantCover(action.dataset.runId, null);
      } else if (name === "save-journal-entry") {
        this._saveJournalEntry();
      } else if (name === "edit-journal-entry") {
        const run = this._state.runs.find((item) => item.id === action.dataset.runId);
        const entry = run?.journal_entries?.find((item) => item.id === action.dataset.entryId);
        if (entry) this._openJournalEditor(run.id, entry);
      } else if (name === "request-delete-journal-entry") {
        this._deleteJournalDraft = { run_id: action.dataset.runId, entry_id: action.dataset.entryId };
        this.render();
      } else if (name === "confirm-delete-journal-entry") {
        this._deleteJournalEntry();
      } else if (name === "select-metric") {
        this._selectedMetric = action.dataset.metric;
        this._loadMetricHistory();
      } else if (name === "select-stage") {
        this._stageDraft = { run_id: this._selectedRunId, stage: action.dataset.stage, occurred_at: dateTimeLocal() };
        this.render();
      } else if (name === "confirm-stage-change") {
        this._changeStage();
      } else if (name === "open-binding-editor") {
        this._openBindingEditor(action.dataset.runId);
      } else if (name === "save-binding") {
        this._saveBinding();
      } else if (name === "clear-binding") {
        this._clearBinding(action);
      } else if (name === "request-archive") {
        this._archiveRunId = action.dataset.runId;
        this.render();
      } else if (name === "confirm-archive") {
        this._archiveRun();
      } else if (name === "request-delete-run") {
        this._deleteRunId = action.dataset.runId;
        this._deleteConfirmation = "";
        this.render();
      } else if (name === "confirm-delete-run") {
        this._deleteRun();
      }
    }

    _handleInput(event) {
      const target = event.target;
      if (target.dataset.createField) {
        this._createDraft[target.dataset.createField] = target.value;
        if (target.dataset.createField === "initial_stage" && !this._createDraft.stage_plan.includes(target.value)) {
          this._createDraft.stage_plan.push(target.value);
          this.render();
        }
        if (["strain", "breeder"].includes(target.dataset.createField)) {
          this._createDraft.selected_cultivar = null;
          this._cultivarPreview = null;
          this._scheduleCultivarSearch();
        }
      } else if (target.dataset.createDuration) {
        this._createDraft.duration[target.dataset.createDuration] = target.value;
      } else if (target.dataset.journalField) {
        this._journalDraft[target.dataset.journalField] = target.value;
      } else if (target.dataset.journalAttachmentCaption !== undefined) {
        const index = Number(target.dataset.journalAttachmentCaption);
        if (this._journalDraft.attachments[index]) this._journalDraft.attachments[index].caption = target.value;
      } else if (target.matches("[data-stage-occurred-at]")) {
        this._stageDraft.occurred_at = target.value;
      } else if (target.matches("[data-delete-confirmation]")) {
        this._deleteConfirmation = target.value;
        const run = this._state.runs.find((item) => item.id === this._deleteRunId);
        const confirmation = this._deleteConfirmation;
        const button = this.shadowRoot.querySelector('[data-action="confirm-delete-run"]');
        if (button) button.disabled = confirmation !== this._runName(run);
      }
    }

    _handleChange(event) {
      const target = event.target;
      if (target.dataset.createStage) {
        const stage = target.dataset.createStage;
        if (stage === this._createDraft.initial_stage && !target.checked) {
          target.checked = true;
          return;
        }
        this._createDraft.stage_plan = target.checked
          ? [...new Set([...this._createDraft.stage_plan, stage])]
          : this._createDraft.stage_plan.filter((item) => item !== stage);
      } else if (target.dataset.createBindingMetric !== undefined) {
        const binding = this._createDraft.bindings[Number(target.dataset.createBindingMetric)];
        binding.metric_type = target.value;
        binding.entity_id = "";
        this.render();
      } else if (target.dataset.createBindingEntity !== undefined) {
        this._createDraft.bindings[Number(target.dataset.createBindingEntity)].entity_id = target.value;
      } else if (target.dataset.createBindingOwner !== undefined) {
        this._createDraft.bindings[Number(target.dataset.createBindingOwner)].owner_type = target.value;
      } else if (target.dataset.bindingField) {
        this._bindingDraft[target.dataset.bindingField] = target.value;
        if (target.dataset.bindingField === "metric_type") this._bindingDraft.entity_id = "";
        this.render();
      } else if (target.dataset.journalFilter === "plant") {
        this._journalPlantFilter = target.value;
        this.render();
      } else if (target.dataset.journalFilter === "type") {
        this._journalTypeFilter = target.value;
        this.render();
      } else if (target.matches("[data-journal-files]")) {
        const files = Array.from(target.files || []);
        target.value = "";
        this._handleJournalFiles(files);
      }
    }

    _handleKeydown(event) {
      if (event.key === "Escape" && (this._createOpen || this._journalEditorOpen || this._stageDraft || this._bindingEditorOpen || this._deleteRunId)) {
        event.preventDefault();
        this._closeDialogs();
      }
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && this._journalEditorOpen) {
        event.preventDefault();
        this._saveJournalEntry();
      }
    }

    _advanceCreate() {
      if (this._createStep === 1 && !this._createDraft.plant_name.trim()) {
        this._dialogError = "Gib der Pflanze einen Namen.";
        this.render();
        return;
      }
      if (this._createStep === 2 && !this._createDraft.stage_plan.length) {
        this._dialogError = "Wähle mindestens eine Phase.";
        this.render();
        return;
      }
      this._dialogError = "";
      this._createStep = Math.min(3, this._createStep + 1);
      this.render();
    }

    _scheduleCultivarSearch() {
      window.clearTimeout(this._searchTimer);
      const query = this._createDraft.strain.trim();
      const breeder = this._createDraft.breeder.trim();
      if (query.length < 2 || breeder.length < 2) {
        this._cultivarResults = [];
        return;
      }
      this._searchTimer = window.setTimeout(() => this._searchCultivar(), 320);
    }

    async _searchCultivar() {
      const nonce = ++this._searchNonce;
      this._cultivarSearching = true;
      this.render();
      try {
        const result = await this._api.searchCultivar(this._createDraft.breeder, this._createDraft.strain);
        if (nonce !== this._searchNonce) return;
        this._cultivarResults = Array.isArray(result?.results) ? result.results : Array.isArray(result) ? result : [];
        this._cultivarPreview = null;
      } catch (_error) {
        if (nonce !== this._searchNonce) return;
        this._cultivarResults = [];
      } finally {
        if (nonce === this._searchNonce) {
          this._cultivarSearching = false;
          this.render();
        }
      }
    }

    _previewCultivar(index) {
      const item = this._cultivarResults[index];
      if (!item) return;
      this._cultivarPreview = item;
      this.render();
    }

    _applyCultivarPreview() {
      const item = this._cultivarPreview;
      if (!item) return;
      this._createDraft.selected_cultivar = item;
      this._createDraft.strain = item.name || item.strain || this._createDraft.strain;
      this._createDraft.breeder = item.breeder || this._createDraft.breeder;
      const duration = item.duration || {};
      this._createDraft.duration = {
        min_days: duration.min_days ?? item.min_days ?? "",
        max_days: duration.max_days ?? item.max_days ?? "",
        meaning: duration.meaning || item.meaning || "",
        start_event: duration.start_event || item.start_event || "",
        source: duration.source || item.detail_url || item.source || "SeedFinder",
        original_text: duration.original_text || item.original_text || item.original_wording || "",
      };
      this.render();
    }

    async _submitCreate() {
      const draft = this._createDraft;
      const tent = this._activeTent();
      const previousIds = new Set(this._state.runs.map((run) => run.id));
      const response = await this._command("create_run", {
        tent_id: tent?.id || null,
        tent_name: tent?.name || "Growzelt",
        run_name: draft.nickname || draft.plant_name,
        friendly_name: draft.nickname || draft.plant_name,
        plant_name: draft.plant_name.trim(),
        nickname: draft.nickname.trim() || null,
        strain: draft.strain.trim() || null,
        breeder: draft.breeder.trim() || null,
        container: draft.container.trim() || null,
        substrate: draft.substrate.trim() || null,
        light_schedule: draft.light_schedule.trim() || null,
        planted_at: toIso(draft.planted_at),
        initial_stage: draft.initial_stage,
        stage_plan: draft.stage_plan,
        bindings: draft.bindings.filter((binding) => binding.entity_id).map((binding) => ({ ...binding, started_at: toIso(draft.planted_at) })),
        duration: {
          min_days: draft.duration.min_days ? Number(draft.duration.min_days) : null,
          max_days: draft.duration.max_days ? Number(draft.duration.max_days) : null,
          meaning: draft.duration.meaning || null,
          start_event: draft.duration.start_event || null,
          source: draft.duration.source || null,
          original_text: draft.duration.original_text || null,
        },
        cultivar: draft.selected_cultivar,
      }, "Pflanze und Lauf wurden angelegt");
      if (!response) return;
      const created = this._state.runs.find((run) => !previousIds.has(run.id));
      if (created) this._selectedRunId = created.id;
      this._createOpen = false;
      this._screen = created ? "run" : "overview";
      this.render();
      if (created) this._loadMetricHistory();
    }

    async _saveJournalEntry() {
      if (this._journalFileBusy) return;
      const draft = this._journalDraft;
      if (!draft.run_id || !draft.text.trim()) {
        this._dialogError = "Wähle eine Pflanze und beschreibe kurz, was passiert ist.";
        this.render();
        return;
      }
      const run = this._state.runs.find((item) => item.id === draft.run_id);
      const command = draft.entry_id ? "update_journal_entry" : "create_journal_entry";
      const response = await this._command(command, {
        ...(draft.entry_id ? { entry_id: draft.entry_id } : {}),
        run_ids: [draft.run_id],
        tent_id: run?.tent_id || this._activeTent()?.id || null,
        entry_type: draft.entry_type,
        text: draft.text.trim(),
        occurred_at: toIso(draft.occurred_at),
        details: draft.details || {},
        sensor_snapshot: draft.entry_id ? draft.sensor_snapshot : this._sensorSnapshot(run),
        attachments: (draft.attachments || []).map(({ preview, data, ...attachment }) => ({
          ...attachment,
          ...(data ? { data } : {}),
        })),
      }, draft.entry_id ? "Eintrag aktualisiert" : "Eintrag gespeichert");
      if (!response) return;
      this._journalEditorOpen = false;
      this._screen = "journal";
      this.render();
    }

    async _handleJournalFiles(files) {
      if (!files.length || this._journalFileBusy) return;
      this._journalFileBusy = true;
      this._dialogError = "";
      this.render();
      try {
        for (const file of files) {
          if (!String(file.type || "").startsWith("image/")) {
            throw new Error("Bitte nur Bilddateien auswählen.");
          }
          const image = await this._readJournalFile(file);
          this._journalDraft.attachments.push({
            ...image,
            captured_at: toIso(this._journalDraft.occurred_at),
            kind: "photo",
            source: "upload",
            caption: "",
          });
        }
      } catch (error) {
        this._dialogError = error?.message || "Das Foto konnte nicht vorbereitet werden.";
      } finally {
        this._journalFileBusy = false;
        this.render();
      }
    }

    async _readJournalFile(file) {
      const source = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Das Foto konnte nicht gelesen werden."));
        reader.readAsDataURL(file);
      });
      const image = await new Promise((resolve, reject) => {
        const element = new Image();
        element.onload = () => resolve(element);
        element.onerror = () => reject(new Error("Das Foto ist kein lesbares Bild."));
        element.src = source;
      });
      const maxEdge = 1800;
      const scale = Math.min(1, maxEdge / image.naturalWidth, maxEdge / image.naturalHeight);
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Das Foto kann im Browser nicht verarbeitet werden.");
      let currentWidth = width;
      let currentHeight = height;
      let quality = 0.84;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        canvas.width = currentWidth;
        canvas.height = currentHeight;
        context.drawImage(image, 0, 0, currentWidth, currentHeight);
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Das Foto konnte nicht komprimiert werden.")), "image/jpeg", quality);
        });
        if (blob.size <= 2_400_000 || attempt === 3) {
          if (blob.size > 2_400_000) throw new Error("Das Foto ist zu groß. Bitte ein kleineres Bild wählen.");
          const compressed = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ""));
            reader.onerror = () => reject(new Error("Das Foto konnte nicht vorbereitet werden."));
            reader.readAsDataURL(blob);
          });
          const originalName = String(file.name || "photo").replace(/\.[^.]+$/, "").replace(/[^a-z0-9._-]+/gi, "_");
          return { data: compressed, preview: compressed, file_name: `${originalName || "photo"}.jpg` };
        }
        currentWidth = Math.max(640, Math.round(currentWidth * 0.8));
        currentHeight = Math.max(640, Math.round(currentHeight * 0.8));
        quality = Math.max(0.58, quality - 0.08);
      }
      throw new Error("Das Foto konnte nicht vorbereitet werden.");
    }

    async _setPlantCover(runId, attachmentId = null) {
      await this._command("set_plant_cover", {
        run_id: runId,
        attachment_id: attachmentId,
      }, "Pflanzenbild aktualisiert");
    }

    _sensorSnapshot(run) {
      const capturedAt = new Date().toISOString();
      return bindingsFor(run, this._activeTent())
        .filter((binding) => !binding?.ended_at)
        .reduce((snapshot, binding) => {
          const entityId = entityIdFor(binding);
          const state = this._hass?.states?.[entityId];
          if (!entityId || !state || ["unknown", "unavailable"].includes(state.state)) return snapshot;
          const unit = state.attributes?.unit_of_measurement || "";
          snapshot[entityId] = `${state.state}${unit ? ` ${unit}` : ""}`;
          snapshot.captured_at = capturedAt;
          return snapshot;
        }, {});
    }

    async _saveBinding() {
      const draft = this._bindingDraft;
      const run = this._state.runs.find((item) => item.id === draft.run_id);
      const tent = this._activeTent();
      if (!run || !draft.entity_id) {
        this._dialogError = "Wähle einen Home-Assistant-Sensor.";
        this.render();
        return;
      }
      const ownerId = draft.owner_type === "tent" ? tent?.id : run.id;
      const response = await this._command("set_binding", {
        owner_type: draft.owner_type,
        owner_id: ownerId,
        metric_type: draft.metric_type,
        entity_id: draft.entity_id,
        occurred_at: new Date().toISOString(),
      }, "Sensorzuordnung gespeichert");
      if (!response) return;
      this._bindingEditorOpen = false;
      this.render();
      this._loadMetricHistory();
    }

    async _clearBinding(action) {
      const run = this._state.runs.find((item) => item.id === this._bindingDraft.run_id);
      const tent = this._activeTent();
      const ownerType = action.dataset.ownerType;
      const ownerId = ownerType === "tent" ? tent?.id : run?.id;
      const response = await this._command("clear_binding", {
        owner_type: ownerType,
        owner_id: ownerId,
        metric_type: action.dataset.metric,
        occurred_at: new Date().toISOString(),
      }, "Sensorzuordnung beendet");
      if (!response) return;
      this._bindingEditorOpen = false;
      this.render();
      this._loadMetricHistory();
    }

    async _deleteJournalEntry() {
      const draft = this._deleteJournalDraft;
      if (!draft) return;
      const response = await this._command("delete_journal_entry", { entry_id: draft.entry_id, run_id: draft.run_id }, "Eintrag gelöscht");
      if (!response) return;
      this._deleteJournalDraft = null;
      this.render();
    }

    async _changeStage() {
      const draft = this._stageDraft;
      if (!draft) return;
      const response = await this._command("change_stage", {
        run_id: draft.run_id,
        target_stage: draft.stage,
        occurred_at: toIso(draft.occurred_at),
      }, `Phase zu ${draft.stage} geändert`);
      if (!response) return;
      this._stageDraft = null;
      this.render();
    }

    async _archiveRun() {
      const runId = this._archiveRunId;
      const response = await this._command("archive_run", { run_id: runId, occurred_at: new Date().toISOString() }, "Lauf archiviert");
      if (!response) return;
      this._archiveRunId = "";
      this._screen = "archive";
      this.render();
    }

    async _deleteRun() {
      const run = this._state.runs.find((item) => item.id === this._deleteRunId);
      const confirmation = this._deleteConfirmation;
      if (!run || confirmation !== this._runName(run)) return;
      const response = await this._command("delete_run", {
        run_id: run.id,
        confirmation_name: confirmation,
      }, "Lauf dauerhaft gelöscht");
      if (!response) return;
      this._deleteRunId = "";
      this._deleteConfirmation = "";
      this._screen = "archive";
      this.render();
    }

    render() {
      this.shadowRoot.innerHTML = `<style>${panelStyles}</style>${this._renderShell()}`;
    }
  }

  Object.assign(
    PlantRunDashboardPanel.prototype,
    createPanelViewMethods(),
    createPanelDialogMethods(),
  );
  customElements.define(TAG, PlantRunDashboardPanel);
})();
