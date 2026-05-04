(() => {
  const CARD_TAG = "plantrun-card";
  const DOMAIN = "plantrun";

  if (customElements.get(CARD_TAG)) {
    return;
  }

  const ensurePlantRunShared = () => {
    if (window.PlantRunShared) {
      return window.PlantRunShared;
    }

    const STAGE_IMAGE_URLS = {
      seedling: "/plantrun_frontend/assets/stage-seedling-wide-2.png",
      veg: "/plantrun_frontend/assets/stage-veg-hero-2.png",
      flower: "/plantrun_frontend/assets/stage-flower-wide-2.png",
    };

    const STAGE_SVGS = {
      seedling: `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="prSeedStem" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#63d66f"/><stop offset="100%" stop-color="#2d7f3d"/></linearGradient></defs><circle cx="120" cy="120" r="106" fill="rgba(120,255,175,0.08)"/><path d="M117 196c6 0 10-4 10-10V118h-14v68c0 6 4 10 10 10Z" fill="url(#prSeedStem)"/><path d="M114 124c-28 2-48-10-60-32 26-10 50-6 66 16Z" fill="#5ad86e"/><path d="M126 118c26-16 50-18 72-8-14 26-36 38-64 34Z" fill="#2dac53"/><ellipse cx="90" cy="105" rx="22" ry="16" fill="#b0ef94"/><ellipse cx="148" cy="106" rx="22" ry="16" fill="#99df7a"/></svg>`,
      veg: `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="120" cy="120" r="108" fill="rgba(110,255,156,0.08)"/><path d="M117 212c7 0 12-5 12-12v-86h-18v86c0 7 5 12 12 12Z" fill="#2c8d45"/><path d="M121 120 90 87c-19-20-24-42-18-64 24 4 44 18 56 42Z" fill="#57d46d"/><path d="M119 116 150 79c20-24 44-34 70-29-6 31-25 51-55 66Z" fill="#38b158"/><path d="M116 126 72 124c-25-1-44 7-58 24 19 17 42 24 71 16Z" fill="#34a153"/><path d="M124 127 171 134c25 4 43 17 55 38-22 13-46 13-71-3Z" fill="#2f8e4a"/><path d="M120 102 111 65c-5-21 0-40 15-56 15 16 20 36 15 58Z" fill="#7ce786"/></svg>`,
      flower: `<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="120" cy="120" r="108" fill="rgba(255,208,122,0.1)"/><path d="M118 216c7 0 12-5 12-12v-82h-18v82c0 7 5 12 12 12Z" fill="#6d4d2c"/><path d="M122 122c-20-36-16-67 10-96 18 28 18 59 3 93Z" fill="#b68949"/><g fill="#6fa751"><path d="M93 141c-24 1-43-8-58-26 21-11 42-12 62 2Z"/><path d="M147 139c19-16 41-22 65-17-9 24-26 38-54 41Z"/></g><g fill="#e4c07c"><ellipse cx="120" cy="84" rx="29" ry="35"/><ellipse cx="86" cy="112" rx="25" ry="29"/><ellipse cx="154" cy="112" rx="25" ry="29"/><ellipse cx="105" cy="132" rx="23" ry="27"/><ellipse cx="138" cy="132" rx="23" ry="27"/></g><g fill="#d69b5f"><circle cx="120" cy="83" r="16"/><circle cx="86" cy="111" r="13"/><circle cx="154" cy="111" r="13"/></g></svg>`,
    };

    const LEAF_LOGO = `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="prLogoGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8effa9"/><stop offset="100%" stop-color="#1f8a47"/></linearGradient></defs><path d="M60 64c-3 0-6-2-6-5 0-6 2-12 6-18 4 6 6 12 6 18 0 3-3 5-6 5Z" fill="#255b35"/><g fill="url(#prLogoGrad)"><path d="M59 58c-15-11-21-24-20-41 15 3 25 12 29 29Z"/><path d="M61 58c15-11 21-24 20-41-15 3-25 12-29 29Z"/><path d="M53 61C34 58 22 48 16 31c17-1 30 5 40 19Z"/><path d="M67 61c19-3 31-13 37-30-17-1-30 5-40 19Z"/><path d="M51 66C35 76 28 90 30 106c14-5 23-16 28-32Z"/><path d="M69 66c16 10 23 24 21 40-14-5-23-16-28-32Z"/><path d="M60 69c-4 14-3 25 4 34 7-9 8-20 4-34Z"/></g></svg>`;

    const stageArtCache = {};

    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const svgToDataUrl = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

    const loadImage = (url) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = url;
      });

    const processStageArt = async (stageKey) => {
      if (stageArtCache[stageKey]) {
        return stageArtCache[stageKey];
      }

      const sourceUrl = STAGE_IMAGE_URLS[stageKey];
      if (!sourceUrl) {
        const fallback = svgToDataUrl(STAGE_SVGS[stageKey] || STAGE_SVGS.seedling);
        stageArtCache[stageKey] = fallback;
        return fallback;
      }

      try {
        const image = await loadImage(sourceUrl);
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
          const isNearWhite = red > 240 && green > 240 && blue > 240;
          if (isNearWhite) {
            data[index + 3] = 0;
            continue;
          }
          if (alpha > 10) {
            found = true;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
          }
        }

        ctx.putImageData(frame, 0, 0);
        if (!found) {
          const fallback = svgToDataUrl(STAGE_SVGS[stageKey] || STAGE_SVGS.seedling);
          stageArtCache[stageKey] = fallback;
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
        cropped.getContext("2d").drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const dataUrl = cropped.toDataURL("image/png");
        stageArtCache[stageKey] = dataUrl;
        return dataUrl;
      } catch (_error) {
        const fallback = svgToDataUrl(STAGE_SVGS[stageKey] || STAGE_SVGS.seedling);
        stageArtCache[stageKey] = fallback;
        return fallback;
      }
    };

    window.PlantRunShared = {
      STAGE_IMAGE_URLS,
      STAGE_SVGS,
      LEAF_LOGO,
      escapeHtml,
      processStageArt,
      stageArtCache,
      svgToDataUrl,
    };
    return window.PlantRunShared;
  };

  const SHARED = ensurePlantRunShared();

  class PlantRunCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._hass = null;
      this._config = { type: "custom:plantrun-card", run_id: "<run_id>", compact: false };
      this._runs = [];
      this._summary = null;
      this._loading = false;
      this._artUrl = "";
      this._loadedRunId = "";
      this._requestNonce = 0;
    }

    static getConfigElement() {
      if (customElements.get("plantrun-card-editor")) {
        return document.createElement("plantrun-card-editor");
      }
      return document.createElement("plantrun-card-editor");
    }

    static getStubConfig() {
      return { type: "custom:plantrun-card", run_id: "<run_id>" };
    }

    setConfig(config) {
      this._config = { ...this._config, ...config };
      this._fetchRunData();
      this.render();
    }

    set hass(value) {
      this._hass = value;
      this._fetchRunData();
      this.render();
    }

    getCardSize() {
      return this._config.compact ? 3 : 4;
    }

    _normalizeRunId(runId) {
      const normalized = String(runId || "").trim().toLowerCase();
      if (!normalized || normalized === "your_run_id" || normalized.includes("<run_id")) {
        return "";
      }
      return String(runId).trim();
    }

    async _fetchRunData() {
      const requestNonce = ++this._requestNonce;
      const runId = this._normalizeRunId(this._config.run_id);
      if (!this._hass || !runId) {
        this._runs = [];
        this._summary = null;
        this._artUrl = "";
        this._loadedRunId = "";
        this._loading = false;
        this.render();
        return;
      }
      if (runId !== this._loadedRunId) {
        this._summary = null;
        this._artUrl = "";
      }
      this._loading = true;
      this.render();
      try {
        const payload = await this._hass.callWS({ type: "plantrun/get_runs" });
        const runs = Array.isArray(payload?.runs) ? payload.runs : [];
        const summary = await this._hass.callWS({ type: "plantrun/get_run_summary", run_id: runId });
        const run = runs.find((item) => item.id === runId) || null;
        const artUrl = await SHARED.processStageArt(this._stageKeyForRun(run));
        if (requestNonce !== this._requestNonce) {
          return;
        }
        this._runs = runs;
        this._summary = summary;
        this._artUrl = artUrl;
        this._loadedRunId = runId;
      } catch (_error) {
        if (requestNonce !== this._requestNonce) {
          return;
        }
        this._runs = [];
        this._summary = null;
        this._artUrl = "";
        this._loadedRunId = "";
      } finally {
        if (requestNonce === this._requestNonce) {
          this._loading = false;
          this.render();
        }
      }
    }

    _selectedRun() {
      const runId = this._normalizeRunId(this._config.run_id);
      return this._runs.find((run) => run.id === runId) || null;
    }

    _currentPhase(run) {
      return run?.phases?.[run.phases.length - 1]?.name || "Seedling";
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

    _runAgeDays(run) {
      const start = Date.parse(run?.planted_date || run?.start_time || "");
      if (!Number.isFinite(start)) {
        return 0;
      }
      return Math.max(0, Math.round((Date.now() - start) / 86400000));
    }

    _summaryChips(run) {
      const chips = [];
      const summary = this._summary || {};
      const currentStates = run?.bindings || [];
      for (const binding of currentStates.slice(0, 3)) {
        const entityState = this._hass?.states?.[binding.sensor_id];
        const value = entityState?.state ?? "—";
        const unit = entityState?.attributes?.unit_of_measurement || "";
        let colorClass = "neutral";
        if (binding.metric_type === "temperature") colorClass = "warm";
        if (binding.metric_type === "humidity") colorClass = "cool";
        if (binding.metric_type === "soil_moisture") colorClass = "moisture";
        chips.push(`
          <div class="chip ${colorClass}">
            <span class="chip-icon ${colorClass}">${this._metricGlyph(binding.metric_type)}</span>
            <span>${SHARED.escapeHtml(binding.metric_type.replace(/_/g, " "))}</span>
            <strong>${SHARED.escapeHtml(`${value}${unit ? ` ${unit}` : ""}`)}</strong>
          </div>
        `);
      }
      if (!chips.length) {
        chips.push(`
          <div class="chip neutral">
            <span class="chip-icon neutral">◎</span>
            <span>Notes</span>
            <strong>${SHARED.escapeHtml(run?.notes_summary || summary.energy_cost || "Ready to track")}</strong>
          </div>
        `);
      }
      return chips.join("");
    }

    _metricGlyph(metricType) {
      switch (metricType) {
        case "temperature":
          return "℃";
        case "humidity":
          return "%";
        case "soil_moisture":
          return "◔";
        case "light":
          return "☼";
        case "energy":
          return "⚡";
        default:
          return "•";
      }
    }

    _openPanel() {
      history.pushState(null, "", "/plantrun-dashboard");
      window.dispatchEvent(new CustomEvent("location-changed", { bubbles: true, composed: true }));
    }

    render() {
      const runId = this._normalizeRunId(this._config.run_id);
      const run = this._selectedRun();
      const title = this._config.title || run?.friendly_name || "PlantRun";
      const summary = this._summary || {};
      const stageKey = this._stageKeyForRun(run);
      const art = this._artUrl || SHARED.svgToDataUrl(SHARED.STAGE_SVGS[stageKey]);

      if (!runId) {
        this.shadowRoot.innerHTML = `
          <ha-card>
            <style>
              :host { display: block; }
              .wrap { padding: 18px; display: grid; gap: 12px; }
              .hint { opacity: 0.72; line-height: 1.45; }
              button {
                border: none; border-radius: 999px; padding: 10px 14px; cursor: pointer;
                background: linear-gradient(135deg, #58d36f, #1f8b45); color: white; font: inherit;
              }
            </style>
            <div class="wrap">
              <div style="display:flex;gap:12px;align-items:center;">
                <div style="width:38px;height:38px;">${SHARED.LEAF_LOGO}</div>
                <div>
                  <strong>PlantRun card setup</strong>
                  <div class="hint">Pick a real run in the card editor instead of placeholder IDs.</div>
                </div>
              </div>
              <div class="hint">Examples detected as placeholders: "<run_id>", "your_run_id".</div>
              <div><button id="open-panel">Open dashboard</button></div>
            </div>
          </ha-card>
        `;
        const button = this.shadowRoot.querySelector("#open-panel");
        if (button) button.addEventListener("click", () => this._openPanel());
        return;
      }

      this.shadowRoot.innerHTML = `
        <ha-card>
          <style>
            :host { display:block; }
            .card {
              position: relative;
              overflow: hidden;
              padding: ${this._config.compact ? "16px" : "18px"};
              display: grid;
              gap: 14px;
              color: var(--primary-text-color, #edf2f8);
              background:
                radial-gradient(circle at top right, rgba(110, 255, 166, 0.2), transparent 42%),
                linear-gradient(160deg, rgba(15, 25, 22, 0.95), rgba(8, 13, 18, 0.98));
              border-radius: 24px;
            }
            .card::after {
              content: "";
              position: absolute;
              inset: 0;
              border: 1px solid rgba(255,255,255,0.08);
              border-radius: 24px;
              pointer-events: none;
            }
            .header, .meta {
              display:flex;
              align-items:center;
              justify-content:space-between;
              gap: 12px;
            }
            .title {
              display:grid;
              gap:4px;
              min-width:0;
            }
            .eyebrow {
              font-size: 0.72rem;
              text-transform: uppercase;
              letter-spacing: 0.12em;
              opacity: 0.7;
            }
            h3 {
              margin:0;
              font-size: ${this._config.compact ? "1.0rem" : "1.15rem"};
              line-height:1.2;
            }
            .badge {
              border-radius: 999px;
              padding: 7px 10px;
              font-size: 0.75rem;
              background: rgba(255,255,255,0.08);
            }
            .hero {
              display:grid;
              grid-template-columns: ${this._config.compact ? "92px 1fr" : "120px 1fr"};
              gap: 16px;
              align-items:center;
            }
            .hero-art {
              width: 100%;
              aspect-ratio: 1;
              border-radius: 22px;
              background:
                radial-gradient(circle at 30% 30%, rgba(159,255,194,0.26), transparent 52%),
                linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01));
              display:grid;
              place-items:center;
              overflow:hidden;
              box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
            }
            .hero-art img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              padding: 10px;
            }
            .stats {
              display:grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
            }
            .stat {
              padding: 10px 12px;
              border-radius: 18px;
              background: rgba(255,255,255,0.06);
              box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
            }
            .stat span {
              display:block;
              font-size: 0.72rem;
              opacity: 0.68;
              text-transform: uppercase;
              letter-spacing: 0.08em;
            }
            .stat strong {
              display:block;
              margin-top:4px;
              font-size: 1rem;
            }
            .chips {
              display:grid;
              gap: 8px;
            }
            .chip {
              display:grid;
              grid-template-columns: 22px 1fr auto;
              gap: 10px;
              align-items:center;
              padding: 10px 12px;
              border-radius: 16px;
              background: rgba(255,255,255,0.05);
            }
            .chip-icon {
              width: 22px;
              height: 22px;
              border-radius: 50%;
              display:grid;
              place-items:center;
              font-size: 0.8rem;
              font-weight: 700;
            }
            .chip-icon.warm { background: rgba(255,154,87,0.26); color: #ffb37d; }
            .chip-icon.cool { background: rgba(110,198,255,0.26); color: #8fdaff; }
            .chip-icon.moisture { background: rgba(92,255,211,0.22); color: #75f1d1; }
            .chip-icon.neutral { background: rgba(255,255,255,0.14); color: rgba(255,255,255,0.82); }
            .actions { display:flex; justify-content:flex-end; }
            button {
              border: none;
              border-radius: 999px;
              padding: 10px 14px;
              cursor: pointer;
              background: linear-gradient(135deg, #69da7d, #218e48);
              color: white;
              font: inherit;
            }
          </style>
          <div class="card">
            <div class="header">
              <div class="title">
                <span class="eyebrow">PlantRun</span>
                <h3>${SHARED.escapeHtml(title)}</h3>
              </div>
              <div class="badge">${SHARED.escapeHtml(this._currentPhase(run))}</div>
            </div>
            <div class="hero">
              <div class="hero-art"><img src="${art}" alt="${SHARED.escapeHtml(this._currentPhase(run))} plant art" /></div>
              <div class="stats">
                <div class="stat"><span>Age</span><strong>${this._runAgeDays(run)} days</strong></div>
                <div class="stat"><span>Target</span><strong>${SHARED.escapeHtml(String(run?.base_config?.target_days || "—"))} days</strong></div>
                <div class="stat"><span>Cultivar</span><strong>${SHARED.escapeHtml(run?.cultivar?.name || "Manual")}</strong></div>
                <div class="stat"><span>Energy</span><strong>${SHARED.escapeHtml(
                  summary?.energy_kwh != null ? `${summary.energy_kwh} kWh` : "—"
                )}</strong></div>
              </div>
            </div>
            <div class="chips">${this._summaryChips(run)}</div>
            <div class="actions"><button id="open-panel">Open dashboard</button></div>
          </div>
        </ha-card>
      `;

      const button = this.shadowRoot.querySelector("#open-panel");
      if (button) {
        button.addEventListener("click", () => this._openPanel());
      }
    }
  }

  customElements.define(CARD_TAG, PlantRunCard);
  window.customCards = window.customCards || [];
  if (!window.customCards.find((item) => item.type === "plantrun-card")) {
    window.customCards.push({
      type: "plantrun-card",
      name: "PlantRun Card",
      description: "Focused overview of a selected PlantRun grow.",
      preview: true,
    });
  }
})();
