# Changelog

## 0.7.0

- Replaced the rejected dashboard and stored run model with the accepted one-plant-per-run PlantRun application.
- Added a persistent Tent, structured Plant and Run records, dated Stage history, sourced Strain identity, Journal Entries, and dated Tent or Plant sensor bindings.
- Added the three-step creation flow, history-first Journal, direct Stage changes, Recorder-backed metric workspace, sensor reassignment, archive, and warned Permanent Deletion.
- Added first-class container, soil, and light-cycle facts so the August 25 acceptance cycle can be imported without reducing those facts to prose.
- Preserved the old v2 store in a hidden backup bucket while keeping it out of the rebuilt interface.
- Added an atomic, idempotent import command for the acceptance ledger and compatibility handling for existing Home Assistant services.
- Added the PlantRun favicon used by T3 Code project tabs.
- Added domain, application, migration, websocket, and critical frontend contract tests.

## 0.6.1

- Keep generated stage artwork visible alongside user and SeedFinder imagery.
- Anchor Recorder charts to the viewport so dialogs stay fully visible after scrolling.

## 0.6.0

- Added an in-panel Recorder chart that reads Home Assistant history on demand without storing samples in PlantRun.
- Added run-window latest, average, low, and high statistics from transient Recorder data.
- Added dense Main data and Grow info panels inspired by cultivation logbooks.
- Added richer harvest summaries with start and harvest dates.
- Added original transparent seedling, vegetative, and flowering plant assets generated for PlantRun.
- Integrated stage artwork into run cards, plant cards, and workspaces while preserving user-provided imagery.

## 0.5.0

- Replaced the dashboard-style frontend with a plant-first garden and focused run workspaces.
- Added migrations-safe structured plant records with watering logs and configurable intervals.
- Added useful attention signals for scheduled watering, unavailable sensors, and cycle timing.
- Added meaningful view personalization with grid/list layouts and optional overview sections.
- Removed decorative placeholder curves and exposed truthful live/unavailable sensor states.
- Made completed runs read-only by default with a dedicated harvest summary and correction path.
- Fixed custom phase rendering and exact run-window history navigation in the Lovelace card.
- Added keyboard-operable sensor history tiles and improved dialog semantics.

## 0.4.2

- Improved dark-theme contrast for the highlighted overview statistic and made
  run-card progress percentages readable inside their rings.

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
