# PlantRun: product vision and rebuild brief

## Status for the next implementation

PlantRun needs a genuine from-scratch product and UI rebuild.

The current sidebar UI, including the redesign work on
`codex/plant-run-redesign`, was rejected by the product owner. It still looks and
feels too much like the previous interface. **Do not use the current UI, its
layout, visual hierarchy, cards, colors, or component composition as a design
reference.** Existing code may be inspected only to understand behavior, stored
data, Home Assistant contracts, migrations, and already solved technical edge
cases.

Start with product discovery, information architecture, wireframes, and a new
visual direction before writing the replacement frontend. A new agent should
treat the screenshots and current frontend as examples of what not to reproduce.

## What PlantRun is

PlantRun is a Home Assistant custom integration for documenting and following
complete cannabis cultivation cycles ("runs"). It should feel like a focused,
high-quality cultivation journal built naturally into Home Assistant, not like a
generic admin dashboard or a collection of HA cards.

A run represents one cultivation cycle from planting through harvest and may
contain one or several plants. The product must support multiple runs and plants
at the same time. Active and completed runs remain useful, browsable records.

PlantRun should help users:

- set up a new run without being overwhelmed;
- see immediately where every plant/run is in its lifecycle;
- define and advance their own phases;
- connect existing Home Assistant sensors;
- inspect environmental history for the exact duration of a run;
- keep notes and important events over time;
- complete a run with harvest information such as dry yield;
- revisit and compare completed runs later.

## Non-negotiable product principles

### Home Assistant owns sensor history

PlantRun must not duplicate Home Assistant time-series sensor data in its own
storage. It stores run metadata, plant metadata, phase changes, notes, sensor
bindings, timestamps, and harvest results. Historical values stay in Home
Assistant Recorder.

Every run defines a time window:

- active run: planting/start time to now;
- completed run: planting/start time to harvest/end time.

Selecting a bound metric such as humidity, temperature, light, soil moisture,
conductivity, or energy should open Home Assistant's native history/detail
experience with that entity and the run's exact time window already selected.
This behavior exists in the current project and must be preserved or improved.

### Existing user data must survive

A frontend rebuild must not throw away existing runs. Preserve and migrate the
current storage and service contracts where practical. Completed runs, notes,
phase history, yield, cultivar data, and sensor bindings must remain accessible.

### The UI is a clean-sheet design

Do not reskin the existing dashboard. Do not begin by rearranging its cards. The
new interface needs a fresh interaction model and visual system.

The desired character is:

- modern, friendly, calm, and tactile;
- minimal without feeling empty or generic;
- highly legible and intentional;
- customizable without exposing complexity too early;
- responsive and genuinely pleasant on desktop and mobile;
- visually distinct from both stock Home Assistant and the rejected UI;
- polished enough to feel like a standalone product while remaining native to
  Home Assistant.

Avoid dense admin-dashboard patterns, excessive bordered rectangles, repeated
metric cards, weak visual hierarchy, decorative imagery with no purpose, and a
layout that is merely a sidebar plus a large detail grid.

The product owner liked the idea and function of a light/dark switch represented
as light on/off, and also liked the sound on/off interaction. Keep those concepts,
but reinterpret their visual design from scratch. Sound must remain optional,
subtle, accessible, and easy to disable.

## Core experience

### Overview

The opening view should answer, at a glance:

- Which runs and plants are active?
- What phase is each one in?
- What needs attention or is coming next?
- How far through the expected cycle is each run?
- Which runs have recently been completed?

Multiple simultaneous runs/plants are a first-class scenario, not an edge case.
Archived runs should stay easy to discover without competing visually with active
work.

### Run workspace

A run needs a coherent workspace rather than an assortment of unrelated cards.
It should combine:

- identity: run name, cultivar/strain, breeder, plants, image if useful;
- current phase and phase timeline;
- expected duration and progress;
- bound live sensor values;
- recorder-backed history entry points;
- chronological notes and events;
- editing and sensor binding;
- completion/harvest flow and final yield;
- useful summary for completed runs.

The UI should make the distinction between live values, stored journal data, and
Recorder history obvious without technical jargon.

### Phases

Common phases may be offered as helpful defaults, for example seedling,
vegetative, flowering, drying, curing, and harvested. Users decide which phases
they use and may add, rename, reorder, skip, or advance custom phases. Phase
changes belong to the permanent run timeline with timestamps.

Do not encode one rigid growing method into the product.

### Cultivar/strain search

