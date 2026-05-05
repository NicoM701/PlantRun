(() => {
  const PANEL_TAG = "plantrun-dashboard-panel";
  const DOMAIN = "plantrun";
  const STORAGE_KEYS = {
    theme: "plantrun:theme",
    lang: "plantrun:lang",
    grid: "plantrun:grid",
    detailLayout: "plantrun:detailLayout",
  };

  if (customElements.get(PANEL_TAG)) {
    return;
  }

  const ensurePlantRunShared = () => {
    const existing = window.PlantRunShared || {};
    const assetCache = existing.assetCache || {};
    const stageArtCache = existing.stageArtCache || {};

    const ASSET_MAP = {
      seedling: {
        hero: "/plantrun_frontend/assets/stage-seedling-wide-2.png",
        tall: "/plantrun_frontend/assets/stage-seedling-tall-2.png",
        legacy: "/plantrun_frontend/assets/stage-seedling.png",
      },
      veg: {
        hero: "/plantrun_frontend/assets/stage-veg-hero-2.png",
        tall: "/plantrun_frontend/assets/stage-veg-tall-2.png",
        legacy: "/plantrun_frontend/assets/stage-veg.png",
      },
      flower: {
        hero: "/plantrun_frontend/assets/stage-flower-wide-2.png",
        tall: "/plantrun_frontend/assets/stage-flower-tall-2.png",
        legacy: "/plantrun_frontend/assets/stage-flower.png",
      },
    };

    const STAGE_SVGS = existing.STAGE_SVGS || {
      seedling: `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="prSeedStemP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#67df73"/><stop offset="100%" stop-color="#307d42"/></linearGradient></defs><circle cx="120" cy="120" r="104" fill="rgba(120,255,175,0.08)"/><path d="M116 196c6 0 10-4 10-10V114h-12v72c0 6 3 10 9 10Z" fill="url(#prSeedStemP)"/><path d="M113 124c-30-1-49-13-60-35 24-8 47-4 65 18Z" fill="#68e07c"/><path d="M127 120c26-18 50-20 71-11-13 28-37 40-63 35Z" fill="#30aa56"/><ellipse cx="92" cy="108" rx="21" ry="14" fill="#b7f39a"/><ellipse cx="149" cy="107" rx="21" ry="14" fill="#a1e57c"/></svg>`,
      veg: `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="120" cy="120" r="108" fill="rgba(110,255,156,0.08)"/><path d="M118 214c7 0 12-5 12-12v-86h-18v86c0 7 5 12 12 12Z" fill="#2d8f47"/><path d="M120 117 87 84c-18-18-24-40-19-63 24 3 44 17 57 42Z" fill="#62da77"/><path d="M120 116 154 77c18-22 43-33 69-28-5 30-25 50-55 67Z" fill="#2cac52"/><path d="M114 126 68 126c-24 0-42 9-55 26 19 16 43 22 70 13Z" fill="#38a956"/><path d="M126 128 174 136c24 4 43 17 55 37-22 14-47 13-71-2Z" fill="#328d49"/><path d="M120 101 112 62c-4-20 2-39 16-55 15 16 20 36 14 59Z" fill="#7ee98a"/></svg>`,
      flower: `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="120" cy="120" r="108" fill="rgba(255,208,122,0.1)"/><path d="M118 216c7 0 12-5 12-12v-82h-18v82c0 7 5 12 12 12Z" fill="#6d4d2c"/><path d="M121 121c-20-36-16-67 11-95 18 28 18 59 2 92Z" fill="#b68949"/><g fill="#6fa751"><path d="M93 141c-24 1-43-8-58-26 21-11 42-12 62 2Z"/><path d="M147 139c19-16 41-22 65-17-9 24-26 38-54 41Z"/></g><g fill="#e4c07c"><ellipse cx="120" cy="84" rx="29" ry="35"/><ellipse cx="86" cy="112" rx="25" ry="29"/><ellipse cx="154" cy="112" rx="25" ry="29"/><ellipse cx="105" cy="132" rx="23" ry="27"/><ellipse cx="138" cy="132" rx="23" ry="27"/></g><g fill="#d69b5f"><circle cx="120" cy="83" r="16"/><circle cx="86" cy="111" r="13"/><circle cx="154" cy="111" r="13"/></g></svg>`,
    };

    const LEAF_LOGO = existing.LEAF_LOGO || `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="prLogoGradPanel" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8effa9"/><stop offset="100%" stop-color="#1f8a47"/></linearGradient></defs><path d="M60 64c-3 0-6-2-6-5 0-6 2-12 6-18 4 6 6 12 6 18 0 3-3 5-6 5Z" fill="#255b35"/><g fill="url(#prLogoGradPanel)"><path d="M59 58c-15-11-21-24-20-41 15 3 25 12 29 29Z"/><path d="M61 58c15-11 21-24 20-41-15 3-25 12-29 29Z"/><path d="M53 61C34 58 22 48 16 31c17-1 30 5 40 19Z"/><path d="M67 61c19-3 31-13 37-30-17-1-30 5-40 19Z"/><path d="M51 66C35 76 28 90 30 106c14-5 23-16 28-32Z"/><path d="M69 66c16 10 23 24 21 40-14-5-23-16-28-32Z"/><path d="M60 69c-4 14-3 25 4 34 7-9 8-20 4-34Z"/></g></svg>`;

    const escapeHtml = existing.escapeHtml || ((value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;"));

    const svgToDataUrl = existing.svgToDataUrl || ((svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);

    const loadImage = (url) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
      });

    const processAssetUrl = existing.processAssetUrl || (async (url, fallbackSvg = STAGE_SVGS.seedling) => {
      if (!url) {
        return svgToDataUrl(fallbackSvg);
      }
      if (assetCache[url]) {
        return assetCache[url];
      }
      try {
        const image = await loadImage(url);
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(image, 0, 0);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = frame.data;
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = 0;
        let maxY = 0;
        let found = false;

        for (let index = 0; index < data.length; index += 4) {
          const red = data[index];
          const green = data[index + 1];
          const blue = data[index + 2];
          const alpha = data[index + 3];
          const pixel = index / 4;
          const x = pixel % canvas.width;
          const y = Math.floor(pixel / canvas.width);
          const isNearWhite = red > 242 && green > 242 && blue > 242;
          if (isNearWhite) {
            data[index + 3] = 0;
            continue;
          }
          if (alpha > 8) {
            found = true;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }

        ctx.putImageData(frame, 0, 0);
        if (!found) {
          const fallback = svgToDataUrl(fallbackSvg);
          assetCache[url] = fallback;
          return fallback;
        }

        const margin = 22;
        const cropX = Math.max(minX - margin, 0);
        const cropY = Math.max(minY - margin, 0);
        const cropW = Math.min(maxX - minX + margin * 2 + 1, canvas.width - cropX);
        const cropH = Math.min(maxY - minY + margin * 2 + 1, canvas.height - cropY);

        const cropped = document.createElement("canvas");
        cropped.width = cropW;
        cropped.height = cropH;
        const croppedCtx = cropped.getContext("2d");
        croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const dataUrl = cropped.toDataURL("image/png");
        assetCache[url] = dataUrl;
        return dataUrl;
      } catch (_error) {
        const fallback = svgToDataUrl(fallbackSvg);
        assetCache[url] = fallback;
        return fallback;
      }
    });

    const getStageArt = async (stageKey, variant = "hero") => {
      const stageAssets = ASSET_MAP[stageKey] || ASSET_MAP.seedling;
      const url = stageAssets[variant] || stageAssets.hero || stageAssets.legacy;
      return processAssetUrl(url, STAGE_SVGS[stageKey] || STAGE_SVGS.seedling);
    };

    const processStageArt = async (stageKey, variant = "hero") => {
      const cacheKey = `${stageKey}:${variant}`;
      if (stageArtCache[cacheKey]) {
        return stageArtCache[cacheKey];
      }
      const art = await getStageArt(stageKey, variant);
      stageArtCache[cacheKey] = art;
      return art;
    };

    window.PlantRunShared = {
      ...existing,
      ASSET_MAP,
      STAGE_SVGS,
      LEAF_LOGO,
      assetCache,
      stageArtCache,
      escapeHtml,
      svgToDataUrl,
      processAssetUrl,
      getStageArt,
      processStageArt,
    };
    return window.PlantRunShared;
  };

  const SHARED = ensurePlantRunShared();

  const STRINGS = {
    en: {
      appName: "PlantRun",
      subtitle: "A cleaner grow cockpit with stage-aware workflows.",
      overview: "Overview",
      newRun: "New run",
      design: "Design",
      all: "All",
      active: "Active",
      ended: "Ended",
      seedling: "Seedling",
      veg: "Vegetative",
      flower: "Flowering",
      filters: "Filter runs",
      emptyTitle: "No runs yet. Let's fix that.",
      emptyBody: "Start a run, bind sensors later if you want, and PlantRun will build the history from there.",
      launchWizard: "Start 3-step wizard",
      quickSummary: "Quick summary",
      target: "Target",
      day: "day",
      days: "days",
      detail: "Run detail",
      close: "Close",
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      edit: "Edit",
      notes: "Notes",
      newNotePlaceholder: "Capture what happened today…",
      sensors: "Sensors",
      addSensor: "Add sensor binding",
      phaseTimeline: "Phase timeline",
      addPhase: "Add phase",
      latestHistory: "Latest sensor history",
      tapHint: "Tap sensor tile for run history · long press for entity details",
      stats: "Stats",
      wizardStep1: "Step 1 · Basics",
      wizardStep2: "Step 2 · Cultivar",
      wizardStep3: "Step 3 · Sensors & create",
      estimatedDuration: "Estimated run duration (days)",
      explicitEstimate: "Explicit estimate used for planning context",
      growMedium: "Grow medium",
      growSpace: "Grow space",
      breeder: "Breeder",
      cultivar: "Cultivar",
      cultivarHint: "Type breeder + cultivar to search live SeedFinder matches.",
      sensorOptional: "Optional sensor bindings",
      createRun: "Create run",
      created: "Run created",
      updateTheme: "Theme",
      updateLanguage: "Language",
      grid: "Grid",
      detailLayout: "Detail layout",
      compact: "Compact",
      comfy: "Comfy",
      split: "Split",
      stack: "Stack",
      noSensors: "No sensor bindings yet.",
      noNotes: "No notes yet.",
      metricTemperature: "Temperature",
      metricHumidity: "Humidity",
      metricSoilMoisture: "Soil moisture",
      metricConductivity: "Conductivity",
      metricLight: "Light",
      metricEnergy: "Energy",
      metricWater: "Water",
      sensorEntity: "Entity ID",
      metricType: "Metric type",
      removeBinding: "Remove binding",
      updateBinding: "Update binding",
      confirmRemoveBinding: "Remove this binding? Sensor history stays preserved on the run.",
      confirmDeleteNote: "Delete this note?",
      confirmEndRun: "End this run now?",
      endRun: "End run",
      more: "More",
      chooseCultivar: "Choose a cultivar",
      manualEntry: "Keep manual entry",
      cultivarSearchEmpty: "No live matches yet.",
      phaseSeedling: "Seedling",
      phaseVeg: "Vegetative",
      phaseFlower: "Flowering",
      phaseDry: "Drying",
      phaseCure: "Curing",
      phaseHarvest: "Harvest",
    },
    de: {
      appName: "PlantRun",
      subtitle: "Ein aufgeräumtes Grow-Cockpit mit stage-aware Workflows.",
      overview: "Übersicht",
      newRun: "Neuer Run",
      design: "Design",
      all: "Alle",
      active: "Aktiv",
      ended: "Beendet",
      seedling: "Keimling",
      veg: "Vegi",
      flower: "Blüte",
      filters: "Runs filtern",
      emptyTitle: "Noch keine Runs. Lässt sich beheben.",
      emptyBody: "Starte einen Run, binde Sensoren später dazu und PlantRun baut die Historie sauber auf.",
      launchWizard: "3-Schritt-Wizard starten",
      quickSummary: "Kurzüberblick",
      target: "Ziel",
      day: "Tag",
      days: "Tage",
      detail: "Run-Details",
      close: "Schließen",
      save: "Speichern",
      cancel: "Abbrechen",
      delete: "Löschen",
      edit: "Bearbeiten",
      notes: "Notizen",
      newNotePlaceholder: "Festhalten, was heute passiert ist…",
      sensors: "Sensoren",
      addSensor: "Sensor-Bindung hinzufügen",
      phaseTimeline: "Phasen-Timeline",
      addPhase: "Phase hinzufügen",
      latestHistory: "Letzte Sensor-Historie",
      tapHint: "Tap sensor tile for run history · long press for entity details",
      stats: "Stats",
      wizardStep1: "Schritt 1 · Basics",
      wizardStep2: "Schritt 2 · Kultivar",
      wizardStep3: "Schritt 3 · Sensoren & Erstellen",
      estimatedDuration: "Estimated run duration (days)",
      explicitEstimate: "Explicit estimate used for planning context",
      growMedium: "Substrat",
      growSpace: "Grow Space",
      breeder: "Breeder",
      cultivar: "Kultivar",
      cultivarHint: "Breeder + Kultivar tippen, dann kommen live SeedFinder-Treffer.",
      sensorOptional: "Optionale Sensor-Bindungen",
      createRun: "Run erstellen",
      created: "Run erstellt",
      updateTheme: "Theme",
      updateLanguage: "Sprache",
      grid: "Grid",
      detailLayout: "Detail-Layout",
      compact: "Kompakt",
      comfy: "Komfort",
      split: "Split",
      stack: "Stack",
      noSensors: "Noch keine Sensor-Bindungen.",
      noNotes: "Noch keine Notizen.",
      metricTemperature: "Temperatur",
      metricHumidity: "Luftfeuchtigkeit",
      metricSoilMoisture: "Bodenfeuchte",
      metricConductivity: "Leitfähigkeit",
      metricLight: "Licht",
      metricEnergy: "Energie",
      metricWater: "Wasser",
      sensorEntity: "Entity ID",
      metricType: "Metriktyp",
      removeBinding: "Bindung entfernen",
      updateBinding: "Bindung aktualisieren",
      confirmRemoveBinding: "Diese Bindung entfernen? Die Sensor-Historie bleibt am Run erhalten.",
      confirmDeleteNote: "Diese Notiz löschen?",
      confirmEndRun: "Diesen Run jetzt beenden?",
      endRun: "Run beenden",
      more: "Mehr",
      chooseCultivar: "Kultivar auswählen",
      manualEntry: "Manuellen Eintrag behalten",
      cultivarSearchEmpty: "Noch keine Live-Treffer.",
      phaseSeedling: "Keimling",
      phaseVeg: "Vegetative",
      phaseFlower: "Blüte",
      phaseDry: "Trocknen",
      phaseCure: "Curing",
      phaseHarvest: "Ernte",
    },
  };

  const DEFAULT_WIZARD_FORM = {
    friendly_name: "",
    planted_date: "",
    target_days: "84",
    grow_medium: "Soil",
    grow_space: "Tent A",
    cultivar_breeder: "",
    cultivar_query: "",
    cultivar_name: "",
    temperature_sensor: "",
    humidity_sensor: "",
    soil_moisture_sensor: "",
    conductivity_sensor: "",
    light_sensor: "",
    energy_sensor: "",
  };

  const QUICK_TARGETS = [56, 70, 84, 98, 112];
  const DELEGATED_ACTION_SELECTOR = [
    "[data-page]",
    "[data-theme]",
    "[data-lang]",
    "[data-grid]",
    "[data-filter]",
    "[data-open-run]",
    "[data-toggle-expand]",
    "[data-open-wizard]",
    "[data-close-wizard]",
    "[data-wizard-next]",
    "[data-wizard-back]",
    "[data-target-chip]",
    "[data-close-detail]",
    "[data-open-entity]",
    "[data-open-binding-add]",
    "[data-edit-binding]",
    "[data-remove-binding]",
    "[data-save-binding]",
    "[data-close-binding-modal]",
    "[data-add-phase]",
    "[data-end-run]",
    "[data-edit-note]",
    "[data-save-note]",
    "[data-cancel-note]",
    "[data-delete-note]",
    "[data-add-note]",
    "[data-cultivar-index]",
    "[data-dismiss-modal]",
    "[data-confirm-modal]",
    "[data-create-run]",
    "[data-detail-layout]",
    "[data-save-detail]",
  ].join(",");
  const METRIC_LABEL_KEYS = {
    temperature: "metricTemperature",
    humidity: "metricHumidity",
    soil_moisture: "metricSoilMoisture",
    conductivity: "metricConductivity",
    light: "metricLight",
    energy: "metricEnergy",
    water: "metricWater",
  };
  const PHASE_OPTIONS = ["Seedling", "Vegetative", "Flowering", "Drying", "Curing", "Harvest"];

  class PlantRunDashboardPanel extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._booted = false;
      this._refreshTimer = null;
      this._renderVersion = 0;
      this._runs = [];
      this._activeRunId = null;
      this._summaries = {};
      this._expandedRuns = {};
      this._filter = "active";
      this._page = "overview";
      this._theme = this._loadSetting(STORAGE_KEYS.theme, "light");
      this._lang = this._loadSetting(STORAGE_KEYS.lang, "en");
      this._gridMode = this._loadSetting(STORAGE_KEYS.grid, "comfy");
      this._detailLayout = this._loadSetting(STORAGE_KEYS.detailLayout, "split");
      this._detailRunId = null;
      this._historyFocus = null;
      this._modal = null;
      this._wizardOpen = false;
      this._wizardStep = 1;
      this._wizardForm = { ...DEFAULT_WIZARD_FORM };
      this._wizardBusy = false;
      this._cultivarSuggestions = [];
      this._cultivarIndex = -1;
      this._suggestionClearTimer = null;
      this._searchTimer = null;
      this._searchRequestNonce = 0;
      this._bindingDraft = null;
      this._sensorPressState = {};
      this._noteDrafts = {};
      this._newNoteText = "";
      this._phaseDraft = "Vegetative";
      this._detailDrafts = {};
      this._artUrls = {};
      this._lastCreatedRunId = null;
      this._boundDelegatedClick = (event) => this._handleDelegatedClick(event);
      this._boundInput = (event) => this._handleInput(event);
    }

    get hass() {
      return this._hass;
    }

    set hass(value) {
      this._hass = value;
      if (value && !this._booted) {
        this._boot();
      }
      this.render();
    }

    connectedCallback() {
      customElements.get("ha-panel-lovelace");
      this.addEventListener("click", this._boundDelegatedClick, true);
      this.addEventListener("input", this._boundInput, true);
      this.addEventListener("change", this._boundInput, true);
      if (this.hass && !this._booted) {
        this._boot();
      }
      this.render();
    }

    disconnectedCallback() {
      this.removeEventListener("click", this._boundDelegatedClick, true);
      this.removeEventListener("input", this._boundInput, true);
      this.removeEventListener("change", this._boundInput, true);
      window.clearTimeout(this._refreshTimer);
      window.clearTimeout(this._suggestionClearTimer);
      window.clearTimeout(this._searchTimer);
    }

    _loadSetting(key, fallback) {
      try {
        return window.localStorage.getItem(key) || fallback;
      } catch (_error) {
        return fallback;
      }
    }

    _saveSetting(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (_error) {
        // no-op
      }
    }

    t(key) {
      return STRINGS[this._lang]?.[key] || STRINGS.en[key] || key;
    }

    async _boot() {
      if (!this.hass || this._booted) {
        return;
      }
      this._booted = true;
      await Promise.all([this._warmSharedAssets(), this._refreshRuns()]);
      this._scheduleRefresh();
      this.render();
    }

    async _warmSharedAssets() {
      const keys = [
        ["seedling", "hero"],
        ["seedling", "tall"],
        ["seedling", "legacy"],
        ["veg", "hero"],
        ["veg", "tall"],
        ["veg", "legacy"],
        ["flower", "hero"],
        ["flower", "tall"],
        ["flower", "legacy"],
      ];
      for (const [stage, variant] of keys) {
        this._resolveStageArt(stage, variant);
      }
    }

    _scheduleRefresh() {
      window.clearTimeout(this._refreshTimer);
      this._refreshTimer = window.setTimeout(async () => {
        await this._refreshRuns();
        this._scheduleRefresh();
      }, 30000);
    }

    async _refreshRuns() {
      if (!this.hass) {
        return;
      }
      try {
        const payload = await this.hass.callWS({ type: "plantrun/get_runs" });
        this._runs = Array.isArray(payload?.runs) ? payload.runs : [];
        this._activeRunId = payload?.active_run_id || null;
        const summaryPairs = await Promise.all(
          this._runs.map(async (run) => {
            try {
              const summary = await this.hass.callWS({ type: "plantrun/get_run_summary", run_id: run.id });
              return [run.id, summary];
            } catch (_error) {
              return [run.id, {}];
            }
          })
        );
        this._summaries = Object.fromEntries(summaryPairs);
        const validIds = new Set(this._runs.map((run) => run.id));
        this._expandedRuns = Object.fromEntries(Object.entries(this._expandedRuns).filter(([runId]) => validIds.has(runId)));
        if (this._detailRunId && !validIds.has(this._detailRunId)) {
          this._detailRunId = null;
          this._historyFocus = null;
        }
        if (this._lastCreatedRunId && validIds.has(this._lastCreatedRunId)) {
          this._detailRunId = this._lastCreatedRunId;
          this._page = "overview";
          this._wizardOpen = false;
          this._lastCreatedRunId = null;
        }
        this._runs.forEach((run) => {
          this._resolveStageArt(this._stageKeyForRun(run), "hero");
          this._resolveStageArt(this._stageKeyForRun(run), "tall");
        });
      } catch (_error) {
        this._runs = [];
        this._summaries = {};
      }
      this.render();
    }

    _resolveStageArt(stageKey, variant = "hero") {
      const key = `${stageKey}:${variant}`;
      if (this._artUrls[key]) {
        return this._artUrls[key];
      }
      const fallback = SHARED.svgToDataUrl(SHARED.STAGE_SVGS[stageKey] || SHARED.STAGE_SVGS.seedling);
      this._artUrls[key] = fallback;
      SHARED.processStageArt(stageKey, variant).then((url) => {
        this._artUrls[key] = url;
        this.render();
      });
      return fallback;
    }

    _toggleTheme(theme) {
      this._theme = theme;
      this._saveSetting(STORAGE_KEYS.theme, theme);
      this.render();
    }

    _toggleLanguage(lang) {
      this._lang = lang;
      this._saveSetting(STORAGE_KEYS.lang, lang);
      this.render();
    }

    _toggleGrid(mode) {
      this._gridMode = mode;
      this._saveSetting(STORAGE_KEYS.grid, mode);
      this.render();
    }

    _toggleDetailLayout(mode) {
      this._detailLayout = mode;
      this._saveSetting(STORAGE_KEYS.detailLayout, mode);
      this.render();
    }

    _setFilter(filter) {
      this._filter = filter;
      this.render();
    }

    _runById(runId) {
      return this._runs.find((run) => run.id === runId) || null;
    }

    _summaryForRun(runId) {
      return this._summaries[runId] || {};
    }

    _currentPhase(run) {
      const phases = Array.isArray(run?.phases) ? run.phases : [];
      return phases[phases.length - 1]?.name || "Seedling";
    }

    _stageKeyForRun(run) {
      const phase = this._currentPhase(run).toLowerCase();
      if (phase.includes("flower") || phase.includes("bloom") || phase.includes("harvest")) {
        return "flower";
      }
      if (phase.includes("veg")) {
        return "veg";
      }
      return "seedling";
    }

    _targetDaysForRun(run) {
      const rawTarget = run?.base_config?.target_days ?? run?.target_days ?? "84";
      const parsed = Number(rawTarget);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    _runAgeDays(run) {
      const stamp = Date.parse(run?.planted_date || run?.start_time || "");
      if (!Number.isFinite(stamp)) {
        return 0;
      }
      return Math.max(0, Math.round((Date.now() - stamp) / 86400000));
    }

    _formatDate(value) {
      if (!value) {
        return "—";
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return SHARED.escapeHtml(String(value));
      }
      return date.toLocaleDateString(this._lang === "de" ? "de-DE" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    _filteredRuns() {
      const filter = this._filter;
      if (filter === "all") {
        return this._runs;
      }
      if (filter === "active") {
        return this._runs.filter((run) => run.status !== "ended");
      }
      if (filter === "ended") {
        return this._runs.filter((run) => run.status === "ended");
      }
      return this._runs.filter((run) => this._stageKeyForRun(run) === filter);
    }

    _toggleRunExpansion(runId) {
      const isExpanded = !!this._expandedRuns[runId];
      this._expandedRuns = { ...this._expandedRuns, [runId]: !isExpanded };
      this.render();
    }

    _openDetail(runId) {
      this._detailRunId = runId;
      this._historyFocus = null;
      const run = this._runById(runId);
      if (run) {
        this._detailDrafts = {
          ...this._detailDrafts,
          [runId]: {
            friendly_name: run.friendly_name || "",
            planted_date: run.planted_date || "",
            notes_summary: run.notes_summary || "",
            dry_yield_grams: run.dry_yield_grams ?? "",
            grow_medium: run?.base_config?.grow_medium || "",
            grow_space: run?.base_config?.grow_space || "",
            target_days: this._targetDaysForRun(run) || "",
          },
        };
      }
      this.render();
    }

    _closeDetail() {
      this._detailRunId = null;
      this._historyFocus = null;
      this._bindingDraft = null;
      this.render();
    }

    _openEntity(entityId) {
      const event = new CustomEvent("hass-more-info", {
        bubbles: true,
        composed: true,
        detail: { entityId },
      });
      this.dispatchEvent(event);
    }

    _openRunHistory(runId, entityId) {
      this._historyFocus = { runId, entityId };
      this.render();
    }

    _sensorPressStart(runId, entityId) {
      const key = `${runId}:${entityId}`;
      const current = this._sensorPressState[key];
      if (current?.timer) {
        window.clearTimeout(current.timer);
      }
      const state = { longPressTriggered: false, timer: null };
      state.timer = window.setTimeout(() => {
        state.longPressTriggered = true;
        this._openEntity(entityId);
      }, 520);
      this._sensorPressState = { ...this._sensorPressState, [key]: state };
    }

    _sensorPressEnd(runId, entityId) {
      const key = `${runId}:${entityId}`;
      const state = this._sensorPressState[key];
      if (!state) {
        return;
      }
      if (state.timer) {
        window.clearTimeout(state.timer);
      }
      const wasLongPress = !!state.longPressTriggered;
      if (!wasLongPress) {
        this._openRunHistory(runId, entityId);
      }
      const next = { ...this._sensorPressState };
      delete next[key];
      this._sensorPressState = next;
    }

    _sensorPressCancel(runId, entityId) {
      const key = `${runId}:${entityId}`;
      const state = this._sensorPressState[key];
      if (state?.timer) {
        window.clearTimeout(state.timer);
      }
      const next = { ...this._sensorPressState };
      delete next[key];
      this._sensorPressState = next;
    }

    _stateForEntity(entityId) {
      return this.hass?.states?.[entityId] || null;
    }

    _numericState(entityId) {
      const raw = this._stateForEntity(entityId)?.state;
      const numeric = Number(raw);
      return Number.isFinite(numeric) ? numeric : null;
    }

    _sensorTarget(metricType) {
      switch (metricType) {
        case "temperature":
          return { min: 22, max: 28, unit: "°C" };
        case "humidity":
          return { min: 48, max: 65, unit: "%" };
        case "soil_moisture":
          return { min: 35, max: 65, unit: "%" };
        case "conductivity":
          return { min: 0.8, max: 2.2, unit: "mS/cm" };
        case "light":
          return { min: 250, max: 700, unit: "lx" };
        case "energy":
          return { min: 0, max: 4, unit: "kWh" };
        default:
          return { min: 0, max: 100, unit: "" };
      }
    }

    _metricLabel(metricType) {
      return this.t(METRIC_LABEL_KEYS[metricType]) || metricType;
    }

    _sensorHistorySeries(run, binding) {
      const metricHistory = Array.isArray(run?.sensor_history?.[binding.metric_type])
        ? run.sensor_history[binding.metric_type]
        : [];
      const cleaned = metricHistory
        .map((point) => ({
          value: Number(point?.value),
          timestamp: point?.timestamp || null,
        }))
        .filter((point) => Number.isFinite(point.value));
      return cleaned.slice(-20);
    }

    _sparklineMarkup(run, binding) {
      const series = this._sensorHistorySeries(run, binding);
      if (!series.length) {
        return `<div class="sparkline-empty">No samples yet</div>`;
      }
      const values = series.map((item) => item.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const span = Math.max(max - min, 1);
      const points = values
        .map((value, index) => {
          const x = (index / Math.max(values.length - 1, 1)) * 100;
          const y = 42 - ((value - min) / span) * 34;
          return `${x},${y}`;
        })
        .join(" ");
      return `
        <svg class="sparkline" viewBox="0 0 100 44" preserveAspectRatio="none" aria-hidden="true">
          <polyline class="sparkline-grid" points="0,38 100,38" />
          <polyline class="sparkline-line" points="${points}" />
        </svg>
      `;
    }

    _sensorTileMarkup(run, binding) {
      const state = this._stateForEntity(binding.sensor_id);
      const numeric = this._numericState(binding.sensor_id);
      const target = this._sensorTarget(binding.metric_type);
      const min = target.min;
      const max = target.max;
      const status = numeric < min ? "below" : numeric > max ? "above" : "in_range";
      const statusClass = status === "below" ? "warn" : status === "above" ? "high" : "ok";
      const unit = state?.attributes?.unit_of_measurement || target.unit || "";
      const label = status === "below" ? "Below target" : status === "in_range" ? "In range" : "Above target";
      const pct = numeric == null ? 0 : Math.max(0, Math.min(100, ((numeric - min) / Math.max(max - min, 1)) * 100));
      const safeName = SHARED.escapeHtml(this._metricLabel(binding.metric_type));
      const safeEntity = SHARED.escapeHtml(binding.sensor_id);
      const stateText = numeric == null ? "—" : `${numeric}${unit ? ` ${unit}` : ""}`;
      return `
        <button
          class="sensor-tile"
          data-run="${run.id}"
          data-entity="${safeEntity}"
          data-press-target="sensor"
          type="button"
        >
          <div class="sensor-top">
            <div>
              <div class="sensor-label">${safeName}</div>
              <div class="sensor-entity">${safeEntity}</div>
            </div>
            <div class="sensor-value">${SHARED.escapeHtml(stateText)}</div>
          </div>
          <div class="range-bar">
            <div class="range-track"></div>
            <div class="range-fill ${statusClass}" style="width:${pct}%"></div>
          </div>
          <div class="sensor-status-row">
            <span class="sensor-status ${statusClass}">${label}</span>
            <span class="sensor-target">${min}–${max}${unit ? ` ${unit}` : ""}</span>
          </div>
          ${this._sparklineMarkup(run, binding)}
        </button>
      `;
    }

    _phaseTrackMarkup(run) {
      const phases = Array.isArray(run?.phases) ? run.phases : [];
      if (!phases.length) {
        return "";
      }
      return phases
        .map((phase, index) => {
          const active = index === phases.length - 1;
          return `<span class="phase-dot ${active ? "active" : ""}">${SHARED.escapeHtml(phase.name.slice(0, 1).toUpperCase())}</span>`;
        })
        .join("");
    }

    _runCardMarkup(run) {
      const runId = run.id;
      const isExpanded = !!this._expandedRuns[runId];
      const summary = this._summaryForRun(runId);
      const stageKey = this._stageKeyForRun(run);
      const art = this._resolveStageArt(stageKey, "hero");
      const runAgeDays = this._runAgeDays(run);
      const currentPhase = this._currentPhase(run);
      const energyCost = summary?.energy_cost != null ? `${summary.energy_cost} ${summary.energy_currency || "EUR"}` : "—";
      const tempAvg = summary?.temperature?.avg != null ? `${summary.temperature.avg}°` : "—";
      const humidityAvg = summary?.humidity?.avg != null ? `${summary.humidity.avg}%` : "—";

      return `
        <article class="run-card ${this._gridMode} ${isExpanded ? "expanded" : ""}" data-run-card="${runId}">
          <button class="run-card-hit" data-open-run="${runId}" type="button">
            <div class="run-card-art"><img src="${art}" alt="${SHARED.escapeHtml(currentPhase)} art" /></div>
            <div class="run-card-copy">
              <div class="run-card-top">
                <div>
                  <div class="eyebrow">${run.status === "ended" ? this.t("ended") : this.t("active")}</div>
                  <h3>${SHARED.escapeHtml(run.friendly_name || "Unnamed Run")}</h3>
                </div>
                <div class="phase-pill">${SHARED.escapeHtml(currentPhase)}</div>
              </div>
              <div class="run-meta">Day ${runAgeDays} · Target: ${this._targetDaysForRun(run) || "—"} days</div>
              <div class="run-stats-row">
                <div class="mini-stat"><span>Temp</span><strong>${SHARED.escapeHtml(tempAvg)}</strong></div>
                <div class="mini-stat"><span>Humidity</span><strong>${SHARED.escapeHtml(humidityAvg)}</strong></div>
                <div class="mini-stat"><span>Energy</span><strong>${SHARED.escapeHtml(energyCost)}</strong></div>
              </div>
              <div class="mini-phase-track" data-contract="compact-mini-phase-track">${this._phaseTrackMarkup(run)}</div>
            </div>
          </button>
          <div class="run-card-actions">
            <button class="ghost-btn" data-toggle-expand="${runId}" type="button">${isExpanded ? this.t("close") : this.t("more")}</button>
            <button class="primary-btn small" data-open-run="${runId}" type="button">${this.t("detail")}</button>
          </div>
          ${isExpanded ? this._runCardExpandedMarkup(run) : ""}
        </article>
      `;
    }

    _runCardExpandedMarkup(run) {
      const cultivar = run?.cultivar?.name || "Manual entry";
      const summary = this._summaryForRun(run.id);
      const note = run?.notes_summary || run?.notes?.[run.notes.length - 1]?.text || this.t("noNotes");
      return `
        <div class="run-card-expanded">
          <div class="expanded-grid">
            <div class="expanded-block">
              <span class="eyebrow">Cultivar</span>
              <strong>${SHARED.escapeHtml(cultivar)}</strong>
              <p>${SHARED.escapeHtml(run?.cultivar?.breeder || "Breeder unknown")}</p>
            </div>
            <div class="expanded-block">
              <span class="eyebrow">Yield</span>
              <strong>${SHARED.escapeHtml(run?.dry_yield_grams != null ? `${run.dry_yield_grams} g` : "—")}</strong>
              <p>${SHARED.escapeHtml(run?.base_config?.grow_medium || "Medium unset")}</p>
            </div>
            <div class="expanded-block">
              <span class="eyebrow">Cost</span>
              <strong>${SHARED.escapeHtml(summary?.energy_cost != null ? `${summary.energy_cost} ${summary.energy_currency || "EUR"}` : "—")}</strong>
              <p>${SHARED.escapeHtml(note)}</p>
            </div>
          </div>
        </div>
      `;
    }

    _emptyStateMarkup() {
      const art = this._resolveStageArt("seedling", "tall");
      return `
        <section class="empty-state">
          <div class="empty-copy">
            <div class="eyebrow">${this.t("appName")}</div>
            <h2>${this.t("emptyTitle")}</h2>
            <p>${this.t("emptyBody")}</p>
            <button class="primary-btn" data-open-wizard type="button">${this.t("launchWizard")}</button>
          </div>
          <div class="empty-art-composition">
            <div class="empty-art art-1"><img src="${art}" alt="Seedling stage art" /></div>
          </div>
        </section>
      `;
    }

    _renderNav() {
      return `
        <header class="topbar">
          <div class="brand">
            <div class="brand-logo">${SHARED.LEAF_LOGO}</div>
            <div>
              <div class="brand-name">${this.t("appName")}</div>
              <div class="brand-subtitle">${this.t("subtitle")}</div>
            </div>
          </div>
          <div class="nav-actions">
            <button class="nav-btn ${this._page === "overview" ? "active" : ""}" data-page="overview" type="button">${this.t("overview")}</button>
            <button class="nav-btn ${this._wizardOpen ? "active" : ""}" data-open-wizard type="button">${this.t("newRun")}</button>
          </div>
          <div class="control-bar">
            <div class="control-group">
              <span>${this.t("updateTheme")}</span>
              <button class="seg ${this._theme === "dark" ? "active" : ""}" data-theme="dark" type="button">Dark</button>
              <button class="seg ${this._theme === "light" ? "active" : ""}" data-theme="light" type="button">Light</button>
            </div>
            <div class="control-group">
              <span>${this.t("updateLanguage")}</span>
              <button class="seg ${this._lang === "en" ? "active" : ""}" data-lang="en" type="button">EN</button>
              <button class="seg ${this._lang === "de" ? "active" : ""}" data-lang="de" type="button">DE</button>
            </div>
            <div class="control-group">
              <span>${this.t("grid")}</span>
              <button class="seg ${this._gridMode === "compact" ? "active" : ""}" data-grid="compact" type="button">${this.t("compact")}</button>
              <button class="seg ${this._gridMode === "comfy" ? "active" : ""}" data-grid="comfy" type="button">${this.t("comfy")}</button>
            </div>
          </div>
        </header>
      `;
    }

    _renderFilters() {
      const filters = [
        ["all", this.t("all")],
        ["active", this.t("active")],
        ["ended", this.t("ended")],
        ["seedling", this.t("seedling")],
        ["veg", this.t("veg")],
        ["flower", this.t("flower")],
      ];
      return `
        <section class="filters">
          <div class="eyebrow">${this.t("filters")}</div>
          <div class="filter-row">
            ${filters
              .map(
                ([value, label]) =>
                  `<button class="filter-chip ${this._filter === value ? "active" : ""}" data-filter="${value}" type="button">${label}</button>`
              )
              .join("")}
          </div>
        </section>
      `;
    }

    _historyPanelMarkup(run) {
      if (!this._historyFocus || this._historyFocus.runId !== run.id) {
        return `<div class="history-panel-empty">${this.t("tapHint")}</div>`;
      }
      const binding = (run.bindings || []).find((item) => item.sensor_id === this._historyFocus.entityId);
      if (!binding) {
        return `<div class="history-panel-empty">${this.t("tapHint")}</div>`;
      }
      return `
        <div class="history-panel-card">
          <div class="history-panel-head">
            <div>
              <div class="eyebrow">${this.t("latestHistory")}</div>
              <strong>${SHARED.escapeHtml(this._metricLabel(binding.metric_type))}</strong>
            </div>
            <button class="ghost-btn" data-open-entity="${SHARED.escapeHtml(binding.sensor_id)}" type="button">Entity</button>
          </div>
          ${this._sparklineMarkup(run, binding)}
        </div>
      `;
    }

    _detailStatsMarkup(run) {
      const summary = this._summaryForRun(run.id);
      const runAgeDays = this._runAgeDays(run);
      return `
        <div class="detail-stats-row">
          <div class="detail-stat"><span>Age</span><strong>${runAgeDays} ${runAgeDays === 1 ? this.t("day") : this.t("days")}</strong></div>
          <div class="detail-stat"><span>${this.t("target")}</span><strong>${this._targetDaysForRun(run) || "—"} ${this.t("days")}</strong></div>
          <div class="detail-stat"><span>Energy</span><strong>${SHARED.escapeHtml(summary?.energy_kwh != null ? `${summary.energy_kwh} kWh` : "—")}</strong></div>
          <div class="detail-stat"><span>Yield</span><strong>${SHARED.escapeHtml(run?.dry_yield_grams != null ? `${run.dry_yield_grams} g` : "—")}</strong></div>
        </div>
      `;
    }

    _detailDraftForRun(run) {
      return (
        this._detailDrafts[run.id] || {
          friendly_name: run.friendly_name || "",
          planted_date: run.planted_date || "",
          notes_summary: run.notes_summary || "",
          dry_yield_grams: run.dry_yield_grams ?? "",
          grow_medium: run?.base_config?.grow_medium || "",
          grow_space: run?.base_config?.grow_space || "",
          target_days: this._targetDaysForRun(run) || "",
        }
      );
    }

    _detailEditorMarkup(run) {
      const draft = this._detailDraftForRun(run);
      return `
        <section class="panel-block detail-editor-block">
          <div class="panel-head"><div><div class="eyebrow">Run metadata</div><strong>Editable detail overlay</strong></div><button class="primary-btn small" data-save-detail="${run.id}" type="button">${this.t("save")}</button></div>
          <div class="form-grid two-col">
            <label class="field">
              <span>Friendly name</span>
              <input data-detail-input="friendly_name" data-run="${run.id}" value="${SHARED.escapeHtml(draft.friendly_name)}" />
            </label>
            <label class="field">
              <span>Planted date</span>
              <input type="date" data-detail-input="planted_date" data-run="${run.id}" value="${SHARED.escapeHtml(draft.planted_date)}" />
            </label>
            <label class="field">
              <span>Grow medium</span>
              <input data-detail-input="grow_medium" data-run="${run.id}" value="${SHARED.escapeHtml(draft.grow_medium)}" />
            </label>
            <label class="field">
              <span>Grow space</span>
              <input data-detail-input="grow_space" data-run="${run.id}" value="${SHARED.escapeHtml(draft.grow_space)}" />
            </label>
            <label class="field">
              <span>${this.t("estimatedDuration")}</span>
              <input type="number" min="1" data-detail-input="target_days" data-run="${run.id}" value="${SHARED.escapeHtml(draft.target_days)}" />
            </label>
            <label class="field">
              <span>Dry yield (g)</span>
              <input type="number" min="0" step="0.1" data-detail-input="dry_yield_grams" data-run="${run.id}" value="${SHARED.escapeHtml(draft.dry_yield_grams)}" />
            </label>
            <label class="field full">
              <span>Summary note</span>
              <textarea data-detail-input="notes_summary" data-run="${run.id}">${SHARED.escapeHtml(draft.notes_summary)}</textarea>
            </label>
          </div>
        </section>
      `;
    }

    _phaseTimelineMarkup(run) {
      const phases = Array.isArray(run?.phases) ? run.phases : [];
      if (!phases.length) {
        return `<div class="empty-list">No phases yet.</div>`;
      }
      return `
        <div class="timeline-list">
          ${phases
            .map(
              (phase, index) => `
                <div class="timeline-item ${index === phases.length - 1 ? "active" : ""}">
                  <div class="timeline-dot"></div>
                  <div>
                    <strong>${SHARED.escapeHtml(phase.name)}</strong>
                    <div>${this._formatDate(phase.start_time)}${phase.end_time ? ` → ${this._formatDate(phase.end_time)}` : ""}</div>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      `;
    }

    _noteMarkup(run, note) {
      const isEditing = Object.prototype.hasOwnProperty.call(this._noteDrafts, note.id);
      const draftValue = isEditing ? this._noteDrafts[note.id] : note.text;
      return `
        <div class="note-card">
          <div class="note-meta">${this._formatDate(note.timestamp)}</div>
          ${
            isEditing
              ? `<textarea class="note-editor" data-note-edit="${note.id}">${SHARED.escapeHtml(draftValue)}</textarea>`
              : `<div class="note-text">${SHARED.escapeHtml(note.text)}</div>`
          }
          <div class="note-actions">
            ${
              isEditing
                ? `<button class="primary-btn small" data-save-note="${note.id}" data-run="${run.id}" type="button">${this.t("save")}</button>
                   <button class="ghost-btn" data-cancel-note="${note.id}" type="button">${this.t("cancel")}</button>`
                : `<button class="ghost-btn" data-edit-note="${note.id}" type="button">${this.t("edit")}</button>`
            }
            <button class="ghost-btn danger" data-delete-note="${note.id}" data-run="${run.id}" type="button">${this.t("delete")}</button>
          </div>
        </div>
      `;
    }

    _bindingListMarkup(run) {
      const bindings = Array.isArray(run?.bindings) ? run.bindings : [];
      if (!bindings.length) {
        return `<div class="empty-list">${this.t("noSensors")}</div>`;
      }
      return bindings
        .map((binding) => {
          const state = this._stateForEntity(binding.sensor_id);
          const value = state?.state ?? "—";
          const unit = state?.attributes?.unit_of_measurement || "";
          return `
            <div class="binding-row">
              <div>
                <strong>${SHARED.escapeHtml(this._metricLabel(binding.metric_type))}</strong>
                <div>${SHARED.escapeHtml(binding.sensor_id)}</div>
              </div>
              <div class="binding-row-right">
                <span>${SHARED.escapeHtml(`${value}${unit ? ` ${unit}` : ""}`)}</span>
                <button class="ghost-btn" data-edit-binding="${binding.id}" data-run="${run.id}" type="button">${this.t("edit")}</button>
                <button class="ghost-btn danger" data-remove-binding="${binding.id}" data-run="${run.id}" type="button">${this.t("delete")}</button>
              </div>
            </div>
          `;
        })
        .join("");
    }

    _detailOverlayMarkup(run) {
      if (!run) {
        return "";
      }
      const stageKey = this._stageKeyForRun(run);
      const heroArt = this._resolveStageArt(stageKey, "hero");
      const layoutClass = this._detailLayout === "stack" ? "stack" : "split";
      return `
        <div class="overlay" role="dialog" aria-modal="true">
          <div class="overlay-backdrop" data-close-detail></div>
          <div class="overlay-card ${layoutClass}">
            <button class="overlay-close" data-close-detail type="button">×</button>
            <div class="overlay-hero">
              <div class="overlay-hero-copy">
                <div class="eyebrow">${this.t("detail")}</div>
                <h2>${SHARED.escapeHtml(run.friendly_name || "Unnamed Run")}</h2>
                <p>${SHARED.escapeHtml(run?.base_config?.grow_space || "Grow space unset")} · ${SHARED.escapeHtml(run?.base_config?.grow_medium || "Medium unset")}</p>
                ${this._detailStatsMarkup(run)}
              </div>
              <div class="overlay-art-stage">
                <div class="overlay-art primary"><img src="${heroArt}" alt="stage hero art" /></div>
              </div>
            </div>
            <div class="detail-toolbar">
              <div class="control-group compact-inline">
                <span>${this.t("detailLayout")}</span>
                <button class="seg ${this._detailLayout === "split" ? "active" : ""}" data-detail-layout="split" type="button">${this.t("split")}</button>
                <button class="seg ${this._detailLayout === "stack" ? "active" : ""}" data-detail-layout="stack" type="button">${this.t("stack")}</button>
              </div>
              <div class="detail-toolbar-actions">
                <button class="ghost-btn" data-open-binding-add="${run.id}" type="button">${this.t("addSensor")}</button>
                <button class="ghost-btn danger" data-end-run="${run.id}" type="button">${this.t("endRun")}</button>
              </div>
            </div>
            <div class="detail-grid ${layoutClass}">
              ${this._detailEditorMarkup(run)}
              <section class="panel-block sensors-block">
                <div class="panel-head">
                  <div>
                    <div class="eyebrow">${this.t("sensors")}</div>
                    <strong>${this.t("tapHint")}</strong>
                  </div>
                </div>
                <div class="sensor-grid">
                  ${run.bindings?.length ? run.bindings.map((binding) => this._sensorTileMarkup(run, binding)).join("") : `<div class="empty-list">${this.t("noSensors")}</div>`}
                </div>
                ${this._historyPanelMarkup(run)}
              </section>
              <section class="panel-block notes-block">
                <div class="panel-head"><div><div class="eyebrow">${this.t("notes")}</div><strong>${run.notes?.length || 0}</strong></div></div>
                <div class="notes-list">
                  ${run.notes?.length ? run.notes.map((note) => this._noteMarkup(run, note)).join("") : `<div class="empty-list">${this.t("noNotes")}</div>`}
                </div>
                <textarea class="note-editor new-note" data-new-note placeholder="${SHARED.escapeHtml(this.t("newNotePlaceholder"))}">${SHARED.escapeHtml(this._newNoteText)}</textarea>
                <div class="note-actions bottom"><button class="primary-btn small" data-add-note="${run.id}" type="button">${this.t("save")}</button></div>
              </section>
              <section class="panel-block timeline-block">
                <div class="panel-head">
                  <div><div class="eyebrow">${this.t("phaseTimeline")}</div><strong>${SHARED.escapeHtml(this._currentPhase(run))}</strong></div>
                  <div class="inline-form">
                    <select data-phase-draft>
                      ${PHASE_OPTIONS.map((name) => `<option value="${name}" ${this._phaseDraft === name ? "selected" : ""}>${name}</option>`).join("")}
                    </select>
                    <button class="primary-btn small" data-add-phase="${run.id}" type="button">${this.t("addPhase")}</button>
                  </div>
                </div>
                ${this._phaseTimelineMarkup(run)}
              </section>
              <section class="panel-block bindings-block">
                <div class="panel-head">
                  <div><div class="eyebrow">${this.t("sensors")}</div><strong>Manage bindings</strong></div>
                </div>
                ${this._bindingListMarkup(run)}
              </section>
            </div>
          </div>
        </div>
      `;
    }

    _wizardStepMarkup() {
      if (!this._wizardOpen) {
        return "";
      }
      const stagePreview = this._wizardStep === 1 ? this._resolveStageArt("seedling", "hero") : this._wizardStep === 2 ? this._resolveStageArt("veg", "hero") : this._resolveStageArt("flower", "hero");
      return `
        <div class="wizard-shell">
          <div class="wizard-head">
            <div>
              <div class="eyebrow">${this.t("newRun")}</div>
              <h2>${this._wizardStep === 1 ? this.t("wizardStep1") : this._wizardStep === 2 ? this.t("wizardStep2") : this.t("wizardStep3")}</h2>
            </div>
            <button class="ghost-btn" data-close-wizard type="button">${this.t("close")}</button>
          </div>
          <div class="wizard-grid">
            <div class="wizard-main">
              ${this._wizardStep === 1 ? this._wizardStepOneMarkup() : this._wizardStep === 2 ? this._wizardStepTwoMarkup() : this._wizardStepThreeMarkup()}
            </div>
            <aside class="wizard-preview">
              <div class="wizard-preview-art"><img src="${stagePreview}" alt="wizard stage preview" /></div>
              <div class="wizard-phase-strip" aria-hidden="true">
                <span class="${this._wizardStep >= 1 ? "active" : ""}"></span>
                <span class="${this._wizardStep >= 2 ? "active" : ""}"></span>
                <span class="${this._wizardStep >= 3 ? "active" : ""}"></span>
              </div>
            </aside>
          </div>
        </div>
      `;
    }

    _wizardStepOneMarkup() {
      return `
        <div class="form-grid two-col">
          <label class="field">
            <span>Run name</span>
            <input data-wizard-input="friendly_name" value="${SHARED.escapeHtml(this._wizardForm.friendly_name)}" />
          </label>
          <label class="field">
            <span>Planted date</span>
            <input type="date" data-wizard-input="planted_date" value="${SHARED.escapeHtml(this._wizardForm.planted_date)}" />
          </label>
          <label class="field full">
            <span>${this.t("estimatedDuration")}</span>
            <input type="number" min="1" data-wizard-input="target_days" value="${SHARED.escapeHtml(this._wizardForm.target_days)}" />
            <small>${this.t("explicitEstimate")}</small>
            <div class="chip-row">
              ${QUICK_TARGETS.map((option) => `<button class="preset ${this._wizardForm.target_days === String(option) ? "on" : ""}" data-target-chip="${option}" type="button">${option} days</button>`).join("")}
            </div>
          </label>
          <label class="field">
            <span>${this.t("growMedium")}</span>
            <input data-wizard-input="grow_medium" value="${SHARED.escapeHtml(this._wizardForm.grow_medium)}" />
          </label>
          <label class="field">
            <span>${this.t("growSpace")}</span>
            <input data-wizard-input="grow_space" value="${SHARED.escapeHtml(this._wizardForm.grow_space)}" />
          </label>
        </div>
        <div class="wizard-actions">
          <button class="primary-btn" data-wizard-next type="button">Next</button>
        </div>
      `;
    }

    _wizardStepTwoMarkup() {
      const options = this._cultivarSuggestions.length
        ? this._cultivarSuggestions
            .map((item, index) => `
              <button
                class="cultivar-option ${this._cultivarIndex === index ? "active" : ""}"
                data-cultivar-index="${index}"
                data-cultivar-name="${SHARED.escapeHtml(item.name || "") }"
                type="button"
              >
                <strong>${SHARED.escapeHtml(item.name || "Unknown")}</strong>
                <span>${SHARED.escapeHtml(item.breeder || this._wizardForm.cultivar_breeder || "Unknown breeder")}</span>
              </button>
            `)
            .join("")
        : `<div class="empty-list">${this.t("cultivarSearchEmpty")}</div>`;
      return `
        <div class="form-grid">
          <label class="field">
            <span>${this.t("breeder")}</span>
            <input data-wizard-input="cultivar_breeder" value="${SHARED.escapeHtml(this._wizardForm.cultivar_breeder)}" />
          </label>
          <label class="field cultivar-field">
            <span>${this.t("cultivar")}</span>
            <input
              data-wizard-input="cultivar_query"
              value="${SHARED.escapeHtml(this._wizardForm.cultivar_query)}"
              placeholder="Runtz Layer Cake"
              data-cultivar-input
            />
            <small>${this.t("cultivarHint")}</small>
            <div class="cultivar-menu">${options}</div>
          </label>
        </div>
        <div class="wizard-actions between">
          <button class="ghost-btn" data-wizard-back type="button">Back</button>
          <button class="primary-btn" data-wizard-next type="button">Next</button>
        </div>
      `;
    }

    _wizardStepThreeMarkup() {
      const sensorFields = [
        ["temperature_sensor", "temperature"],
        ["humidity_sensor", "humidity"],
        ["soil_moisture_sensor", "soil_moisture"],
        ["conductivity_sensor", "conductivity"],
        ["light_sensor", "light"],
        ["energy_sensor", "energy"],
      ];
      return `
        <div class="form-grid two-col">
          <div class="field full"><span>${this.t("sensorOptional")}</span></div>
          ${sensorFields
            .map(
              ([field, metric]) => `
                <label class="field">
                  <span>${SHARED.escapeHtml(this._metricLabel(metric))}</span>
                  <input data-wizard-input="${field}" value="${SHARED.escapeHtml(this._wizardForm[field])}" placeholder="sensor.grow_${metric}" />
                </label>
              `
            )
            .join("")}
        </div>
        <div class="wizard-actions between">
          <button class="ghost-btn" data-wizard-back type="button">Back</button>
          <button class="primary-btn" data-create-run type="button" ${this._wizardBusy ? "disabled" : ""}>${this._wizardBusy ? "Creating…" : this.t("createRun")}</button>
        </div>
      `;
    }

    _bindingModalMarkup() {
      if (!this._bindingDraft) {
        return "";
      }
      const mode = this._bindingDraft.mode;
      const title = mode === "add" ? this.t("addSensor") : this.t("updateBinding");
      return `
        <div class="modal-shell">
          <div class="modal-backdrop" data-close-binding-modal></div>
          <div class="modal-card small-card">
            <div class="panel-head"><div><div class="eyebrow">${this.t("sensors")}</div><strong>${title}</strong></div></div>
            <label class="field">
              <span>${this.t("metricType")}</span>
              <select data-binding-input="metric_type">
                ${Object.keys(METRIC_LABEL_KEYS).map((metric) => `<option value="${metric}" ${this._bindingDraft.metric_type === metric ? "selected" : ""}>${this._metricLabel(metric)}</option>`).join("")}
              </select>
            </label>
            <label class="field">
              <span>${this.t("sensorEntity")}</span>
              <input data-binding-input="sensor_id" value="${SHARED.escapeHtml(this._bindingDraft.sensor_id || "")}" />
            </label>
            <div class="wizard-actions between">
              <button class="ghost-btn" data-close-binding-modal type="button">${this.t("cancel")}</button>
              <button class="primary-btn" data-save-binding type="button">${this.t("save")}</button>
            </div>
          </div>
        </div>
      `;
    }

    _modalMarkup() {
      if (!this._modal) {
        return "";
      }
      return `
        <div class="modal-shell">
          <div class="modal-backdrop" data-dismiss-modal></div>
          <div class="modal-card">
            <div class="panel-head"><div><div class="eyebrow">PlantRun</div><strong>${SHARED.escapeHtml(this._modal.title)}</strong></div></div>
            <p class="modal-copy">${SHARED.escapeHtml(this._modal.body)}</p>
            <div class="wizard-actions between">
              <button class="ghost-btn" data-dismiss-modal type="button">${this.t("cancel")}</button>
              <button class="primary-btn danger" data-confirm-modal type="button">${this.t("save")}</button>
            </div>
          </div>
        </div>
      `;
    }

    _openConfirmModal(title, body, onConfirm) {
      this._modal = { title, body, onConfirm };
      this.render();
    }

    async _confirmModal() {
      const handler = this._modal?.onConfirm;
      this._modal = null;
      this.render();
      if (handler) {
        await handler();
      }
    }

    _dismissModal() {
      this._modal = null;
      this.render();
    }

    _openBindingModal(runId, bindingId = null) {
      const run = this._runById(runId);
      const binding = bindingId ? run?.bindings?.find((item) => item.id === bindingId) : null;
      this._bindingDraft = {
        run_id: runId,
        mode: binding ? "edit" : "add",
        binding_id: binding?.id || null,
        metric_type: binding?.metric_type || "temperature",
        sensor_id: binding?.sensor_id || "",
      };
      this.render();
    }

    _closeBindingModal() {
      this._bindingDraft = null;
      this.render();
    }

    async _saveBindingDraft() {
      if (!this.hass || !this._bindingDraft) {
        return;
      }
      const payload = {
        run_id: this._bindingDraft.run_id,
        metric_type: this._bindingDraft.metric_type,
        sensor_id: String(this._bindingDraft.sensor_id || "").trim(),
      };
      if (!payload.sensor_id) {
        return;
      }
      if (this._bindingDraft.mode === "edit") {
        await this.hass.callService(DOMAIN, "update_binding", {
          ...payload,
          binding_id: this._bindingDraft.binding_id,
        });
      } else {
        await this.hass.callService(DOMAIN, "add_binding", payload);
      }
      this._bindingDraft = null;
      await this._refreshRuns();
    }

    async _removeBinding(runId, bindingId) {
      if (!this.hass) {
        return;
      }
      await this.hass.callService(DOMAIN, "remove_binding", { run_id: runId, binding_id: bindingId });
      await this._refreshRuns();
    }

    async _addPhase(runId) {
      if (!this.hass) {
        return;
      }
      await this.hass.callService(DOMAIN, "add_phase", { run_id: runId, phase_name: this._phaseDraft });
      await this._refreshRuns();
    }

    async _endRun(runId) {
      if (!this.hass) {
        return;
      }
      await this.hass.callService(DOMAIN, "end_run", { run_id: runId });
      await this._refreshRuns();
    }

    _startEditingNote(noteId, currentText) {
      this._noteDrafts = { ...this._noteDrafts, [noteId]: currentText };
      this.render();
    }

    _cancelEditingNote(noteId) {
      const next = { ...this._noteDrafts };
      delete next[noteId];
      this._noteDrafts = next;
      this.render();
    }

    async _saveNote(runId, noteId) {
      const text = String(this._noteDrafts[noteId] || "").trim();
      if (!text || !this.hass) {
        return;
      }
      await this.hass.callService(DOMAIN, "update_note", { run_id: runId, note_id: noteId, text });
      this._cancelEditingNote(noteId);
      await this._refreshRuns();
    }

    async _deleteNote(runId, noteId) {
      if (!this.hass) {
        return;
      }
      await this.hass.callService(DOMAIN, "delete_note", { run_id: runId, note_id: noteId });
      await this._refreshRuns();
    }

    async _addNote(runId) {
      const text = String(this._newNoteText || "").trim();
      if (!text || !this.hass) {
        return;
      }
      await this.hass.callService(DOMAIN, "add_note", { run_id: runId, text });
      this._newNoteText = "";
      await this._refreshRuns();
    }

    async _saveDetailDraft(runId) {
      if (!this.hass) {
        return;
      }
      const run = this._runById(runId);
      const draft = this._detailDrafts[runId];
      if (!run || !draft) {
        return;
      }
      await this.hass.callService(DOMAIN, "update_run", {
        run_id: runId,
        friendly_name: draft.friendly_name,
        planted_date: draft.planted_date || null,
        notes_summary: draft.notes_summary || null,
        dry_yield_grams: draft.dry_yield_grams === "" ? null : Number(draft.dry_yield_grams),
        base_config: {
          ...(run.base_config || {}),
          target_days: Number(draft.target_days || this._targetDaysForRun(run) || 84),
          grow_medium: draft.grow_medium,
          grow_space: draft.grow_space,
        },
      });
      await this._refreshRuns();
    }

    _normalizeWizardData() {
      return {
        friendly_name: String(this._wizardForm.friendly_name || "").trim(),
        planted_date: String(this._wizardForm.planted_date || "").trim(),
        target_days: String(this._wizardForm.target_days || "").trim(),
        grow_medium: String(this._wizardForm.grow_medium || "").trim(),
        grow_space: String(this._wizardForm.grow_space || "").trim(),
        cultivar_breeder: String(this._wizardForm.cultivar_breeder || "").trim(),
        cultivar_query: String(this._wizardForm.cultivar_query || "").trim(),
      };
    }

    _openWizard() {
      this._wizardOpen = true;
      this._wizardStep = 1;
      this._page = "overview";
      this.render();
    }

    _closeWizard() {
      this._wizardOpen = false;
      this._wizardBusy = false;
      this._searchRequestNonce += 1;
      window.clearTimeout(this._suggestionClearTimer);
      window.clearTimeout(this._searchTimer);
      this._cultivarSuggestions = [];
      this._cultivarIndex = -1;
      this.render();
    }

    _setWizardField(field, value, { render = false } = {}) {
      const next = { ...this._wizardForm, [field]: value };
      if (
        (field === "cultivar_query" || field === "cultivar_breeder")
        && value !== this._wizardForm[field]
      ) {
        next.cultivar_name = "";
      }
      this._wizardForm = next;
      if (render) {
        this.render();
      }
    }

    _wizardNext() {
      if (this._wizardStep < 3) {
        this._wizardStep += 1;
        this.render();
      }
    }

    _wizardBack() {
      if (this._wizardStep > 1) {
        this._wizardStep -= 1;
        this.render();
      }
    }

    async _createRunFromWizard() {
      if (!this.hass || this._wizardBusy) {
        return;
      }
      const normalizedForm = this._normalizeWizardData();
      if (!normalizedForm.friendly_name) {
        return;
      }
      const knownRunIds = new Set(this._runs.map((run) => run.id));
      this._wizardBusy = true;
      this.render();
      try {
        await this.hass.callService(DOMAIN, "create_run", {
          friendly_name: normalizedForm.friendly_name,
          planted_date: normalizedForm.planted_date || undefined,
        });
        await this._refreshRuns();
        const createdRun = this._resolveNewlyCreatedRun(normalizedForm.friendly_name, knownRunIds);
        if (!createdRun) {
          return;
        }
        this._lastCreatedRunId = createdRun.id;
        await this.hass.callService(DOMAIN, "update_run", {
          run_id: createdRun.id,
          planted_date: normalizedForm.planted_date || undefined,
          base_config: {
            ...(createdRun.base_config || {}),
            target_days: Number(normalizedForm.target_days || 84),
            grow_medium: normalizedForm.grow_medium || "Soil",
            grow_space: normalizedForm.grow_space || "Tent A",
          },
        });
        const cultivarName = this._wizardForm.cultivar_name || normalizedForm.cultivar_query;
        if (cultivarName) {
          await this.hass.callService(DOMAIN, "set_cultivar", {
            run_id: createdRun.id,
            cultivar_name: cultivarName,
            breeder: normalizedForm.cultivar_breeder || undefined,
            strain: normalizedForm.cultivar_query || undefined,
          });
        }
        for (const [field, metric] of [
          ["temperature_sensor", "temperature"],
          ["humidity_sensor", "humidity"],
          ["soil_moisture_sensor", "soil_moisture"],
          ["conductivity_sensor", "conductivity"],
          ["light_sensor", "light"],
          ["energy_sensor", "energy"],
        ]) {
          const sensorId = String(this._wizardForm[field] || "").trim();
          if (!sensorId) continue;
          await this.hass.callService(DOMAIN, "add_binding", {
            run_id: createdRun.id,
            metric_type: metric,
            sensor_id: sensorId,
          });
        }
        await this._refreshRuns();
        this._wizardForm = { ...DEFAULT_WIZARD_FORM };
        this._wizardBusy = false;
        this._closeWizard();
      } finally {
        this._wizardBusy = false;
        this.render();
      }
    }

    _resolveNewlyCreatedRun(name, previousRunIds = new Set()) {
      const newlyDiscovered = this._runs.filter((run) => !previousRunIds.has(run.id));
      if (newlyDiscovered.length === 1) {
        return newlyDiscovered[0];
      }
      if (newlyDiscovered.length > 1) {
        return [...newlyDiscovered].sort((a, b) => Date.parse(b.start_time || 0) - Date.parse(a.start_time || 0))[0];
      }
      const sameName = this._runs.filter((run) => run.friendly_name === name);
      if (sameName.length === 1) {
        return sameName[0];
      }
      return [...sameName].sort((a, b) => Date.parse(b.start_time || 0) - Date.parse(a.start_time || 0))[0] || this._runs.find((run) => run.id === this._activeRunId) || null;
    }

    async _searchCultivarSuggestions() {
      const breeder = String(this._wizardForm.cultivar_breeder || "").trim();
      const query = String(this._wizardForm.cultivar_query || "").trim();
      if (!breeder || query.length < 2) {
        this._searchRequestNonce += 1;
        this._cultivarSuggestions = [];
        this._cultivarIndex = -1;
        this.render();
        return;
      }
      const requestNonce = ++this._searchRequestNonce;
      try {
        const token = this.hass?.auth?.data?.access_token || this.hass?.auth?.data?.accessToken;
        const response = await fetch("/api/plantrun/search_cultivar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ breeder, query }),
        });
        const payload = await response.json();
        if (requestNonce !== this._searchRequestNonce) {
          return;
        }
        this._cultivarSuggestions = Array.isArray(payload?.results) ? payload.results : [];
        this._cultivarIndex = this._cultivarSuggestions.length ? 0 : -1;
        this.render();
      } catch (_error) {
        if (requestNonce !== this._searchRequestNonce) {
          return;
        }
        this._cultivarSuggestions = [];
        this._cultivarIndex = -1;
        this.render();
      }
    }

    _queueCultivarSearch() {
      window.clearTimeout(this._searchTimer);
      this._searchTimer = window.setTimeout(() => this._searchCultivarSuggestions(), 220);
    }

    _selectCultivarSuggestion(index) {
      const item = this._cultivarSuggestions[index];
      if (!item) {
        return;
      }
      this._wizardForm = {
        ...this._wizardForm,
        cultivar_name: item.name || "",
        cultivar_query: item.name || this._wizardForm.cultivar_query,
      };
      this._cultivarIndex = index;
      this._cultivarSuggestions = [];
      this.render();
    }

    _onCultivarKeydown(event) {
      if (!this._cultivarSuggestions.length) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        this._cultivarIndex = Math.min(this._cultivarSuggestions.length - 1, this._cultivarIndex + 1);
        this.render();
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        this._cultivarIndex = Math.max(0, this._cultivarIndex - 1);
        this.render();
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        if (this._cultivarIndex >= 0) {
          event.preventDefault();
          this._selectCultivarSuggestion(this._cultivarIndex);
        }
        return;
      }
      if (event.key === "Escape") {
        this._cultivarSuggestions = [];
        this._cultivarIndex = -1;
        this.render();
      }
    }

    _clearCultivarSuggestionsSoon() {
      window.clearTimeout(this._suggestionClearTimer);
      this._suggestionClearTimer = window.setTimeout(() => {
        this._cultivarSuggestions = [];
        this._cultivarIndex = -1;
        this.render();
      }, 130);
    }

    _handleDelegatedClick(event) {
      const target = event.target.closest(DELEGATED_ACTION_SELECTOR);
      if (!target || !this.shadowRoot.contains(target)) {
        return;
      }
      if (target.dataset.page) {
        this._page = target.dataset.page;
        this.render();
      }
      if (target.dataset.theme) this._toggleTheme(target.dataset.theme);
      if (target.dataset.lang) this._toggleLanguage(target.dataset.lang);
      if (target.dataset.grid) this._toggleGrid(target.dataset.grid);
      if (target.dataset.filter) this._setFilter(target.dataset.filter);
      if (target.dataset.openRun) this._openDetail(target.dataset.openRun);
      if (target.dataset.toggleExpand) this._toggleRunExpansion(target.dataset.toggleExpand);
      if (target.dataset.openWizard !== undefined) this._openWizard();
      if (target.dataset.closeWizard !== undefined) this._closeWizard();
      if (target.dataset.wizardNext !== undefined) this._wizardNext();
      if (target.dataset.wizardBack !== undefined) this._wizardBack();
      if (target.dataset.targetChip) this._setWizardField("target_days", target.dataset.targetChip, { render: true });
      if (target.dataset.closeDetail !== undefined) this._closeDetail();
      if (target.dataset.openEntity) this._openEntity(target.dataset.openEntity);
      if (target.dataset.openBindingAdd) this._openBindingModal(target.dataset.openBindingAdd);
      if (target.dataset.editBinding) this._openBindingModal(target.dataset.run, target.dataset.editBinding);
      if (target.dataset.removeBinding) {
        this._openConfirmModal(this.t("removeBinding"), this.t("confirmRemoveBinding"), () => this._removeBinding(target.dataset.run, target.dataset.removeBinding));
      }
      if (target.dataset.saveBinding !== undefined) this._saveBindingDraft();
      if (target.dataset.closeBindingModal !== undefined) this._closeBindingModal();
      if (target.dataset.addPhase) this._addPhase(target.dataset.addPhase);
      if (target.dataset.endRun) {
        this._openConfirmModal(this.t("endRun"), this.t("confirmEndRun"), () => this._endRun(target.dataset.endRun));
      }
      if (target.dataset.editNote) {
        const run = this._runById(this._detailRunId);
        const note = run?.notes?.find((item) => item.id === target.dataset.editNote);
        this._startEditingNote(target.dataset.editNote, note?.text || "");
      }
      if (target.dataset.saveNote) this._saveNote(target.dataset.run, target.dataset.saveNote);
      if (target.dataset.cancelNote) this._cancelEditingNote(target.dataset.cancelNote);
      if (target.dataset.deleteNote) {
        this._openConfirmModal(this.t("delete"), this.t("confirmDeleteNote"), () => this._deleteNote(target.dataset.run, target.dataset.deleteNote));
      }
      if (target.dataset.addNote) this._addNote(target.dataset.addNote);
      if (target.dataset.cultivarIndex) this._selectCultivarSuggestion(Number(target.dataset.cultivarIndex));
      if (target.dataset.dismissModal !== undefined) this._dismissModal();
      if (target.dataset.confirmModal !== undefined) this._confirmModal();
      if (target.dataset.createRun !== undefined) this._createRunFromWizard();
      if (target.dataset.detailLayout) this._toggleDetailLayout(target.dataset.detailLayout);
      if (target.dataset.saveDetail) this._saveDetailDraft(target.dataset.saveDetail);
    }

    _handleInput(event) {
      const target = event.target;
      if (target.matches("[data-wizard-input]")) {
        this._setWizardField(target.dataset.wizardInput, target.value);
        if (target.dataset.wizardInput === "cultivar_query" || target.dataset.wizardInput === "cultivar_breeder") {
          this._queueCultivarSearch();
        }
      }
      if (target.matches("[data-binding-input]")) {
        this._bindingDraft = { ...this._bindingDraft, [target.dataset.bindingInput]: target.value };
      }
      if (target.matches("[data-new-note]")) {
        this._newNoteText = target.value;
      }
      if (target.matches("[data-note-edit]")) {
        this._noteDrafts = { ...this._noteDrafts, [target.dataset.noteEdit]: target.value };
      }
      if (target.matches("[data-phase-draft]")) {
        this._phaseDraft = target.value;
      }
      if (target.matches("[data-detail-input]")) {
        const runId = target.dataset.run;
        this._detailDrafts = {
          ...this._detailDrafts,
          [runId]: {
            ...(this._detailDrafts[runId] || {}),
            [target.dataset.detailInput]: target.value,
          },
        };
      }
    }

    _bindInteractions() {
      this.shadowRoot.querySelectorAll("[data-cultivar-input]").forEach((input) => {
        input.onkeydown = (event) => this._onCultivarKeydown(event);
        input.onblur = () => this._clearCultivarSuggestionsSoon();
        input.onfocus = () => {
          if (this._cultivarSuggestions.length) this.render();
        };
      });

      this.shadowRoot.querySelectorAll("[data-cultivar-index]").forEach((button) => {
        // @mousedown=${(e) => e.preventDefault()}
        button.onmousedown = (event) => event.preventDefault();
      });

      this.shadowRoot.querySelectorAll("[data-press-target='sensor']").forEach((button) => {
        const runId = button.dataset.run;
        const entityId = button.dataset.entity;
        // @click=${(e) => e.preventDefault()}
        button.onclick = (e) => e.preventDefault();
        button.onpointerdown = () => this._sensorPressStart(runId, entityId);
        button.onpointerup = () => this._sensorPressEnd(runId, entityId);
        button.onpointerleave = () => this._sensorPressCancel(runId, entityId);
        button.onpointercancel = () => this._sensorPressCancel(runId, entityId);
      });
    }

    _selectorValue(value) {
      const text = String(value ?? "");
      if (window.CSS?.escape) {
        return window.CSS.escape(text);
      }
      return text.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    }

    _focusSelectorForElement(element) {
      if (!element || typeof element.matches !== "function") {
        return null;
      }
      if (element.dataset?.wizardInput) {
        return `[data-wizard-input="${this._selectorValue(element.dataset.wizardInput)}"]`;
      }
      return null;
    }

    _captureFocusState() {
      const active = this.shadowRoot?.activeElement;
      const selector = this._focusSelectorForElement(active);
      if (!selector) {
        return null;
      }
      return {
        selector,
        selectionStart: typeof active.selectionStart === "number" ? active.selectionStart : null,
        selectionEnd: typeof active.selectionEnd === "number" ? active.selectionEnd : null,
        selectionDirection: active.selectionDirection || "none",
      };
    }

    _restoreFocusState(state) {
      if (!state?.selector) {
        return;
      }
      const target = this.shadowRoot?.querySelector(state.selector);
      if (!target || typeof target.focus !== "function") {
        return;
      }
      target.focus({ preventScroll: true });
      if (typeof state.selectionStart === "number" && typeof target.setSelectionRange === "function") {
        const valueLength = typeof target.value === "string" ? target.value.length : 0;
        const start = Math.min(state.selectionStart, valueLength);
        const end = Math.min(state.selectionEnd ?? state.selectionStart, valueLength);
        try {
          target.setSelectionRange(start, end, state.selectionDirection || "none");
        } catch (_error) {
          // Some input types (for example date/number) do not expose selection APIs.
        }
      }
    }

    _overviewMarkup() {
      const runs = this._filteredRuns();
      if (!runs.length) {
        return this._emptyStateMarkup();
      }
      return `
        ${this._overviewHeroMarkup(runs)}
        <section class="overview-grid ${this._gridMode}">
          ${runs.map((run) => this._runCardMarkup(run)).join("")}
        </section>
      `;
    }

    _overviewHeroMarkup(runs) {
      const featured = this._runById(this._activeRunId) || runs[0];
      const stageKey = this._stageKeyForRun(featured);
      const heroArt = this._resolveStageArt(stageKey, "tall");
      const summary = this._summaryForRun(featured.id);
      const runAgeDays = this._runAgeDays(featured);
      const tempAvg = summary?.temperature?.avg != null ? `${summary.temperature.avg}°` : "—";
      const humidityAvg = summary?.humidity?.avg != null ? `${summary.humidity.avg}%` : "—";
      return `
        <section class="overview-hero">
          <div class="overview-hero-copy">
            <div class="eyebrow">${this.t("quickSummary")}</div>
            <h1>${SHARED.escapeHtml(featured.friendly_name || "PlantRun")}</h1>
            <p>${SHARED.escapeHtml(this._currentPhase(featured))} · ${this.t("day")} ${runAgeDays} · ${SHARED.escapeHtml(featured?.base_config?.grow_space || "Grow space unset")}</p>
            <div class="hero-stats">
              <div><span>Temp</span><strong>${SHARED.escapeHtml(tempAvg)}</strong></div>
              <div><span>Humidity</span><strong>${SHARED.escapeHtml(humidityAvg)}</strong></div>
              <div><span>${this.t("target")}</span><strong>${this._targetDaysForRun(featured) || "—"} ${this.t("days")}</strong></div>
            </div>
          </div>
          <div class="overview-hero-art">
            <img src="${heroArt}" alt="${SHARED.escapeHtml(this._currentPhase(featured))} hero art" />
          </div>
        </section>
      `;
    }

    render() {
      if (!this.hass) return;

      const detailRun = this._runById(this._detailRunId);
      const focusState = this._captureFocusState();
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            position: relative;
            color: var(--primary-text-color, #edf4ff);
            --bg-dark: #111815;
            --bg-dark-soft: rgba(25, 33, 28, 0.88);
            --bg-light: #f7f3e8;
            --bg-light-soft: rgba(255, 252, 242, 0.9);
            --line-dark: rgba(255, 255, 255, 0.08);
            --line-light: rgba(74, 85, 62, 0.14);
            --accent: #6f8f64;
            --accent-2: #365d42;
            --sage: #dfe9d2;
            --sage-strong: #c6d6b7;
            --cream: #fffaf0;
            --clay: #a87556;
            --text-dark: #edf3e7;
            --text-light: #253024;
            --muted-dark: rgba(237, 243, 231, 0.72);
            --muted-light: rgba(37, 48, 36, 0.66);
            font-family: var(--primary-font-family, Inter, system-ui, sans-serif);
          }
          .shell {
            min-height: 100vh;
            box-sizing: border-box;
            padding: clamp(16px, 2vw, 28px);
            background:
              linear-gradient(180deg, ${this._theme === "dark" ? "rgba(111, 143, 100, 0.12)" : "rgba(223, 233, 210, 0.56)"}, transparent 38%),
              linear-gradient(180deg, ${this._theme === "dark" ? "var(--bg-dark)" : "var(--bg-light)"}, ${this._theme === "dark" ? "#172018" : "#efe8d9"});
            color: ${this._theme === "dark" ? "var(--text-dark)" : "var(--text-light)"};
          }
          .topbar,
          .filters,
          .wizard-shell,
          .run-card,
          .empty-state,
          .panel-block,
          .overlay-card,
          .modal-card {
            backdrop-filter: blur(18px);
            background: ${this._theme === "dark" ? "var(--bg-dark-soft)" : "var(--bg-light-soft)"};
            border: 1px solid ${this._theme === "dark" ? "var(--line-dark)" : "var(--line-light)"};
            box-shadow: 0 22px 54px rgba(57, 48, 32, ${this._theme === "dark" ? 0.34 : 0.1});
          }
          .topbar {
            display: grid;
            grid-template-columns: auto 1fr auto;
            gap: 18px;
            align-items: center;
            padding: 14px 16px;
            border-radius: 24px;
          }
          .brand { display:flex; gap:14px; align-items:center; min-width:0; }
          .brand-logo { width:38px; height:38px; opacity: 0.9; }
          .brand-name { font-size: 1.04rem; font-weight: 800; }
          .brand-subtitle { opacity: 0.62; font-size: 0.86rem; }
          .nav-actions, .filter-row, .control-bar, .control-group, .wizard-actions, .note-actions, .detail-toolbar-actions, .inline-form, .run-card-actions, .binding-row-right { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
          .nav-btn, .seg, .filter-chip, .ghost-btn, .primary-btn, .preset, .cultivar-option, .run-card-hit, .sensor-tile {
            font: inherit;
          }
          button {
            cursor: pointer;
          }
          .nav-btn, .seg, .filter-chip, .ghost-btn, .preset {
            border-radius: 999px;
            border: 1px solid ${this._theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(17,24,31,0.08)"};
            background: ${this._theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,250,240,0.62)"};
            color: inherit;
            padding: 9px 13px;
          }
          .nav-btn.active, .seg.active, .filter-chip.active, .preset.on {
            background: ${this._theme === "dark" ? "rgba(111,143,100,0.26)" : "var(--sage)"};
            border-color: ${this._theme === "dark" ? "rgba(148,181,133,0.5)" : "rgba(89,115,78,0.26)"};
          }
          .primary-btn {
            border: none;
            border-radius: 999px;
            background: linear-gradient(135deg, #78996d, #365d42);
            color: white;
            padding: 11px 16px;
            box-shadow: 0 10px 22px rgba(54, 93, 66, 0.18);
          }
          .primary-btn.small, .ghost-btn.small { padding: 8px 12px; font-size: 0.86rem; }
          .ghost-btn.danger, .primary-btn.danger { background: ${this._theme === "dark" ? "rgba(255,95,95,0.14)" : "rgba(255,95,95,0.12)"}; color: ${this._theme === "dark" ? "#ffc0c0" : "#8d2222"}; border-color: rgba(255,95,95,0.3); }
          .control-bar { justify-content: flex-end; }
          .control-group { padding: 5px 7px; border-radius: 999px; background: ${this._theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,250,240,0.52)"}; }
          .control-group span { opacity: 0.7; font-size: 0.82rem; }
          .filters { margin-top: 18px; border-radius: 22px; padding: 14px 16px; }
          .eyebrow { text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.72rem; opacity: 0.7; }
          .overview-hero {
            margin-top: 18px;
            min-height: 340px;
            display:grid;
            grid-template-columns: minmax(0, 1.08fr) minmax(260px, 0.92fr);
            gap: clamp(18px, 4vw, 46px);
            align-items:center;
            overflow:hidden;
            border-radius: 34px;
            padding: clamp(24px, 4vw, 46px);
            background:
              linear-gradient(135deg, ${this._theme === "dark" ? "rgba(35,47,38,0.92)" : "rgba(255,250,240,0.94)"}, ${this._theme === "dark" ? "rgba(24,34,28,0.86)" : "rgba(223,233,210,0.78)"});
            border: 1px solid ${this._theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(74,85,62,0.12)"};
            box-shadow: 0 28px 70px rgba(57, 48, 32, ${this._theme === "dark" ? 0.3 : 0.12});
          }
          .overview-hero-copy { display:grid; gap: 16px; align-content:center; max-width: 620px; }
          .overview-hero-copy h1 { margin:0; font-size: clamp(2.1rem, 5vw, 4.8rem); line-height:0.96; font-weight: 800; }
          .overview-hero-copy p { margin:0; color: ${this._theme === "dark" ? "var(--muted-dark)" : "var(--muted-light)"}; font-size: 1rem; line-height:1.65; }
          .hero-stats { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; max-width: 520px; }
          .hero-stats div {
            border-radius: 18px;
            padding: 13px 14px;
            background: ${this._theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(255,250,240,0.72)"};
            border: 1px solid ${this._theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(74,85,62,0.1)"};
          }
          .hero-stats span { display:block; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; opacity:0.62; }
          .hero-stats strong { display:block; margin-top:5px; font-size:1.08rem; }
          .overview-hero-art {
            position:relative;
            min-height: 330px;
            display:grid;
            place-items:center;
            overflow:visible;
            pointer-events: none;
            user-select: none;
          }
          .overview-hero-art::before {
            content:"";
            position:absolute;
            width:min(76%, 360px);
            aspect-ratio:1;
            border-radius:50%;
            background:${this._theme === "dark" ? "rgba(111,143,100,0.18)" : "rgba(198,214,183,0.5)"};
            bottom: 4%;
            right: 8%;
          }
          .overview-hero-art img {
            position:relative;
            width:min(118%, 520px);
            height: min(118%, 480px);
            object-fit: contain;
            transform: translate(7%, 2%) scale(1.08);
            filter: drop-shadow(0 24px 28px rgba(57,48,32,0.16));
          }
          .overview-grid { margin-top: 18px; display:grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 18px; }
          .overview-grid.compact { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
          .run-card { border-radius: 26px; padding: 16px; display:grid; gap: 12px; background: ${this._theme === "dark" ? "rgba(25,33,28,0.88)" : "rgba(223,233,210,0.62)"}; }
          .run-card-hit { width:100%; border:none; background:none; padding:0; color:inherit; display:grid; gap: 16px; grid-template-columns: 100px 1fr; text-align:left; overflow:hidden; }
          .run-card.comfy .run-card-hit { grid-template-columns: 112px 1fr; }
          .run-card-art { border-radius: 24px 10px 24px 10px; overflow:visible; background: ${this._theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,250,240,0.55)"}; min-height: 126px; display:grid; place-items:center; pointer-events: none; user-select: none; }
          .run-card-art img, .wizard-preview-art img, .overlay-art img, .empty-art img { width: 100%; height: 100%; object-fit: contain; padding: 10px; filter: drop-shadow(0 16px 18px rgba(57,48,32,0.12)); }
          .run-card-art img { width: 124%; height: 124%; transform: translate(5%, -3%) scale(1.08); padding:0; }
          .run-card-copy { display:grid; gap: 10px; min-width:0; }
          .run-card-top { display:flex; justify-content:space-between; gap: 12px; align-items:start; }
          .run-card-top h3 { margin: 3px 0 0; font-size: 1.12rem; line-height: 1.2; }
          .phase-pill { border-radius: 999px; padding: 7px 10px; background: ${this._theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(255,250,240,0.68)"}; font-size: 0.8rem; }
          .run-meta { opacity: 0.78; }
          .run-stats-row { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 8px; }
          .mini-stat, .detail-stat { border-radius: 18px; padding: 10px 12px; background: ${this._theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(255,250,240,0.6)"}; }
          .mini-stat span, .detail-stat span { display:block; font-size: 0.74rem; opacity: 0.68; text-transform: uppercase; letter-spacing: 0.08em; }
          .mini-stat strong, .detail-stat strong { display:block; margin-top: 4px; }
          .mini-phase-track { display:flex; gap: 8px; }
          .phase-dot { width: 28px; height: 28px; border-radius: 50%; display:grid; place-items:center; background: ${this._theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,250,240,0.7)"}; font-size: 0.82rem; }
          .phase-dot.active { background: ${this._theme === "dark" ? "rgba(111,143,100,0.42)" : "var(--sage-strong)"}; }
          .run-card-actions { justify-content: space-between; }
          .expanded-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
          .expanded-block { border-radius: 18px; padding: 12px; background: ${this._theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,250,240,0.58)"}; }
          .expanded-block p { margin: 5px 0 0; opacity: 0.76; line-height: 1.4; }
          .empty-state { margin-top: 18px; min-height: 420px; border-radius: 34px; padding: clamp(24px, 4vw, 46px); display:grid; grid-template-columns: 1.05fr 0.95fr; gap: clamp(20px, 4vw, 48px); align-items:center; overflow:hidden; }
          .empty-copy h2 { margin: 8px 0 10px; font-size: clamp(1.5rem, 3vw, 2.2rem); }
          .empty-copy p { opacity: 0.78; max-width: 42ch; line-height: 1.6; }
          .empty-art-composition { min-height: 340px; position: relative; display:grid; place-items:center; overflow:visible; pointer-events: none; user-select: none; }
          .empty-art { position:absolute; overflow:visible; background: ${this._theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(223,233,210,0.46)"}; box-shadow: inset 0 0 0 1px ${this._theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(74,85,62,0.08)"}; pointer-events: none; user-select: none; }
          .empty-art.art-1 { width: min(82%, 390px); height: 86%; border-radius: 42px 14px 42px 14px; transform: translate(8%, 2%); }
          .empty-art.art-1 img { width: 128%; height: 120%; transform: translate(-4%, -7%) scale(1.08); padding:0; }
          .wizard-shell { margin-top: 18px; border-radius: 28px; padding: 22px; display:grid; gap: 18px; }
          .wizard-grid { display:grid; grid-template-columns: 1.25fr 0.75fr; gap: 16px; }
          .wizard-preview { display:grid; gap: 12px; pointer-events: none; user-select: none; }
          .wizard-preview-art { border-radius: 36px 14px 36px 14px; overflow:visible; min-height: 260px; background: ${this._theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(223,233,210,0.54)"}; pointer-events: none; user-select: none; }
          .wizard-preview-art img { width: 116%; height: 112%; transform: translate(3%, -4%); padding:0; }
          .wizard-phase-strip { display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
          .wizard-phase-strip span { height: 8px; border-radius:999px; background: ${this._theme === "dark" ? "rgba(255,255,255,0.1)" : "rgba(17,24,31,0.1)"}; }
          .wizard-phase-strip span.active { background: linear-gradient(135deg, #90a97d, #4f7557); }
          .form-grid { display:grid; gap: 14px; }
          .form-grid.two-col { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .field { display:grid; gap: 8px; }
          .field.full { grid-column: 1 / -1; }
          .field span { font-size: 0.86rem; font-weight: 700; }
          .field small { opacity: 0.68; }
          input, select, textarea {
            width: 100%; box-sizing: border-box; border-radius: 16px; padding: 12px 13px;
            border: 1px solid ${this._theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(17,24,31,0.08)"};
            background: ${this._theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,250,240,0.78)"};
            color: inherit; font: inherit;
          }
          textarea { min-height: 92px; resize: vertical; }
          .chip-row { display:flex; gap: 8px; flex-wrap:wrap; }
          .cultivar-field { position: relative; }
          .cultivar-menu { display:grid; gap: 8px; margin-top: 10px; }
          .cultivar-option { text-align:left; border-radius: 16px; border: 1px solid ${this._theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(17,24,31,0.08)"}; background: ${this._theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.72)"}; padding: 11px 12px; display:grid; gap: 4px; }
          .cultivar-option.active { border-color: rgba(94,211,122,0.5); background: linear-gradient(135deg, rgba(94,211,122,0.2), rgba(43,154,74,0.18)); }
          .wizard-actions.between { justify-content: space-between; }
          .overlay, .modal-shell { position: absolute; inset: 0; z-index: 20; }
          .overlay-backdrop, .modal-backdrop { position:absolute; inset:0; background: rgba(0,0,0,0.5); }
          .overlay-card {
            position: absolute; inset: 24px; z-index: 1; border-radius: 34px; padding: clamp(18px, 3vw, 30px); overflow:auto; display:grid; gap: 18px;
          }
          .overlay-card.stack .detail-grid { grid-template-columns: 1fr; }
          .overlay-close { position:absolute; top:16px; right:16px; border:none; background: ${this._theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.72)"}; color:inherit; width:40px; height:40px; border-radius:50%; font-size: 1.2rem; }
          .overlay-hero {
            display:grid;
            grid-template-columns: 1.08fr 0.92fr;
            gap: clamp(18px, 4vw, 42px);
            align-items:center;
            min-height: 330px;
            overflow:hidden;
            border-radius: 30px;
            padding: clamp(20px, 3vw, 34px);
            background: ${this._theme === "dark" ? "rgba(33,45,36,0.72)" : "rgba(223,233,210,0.5)"};
          }
          .overlay-hero-copy h2 { margin: 8px 0 6px; font-size: clamp(1.8rem, 4vw, 4.1rem); line-height:0.98; }
          .overlay-hero-copy p { margin: 0; opacity: 0.78; }
          .overlay-art-stage { display:grid; min-height: 300px; overflow:visible; pointer-events: none; user-select: none; }
          .overlay-art { border-radius: 44px 14px 44px 14px; overflow:visible; min-height: 300px; background: ${this._theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(255,250,240,0.58)"}; pointer-events: none; user-select: none; }
          .overlay-art img { width: 118%; height: 118%; transform: translate(5%, -5%) scale(1.08); padding:0; }
          .detail-stats-row { margin-top: 16px; display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
          .detail-toolbar { display:flex; justify-content:space-between; gap: 12px; align-items:center; flex-wrap:wrap; }
          .control-group.compact-inline { padding: 0; background: transparent; }
          .detail-grid { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
          .panel-block { border-radius: 24px; padding: 16px; display:grid; gap: 14px; }
          .panel-head { display:flex; justify-content:space-between; gap:10px; align-items:center; }
          .sensor-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; }
          .sensor-tile { border:none; text-align:left; border-radius: 20px; padding: 14px; display:grid; gap: 12px; background: ${this._theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.72)"}; color: inherit; }
          .sensor-top, .sensor-status-row, .history-panel-head, .binding-row, .note-actions.bottom { display:flex; justify-content:space-between; gap: 12px; align-items:center; }
          .sensor-label { font-weight: 700; }
          .sensor-entity { opacity: 0.68; font-size: 0.8rem; }
          .sensor-value { font-size: 1.05rem; font-weight: 800; }
          .range-bar { position: relative; height: 8px; }
          .range-track, .range-fill { position:absolute; inset:0; border-radius:999px; }
          .range-track { background: ${this._theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(17,24,31,0.08)"}; }
          .range-fill.ok { background: linear-gradient(135deg, #5ed37a, #1f8a47); }
          .range-fill.warn { background: linear-gradient(135deg, #ffd166, #ff9f1c); }
          .range-fill.high { background: linear-gradient(135deg, #ff8c7f, #ff5d5d); }
          .sensor-status.ok { color: #73e18e; }
          .sensor-status.warn { color: #ffc75e; }
          .sensor-status.high { color: #ff9d9d; }
          .sparkline { width: 100%; height: 54px; }
          .sparkline-grid { fill:none; stroke:${this._theme === "dark" ? "rgba(255,255,255,0.14)" : "rgba(17,24,31,0.12)"}; stroke-width: 1; }
          .sparkline-line { fill:none; stroke: var(--accent); stroke-width: 2.4; stroke-linecap:round; stroke-linejoin:round; }
          .sparkline-empty, .history-panel-empty, .empty-list { opacity: 0.7; }
          .history-panel-card { border-radius: 20px; padding: 14px; background: ${this._theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.68)"}; }
          .notes-list, .timeline-list { display:grid; gap: 10px; }
          .note-card, .binding-row, .history-panel-card, .timeline-item { border-radius: 18px; padding: 12px; background: ${this._theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.68)"}; }
          .note-meta { opacity: 0.62; font-size: 0.82rem; }
          .note-text { line-height: 1.55; }
          .timeline-item { display:grid; grid-template-columns: 18px 1fr; gap: 12px; align-items:start; }
          .timeline-dot { width: 10px; height: 10px; border-radius:50%; margin-top: 6px; background: rgba(94,211,122,0.9); box-shadow: 0 0 0 6px rgba(94,211,122,0.14); }
          .timeline-item.active .timeline-dot { background: #ffd166; box-shadow: 0 0 0 6px rgba(255,209,102,0.16); }
          .binding-row-right { justify-content:flex-end; }
          .modal-card { position:absolute; left:50%; top:min(50%, 50vh); z-index:1; transform:translate(-50%, -50%); width:min(92vw, 520px); border-radius: 26px; padding: 18px; display:grid; gap: 14px; }
          .overview-hero-art img, .run-card-art img, .wizard-preview-art img, .overlay-art img, .empty-art img { pointer-events: none; user-select: none; }
          .modal-card.small-card { width:min(92vw, 460px); }
          .modal-copy { margin:0; line-height:1.55; opacity:0.82; }
          @media (max-width: 980px) {
            .topbar { grid-template-columns: 1fr; }
            .control-bar { justify-content: flex-start; }
            .wizard-grid, .empty-state, .overlay-hero, .detail-grid, .expanded-grid { grid-template-columns: 1fr; }
            .detail-stats-row { grid-template-columns: repeat(2, minmax(0,1fr)); }
          }
          @media (max-width: 760px) {
            .shell { padding: 12px; }
            .run-card-hit { grid-template-columns: 88px 1fr; }
            .overview-grid, .sensor-grid { grid-template-columns: 1fr; }
            .detail-stats-row, .run-stats-row, .form-grid.two-col { grid-template-columns: 1fr; }
            .overlay-card { inset: 12px; padding: 16px; border-radius: 24px; }
            .empty-art-composition { min-height: 220px; }
          }
        </style>
        <div class="shell ${this._theme}">
          ${this._renderNav()}
          ${this._wizardStepMarkup()}
          ${this._renderFilters()}
          ${this._overviewMarkup()}
        </div>
        ${this._bindingModalMarkup()}
        ${this._modalMarkup()}
        ${this._detailOverlayMarkup(detailRun)}
      `;
      this._bindInteractions();
      this._restoreFocusState(focusState);
    }
  }

  customElements.define(PANEL_TAG, PlantRunDashboardPanel);
})();
