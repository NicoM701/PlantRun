export const METRICS = Object.freeze([
  { key: "soil_moisture", label: "Bodenfeuchte", icon: "mdi:water-percent", unit: "%" },
  { key: "temperature", label: "Temperatur", icon: "mdi:thermometer", unit: "°C" },
  { key: "humidity", label: "Luftfeuchte", icon: "mdi:water-outline", unit: "%" },
  { key: "light", label: "Licht", icon: "mdi:white-balance-sunny", unit: "lx" },
  { key: "energy", label: "Energie", icon: "mdi:lightning-bolt-outline", unit: "kWh" },
]);

export const DEFAULT_STAGES = Object.freeze([
  "Germination",
  "Seedling",
  "Vegetative",
  "Flowering",
  "Harvested",
]);

export const ENTRY_TYPES = Object.freeze([
  ["free_text", "Freitext", "mdi:text"],
  ["water", "Gießen", "mdi:watering-can-outline"],
  ["stage_change", "Phase ändern", "mdi:timeline-clock-outline"],
  ["inspect", "Prüfen", "mdi:magnify"],
  ["harvest", "Ernten", "mdi:basket-outline"],
]);

const array = (value) => (Array.isArray(value) ? value : []);
const id = (value) => String(value ?? "");

function normalizeBinding(binding) {
  const owner = binding?.owner_type || binding?.owner || "";
  return {
    ...binding,
    owner_type: owner === "run" ? "plant" : owner,
  };
}

function uniqueBindings(bindings) {
  return bindings.map(normalizeBinding).filter((binding, index, all) => {
    const key = id(binding?.id) || `${binding?.owner_type}:${binding?.metric_type}:${binding?.entity_id || binding?.sensor_id}`;
    return all.findIndex((candidate) => {
      const candidateKey = id(candidate?.id) || `${candidate?.owner_type}:${candidate?.metric_type}:${candidate?.entity_id || candidate?.sensor_id}`;
      return candidateKey === key;
    }) === index;
  });
}

