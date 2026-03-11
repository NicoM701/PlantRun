# PlantRun 🌱
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)

PlantRun is a Home Assistant custom integration for tracking cultivation runs end-to-end.

It combines:
- guided run setup,
- optional SeedFinder enrichment,
- sensor bindings and proxy entities,
- a dedicated sidebar dashboard,
- persistent run storage for long-term run history.

---

## Current Status (March 2026)

PlantRun is actively developed and already supports a full day-to-day workflow:

- ✅ create/manage runs via UI
- ✅ multiple runs with run selection in dashboard card
- ✅ notes CRUD (add/edit/delete)
- ✅ phase changes + end-run flow
- ✅ SeedFinder cultivar search/enrichment
- ✅ default run preview image from cultivar match
- ✅ target-days prefill support from SeedFinder flower window data
- ✅ configurable energy price + currency in summary settings
- ✅ phase-aware detail fields in dashboard (harvest-only fields gated)
- ✅ multi-unit light sensor compatibility (`lx`/`lux` normalization)

---

## Features

### Setup & Run Management
- Guided configuration flow in Home Assistant (no YAML required for normal use)
- Start new runs and manage existing runs
- Friendly setup wording and improved setup field clarity
- Cultivar input with suggestions/autocomplete improvements

### Dashboard UI
PlantRun provides a sidebar dashboard at:
- **PlantRun** (`/plantrun-dashboard`)

Includes:
- run cards with status/phase/sensor chips
- run-age visibility (days running)
- collapsible notes panel with preview + count
- image upload + SeedFinder image usage
- safer action handling when run selection is ambiguous

### Sensor & Summary Layer
- Proxy sensors per run for dashboarding and grouping
- Robust handling of light units (`lx`, `lux`, case variants)
- Summary pipeline supports:
  - run-window-scoped energy kWh (from run start → run end/now)
  - configurable energy cost using integration energy-price settings
  - explicit energy currency in summary outputs
- Dedicated run entities for dashboarding:
  - `sensor.<run>_run_energy`
  - `sensor.<run>_run_energy_cost`

### Data Persistence
- Run state persisted in local store (`plantrun_store.json`)
- Designed to retain run context beyond recorder retention windows

---

## Installation (HACS)

1. Open **HACS → Integrations**
2. Add this repo as a **Custom repository** (category: Integration)
3. Install PlantRun
4. Restart Home Assistant
5. Add integration via **Settings → Devices & Services**

---

## Main Services

- `plantrun.create_run`
- `plantrun.add_phase`
- `plantrun.add_note`
- `plantrun.update_note`
- `plantrun.delete_note`
- `plantrun.update_run`
- `plantrun.set_cultivar`
- `plantrun.set_run_image`
- `plantrun.end_run`

---

## Known Focus Area

The remaining open UX epic is:
- **#35 — Simplify and clarify run-creation setup flow**

Work is being delivered in mergeable slices to keep changes safe and testable.

---

## Development Notes

- Tests: `python3 -m unittest discover -s tests -q`
- Keep changes scoped and production-runnable per PR
- Prefer backward-compatible UX/data changes

## QA Campaign Release Notes

- 2026-03-11 closure summary for issues #66-#79: `docs/QA_WAVE_CLOSURE_2026-03-11.md`