The partially working SeedFinder search is valuable and should be retained as a
capability, not copied blindly as UI. It should help find cultivar and breeder
information during setup. When reliable flowering/duration information is
available, PlantRun may use it to suggest an expected duration and end date.

Suggestions must be transparent and editable. A user can always enter the data
manually or continue without cultivar enrichment. Network/provider failure must
never block run creation.

### Notes and completed runs

Notes should feel like a lightweight journal: fast to add, chronological, easy to
edit, and visibly associated with a date/phase. Completion should record the end
time and optionally harvest/yield information. Completed runs become read-only by
default but remain fully browsable, with an explicit edit path when correction is
needed.

## Onboarding and new-run setup

The first-run experience must follow progressive disclosure and current UX best
practices. A new user should understand the value before being asked to configure
everything.

Use a short, guided sequence with one clear decision per step. A sensible model is:

1. Name the run and choose the start/planting date.
2. Add one or more plants and optionally search/select cultivar and breeder.
3. Choose suggested or custom phases and review the editable duration estimate.
4. Optionally bind Home Assistant sensors, with compatible entities suggested.
5. Review and create.

The precise number of screens is a design decision, not a requirement. Required
fields should be minimal. Cultivar lookup, images, notes, phases beyond a useful
default, and sensor bindings can be completed later. Always show progress, allow
back navigation without losing input, explain why permissions/data are needed,
and provide honest empty/error states.

## Customization and accessibility

Customization should include theme and density/layout choices where useful, but
defaults must already look excellent. Support Home Assistant theme context while
providing a deliberate PlantRun light and dark appearance. Respect reduced-motion
preferences, keyboard navigation, focus visibility, contrast, touch target sizes,
and screen-reader labels. Do not rely on color alone for phase or status.

## Architecture expectations

A full rebuild may replace the frontend architecture and may refactor backend
boundaries where that makes the product easier to maintain. It should not be a
single giant custom element or a monolithic `__init__.py`.

Keep clear boundaries between:

- Home Assistant transport (websocket/services);
- run and plant domain models;
- persistence and migrations;
- Recorder/history link construction;
- external cultivar providers;
- view components and design tokens;
- onboarding and other workflows.

Prefer a small documented API contract between frontend and integration. Domain
calculations such as phase progress, expected end date, and history window should
be pure and testable. External provider responses must be normalized behind an
adapter. UI state must not become the source of truth for stored run data.

The implementation should follow Home Assistant custom integration conventions,
support unload/reload cleanly, avoid unauthenticated browser fetches, and keep
frontend cache/version handling deterministic.

## Existing behavior worth studying, not visually copying

The current code contains useful technical work that a rebuild should inspect:

- Home Assistant `Store` schema normalization and migration;
- services for run, phase, note, binding, cultivar, image, and completion changes;
- websocket run/summary endpoints;
- SeedFinder tolerant matching and flowering-window extraction;
- stable sensor binding IDs and metric compatibility;
- Recorder-first run-window history context and deep links;
- legacy data compatibility;
- HACS packaging, panel registration, Lovelace card registration, and tests.

Important locations include:

- `custom_components/plantrun/store.py`
- `custom_components/plantrun/run_window.py`
- `custom_components/plantrun/history_context.py`
- `custom_components/plantrun/providers_seedfinder.py`
- `custom_components/plantrun/sensor.py`
- `custom_components/plantrun/services.yaml`
- `tests/`

The current files under `custom_components/plantrun/www/` are implementation
reference only. They are not a design specification.

## Definition of a successful rebuild

Before implementation is called finished, it should demonstrate:

- a clearly new visual and interaction concept approved from wireframes or
  mockups before full build-out;
- excellent desktop and mobile layouts;
- easy first-run onboarding and later editing;
- multiple active runs/plants;
- custom phase configuration and a durable phase timeline;
- optional cultivar lookup with editable duration estimate;
- sensor binding without copying recorder data;
- exact run-window navigation into Home Assistant history;
- notes, completion, yield, archive, and completed-run browsing;
- light/dark and optional sound interactions;
- migration of existing PlantRun data;
- automated tests for domain, storage migration, APIs, and critical UI flows;
- installation and live validation through HACS on a current Home Assistant;
- screenshots or a short visual walkthrough for product-owner approval before a
  final release.

Most importantly: do not interpret "from scratch" as permission to discard the
product's useful data and integration behavior. It means creating a new product
experience from first principles while preserving the valuable Home Assistant
foundation underneath.
