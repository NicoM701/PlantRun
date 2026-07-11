import { METRICS, historyWindowForRun } from "./plantrun-panel-domain.js?v=0.4.1";

export function createPanelDialogMethods(S) {
  return {
    _renderWizard() {
      if (!this._wizardOpen) return "";
      return `
        <div class="overlay">
          <button class="overlay-backdrop" data-action="close-wizard" type="button" aria-label="Close new run dialog"></button>
          <section class="modal wizard-modal" data-modal-card>
            <header>
              <div><span class="eyebrow">Guided setup</span><h2>Create a new run</h2></div>
              <button class="icon-button" data-action="close-wizard" type="button" title="Close">${S.icon("mdi:close")}</button>
            </header>
            <div class="wizard-progress" aria-label="Setup progress">
              ${[[1, "Run"], [2, "Plants"], [3, "Cultivar"], [4, "Sensors"]].map(([step, label]) => `<div class="${step === this._wizardStep ? "current" : step < this._wizardStep ? "done" : ""}"><span>${step < this._wizardStep ? S.icon("mdi:check") : step}</span><small>${label}</small></div>`).join("")}
            </div>
            ${this._wizardStep === 1 ? this._renderWizardBasics() : this._wizardStep === 2 ? this._renderWizardPlants() : this._wizardStep === 3 ? this._renderWizardCultivar() : this._renderWizardSensors()}
            ${this._wizardError ? `<p class="form-error" role="alert">${S.icon("mdi:alert-circle-outline")} ${S.escapeHtml(this._wizardError)}</p>` : ""}
            <footer>
              <button class="ghost" data-action="wizard-back" type="button" ${this._wizardStep === 1 ? "disabled" : ""}>${S.icon("mdi:arrow-left")} Back</button>
              <button class="primary" data-action="${this._wizardStep === 4 ? "create-run" : "wizard-next"}" type="button">${this._wizardStep === 4 ? `${S.icon("mdi:sprout")} Create run` : `Continue ${S.icon("mdi:arrow-right")}`}</button>
            </footer>
          </section>
        </div>
      `;
    },

    _renderWizardPlants() {
      const plantRows = this._wizard.plants.map((plant, index) => `<div class="inline-field"><input data-wizard-plant="${index}" value="${S.escapeHtml(plant)}" placeholder="Plant ${index + 1} name (optional)" autocomplete="off" /><button class="icon-button danger" data-action="remove-wizard-plant" data-index="${index}" type="button" title="Remove plant">${S.icon("mdi:minus")}</button></div>`).join("");
      const phases = this._wizard.phase_plan.map((phase, index) => `<span class="editable-chip">${S.icon("mdi:circle-small")} ${S.escapeHtml(phase)}<button data-action="remove-wizard-phase" data-index="${index}" type="button" title="Remove phase">${S.icon("mdi:close")}</button></span>`).join("");
      return `<div class="step-intro"><span class="step-icon">${S.icon("mdi:flower-tulip-outline")}</span><div><strong>Shape this run</strong><p>Name one or several plants and choose the lifecycle that fits your method. Both stay editable later.</p></div></div>
        <div class="setup-columns"><section><span class="field-title">Plants</span><div class="stacked-fields">${plantRows}</div><button class="ghost" data-action="add-wizard-plant" type="button">${S.icon("mdi:plus")} Add plant</button></section><section><span class="field-title">Phase plan</span><div class="editable-chips">${phases}</div><div class="inline-field"><input data-wizard-new-phase placeholder="Add Drying, Curing…" autocomplete="off" /><button class="ghost" data-action="add-wizard-phase" type="button">Add</button></div></section></div>`;
    },

    _renderWizardBasics() {
      return `
        <div class="step-intro"><span class="step-icon">${S.icon("mdi:sprout-outline")}</span><div><strong>Start with the essentials</strong><p>Name the run so you can recognize it later. Today is preselected, but past starts work too.</p></div></div>
        <div class="form-grid">
          <label><span>Run name <em>Required</em></span><input data-wizard-field="friendly_name" value="${S.escapeHtml(this._wizard.friendly_name)}" placeholder="Amnesia · Summer 2026" autocomplete="off" /></label>
          <label><span>Planted date</span><input data-wizard-field="planted_date" value="${S.escapeHtml(this._wizard.planted_date)}" type="date" /></label>
        </div>
        <p class="hint">Keep step 1 dead simple. Name it, set the plant date, move on.</p>
      `;
    },

    _renderWizardCultivar() {
      const targetDays = this._wizard.target_days || this._derivedTargetDays();
      return `
        <div class="step-intro"><span class="step-icon">${S.icon("mdi:seed-outline")}</span><div><strong>Add cultivar details</strong><p>Optional. Pick a SeedFinder result to prefill the estimated duration, or enter your own cultivar.</p></div></div>
        <div class="form-grid">
          <label><span>Breeder</span><input data-wizard-field="breeder" value="${S.escapeHtml(this._wizard.breeder)}" placeholder="Breeder" autocomplete="off" /></label>
          <label class="search-field"><span>Strain</span>
            <input data-wizard-field="cultivar_name" data-cultivar-input value="${S.escapeHtml(this._wizard.cultivar_name)}" placeholder="Start typing to search SeedFinder" autocomplete="off" />
            <div class="suggestions" data-suggestions>${this._suggestionMarkup()}</div>
          </label>
        </div>
        <p class="hint">Estimated total run duration: <strong>${S.escapeHtml(targetDays || "Will be derived from SeedFinder when available")}</strong></p>
      `;
    },

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
        <div class="step-intro"><span class="step-icon">${S.icon("mdi:access-point")}</span><div><strong>Connect live sensors</strong><p>Optional. PlantRun links to Home Assistant entities and Recorder history without copying their data.</p></div></div>
        <div class="binding-editor">
          ${rows}
          <button class="ghost" data-action="add-wizard-binding" type="button">${S.icon("mdi:plus")} Add another sensor</button>
        </div>
      `;
    },

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
    },

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
    },

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
    },

    _renderNoteModal() {
      if (!this._noteEditor) return "";
      const isNew = !this._noteEditor.note_id;
      return `
        <div class="overlay">
          <button class="overlay-backdrop" data-action="close-note-edit" type="button" aria-label="Close note dialog"></button>
          <section class="modal compact" data-modal-card>
            <header>
              <div><span class="eyebrow">Grow log</span><h2>${isNew ? "New note" : "Edit note"}</h2></div>
              <button class="icon-button" data-action="close-note-edit" type="button" title="Close">${S.icon("mdi:close")}</button>
            </header>
            <div class="form-grid">
              <label class="wide"><span>Note</span><textarea data-note-edit-text rows="5">${S.escapeHtml(this._noteEditor.text || "")}</textarea></label>
            </div>
            <footer>
              <button class="ghost" data-action="close-note-edit" type="button">Cancel</button>
              <button class="primary" data-action="save-note-edit" type="button">${isNew ? "Add note" : "Save note"}</button>
            </footer>
          </section>
        </div>
      `;
    },

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
    },

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
              <label class="wide search-field"><span>Strain</span>
                <input data-detail-field="cultivar_name" data-detail-cultivar-input value="${S.escapeHtml(this._detailDraft.cultivar_name || "")}" placeholder="Start typing to search SeedFinder" autocomplete="off" />
                <div class="suggestions" data-detail-suggestions>${this._detailSuggestionMarkup()}</div>
              </label>
              <label><span>Dry yield (g)</span><input data-detail-field="dry_yield_grams" value="${S.escapeHtml(this._detailDraft.dry_yield_grams ?? "")}" type="number" min="0" step="0.1" /></label>
              <label class="wide"><span>Plants <em>Comma separated</em></span><input data-detail-field="plants_text" value="${S.escapeHtml(this._detailDraft.plants_text || "")}" placeholder="Khaled, Bobbi, Jackie" /></label>
              <label class="wide"><span>Phase plan <em>Comma separated</em></span><input data-detail-field="phase_plan_text" value="${S.escapeHtml(this._detailDraft.phase_plan_text || "")}" placeholder="Seedling, Vegetative, Flowering, Drying, Curing, Harvested" /></label>
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
    },

    _bindingHistory(run, binding) {
      return Array.isArray(run?.sensor_history?.[binding?.metric_type]) ? run.sensor_history[binding.metric_type] : [];
    },

    _historyWindow(run) {
      return historyWindowForRun(run);
    },

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
    },

    _renderHistoryInspector() {
      const panel = this._historyInspector;
      if (!panel) return "";
      const run = this._runs.find((item) => item.id === panel.run_id);
      const binding = run?.bindings?.find((item) => item.id === panel.binding_id || item.sensor_id === panel.entity_id);
      const context = panel.context || this._fallbackHistoryContext(run, binding, panel.entity_id);
      const summary = context.orphaned
        ? "The linked sensor is no longer available in Home Assistant. Its Recorder history may still exist."
        : "PlantRun keeps only this run window and entity link. The chart and every sensor sample stay in Home Assistant Recorder.";
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
              <p class="hint">Open the native History panel to load this entity from planting through harvest. Long-pressing a metric opens the regular entity details.</p>
              ${panel.loading ? `<p class="hint">Loading recorder context…</p>` : ""}
              ${panel.error ? `<p class="hint error-text">${S.escapeHtml(panel.error)}</p>` : ""}
            </div>
            <div class="recorder-callout">${S.icon("mdi:database-clock-outline")}<div><strong>Recorder-first by design</strong><span>No duplicate time-series data is stored by PlantRun.</span></div></div>
            <footer>
              <button class="ghost" data-action="open-history-entity" data-entity-id="${S.escapeHtml(panel.entity_id)}" type="button">${S.icon("mdi:open-in-app")} Open entity details</button>
              <button class="ghost" data-action="open-native-history" data-entity-id="${S.escapeHtml(panel.entity_id)}" type="button">${S.icon("mdi:chart-timeline-variant")} Open native history</button>
              <button class="primary" data-action="close-history" type="button">Done</button>
            </footer>
          </section>
        </div>
      `;
    },

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
    },

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
    },

    _renderEndRunModal() {
      const pending = this._endRunConfirm;
      if (!pending) return "";
      return `
        <div class="overlay" role="dialog" aria-modal="true" aria-label="Finish run">
          <button class="overlay-backdrop" data-action="close-end-run" type="button" aria-label="Close finish run dialog"></button>
          <section class="modal compact end-run-modal" data-modal-card>
            <header>
              <div><span class="eyebrow">Harvest & archive</span><h2>Finish ${S.escapeHtml(pending.run_name)}?</h2></div>
              <button class="icon-button" data-action="close-end-run" type="button" title="Close">${S.icon("mdi:close")}</button>
            </header>
            <div class="step-intro"><span class="step-icon">${S.icon("mdi:scale-balance")}</span><div><strong>Close the run window</strong><p>The end time is saved now. Linked sensor charts will use planting through this moment.</p></div></div>
            <div class="form-grid single-column">
              <label><span>Dry harvest yield (g)</span><input data-end-run-yield value="${S.escapeHtml(pending.dry_yield_grams ?? "")}" type="number" min="0" step="0.1" placeholder="Optional" /></label>
            </div>
            <footer>
              <button class="ghost" data-action="close-end-run" type="button">Cancel</button>
              <button class="primary" data-action="confirm-end-run" type="button">${S.icon("mdi:archive-arrow-down-outline")} Finish & archive</button>
            </footer>
          </section>
        </div>
      `;
    }
  };
}
