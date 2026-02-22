# PlantRun

Track every grow run — sensors, notes, photos, timelapse.

PlantRun is a Home Assistant custom integration project for documenting plant cultivation runs with structured metrics and a clean run history.

## Vision

- Track runs (start/end/phase)
- Collect sensor-linked metrics (energy, soil moisture, humidity, temperature)
- Add manual notes/events (e.g. flowering switch, yield)
- Attach photos per run
- Generate per-run media timelines
- Later: optional timelapse generation from camera snapshots

## Planned MVP (v0.1)

- Custom integration scaffold (`custom_components/plantrun`)
- Run entity + phase state (`growth`, `flower`, `harvest_ready`)
- Service calls:
  - `plantrun.start_run`
  - `plantrun.end_run`
  - `plantrun.set_phase`
  - `plantrun.add_note`
- Basic persistent run log
- Dashboard starter cards (manual setup)

## Repository Structure

```text
custom_components/plantrun/
  __init__.py
  manifest.json
  const.py
  services.yaml
```

## Status

🚧 Early bootstrap phase.

## License

TBD
