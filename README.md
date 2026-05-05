# PlantRun 🌱

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)

PlantRun is a Home Assistant custom integration for tracking cultivation runs end to end.

It combines:
- guided run setup
- a dedicated sidebar dashboard
- a Lovelace run card
- sensor bindings and proxy entities
- SeedFinder cultivar enrichment
- persistent per-run history and summaries

---

## Features

### Run management
- Create and manage multiple runs
- Track phases, notes, planted date, target days, status, and harvest yield
- Keep one active run for compatibility with older service flows

### Frontend
PlantRun ships with two UI entry points:
- **Sidebar dashboard** at `/plantrun-dashboard`
- **Lovelace card** via `custom:plantrun-card`

Current UI capabilities include:
- run cards with live metric chips and stage-aware artwork
- detail editing for metadata, notes, bindings, and images
- a 3-step run creation wizard
- theme/language/layout preferences
- live cultivar suggestions backed by SeedFinder

### Sensor and summary layer
- per-run status, phase, cultivar, energy, and energy cost sensors
- proxy sensors for bound Home Assistant entities
- run-window energy and energy cost summaries
- light unit compatibility for `lx` / `lux`

### Persistence
- local store-backed run history
- migration support for older payload shapes and legacy binding IDs

---

## Installation (HACS)

1. Open **HACS → Integrations**
2. Add this repo as a **Custom repository** (category: Integration)
3. Install PlantRun
4. Restart Home Assistant
5. Add the integration via **Settings → Devices & Services**

---

## Main services

- `plantrun.create_run`
- `plantrun.add_phase`
- `plantrun.add_note`
- `plantrun.update_note`
- `plantrun.delete_note`
- `plantrun.update_run`
- `plantrun.set_cultivar`
- `plantrun.set_run_image`
- `plantrun.add_binding`
- `plantrun.update_binding`
- `plantrun.remove_binding`
- `plantrun.end_run`

---

## Development gate

Primary local validation:

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
node --check custom_components/plantrun/www/plantrun-panel.js
node --check custom_components/plantrun/www/plantrun-card.js
node --check custom_components/plantrun/www/plantrun-card-editor.js
```

Useful focused suite:

```bash
python3 -m unittest tests.test_dashboard_panel_interactions -q
```

Related docs:
- `docs/RELEASE_QA_SIGNOFF.md`
- `docs/PERFORMANCE_NOTES.md`
- `docs/RELEASE_CHECKLIST.md`
- `PROJECT_CONTEXT.md`
