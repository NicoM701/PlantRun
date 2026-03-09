# PlantRun

<p align="center">
  <img src="assets/plantrun-logo.svg" alt="PlantRun Logo" width="220" />
</p>

<p align="center">
  <a href="https://github.com/hacs/integration"><img src="https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge" alt="HACS Custom" /></a>
  <img src="https://img.shields.io/badge/Home%20Assistant-Custom%20Integration-18BCF2?style=for-the-badge&logo=homeassistant&logoColor=white" alt="Home Assistant" />
</p>

Track every grow run — sensors, notes, photos, timelapse.

PlantRun is a Home Assistant custom integration project for documenting cultivation runs with structured metrics, cultivar context, and run history.

---

## ✨ Features (current, v0.4.0)

- Run lifecycle tracking (`start`, `phase`, `end`)
- Setup wizard with optional first-run create/import
- Integration options flow with binding wizard entry point
- Backdated run start support (`started_at`) + run import for ongoing/historical runs
- Human-friendly run labels (`display_id`) + list service for easier selection
- Notes and event history per run
- SeedFinder-based cultivar lookup (species + optional breeder, with compatibility local fallback)
- Attach cultivar profiles to runs
- Mid-run sensor/camera binding updates
- Live sensors for active run + active cultivar status
- Persistent storage via Home Assistant storage helper

---

## 📦 Installation

### Option A — HACS (recommended)

1. Open **HACS** in Home Assistant.
2. Go to **⋮ → Custom repositories**.
3. Add repository URL:
   - `https://github.com/NicoM701/PlantRun`
4. Category/type: **Integration**.
5. Install **PlantRun**.
6. Restart Home Assistant.
7. Go to **Settings → Devices & Services → Add Integration**.
8. Search for **PlantRun** and complete setup.

### Option B — Manual installation

1. Copy `custom_components/plantrun` into your HA config folder:
   - `<config>/custom_components/plantrun`
2. Restart Home Assistant.
3. Add integration via **Settings → Devices & Services**.

---

## 🚀 Quick start

1. Start or import a run:
   - `plantrun.start_run` with `run_name` (optional `started_at`, `phase`)
   - or `plantrun.import_run` for already running/historical runs
2. Optional: inspect run list with friendly IDs:
   - `plantrun.list_runs`
3. (Optional) Lookup cultivar:
   - `plantrun.search_cultivar` with `species` (+ optional `breeder`, optional `prefer_automatic`)
   - If `breeder` is omitted, PlantRun uses best-effort local cache matching only.
4. Attach cultivar to run:
   - `plantrun.attach_cultivar_to_run` with `cultivar_id` + (`run_id` or `run_name`)
5. Bind sensors/camera (any time during run):
   - `plantrun.bind_sensor_to_run`
   - or open Integration **Options** and enable **Open sensor binding wizard**
6. Update phase and notes as needed:
   - `plantrun.set_phase`
   - `plantrun.add_note`
7. End run:
   - `plantrun.end_run`
   - Optional `strict_active_resolution: true` errors if multiple runs are active and no `run_id`/`run_name` is passed.
   - Optional `active_run_strategy` can be set to `legacy` (default), `active_run_id`, or `first_active`.

## 🤖 Automation compatibility (recommended)

- For automations/scripts, pass explicit `run_id` (preferred) or `run_name` to avoid multi-active ambiguity.
- If you intentionally rely on active-run fallback, set `active_run_strategy` explicitly so behavior remains predictable.
- Keep `legacy` only for backward compatibility with existing flows.

---

## 🧩 Services

- `plantrun.start_run`
- `plantrun.import_run`
- `plantrun.list_runs`
- `plantrun.end_run`
- `plantrun.set_phase`
- `plantrun.add_note`
- `plantrun.search_cultivar`
- `plantrun.attach_cultivar_to_run`
- `plantrun.refresh_cultivar`
- `plantrun.bind_sensor_to_run`
- `plantrun.unbind_sensor_from_run`

See `custom_components/plantrun/services.yaml` for fields.

Release notes for compatibility-related behavior are tracked in `docs/release-notes.md`.

---

## 📊 Exposed sensors

- `sensor.plantrun_active_run`
- `sensor.plantrun_active_run_count`
- `sensor.plantrun_active_phase`
- `sensor.plantrun_active_cultivar_name`
- `sensor.plantrun_active_cultivar_breeder`
- `sensor.plantrun_active_cultivar_flower_window`
- `sensor.plantrun_total_runs`
- `sensor.plantrun_last_event`

`sensor.plantrun_active_phase` and active cultivar sensors include attributes indicating the represented run (`represented_run_id`, `represented_display_id`, `represented_run_name`) plus active-run ambiguity context.

---

## 🗂️ Project structure

```text
custom_components/plantrun/
  __init__.py
  config_flow.py
  const.py
  manager.py
  manifest.json
  providers_seedfinder.py
  sensor.py
  services.yaml
  storage.py
  strings.json
dashboard/
  plantrun-dashboard.yaml
hacs.json
```

---

## ⚠️ Current limitations

- Date/time inputs still use ISO text format in setup/import fields.
- Sensor binding wizard currently uses plain text entity IDs (entity picker UX planned).

## 🛣️ Roadmap

- Recorder-based run summary generation (time-window by run)
- Optional backup snapshots for long-term retention
- Improved Config Flow for sensor binding UX
- Photo events + camera snapshot hooks
- Timelapse pipeline for completed runs

---

## 🧪 Stability note

PlantRun is in active MVP iteration. SeedFinder lookup currently uses best-effort web parsing and may require adjustments if upstream page structure changes.

## License

TBD