export function normalizeState(payload) {
  const source = payload?.state && typeof payload.state === "object" ? payload.state : payload || {};
  const topLevelBindings = array(source.sensor_bindings);
  const tents = array(source.tents).map((tent) => ({
    ...tent,
    bindings: uniqueBindings([
      ...array(tent?.bindings),
      ...topLevelBindings.filter((binding) => {
        const owner = binding?.owner_type || binding?.owner;
        return owner === "tent" && id(binding?.owner_id) === id(tent?.id);
      }),
    ]),
  }));
  const plants = array(source.plants);
  const entries = array(source.journal_entries);
  const runs = array(source.runs).map((rawRun) => {
    const run = { ...rawRun };
    // A Run owns exactly one plant. Embedded records let early schema adapters
    // expose the same interface before all callers use top-level collections.
    const plant = plants.find((item) => id(item?.id) === id(run.plant_id)) || run?.plant || null;
    const journalEntries = entries
      .filter((entry) => array(entry?.run_ids).map(id).includes(id(run.id)) || id(entry?.run_id) === id(run.id))
      .concat(array(run?.journal_entries))
      .filter((entry, index, all) => all.findIndex((candidate) => id(candidate?.id) === id(entry?.id)) === index)
      .sort((a, b) => Date.parse(b?.occurred_at || b?.created_at || 0) - Date.parse(a?.occurred_at || a?.created_at || 0));
    const bindings = uniqueBindings([
      ...array(run?.bindings),
      ...array(plant?.bindings),
      ...topLevelBindings.filter((binding) => {
        const owner = binding?.owner_type || binding?.owner;
        return ["run", "plant"].includes(owner) && id(binding?.owner_id) === id(run?.id);
      }),
    ]);
    return { ...run, plant, bindings, journal_entries: journalEntries };
  });
  const activeTentId = id(source.active_tent_id || tents[0]?.id);
  return {
    ...source,
    tents,
    plants,
    runs,
    journal_entries: entries,
    active_tent_id: activeTentId,
  };
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function dateTimeLocal(value = new Date()) {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "";
  const local = new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export function toIso(value) {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

export function formatDate(value, withTime = false) {
  if (!value) return "Noch nicht erfasst";
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return String(value);
  return parsed.toLocaleString("de-DE", withTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { day: "2-digit", month: "short", year: "numeric" });
}

export function daysSince(value, end = new Date()) {
  const startTime = Date.parse(value);
  const endTime = new Date(end).getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 0;
  return Math.max(0, Math.floor((endTime - startTime) / 86400000));
}

export function runName(run) {
  return String(run?.friendly_name || run?.name || run?.plant?.nickname || run?.plant?.name || "Unbenannter Lauf");
}

export function plantName(run) {
  return String(run?.plant?.nickname || run?.plant?.name || run?.friendly_name || run?.name || "Unbenannte Pflanze");
}

export function cultivarName(run) {
  const strain = run?.plant?.strain || run?.strain;
  return String(
    (typeof strain === "string" ? strain : strain?.name)
      || run?.plant?.cultivar?.name
      || run?.cultivar?.name
      || "Sorte nicht erfasst",
  );
}

export function breederName(run) {
  const strain = run?.plant?.strain || run?.strain;
  return String(
    (typeof strain === "object" ? strain?.breeder : "")
      || run?.plant?.breeder
      || run?.plant?.cultivar?.breeder
      || run?.cultivar?.breeder
      || run?.breeder
      || "",
  );
}

export function currentStage(run) {
  return String(
    run?.current_stage
      || run?.stage
      || array(run?.stage_events).at(-1)?.stage
      || array(run?.phases).at(-1)?.name
      || "Germination",
  );
}

export function stagePlan(run) {
  const configured = array(run?.stage_plan || run?.phase_plan || run?.base_config?.phase_plan);
  const plan = configured.length ? configured.map((stage) => typeof stage === "string" ? stage : stage?.name).filter(Boolean) : [...DEFAULT_STAGES];
  const active = currentStage(run);
  if (!plan.some((stage) => stage.toLowerCase() === active.toLowerCase())) plan.unshift(active);
  return plan;
}

export function recordedStages(run) {
  return new Set([
    ...array(run?.stage_history).map((event) => event?.to_stage || event?.stage),
    ...array(run?.stage_events).map((event) => event?.stage || event?.to_stage),
  ].filter(Boolean).map((stage) => String(stage).toLowerCase()));
}

export function isArchived(run) {
  return Boolean(run?.archived_at || ["archived", "ended", "completed"].includes(String(run?.status || "").toLowerCase()));
}

export function runStart(run) {
  return run?.planted_at || run?.planted_date || run?.start_time || run?.created_at;
}

export function runEnd(run) {
  return run?.ended_at || run?.archived_at || run?.end_time || new Date().toISOString();
}

export function durationRange(run) {
  const duration = run?.duration || run?.plant?.duration || run?.plant?.strain?.duration || run?.cultivar?.duration || {};
  const minimum = Number(duration?.min_days ?? duration?.minimum_days ?? run?.harvest_estimate?.min_days);
  const maximum = Number(duration?.max_days ?? duration?.maximum_days ?? run?.harvest_estimate?.max_days);
  if (Number.isFinite(minimum) || Number.isFinite(maximum)) {
    const low = Number.isFinite(minimum) ? minimum : maximum;
    const high = Number.isFinite(maximum) ? maximum : minimum;
    return { minimum: low, maximum: high, label: `${low}–${high} Tage` };
  }
  const legacy = Number(run?.base_config?.target_days || run?.cultivar?.flower_window_days);
  return Number.isFinite(legacy) ? { minimum: legacy, maximum: legacy, label: `${legacy} Tage` } : null;
}

export function harvestEstimate(run) {
  const explicit = run?.harvest_estimate || run?.plant?.harvest_estimate || {};
  if (explicit?.from || explicit?.to) return `${formatDate(explicit.from || explicit.to)} bis ${formatDate(explicit.to || explicit.from)}`;
  const range = durationRange(run);
  const start = Date.parse(runStart(run));
  if (!range || !Number.isFinite(start)) return "Noch keine Schätzung";
  return `${formatDate(start + range.minimum * 86400000)} bis ${formatDate(start + range.maximum * 86400000)}`;
}

export function bindingsFor(run, tent) {
  return uniqueBindings([
    ...array(run?.bindings),
    ...array(run?.plant?.bindings).map((binding) => ({ ...binding, owner_type: binding?.owner_type || "plant" })),
    ...array(tent?.bindings).map((binding) => ({ ...binding, owner_type: binding?.owner_type || "tent" })),
  ]);
}

export function bindingForMetric(run, tent, metric) {
  return bindingsFor(run, tent).find((binding) => binding?.metric_type === metric && !binding?.ended_at) || null;
}

export function entityIdFor(binding) {
  return String(binding?.entity_id || binding?.sensor_id || "");
}

export function metricDefinition(metric) {
  return METRICS.find((item) => item.key === metric) || METRICS[0];
}

export function targetFor(run, metric) {
  const stage = currentStage(run);
  const targets = run?.targets || run?.stage_targets || run?.plant?.targets || {};
  const value = targets?.[stage]?.[metric] || targets?.[stage.toLowerCase()]?.[metric] || targets?.[metric] || null;
  if (!value) return null;
  const minimum = Number(value.minimum ?? value.min);
  const maximum = Number(value.maximum ?? value.max);
  return Number.isFinite(minimum) && Number.isFinite(maximum) ? { minimum, maximum } : null;
}

export function chartStats(points) {
  const values = array(points).map((point) => Number(point?.value)).filter(Number.isFinite);
  if (!values.length) return null;
  return {
    minimum: Math.min(...values),
    maximum: Math.max(...values),
    average: values.reduce((sum, value) => sum + value, 0) / values.length,
    current: values.at(-1),
  };
}

export function chartPath(points, width = 720, height = 220) {
  const usable = array(points).filter((point) => Number.isFinite(Number(point?.value)) && Number.isFinite(Date.parse(point?.timestamp)));
  if (usable.length < 2) return "";
  const values = usable.map((point) => Number(point.value));
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(0.0001, maximum - minimum);
  return usable.map((point, index) => {
    const x = (index / (usable.length - 1)) * width;
    const y = height - ((Number(point.value) - minimum) / range) * height;
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}
