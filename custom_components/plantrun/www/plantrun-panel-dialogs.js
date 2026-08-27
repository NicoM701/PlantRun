import {
  ENTRY_TYPES,
  METRICS,
  bindingsFor,
  cultivarName,
  dateTimeLocal,
  escapeHtml,
  plantName,
  runName,
} from "./plantrun-panel-domain.js?v=0.7.0";

const e = escapeHtml;

export function createPanelDialogMethods() {
  return {
    _renderDialogs() {
      return [
        this._renderCreateDialog(),
        this._renderJournalDrawer(),
        this._renderStageDialog(),
        this._renderBindingDialog(),
        this._renderArchiveDialog(),
        this._renderDeleteRunDialog(),
        this._renderDeleteJournalDialog(),
      ].join("");
    },

    _dialogClose(label = "Dialog schließen") {
      return `<button class="icon-button" data-action="close-dialog" type="button" aria-label="${e(label)}"><ha-icon icon="mdi:close"></ha-icon></button>`;
    },

    _renderCreateDialog() {
      if (!this._createOpen) return "";
      const step = this._createStep;
      return `<div class="dialog-layer"><button class="modal-backdrop" data-action="close-dialog" type="button" aria-label="Anlegen schließen"></button><section class="modal create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title">
        <header><div><span class="overline">Eine Pflanze · ein Lauf</span><h2 id="create-title">Neue Pflanze anlegen</h2></div>${this._dialogClose()}</header>
        <ol class="create-progress">
          <li class="${step === 1 ? "current" : step > 1 ? "done" : ""}"><b>1</b><span>1. Sorte und Pflanze</span></li>
          <li class="${step === 2 ? "current" : step > 2 ? "done" : ""}"><b>2</b><span>2. Ablauf und Sensoren</span></li>
          <li class="${step === 3 ? "current" : ""}"><b>3</b><span>3. Prüfen und anlegen</span></li>
        </ol>
        <div class="create-body">${step === 1 ? this._renderCreateIdentity() : step === 2 ? this._renderCreatePlan() : this._renderCreateReview()}</div>
        ${this._dialogError ? `<p class="dialog-error" role="alert">${e(this._dialogError)}</p>` : ""}
        <footer><button class="secondary" data-action="create-back" type="button" ${step === 1 ? "disabled" : ""}>Zurück</button><button class="primary" data-action="${step === 3 ? "submit-create" : "create-next"}" type="button" ${this._busy ? "disabled" : ""}>${step === 3 ? "Pflanze und Lauf anlegen" : "Weiter"}</button></footer>
      </section></div>`;
    },

    _renderCreateIdentity() {
      const draft = this._createDraft;
      return `<section class="create-step"><div class="step-copy"><h3>Sorte finden</h3><p>Suche wie im Web. Ein Ergebnis füllt nur bekannte Angaben aus. Die Suche blockiert das Anlegen nie.</p></div>
        <div class="search-row"><label class="field grow"><span>Strain</span><input data-create-field="strain" data-cultivar-search value="${e(draft.strain)}" placeholder="Zum Beispiel Tangerine Dream Auto" autocomplete="off" /></label><label class="field"><span>Breeder <small>für Suche</small></span><input data-create-field="breeder" value="${e(draft.breeder)}" placeholder="Breeder" autocomplete="off" /></label></div>
        ${this._cultivarSearching ? `<p class="search-state">SeedFinder wird durchsucht …</p>` : ""}
        ${this._cultivarResults.length ? `<div class="cultivar-search-results">${this._cultivarResults.map((item, index) => `<button class="${this._cultivarPreview === item ? "selected" : ""}" data-action="preview-cultivar" data-index="${index}" type="button" aria-pressed="${this._cultivarPreview === item}"><span><strong>${e(item.name || item.strain)}</strong><small>${e(item.breeder || draft.breeder || "Breeder nicht angegeben")}</small></span><ha-icon icon="mdi:arrow-right"></ha-icon></button>`).join("")}</div>` : draft.strain.length >= 2 && draft.breeder.length >= 2 && !this._cultivarSearching ? `<p class="search-state">Keine passenden Daten. <button data-action="manual-cultivar" type="button">Manuell fortfahren</button></p>` : ""}
        ${this._cultivarPreview ? this._renderCultivarPreview() : ""}
        <hr />
        <div class="form-grid"><label class="field"><span>Pflanzenname</span><input data-create-field="plant_name" value="${e(draft.plant_name)}" placeholder="Name der Pflanze" autocomplete="off" /></label><label class="field"><span>Spitzname <small>optional</small></span><input data-create-field="nickname" value="${e(draft.nickname)}" placeholder="Kurzer Anzeigename" autocomplete="off" /></label><label class="field"><span>Pflanzzeitpunkt</span><input data-create-field="planted_at" type="datetime-local" value="${e(draft.planted_at)}" /></label></div>
        <details class="optional-details"><summary>Topf, Erde und Lichtzyklus</summary><div class="form-grid"><label class="field"><span>Behälter</span><input data-create-field="container" value="${e(draft.container)}" placeholder="z. B. 7 L Endtopf" /></label><label class="field"><span>Substrat</span><input data-create-field="substrate" value="${e(draft.substrate)}" placeholder="z. B. All-Mix Erde" /></label><label class="field"><span>Lichtzyklus</span><input data-create-field="light_schedule" value="${e(draft.light_schedule)}" placeholder="z. B. 20:00 bis 14:00, 18/6" /></label></div></details>
      </section>`;
    },

    _renderCultivarPreview() {
      const item = this._cultivarPreview;
      const duration = item?.duration || {};
      const minimum = duration.min_days ?? duration.minimum_days ?? item?.min_days;
      const maximum = duration.max_days ?? duration.maximum_days ?? item?.max_days;
      const timing = minimum || maximum ? `${minimum ?? maximum}${maximum && maximum !== minimum ? ` bis ${maximum}` : ""} Tage` : "Nicht angegeben";
      const meaning = duration.meaning || item?.meaning || "Nicht angegeben";
      const startEvent = duration.start_event || item?.start_event || "Nicht angegeben";
      const source = duration.source || item?.detail_url || item?.source || "SeedFinder";
      const original = duration.original_text || item?.original_text || item?.original_wording || "";
      const imported = this._createDraft.selected_cultivar === item;
      return `<article class="cultivar-preview"><span class="overline">Vorschau der Quelle</span><strong>${e(item?.name || item?.strain || "Unbenannte Sorte")}</strong><dl><div><dt>Breeder</dt><dd>${e(item?.breeder || "Nicht angegeben")}</dd></div><div><dt>Zeitangabe</dt><dd>${e(timing)}</dd></div><div><dt>Bedeutung</dt><dd>${e(meaning)}</dd></div><div><dt>Start-Ereignis</dt><dd>${e(startEvent)}</dd></div><div><dt>Quelle</dt><dd>${e(source)}</dd></div></dl>${original ? `<p>${e(original)}</p>` : ""}${imported ? `<small>Angaben übernommen. Du kannst sie weiter bearbeiten.</small>` : `<button class="secondary" data-action="apply-cultivar" type="button">Angaben übernehmen</button>`}</article>`;
    },

    _renderCreatePlan() {
      const draft = this._createDraft;
      return `<section class="create-step"><div class="step-copy"><h3>Ablauf und Sensoren</h3><p>Germination unterstützt direkt gesäte, trockene Samen im Endtopf. Phasen lassen sich später frei wechseln.</p></div>
        <label class="field"><span>Startphase</span><select data-create-field="initial_stage">${["Germination", ...draft.stage_plan.filter((stage) => stage !== "Germination")].map((stage) => `<option value="${e(stage)}" ${draft.initial_stage === stage ? "selected" : ""}>${e(stage)}</option>`).join("")}</select></label>
        <fieldset class="stage-choice"><legend>Phasenplan</legend>${["Germination", "Seedling", "Vegetative", "Flowering", "Harvested"].map((stage) => `<label><input type="checkbox" data-create-stage="${e(stage)}" ${draft.stage_plan.includes(stage) ? "checked" : ""} ${stage === draft.initial_stage ? "disabled" : ""} /><span>${e(stage)}</span></label>`).join("")}</fieldset>
        <details class="optional-details"><summary>Zeitangabe der Quelle</summary><div class="form-grid"><label class="field"><span>Minimum in Tagen</span><input data-create-duration="min_days" type="number" min="1" value="${e(draft.duration.min_days)}" /></label><label class="field"><span>Maximum in Tagen</span><input data-create-duration="max_days" type="number" min="1" value="${e(draft.duration.max_days)}" /></label><label class="field"><span>Bedeutung</span><input data-create-duration="meaning" value="${e(draft.duration.meaning)}" placeholder="Samen bis Ernte" /></label><label class="field"><span>Start-Ereignis</span><input data-create-duration="start_event" value="${e(draft.duration.start_event)}" placeholder="Nach Keimung" /></label><label class="field"><span>Quelle</span><input data-create-duration="source" value="${e(draft.duration.source)}" placeholder="Breeder-Seite" /></label><label class="field wide"><span>Originalangabe</span><input data-create-duration="original_text" value="${e(draft.duration.original_text)}" /></label></div></details>
        <div class="sensor-create"><header><h3>Sensoren</h3><span>optional</span></header>${draft.bindings.map((binding, index) => `<div class="sensor-create-row"><select data-create-binding-metric="${index}">${METRICS.map((metric) => `<option value="${metric.key}" ${binding.metric_type === metric.key ? "selected" : ""}>${e(metric.label)}</option>`).join("")}</select><select data-create-binding-entity="${index}"><option value="">Nicht zuordnen</option>${this._sensorOptions(binding.metric_type, binding.entity_id)}</select><select data-create-binding-owner="${index}"><option value="plant" ${binding.owner_type === "plant" ? "selected" : ""}>Pflanze</option><option value="tent" ${binding.owner_type === "tent" ? "selected" : ""}>Growzelt</option></select><button class="icon-button" data-action="remove-create-binding" data-index="${index}" type="button" aria-label="Sensorzeile entfernen"><ha-icon icon="mdi:close"></ha-icon></button></div>`).join("")}<button class="quiet" data-action="add-create-binding" type="button"><ha-icon icon="mdi:plus"></ha-icon> Sensor hinzufügen</button></div>
      </section>`;
    },

    _renderCreateReview() {
      const draft = this._createDraft;
      return `<section class="create-step review-step"><div class="step-copy"><h3>Prüfen und anlegen</h3><p>PlantRun speichert die Pflanze und ihren Lauf gemeinsam.</p></div><dl><div><dt>Pflanze</dt><dd>${e(draft.nickname || draft.plant_name)}</dd></div><div><dt>Sorte</dt><dd>${e(draft.strain || "Nicht angegeben")}${draft.breeder ? ` · ${e(draft.breeder)}` : ""}</dd></div><div><dt>Zelt</dt><dd>${e(this._activeTent()?.name || "Growzelt")}</dd></div><div><dt>Gepflanzt</dt><dd>${e(new Date(draft.planted_at).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short" }))}</dd></div><div><dt>Behälter</dt><dd>${e(draft.container || "Nicht angegeben")}</dd></div><div><dt>Substrat</dt><dd>${e(draft.substrate || "Nicht angegeben")}</dd></div><div><dt>Lichtzyklus</dt><dd>${e(draft.light_schedule || "Nicht angegeben")}</dd></div><div><dt>Startphase</dt><dd>${e(draft.initial_stage)}</dd></div><div><dt>Sensoren</dt><dd>${draft.bindings.filter((binding) => binding.entity_id).length || "Keine"}</dd></div></dl></section>`;
    },

    _renderJournalAttachments(draft) {
      const attachments = Array.isArray(draft?.attachments) ? draft.attachments : [];
      return `<section class="journal-media"><div class="journal-media-heading"><div><span class="field-label">Fotos</span><p>Optional. PlantRun verkleinert Bilder vor dem Upload.</p></div><label class="attachment-upload"><span><ha-icon icon="mdi:camera-plus-outline"></ha-icon> Foto hinzufügen</span><input data-journal-files type="file" accept="image/jpeg,image/png,image/webp" multiple ${this._journalFileBusy || this._busy ? "disabled" : ""} /></label></div>${attachments.length ? `<div class="journal-attachment-editor">${attachments.map((attachment, index) => {
        const src = attachment?.preview || attachment?.url;
        return `<article class="journal-attachment-item">${src ? `<img src="${e(src)}" alt="${e(attachment.caption || attachment.file_name || "Journalfoto")}" />` : `<div class="attachment-placeholder"><ha-icon icon="mdi:image-outline"></ha-icon></div>`}<div><input data-journal-attachment-caption="${index}" value="${e(attachment.caption || "")}" placeholder="Bildunterschrift (optional)" aria-label="Bildunterschrift" /><small>${e(attachment.file_name || "Foto")}</small></div><button class="icon-button danger" data-action="remove-journal-attachment" data-index="${index}" type="button" aria-label="Foto entfernen"><ha-icon icon="mdi:close"></ha-icon></button></article>`;
      }).join("")}</div>` : `<p class="empty-copy">Du kannst hier später Bilder vom Zelt oder vom Handy anhängen.</p>`}</section>`;
    },

    _renderJournalDrawer() {
      if (!this._journalEditorOpen) return "";
      const draft = this._journalDraft;
      return `<div class="drawer-layer"><button class="modal-backdrop" data-action="close-journal-editor" type="button" aria-label="Editor schließen"></button><aside class="journal-drawer" role="dialog" aria-modal="true" aria-labelledby="journal-title"><header><div><span class="overline">Schnelle Erfassung</span><h2 id="journal-title">${draft.entry_id ? "Eintrag bearbeiten" : "Neuer Eintrag"}</h2></div><button class="icon-button" data-action="close-journal-editor" type="button" aria-label="Editor schließen"><ha-icon icon="mdi:close"></ha-icon></button></header><div class="drawer-body"><label class="field"><span>Pflanze</span><select data-journal-field="run_id">${this._state.runs.map((run) => `<option value="${e(run.id)}" ${draft.run_id === run.id ? "selected" : ""}>${e(plantName(run))}</option>`).join("")}</select></label><fieldset class="entry-types"><legend>Art</legend>${ENTRY_TYPES.map(([value,label,icon]) => `<button class="${draft.entry_type === value ? "selected" : ""}" data-action="set-journal-type" data-entry-type="${value}" type="button"><ha-icon icon="${icon}"></ha-icon>${label}</button>`).join("")}</fieldset><label class="field"><span>Was ist passiert?</span><textarea data-journal-field="text" rows="7" placeholder="Zum Beispiel: Erde angefeuchtet und den Samen leicht mit Wasser besprüht.">${e(draft.text)}</textarea></label><label class="field"><span>Zeitpunkt des Ereignisses</span><input data-journal-occurred-at data-journal-field="occurred_at" type="datetime-local" value="${e(draft.occurred_at)}" /></label>${this._renderJournalAttachments(draft)}<details class="sensor-context"><summary>Sensorkontext wird beim Speichern angehängt</summary><p>PlantRun übernimmt die zu diesem Zeitpunkt verfügbaren Werte. Du musst sie nicht abschreiben.</p></details>${this._dialogError ? `<p class="dialog-error" role="alert">${e(this._dialogError)}</p>` : ""}</div><footer><span>Strg + Enter speichert</span><button class="primary" data-action="save-journal-entry" type="button" ${this._busy || this._journalFileBusy ? "disabled" : ""}>Speichern</button></footer></aside></div>`;
    },

    _renderStageDialog() {
      if (!this._stageDraft) return "";
      return `<div class="dialog-layer"><button class="modal-backdrop" data-action="close-dialog" type="button" aria-label="Phasenwechsel schließen"></button><section class="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="stage-title"><header><div><span class="overline">Direkter Wechsel</span><h2 id="stage-title">Phase wechseln</h2></div>${this._dialogClose()}</header><div class="confirm-body"><p>Ausgewählte Zielphase</p><strong class="target-stage">${e(this._stageDraft.stage)}</strong><label class="field"><span>Wechselzeitpunkt</span><input data-stage-occurred-at type="datetime-local" value="${e(this._stageDraft.occurred_at)}" /></label><small>Jede Phase ist erlaubt, auch eine frühere oder eigene. Der bestätigte Wechsel bleibt im Verlauf.</small></div>${this._dialogError ? `<p class="dialog-error" role="alert">${e(this._dialogError)}</p>` : ""}<footer><button class="secondary" data-action="close-dialog" type="button">Abbrechen</button><button class="primary" data-action="confirm-stage-change" type="button">Zu ${e(this._stageDraft.stage)} wechseln</button></footer></section></div>`;
    },

    _renderBindingDialog() {
      if (!this._bindingEditorOpen) return "";
      const run = this._state.runs.find((item) => item.id === this._bindingDraft.run_id);
      const tent = this._activeTent();
      const active = bindingsFor(run, tent).filter((binding) => !binding?.ended_at);
      const draft = this._bindingDraft;
      return `<div class="dialog-layer"><button class="modal-backdrop" data-action="close-dialog" type="button" aria-label="Sensoren schließen"></button><section class="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="binding-title"><header><div><span class="overline">Datiert und austauschbar</span><h2 id="binding-title">Sensoren für ${e(plantName(run))}</h2></div>${this._dialogClose()}</header><div class="confirm-body"><p>Eine neue Zuordnung beendet die bisherige für diesen Messwert. Frühere Recorder-Daten bleiben beim richtigen Lauf.</p>${active.length ? `<div class="binding-list">${active.map((binding) => `<div class="sensor-create-row"><span><strong>${e(METRICS.find((metric) => metric.key === binding.metric_type)?.label || binding.metric_type)}</strong><small>${binding.owner_type === "tent" ? "Growzelt" : "Pflanze"} · ${e(binding.entity_id || binding.sensor_id)}</small></span><button class="quiet" data-action="clear-binding" data-owner-type="${e(binding.owner_type)}" data-metric="${e(binding.metric_type)}" type="button">Zuordnung beenden</button></div>`).join("")}</div>` : `<p class="empty-copy">Noch kein Sensor zugeordnet.</p>`}<div class="sensor-create-row"><select data-binding-field="metric_type">${METRICS.map((metric) => `<option value="${metric.key}" ${draft.metric_type === metric.key ? "selected" : ""}>${e(metric.label)}</option>`).join("")}</select><select data-binding-field="entity_id"><option value="">Sensor wählen</option>${this._sensorOptions(draft.metric_type, draft.entity_id)}</select><select data-binding-field="owner_type"><option value="plant" ${draft.owner_type === "plant" ? "selected" : ""}>Pflanze</option><option value="tent" ${draft.owner_type === "tent" ? "selected" : ""}>Growzelt</option></select></div></div>${this._dialogError ? `<p class="dialog-error" role="alert">${e(this._dialogError)}</p>` : ""}<footer><button class="secondary" data-action="close-dialog" type="button">Abbrechen</button><button class="primary" data-action="save-binding" type="button" ${this._busy ? "disabled" : ""}>Zuordnen</button></footer></section></div>`;
    },

    _renderArchiveDialog() {
      if (!this._archiveRunId) return "";
      const run = this._state.runs.find((item) => item.id === this._archiveRunId);
      return `<div class="dialog-layer"><button class="modal-backdrop" data-action="close-dialog" type="button"></button><section class="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="archive-title"><header><div><span class="overline">Lauf abschließen</span><h2 id="archive-title">${e(plantName(run))} archivieren?</h2></div>${this._dialogClose()}</header><div class="confirm-body"><p>Der Recorder-Zeitraum endet jetzt. Journal und alle PlantRun-Daten bleiben erhalten und später editierbar.</p></div><footer><button class="secondary" data-action="close-dialog" type="button">Abbrechen</button><button class="primary" data-action="confirm-archive" type="button">Abschließen und archivieren</button></footer></section></div>`;
    },

    _renderDeleteRunDialog() {
      if (!this._deleteRunId) return "";
      const run = this._state.runs.find((item) => item.id === this._deleteRunId);
      const name = this._runName(run);
      return `<div class="dialog-layer danger-layer"><button class="modal-backdrop" data-action="close-dialog" type="button"></button><section class="modal compact-modal danger-modal" role="dialog" aria-modal="true" aria-labelledby="delete-run-title"><header><div><span class="overline">Gefahrenbereich</span><h2 id="delete-run-title">Dauerhaft löschen</h2></div>${this._dialogClose()}</header><div class="confirm-body"><p>Diese Aktion kann nicht rückgängig gemacht werden.</p><p>Pflanze, Lauf, Phasen, Journal und PlantRun-Sensorzuordnungen verschwinden. Home Assistant Recorder-Daten gehören weiterhin Home Assistant und werden nicht gelöscht.</p><label class="field"><span>Tippe <b>${e(name)}</b> zur Bestätigung</span><input data-delete-confirmation autocomplete="off" value="${e(this._deleteConfirmation)}" /></label></div><footer><button class="secondary" data-action="close-dialog" type="button">Abbrechen</button><button class="danger-button" data-action="confirm-delete-run" type="button" ${this._deleteConfirmation === name ? "" : "disabled"}>Dauerhaft löschen</button></footer></section></div>`;
    },

    _renderDeleteJournalDialog() {
      if (!this._deleteJournalDraft) return "";
      return `<div class="dialog-layer"><button class="modal-backdrop" data-action="close-dialog" type="button"></button><section class="modal compact-modal" role="dialog" aria-modal="true" aria-labelledby="delete-entry-title"><header><h2 id="delete-entry-title">Journaleintrag löschen?</h2>${this._dialogClose()}</header><div class="confirm-body"><p>Der Eintrag wird dauerhaft aus diesem Lauf entfernt.</p></div><footer><button class="secondary" data-action="close-dialog" type="button">Abbrechen</button><button class="danger-button" data-action="confirm-delete-journal-entry" type="button">Eintrag löschen</button></footer></section></div>`;
    },
  };
}
