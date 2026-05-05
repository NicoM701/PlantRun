# PlantRun project context

## What PlantRun is

PlantRun is a Home Assistant custom integration for tracking cultivation runs end to end: run creation, phase changes, notes, cultivar enrichment, sensor bindings, run summaries, and persistent per-run history.

The product now has two frontend entry points:
- a dedicated sidebar app at `/plantrun-dashboard`
- a Lovelace card: `custom:plantrun-card`

## Current status: frontend rebuild branch

This branch (`feature/frontend-rebuild`) is the rebuilt UI line intended to become the new frontend baseline.

What is already in place here:
- full sidebar panel rebuild in `custom_components/plantrun/www/plantrun-panel.js`
- richer run cards with stage art, live metric chips, filters, and expanded summaries
- detail overlay with editable run metadata, notes, yield, target days, and binding management
- 3-step run creation wizard
- theme + language toggles and persisted layout preferences
- live SeedFinder cultivar search
- Lovelace card/editor updated to use canonical PlantRun runtime data instead of brittle entity-ID guessing

## Key architecture surfaces

### Frontend

#### `custom_components/plantrun/www/plantrun-panel.js`
Main app surface.
- loads runs via websocket
- renders run grid, detail overlay, wizard, history tiles, layout/theme/lang controls
- calls `/api/plantrun/search_cultivar` for live cultivar suggestions
- uses HA services for mutations

#### `custom_components/plantrun/www/plantrun-card.js`
Compact Lovelace card for one selected run.
- fetches a run with `plantrun/get_run`
- fetches summary data with `plantrun/get_run_summary`
- opens the sidebar dashboard for deeper interaction

#### `custom_components/plantrun/www/plantrun-card-editor.js`
Card editor for picking a run and optional title/compact mode.
- discovers runs through `plantrun/get_runs`
- do not regress this back to `hass.states` string matching

### Backend runtime / API surface

#### `custom_components/plantrun/__init__.py`
Registers most of the runtime contract:
- static frontend path: `/plantrun_frontend`
- sidebar panel: `/plantrun-dashboard`
- websocket commands:
  - `plantrun/get_runs`
  - `plantrun/get_run`
  - `plantrun/get_run_summary`
- authenticated HTTP search endpoint:
  - `POST /api/plantrun/search_cultivar`
- Home Assistant services for create/update/end/bind/note/image workflows

### Services currently exposed

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

### Storage

#### `custom_components/plantrun/store.py`
- canonical source of persisted run data
- Home Assistant `Store` backed payload with schema normalization/migration
- maintains:
  - `runs`
  - `active_run_id`
  - `daily_rollups`
- legacy payloads and legacy binding IDs are normalized on load

### Sensors

#### `custom_components/plantrun/sensor.py`
Exposes HA entities for dashboarding and automation:
- total runs sensor
- per-run status / phase / cultivar / energy / energy cost sensors
- proxy sensors per binding

Important: frontend discovery should not depend on HA-generated entity IDs as the primary contract. Use storage/websocket data first; treat entities as display/automation surfaces.

## Testing commands

Primary gate used on this branch:

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

## Branch / install reality

- HACS follows the repo default branch, not this feature branch.
- If testing `feature/frontend-rebuild` before merge, use a manual checkout/copy into `custom_components/plantrun`.
- After JS changes, hard-refresh the browser. The panel has versioned module loading, but stale frontend cache can still waste time.

## Important gotchas from this sprint

- **Do not reintroduce entity-ID guessing in the frontend.** Older codepaths broke when UI discovery depended on `sensor.plantrun_*` naming assumptions.
- **Binding IDs matter.** `remove_binding` / `update_binding` should operate on stable binding IDs where possible; history is meant to stay attached to the run.
- **Storage migration is part of the contract.** Old runs may be missing schema version, phases, active run ID, or binding IDs.
- **Light units are intentionally normalized.** `lx` and `lux` variants should keep working.
- **Node `--check` is syntax-only.** Passing it does not prove runtime behavior; keep the Python tests green too.
- **Some test output warnings are expected.** The suite intentionally covers unit-drift and malformed-store scenarios.
- **Local scratch files exist sometimes.** If `plantrun-ship-readiness-2026-03-20.md` is present locally, keep it out of commits.

## If you pick this up next

Good next checks before changing behavior:
1. confirm whether the change belongs to panel, card, editor, or backend service contract
2. prefer websocket/storage-backed data over HA entity-name inference
3. run the full unittest + JS syntax gate before handing off
4. test manual branch install behavior, not just assumptions about HACS
