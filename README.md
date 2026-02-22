# PlantRun

<p align="center">
  <img src="assets/plantrun-logo.svg" alt="PlantRun Logo" width="220" />
</p>

Track every grow run — sensors, notes, photos, timelapse.

PlantRun is a Home Assistant custom integration project for documenting plant cultivation runs with structured metrics and a clean run history.

## Vision

- Track runs (start/end/phase)
- Collect sensor-linked metrics (energy, soil moisture, humidity, temperature)
- Add manual notes/events (e.g. flowering switch, yield)
- Attach photos per run
- Generate per-run media timelines
- Later: optional timelapse generation from camera snapshots

## MVP status (v0.1.3)

Implemented now:

- HACS metadata (`hacs.json`)
- Persistent run storage (`homeassistant.helpers.storage`)
- Service calls:
  - `plantrun.start_run`
  - `plantrun.end_run`
  - `plantrun.set_phase`
  - `plantrun.add_note`
  - `plantrun.search_cultivar` (SeedFinder provider, v0.1)
  - `plantrun.attach_cultivar_to_run`
  - `plantrun.refresh_cultivar`
  - `plantrun.bind_sensor_to_run`
  - `plantrun.unbind_sensor_from_run`
- Live sensors:
  - `sensor.plantrun_active_run`
  - `sensor.plantrun_active_phase`
  - `sensor.plantrun_active_cultivar_name`
  - `sensor.plantrun_active_cultivar_breeder`
  - `sensor.plantrun_active_cultivar_flower_window`
  - `sensor.plantrun_total_runs`
  - `sensor.plantrun_last_event`

Run model currently stores:

- `id`, `name`
- `phase` + `phase_history`
- `started_at`, `ended_at`
- `notes[]`

## Repository structure

```text
custom_components/plantrun/
  __init__.py
  const.py
  manager.py
  manifest.json
  providers_seedfinder.py
  sensor.py
  services.yaml
  storage.py
dashboard/
  plantrun-dashboard.yaml
hacs.json
```

## Next steps

- Add metric ingestion from bound entity IDs (energy/humidity/soil)
- Add photo references/events + camera snapshot hooks
- Add timelapse job pipeline for completed runs
- Add Config Flow UI for binding setup

## License

TBD
