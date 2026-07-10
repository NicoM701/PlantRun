export const METRICS = Object.freeze([
  ["temperature", "Temperature", "mdi:thermometer"],
  ["humidity", "Humidity", "mdi:water-percent"],
  ["soil_moisture", "Soil moisture", "mdi:sprout"],
  ["conductivity", "Conductivity", "mdi:flash-triangle"],
  ["light", "Light", "mdi:white-balance-sunny"],
  ["energy", "Energy", "mdi:lightning-bolt"],
  ["water", "Water", "mdi:water"],
]);

export const CANONICAL_STAGES = Object.freeze([
  "Seedling",
  "Vegetative",
  "Flowering",
  "Harvested",
]);

export const METRIC_ENTITY_HINTS = Object.freeze({
  temperature: { deviceClasses: ["temperature"], units: ["°c", "°f", "c", "f"] },
  humidity: { deviceClasses: ["humidity"], units: ["%"] },
  soil_moisture: { deviceClasses: ["moisture", "humidity"], units: ["%"] },
  conductivity: { deviceClasses: ["conductivity"], units: ["ms/cm", "µs/cm", "us/cm", "ec"] },
  light: { deviceClasses: ["illuminance", "irradiance"], units: ["lx", "lux", "ppfd", "dli", "µmol/m²/s", "umol/m²/s"] },
  energy: { deviceClasses: ["energy", "power"], units: ["kwh", "wh", "w", "kw"] },
  water: { deviceClasses: ["volume", "water"], units: ["l", "ml", "gal"] },
});

export function daysBetween(start, end = new Date()) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.max(0, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000));
}

export function stageKey(run) {
  const phase = String(run?.phases?.at?.(-1)?.name || "seedling").toLowerCase();
  if (phase.includes("flower")) return "flower";
  if (phase.includes("veg")) return "veg";
  if (phase.includes("harvest")) return "harvest";
  return "seedling";
}

export function targetDaysForRun(run, fallback = 90) {
  const configured = Number(run?.base_config?.target_days || run?.base_config?.estimated_duration_days);
  if (Number.isFinite(configured) && configured > 0) return Math.round(configured);
  const flowerWindow = Number(run?.cultivar?.flower_window_days);
  if (Number.isFinite(flowerWindow) && flowerWindow > 0) return Math.round(flowerWindow + 35);
  return fallback;
}

export function progressForRun(run) {
  const elapsed = daysBetween(run?.planted_date || run?.start_time, run?.end_time || new Date());
  return Math.min(100, Math.round((elapsed / Math.max(targetDaysForRun(run), 1)) * 100));
}

export function historyWindowForRun(run) {
  const phases = Array.isArray(run?.phases) ? [...run.phases].reverse() : [];
  const harvested = phases.find((phase) => String(phase?.name || "").toLowerCase().includes("harvest"));
  return {
    start: run?.planted_date || run?.start_time,
    end: run?.end_time || harvested?.start_time || new Date().toISOString(),
  };
}
