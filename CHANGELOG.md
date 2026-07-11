# Changelog

## 0.4.1

- Added explicit release cache keys to every imported panel module so Home
  Assistant cannot combine a new entry module with stale child modules.

## 0.4.0

- Rebuilt the PlantRun experience around a calm garden overview and a dedicated
  run workspace instead of the rejected sidebar-and-detail dashboard pattern.
- Added a prominent responsive lifecycle rail inspired by the supplied phase
  references, with working canonical and custom phase transitions.
- Added named plants and editable per-run phase plans to guided setup and run
  customization without changing the existing storage schema.
- Reworked live sensor bindings into Recorder-first intelligence cards and notes
  into a lightweight chronological journal.
- Added a four-step setup flow, polished light/dark palettes, density and optional
  sound controls, mobile layouts, keyboard focus states, and reduced-motion support.
- Preserved existing runs, services, SeedFinder enrichment, bindings, completion,
  yield, and exact Home Assistant history-window navigation.

## 0.3.1

- Fixed light-mode text inheritance when Home Assistant itself uses a dark theme.
- Reduced distracting low-quality cultivar imagery behind the light hero surface.

## 0.3.0

- Rebuilt the sidebar frontend as native ES modules with explicit API, domain,
  view, dialog, style, and controller boundaries.
- Removed direct Home Assistant websocket and service transport from the panel
  controller in favor of a focused `PlantRunApi` adapter.
- Centralized phase, target-day, progress, and run-history-window calculations.
- Extracted Home Assistant panel registration from integration setup.
- Added a module-set cache fingerprint so changes in imported frontend files are
  picked up after integration reloads.
- Preserved sound feedback, light/dark mode, density controls, stored runs, and
  all public Home Assistant services.

## 0.2.0

- Redesigned the PlantRun sidebar around a smaller, responsive run workspace.
- Added active, archive, and all-run counts with filter-aware selection.
- Added light/dark and comfortable/compact layout preferences.
- Reworked sensor tiles and history dialogs around Home Assistant Recorder data.
- Added a validated three-step onboarding flow with optional cultivar and sensor setup.
- Added user-defined phases alongside the common cultivation stages.
- Added a finish-and-archive flow with optional dry harvest yield.
- Fixed completed-run day/progress calculations and run-window end-time handling.
