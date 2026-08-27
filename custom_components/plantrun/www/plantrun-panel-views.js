import {
  METRICS,
  bindingForMetric,
  bindingsFor,
  breederName,
  chartPath,
  chartStats,
  cultivarName,
  currentStage,
  daysSince,
  entityIdFor,
  escapeHtml,
  formatDate,
  harvestEstimate,
  isArchived,
  metricDefinition,
  plantName,
  recordedStages,
  runEnd,
  runName,
  runStart,
  stagePlan,
  targetFor,
} from "./plantrun-panel-domain.js?v=0.8.0";

const e = escapeHtml;

function plantImage(run) {
  const coverId = run?.plant?.cover_attachment_id || run?.base_config?.cover_attachment_id;
  const cover = (Array.isArray(run?.journal_entries) ? run.journal_entries : [])
    .flatMap((entry) => Array.isArray(entry?.attachments) ? entry.attachments : [])
    .find((attachment) => attachment?.id === coverId);
  return cover?.url
    || run?.plant?.image
    || run?.plant?.image_url
    || run?.image_url
    || run?.plant?.cultivar?.image_url
    || run?.cultivar?.image_url
    || "";
}

function imageMarkup(run, className = "plant-photo") {
  const src = plantImage(run);
  if (src) return `<img class="${className}" src="${e(src)}" alt="${e(plantName(run))}" loading="lazy" />`;
  return `<div class="${className} photo-empty"><ha-icon icon="mdi:sprout-outline"></ha-icon><span>Noch kein Pflanzenfoto</span></div>`;
}

function statusText(value, target) {
  if (!Number.isFinite(value)) return { key: "missing", label: "Kein aktueller Wert" };
  if (!target) return { key: "neutral", label: "Ohne Zielbereich" };
  return value >= target.minimum && value <= target.maximum
    ? { key: "good", label: "Im Zielbereich" }
    : { key: "warn", label: "Außerhalb des Zielbereichs" };
}

