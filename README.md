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
- Home Assistant history deeplinks scoped to a PlantRun run window

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
- detail editing for metadata, notes, bindings, cultivar, breeder, and images
- a 3-step run creation wizard
- theme/language/layout preferences
- live cultivar suggestions backed by SeedFinder
- note editing/deletion with in-panel confirmation
- phase changes via in-panel confirmation modal
- Home Assistant history deeplinks from bound sensor tiles

### Sensor and summary layer
- per-run status, phase, cultivar, energy, and energy cost sensors
- proxy sensors for bound Home Assistant entities
- run-window energy and energy cost summaries
- light unit compatibility for `lx` / `lux`
- metric-aware binding UI that tries to show only compatible Home Assistant sensors

### Persistence
- local store-backed run history
- migration support for older payload shapes and legacy binding IDs

---

## Current architecture notes (important)

### Run window is the source of truth
PlantRun is moving toward a recorder-first model for time-scoped history.

Important rules:
- treat a run as a **window**: `start -> now` for active runs, `start -> end` for ended runs
- prefer `planted_date` over raw `start_time` when presenting user-facing run history windows
- do **not** deepen reliance on copied `run.sensor_history` for UX/history flows when Home Assistant recorder/history can be used instead

Relevant pieces:
- `custom_components/plantrun/run_window.py`
- `custom_components/plantrun/history_context.py`
- websocket: `plantrun/get_run_binding_history_context`

### SeedFinder live preview uses Home Assistant websocket on purpose
The cultivar preview search is intentionally implemented through Home Assistant websocket, **not** raw browser `fetch()` against a custom HTTP view.

Why this matters:
- earlier browser calls to `/api/plantrun/search_cultivar` triggered invalid-auth / ban behavior in real Home Assistant use
- the fixed implementation uses `this._hass.callWS(...)`
- preview results are debounced and cached client-side to avoid spam

Guardrail:
- do **not** replace the current preview flow with unauthenticated or ad-hoc browser fetch calls unless auth behavior is explicitly re-verified inside Home Assistant

Relevant pieces:
- websocket command: `plantrun/search_cultivar`
- frontend: `custom_components/plantrun/www/plantrun-panel.js`
- provider: `custom_components/plantrun/providers_seedfinder.py`

### SeedFinder matching and flower-window extraction are custom
The SeedFinder flow is not a stock autocomplete from the upstream site.

PlantRun currently does its own:
- breeder + query lookup
- tolerant cultivar scoring / matching
- flower-window extraction from SeedFinder result text
- UI preview suggestions inside the PlantRun wizard/edit flow

Guardrail:
- do not remove the tolerant matcher or flower-window parsing just because the upstream SeedFinder website does not expose the same UX directly

### Home Assistant history deeplink is a deliberate custom solution
Bound sensor taps use a PlantRun-specific history flow:
- short tap tries to open HA native `/history` with `entity_id`, `start_date`, and `end_date`
- long press opens normal HA entity details / more-info
- modal fallback still exists when the deeplink cannot be formed

This is intentionally a custom solution because HA more-info does not expose a clean documented public API for forcing arbitrary run start/end ranges from this panel.

Guardrail:
- do not regress this back to a fake history modal or remove the explicit run-window start/end behavior without re-checking the user requirement
- if replacing it, replace it with an equally-good or better recorder-backed history experience

### UI behavior guardrails
- phase changes should use an in-panel confirmation modal, **not** browser `alert()` / `confirm()`
- note deletion should use the same in-panel confirmation pattern
- explicit breeder field is required in create/edit cultivar flows
- binding pickers should not silently fall back to showing all sensors when metric filtering fails; misleading lists are worse than honest empty states

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
