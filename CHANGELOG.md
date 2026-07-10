# Changelog

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