export function createPanelViewMethods() {
  return {
    _renderShell() {
      const tent = this._activeTent();
      const tentName = tent?.name || "Growzelt";
      const active = this._state.runs.filter((run) => !isArchived(run));
      return `<div class="app theme-${e(this._theme)}">
        <aside class="desktop-rail" aria-label="PlantRun Navigation">
          <button class="rail-brand ${this._versionPeek ? "version-peek" : ""}" data-action="navigate" data-screen="overview" type="button" aria-label="${e(this._versionPeek ? `PlantRun ${this._versionLabel()}` : "PlantRun Startseite")}">
            <span class="brand-flip">
              <span class="brand-face brand-front" aria-hidden="${this._versionPeek ? "true" : "false"}"><span class="brand-leaf"><ha-icon icon="mdi:sprout"></ha-icon></span></span>
              <span class="brand-face brand-back" aria-hidden="${this._versionPeek ? "false" : "true"}"><span class="brand-version"><b>${e(this._versionLabel())}</b><small>${e(this._versionBuildLabel())}</small></span></span>
            </span><span class="brand-name">PlantRun</span>
          </button>
          <nav>
            ${this._navButton("overview", "mdi:greenhouse", tentName)}
            ${this._navButton("journal", "mdi:notebook-outline", "Journal")}
            ${this._navButton("archive", "mdi:archive-outline", "Archiv")}
          </nav>
          <button class="rail-utility" data-action="toggle-theme" type="button" title="Darstellung wechseln"><ha-icon icon="${this._theme === "dark" ? "mdi:white-balance-sunny" : "mdi:weather-night"}"></ha-icon><span>Darstellung</span></button>
        </aside>
        <div class="page-frame">
          <header class="topbar">
            <div><span class="overline">${e(tentName)}</span><strong>${active.length} aktive ${active.length === 1 ? "Pflanze" : "Pflanzen"}</strong></div>
            <button class="primary" data-action="open-create" type="button"><ha-icon icon="mdi:plus"></ha-icon> Neue Pflanze</button>
          </header>
          <main id="main-content">
            ${this._loading ? this._renderLoading() : this._error ? this._renderError() : this._renderScreen()}
          </main>
        </div>
        <nav class="mobile-nav" aria-label="PlantRun Navigation">
          ${this._navButton("overview", "mdi:greenhouse", "Zelt")}
          ${this._navButton("journal", "mdi:notebook-outline", "Journal")}
          ${this._navButton("archive", "mdi:archive-outline", "Archiv")}
        </nav>
        ${this._busy ? `<div class="busy-line" role="status"><span></span>PlantRun speichert</div>` : ""}
        ${this._toast ? `<div class="toast" role="status">${e(this._toast)}</div>` : ""}
        ${this._renderDialogs()}
      </div>`;
    },

    _navButton(screen, icon, label) {
      const selected = this._screen === screen || (screen === "overview" && this._screen === "run");
      return `<button class="nav-button ${selected ? "selected" : ""}" data-action="navigate" data-screen="${screen}" type="button" ${selected ? 'aria-current="page"' : ""}><ha-icon icon="${icon}"></ha-icon><span>${e(label)}</span></button>`;
    },

    _renderLoading() {
      return `<section class="system-state" aria-live="polite"><ha-icon icon="mdi:sprout"></ha-icon><h1>PlantRun wird geladen</h1><p>Home Assistant liest Zelt, Pflanzen und Journal.</p></section>`;
    },

    _renderError() {
      return `<section class="system-state error" role="alert"><ha-icon icon="mdi:cloud-alert-outline"></ha-icon><h1>PlantRun ist gerade nicht erreichbar</h1><p>${e(this._error)}</p><button class="secondary" data-action="reload" type="button">Erneut versuchen</button></section>`;
    },

    _renderScreen() {
      if (this._screen === "run") return this._renderRunWorkspace();
      if (this._screen === "journal") return this._renderJournal();
      if (this._screen === "archive") return this._renderArchive();
      return this._renderOverview();
    },

    _renderOverview() {
      const tent = this._activeTent();
      const runs = this._state.runs.filter((run) => !isArchived(run));
      return `<section class="tent-overview">
        <header class="page-heading">
          <div><span class="overline">Heute im Zelt</span><h1>${e(tent?.name || "Growzelt")}</h1><p>Deine Pflanzen stehen im Mittelpunkt. Geteilte Zeltwerte bleiben eine ruhige Zeile darüber.</p></div>
          <button class="quiet" data-action="navigate" data-screen="journal" type="button">Journal öffnen <ha-icon icon="mdi:arrow-right"></ha-icon></button>
        </header>
        ${this._renderTentStrip(tent)}
        ${runs.length ? `<div class="plant-gallery">${runs.map((run) => this._renderPlantCard(run)).join("")}</div>` : this._renderEmptyGarden()}
      </section>`;
    },

    _renderTentStrip(tent) {
      const metrics = ["temperature", "humidity", "light", "energy"];
      const bindings = Array.isArray(tent?.bindings) ? tent.bindings : [];
      const rows = metrics.map((metric) => {
        const binding = bindings.find((item) => item?.metric_type === metric && !item?.ended_at);
        const entityId = entityIdFor(binding);
        const live = this._entityDisplay(entityId);
        const label = metric === "temperature" ? "Temperatur" : metric === "humidity" ? "Luftfeuchte" : metric === "light" ? "Licht" : "Energie";
        return `<div class="tent-reading"><span>${label}</span><strong>${e(live.value)}</strong><small>${entityId ? e(live.status) : "Nicht zugeordnet"}</small></div>`;
      });
      return `<section class="tent-strip" aria-label="Geteilte Zeltwerte">${rows.join("")}</section>`;
    },

    _renderPlantCard(run) {
      const stage = currentStage(run);
      return `<article class="plant-card">
        <button class="plant-card-main" data-action="open-run" data-run-id="${e(run.id)}" type="button">
          ${imageMarkup(run, "plant-card-photo")}
          <span class="plant-card-body">
            <span class="stage-label">${e(stage)}</span>
            <strong>${e(plantName(run))}</strong>
            <small>${e(cultivarName(run))}${breederName(run) ? ` · ${e(breederName(run))}` : ""}</small>
            <span class="plant-card-meta"><span>Tag ${daysSince(runStart(run))}</span><span><b>Nächste Schätzung</b>${e(harvestEstimate(run))}</span></span>
          </span>
        </button>
        <button class="journal-direct" data-action="open-journal-editor" data-run-id="${e(run.id)}" type="button"><ha-icon icon="mdi:plus"></ha-icon> Eintrag</button>
      </article>`;
    },

    _renderEmptyGarden() {
      return `<section class="empty-garden"><ha-icon icon="mdi:sprout-outline"></ha-icon><h2>Noch keine Pflanze</h2><p>Ein Durchlauf legt genau eine Pflanze an. Sensoren und Sortendaten kannst du später ergänzen.</p><button class="primary" data-action="open-create" type="button">Erste Pflanze anlegen</button></section>`;
    },

    _renderRunWorkspace() {
      const run = this._selectedRun();
      if (!run) return this._renderEmptyGarden();
      const stage = currentStage(run);
      const latest = run.journal_entries?.[0];
      return `<section class="run-workspace">
        <button class="back-button" data-action="navigate" data-screen="overview" type="button"><ha-icon icon="mdi:arrow-left"></ha-icon> ${e(this._activeTent()?.name || "Growzelt")}</button>
        <header class="workspace-identity">
          ${imageMarkup(run, "workspace-photo")}
          <div><span class="stage-label">${e(stage)} · Tag ${daysSince(runStart(run))}</span><h1>${e(plantName(run))}</h1><p>${e(cultivarName(run))}${breederName(run) ? ` · ${e(breederName(run))}` : ""}</p></div>
          <button class="primary" data-action="open-journal-editor" data-run-id="${e(run.id)}" type="button"><ha-icon icon="mdi:notebook-plus-outline"></ha-icon> Eintrag</button>
        </header>
        ${this._renderLifecycle(run)}
        ${this._renderRecorderWorkspace(run)}
        ${this._renderFacts(run)}
        <section class="latest-entry">
          <header><div><span class="overline">Journal</span><h2>Letzter Journaleintrag</h2></div><button class="quiet" data-action="navigate" data-screen="journal" type="button">Alle Einträge</button></header>
          ${latest ? this._renderJournalEntry(latest, run, true) : `<p class="empty-copy">Noch kein Eintrag. Sensordaten und feste Daten laufen trotzdem weiter.</p>`}
        </section>
        <footer class="run-footer">
          ${isArchived(run) ? `<span>Archiviert am ${e(formatDate(runEnd(run)))}</span>` : `<button class="secondary" data-action="request-archive" data-run-id="${e(run.id)}" type="button">Lauf abschließen und archivieren</button>`}
          <button class="danger-link" data-action="request-delete-run" data-run-id="${e(run.id)}" type="button">Dauerhaft löschen</button>
        </footer>
      </section>`;
    },

    _renderLifecycle(run) {
      const active = currentStage(run);
      const plan = stagePlan(run);
      const recorded = recordedStages(run);
      return `<section class="lifecycle-panel"><header><div><span class="overline">Lebenszyklus</span><h2>${e(active)}</h2></div><span>Schätzung: ${e(harvestEstimate(run))}</span></header><div class="lifecycle-rail">${plan.map((stage) => `<button class="stage-target ${stage.toLowerCase() === active.toLowerCase() ? "current" : recorded.has(stage.toLowerCase()) ? "past" : "future"}" data-action="select-stage" data-stage="${e(stage)}" type="button"><i></i><span>${e(stage)}</span></button>`).join("")}</div></section>`;
    },

    _renderRecorderWorkspace(run) {
      const tent = this._activeTent();
      const metric = metricDefinition(this._selectedMetric);
      const binding = bindingForMetric(run, tent, metric.key);
      const entityId = entityIdFor(binding);
      const live = this._entityDisplay(entityId);
      const numeric = Number(live.raw);
      const target = targetFor(run, metric.key);
      const status = statusText(numeric, target);
      const stats = chartStats(this._historyPoints);
      return `<section class="recorder-workspace">
        <nav class="environment-list" aria-label="Messwert wählen">${METRICS.map((item) => {
          const itemBinding = bindingForMetric(run, tent, item.key);
          const itemLive = this._entityDisplay(entityIdFor(itemBinding));
          return `<button class="environment-row ${item.key === metric.key ? "selected" : ""}" data-action="select-metric" data-metric="${item.key}" type="button"><ha-icon icon="${item.icon}"></ha-icon><span><strong>${e(item.label)}</strong><small>${itemBinding ? (itemBinding.owner_type === "tent" ? "Zelt" : "Pflanze") : "Nicht zugeordnet"}</small></span><b>${e(itemLive.value)}</b></button>`;
        }).join("")}</nav>
        <div class="chart-panel">
          <header class="chart-heading"><div><span class="overline">Recorder-Verlauf</span><h2>${e(metric.label)}</h2></div><div class="current-reading"><strong>${e(live.value)}</strong><span class="assessment ${status.key}">${e(status.label)}</span><button class="quiet" data-action="open-binding-editor" data-run-id="${e(run.id)}" type="button">Sensoren verwalten</button></div></header>
          ${this._renderChart(entityId)}
          <div class="chart-context">
            <span><b>Zielbereich</b>${target ? `${target.minimum}–${target.maximum} ${e(metric.unit)}` : "Noch nicht festgelegt"}</span>
            <span><b>Letztes Ereignis</b>${run.journal_entries?.[0] ? e(formatDate(run.journal_entries[0].occurred_at, true)) : "Noch kein Eintrag"}</span>
            <span><b>Minimum</b>${stats ? `${stats.minimum.toFixed(1)} ${e(metric.unit)}` : "–"}</span>
            <span><b>Durchschnitt</b>${stats ? `${stats.average.toFixed(1)} ${e(metric.unit)}` : "–"}</span>
            <span><b>Maximum</b>${stats ? `${stats.maximum.toFixed(1)} ${e(metric.unit)}` : "–"}</span>
          </div>
        </div>
      </section>`;
    },

    _renderChart(entityId) {
      if (this._historyLoading) return `<div class="chart-state"><ha-icon icon="mdi:loading"></ha-icon>Recorder-Daten werden geladen</div>`;
      const path = chartPath(this._historyPoints);
      if (!entityId) return `<div class="chart-state"><span>Kein Sensor zugeordnet.</span><small>Ordne diesen Messwert später der Pflanze oder dem Zelt zu.</small></div>`;
      if (!path) return `<div class="chart-state"><span>Noch kein Recorder-Verlauf.</span><small>PlantRun zeichnet keine erfundenen Messwerte.</small></div>`;
      return `<div class="chart-wrap" role="img" aria-label="Recorder-Verlauf mit ${this._historyPoints.length} Messpunkten"><svg viewBox="0 0 720 220" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="55" x2="720" y2="55"></line><line x1="0" y1="110" x2="720" y2="110"></line><line x1="0" y1="165" x2="720" y2="165"></line><path d="${path}"></path></svg></div>`;
    },

    _renderFacts(run) {
      const duration = run?.duration || run?.plant?.duration || run?.plant?.strain?.duration || {};
      const light = run?.light_schedule || run?.tent?.light_schedule || this._activeTent()?.light_schedule;
      const container = typeof run?.plant?.container === "string" ? run.plant.container : run?.plant?.container?.label || run?.container;
      return `<section class="facts-strip"><header><span class="overline">Feste Daten</span><h2>Grundlage dieses Laufs</h2></header><dl>
        <div><dt>Gepflanzt</dt><dd>${e(formatDate(runStart(run)))}</dd></div>
        <div><dt>Behälter</dt><dd>${e(container || "Nicht erfasst")}</dd></div>
        <div><dt>Substrat</dt><dd>${e(run?.plant?.substrate || run?.substrate || "Nicht erfasst")}</dd></div>
        <div><dt>Lichtzyklus</dt><dd>${e(typeof light === "string" ? light : light?.label || "Nicht erfasst")}</dd></div>
        <div><dt>Breeder-Angabe</dt><dd>${e(duration?.original_text || duration?.original_wording || harvestEstimate(run))}</dd></div>
      </dl></section>`;
    },

    _renderJournal() {
      const activeRuns = this._state.runs.filter((run) => !isArchived(run));
      const linkedEntries = this._state.runs.flatMap((run) => (run.journal_entries || []).map((entry) => ({ entry, run })));
      const tentEntries = (this._state.journal_entries || [])
        .filter((entry) => !(entry.run_ids || []).length && !entry.run_id)
        .map((entry) => ({ entry, run: null }));
      const allEntries = [...linkedEntries, ...tentEntries]
        .filter(({ entry, run }) => (!this._journalPlantFilter || run?.id === this._journalPlantFilter) && (!this._journalTypeFilter || String(entry.entry_type || "").toLowerCase() === this._journalTypeFilter))
        .sort((a, b) => Date.parse(b.entry.occurred_at || 0) - Date.parse(a.entry.occurred_at || 0));
      return `<section class="journal-screen"><header class="page-heading"><div><span class="overline">Verlauf zuerst</span><h1>Journal</h1><p>Chronologisch, mit dem Zeitpunkt des Ereignisses und dem damals angehängten Home-Assistant-Kontext.</p></div><button class="primary" data-action="open-journal-editor" data-run-id="${e(this._journalPlantFilter || activeRuns[0]?.id || "")}" type="button"><ha-icon icon="mdi:plus"></ha-icon> Neuer Eintrag</button></header>
        <div class="journal-filters"><label><span>Pflanze</span><select data-journal-filter="plant"><option value="">Alle Pflanzen</option>${this._state.runs.map((run) => `<option value="${e(run.id)}" ${this._journalPlantFilter === run.id ? "selected" : ""}>${e(plantName(run))}</option>`).join("")}</select></label><label><span>Art</span><select data-journal-filter="type"><option value="">Alle Arten</option>${[["water","Gießen"],["inspect","Prüfen"],["stage_change","Phase ändern"],["harvest","Ernten"],["free_text","Freitext"]].map(([value,label]) => `<option value="${value}" ${this._journalTypeFilter === value ? "selected" : ""}>${label}</option>`).join("")}</select></label></div>
        <div class="journal-history">${allEntries.length ? allEntries.map(({ entry, run }) => this._renderJournalEntry(entry, run)).join("") : `<section class="empty-journal"><h2>Noch keine Einträge in dieser Auswahl</h2><p>Ein ungemessener Wassereintrag ist vollständig. Mengen bleiben optional.</p></section>`}</div>
      </section>`;
    },

    _renderJournalEntry(entry, run, compact = false) {
      const context = entry?.sensor_snapshot || entry?.sensor_context || entry?.context || {};
      const contextRows = Object.entries(context).filter(([key, value]) => key !== "captured_at" && value !== null && typeof value !== "object");
      const target = run ? plantName(run) : this._activeTent()?.name || "Growzelt";
      const attachments = Array.isArray(entry?.attachments) ? entry.attachments : [];
      const coverId = run?.plant?.cover_attachment_id || run?.base_config?.cover_attachment_id || "";
      const media = attachments.length ? `<div class="journal-attachments" aria-label="Fotos im Journaleintrag">${attachments.map((attachment) => {
        const src = attachment?.url;
        if (!src) return "";
        const isCover = attachment.id && attachment.id === coverId;
        return `<figure class="journal-attachment"><img src="${e(src)}" alt="${e(attachment.caption || attachment.file_name || "Journalfoto")}" loading="lazy" /><figcaption><span>${e(attachment.caption || attachment.file_name || "Foto")}</span><small class="attachment-meta">${e(formatDate(attachment.captured_at))} · ${e(attachment.source === "upload" ? "Upload" : attachment.source || "Quelle unbekannt")}</small>${isCover ? `<small class="cover-badge">Pflanzenbild</small>` : ""}${run && attachment.id ? (isCover ? `<button class="quiet" data-action="clear-plant-cover" data-run-id="${e(run.id)}" type="button">Pflanzenbild entfernen</button>` : `<button class="quiet" data-action="set-plant-cover" data-run-id="${e(run.id)}" data-attachment-id="${e(attachment.id)}" type="button">Als Pflanzenbild verwenden</button>`) : ""}</figcaption></figure>`;
      }).join("")}</div>` : "";
      return `<article class="journal-entry ${compact ? "compact" : ""}"><span class="entry-time"><b>${e(formatDate(entry?.occurred_at || entry?.created_at, true))}</b><small>${e(target)}</small></span><div class="entry-copy"><span class="entry-type">${e(this._entryTypeLabel(entry?.entry_type))}</span><p>${e(entry?.text || entry?.description || "Eintrag ohne Text")}</p>${media}${contextRows.length ? `<details><summary>${contextRows.length} Sensorwerte angehängt</summary><dl>${contextRows.map(([key, value]) => `<div><dt>${e(key)}</dt><dd>${e(value)}</dd></div>`).join("")}</dl></details>` : ""}</div>${compact ? "" : `<div class="entry-actions">${run ? `<button class="icon-button" data-action="edit-journal-entry" data-run-id="${e(run.id)}" data-entry-id="${e(entry.id)}" type="button" aria-label="Eintrag bearbeiten"><ha-icon icon="mdi:pencil-outline"></ha-icon></button>` : ""}<button class="icon-button danger" data-action="request-delete-journal-entry" data-run-id="${e(run?.id || "")}" data-entry-id="${e(entry.id)}" type="button" aria-label="Eintrag löschen"><ha-icon icon="mdi:trash-can-outline"></ha-icon></button></div>`}</article>`;
    },

    _renderArchive() {
      const runs = this._state.runs.filter(isArchived).sort((a, b) => Date.parse(runEnd(b) || 0) - Date.parse(runEnd(a) || 0));
      return `<section class="archive-screen"><header class="page-heading"><div><span class="overline">Dauerhafte Historie</span><h1>Archiv</h1><p>Abgeschlossene Läufe bleiben vollständig lesbar und werden nicht automatisch entfernt.</p></div></header>${runs.length ? `<div class="archive-list">${runs.map((run) => `<article><button data-action="open-run" data-run-id="${e(run.id)}" type="button">${imageMarkup(run, "archive-photo")}<span><strong>${e(plantName(run))}</strong><small>${e(cultivarName(run))}</small></span><span><b>${daysSince(runStart(run), runEnd(run))}</b><small>Tage</small></span><span><b>${run.journal_entries?.length || 0}</b><small>Einträge</small></span><ha-icon icon="mdi:arrow-right"></ha-icon></button></article>`).join("")}</div>` : `<section class="empty-journal"><h2>Das Archiv ist noch leer</h2><p>Ein abgeschlossener Lauf erscheint hier und bleibt erhalten.</p></section>`}</section>`;
    },

    _entryTypeLabel(value) {
      const normalized = String(value || "").toLowerCase();
      return normalized === "water" ? "Gießen" : normalized === "stage_change" ? "Phase geändert" : normalized === "inspect" ? "Prüfung" : normalized === "harvest" ? "Ernte" : normalized === "planting" ? "Einpflanzen" : normalized === "lighting" ? "Licht" : "Freitext";
    },
  };
}
