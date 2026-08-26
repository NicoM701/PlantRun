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

The disposable prototype under `custom_components/plantrun/www/prototype/` is
the current design record. Its `Clean development` plant workspace, `detail=B`
revision 13, has been accepted as the working detail direction. The guided
`create=A` flow is also selected: one invocation creates one plant and one run.
Prototype code is still throwaway code and must not be promoted directly into
the HACS integration.

All remaining review screens must use the same shape language as those selected
directions. Major work areas use a 24 px radius, grouped content uses 18 px, and
controls use 12 px. Keep rows and charts flat inside the outer container. Do not
switch back to joined square boxes, and do not turn every value into its own
floating card. The Lovelace companion follows Home Assistant styling instead.

## What PlantRun is

PlantRun is a Home Assistant custom integration for documenting and following
complete cannabis cultivation cycles ("runs"). It should feel like a focused,
high-quality cultivation journal built naturally into Home Assistant, not like a
generic admin dashboard or a collection of HA cards.

A tent is the persistent growing space. A run represents exactly one plant from
planting through harvest and later history. A tent may contain any number of
overlapping runs at unrelated stages. Active and completed runs remain useful,
browsable records.

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

### Acceptance data must survive

The owner's next real cultivation cycle began on August 25, 2026. Data captured
for that cycle is relied upon and must survive the rebuild. Before replacing the
stored schema or installed integration, create a supported export or backup and
prove the migration or one-time import path. Older test runs may be discarded
only after the owner identifies them as disposable. Once the rebuilt schema
becomes the public HACS baseline, every later release must migrate real user data
forward.

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

Dark mode is the default. Use muted green-black surfaces, restrained botanical
accents, ordinary interface typography, and plant photography for identity.
Avoid app-store mockup styling, neon lime, glass effects, oversized marketing
headlines, and soft gradients that make the interface look generated.

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

Plants dominate the overview. Shared tent values sit in one restrained strip.
The full dashboard has its own PlantRun design, while the compact Lovelace card
will follow Home Assistant's native visual language.

### Run workspace

A run needs a coherent workspace rather than an assortment of unrelated cards.
It should combine:

- identity: optional nickname, strain, breeder, and plant image;
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

The accepted detail direction leads with the plant image, lifecycle progress,
and one focused Recorder chart. Selecting an environment metric updates that
chart and its visible target range, current status, change, latest related event,
minimum, average, and maximum. Journal content sits below this development view.
Permanent facts use one aligned strip beneath the chart.

### Phases

Common phases may be offered as helpful defaults, for example seedling,
vegetative, flowering, drying, curing, and harvested. Users decide which phases
they use and may add, rename, reorder, skip, or advance custom phases. Phase
changes belong to the permanent run timeline with timestamps.

Do not encode one rigid growing method into the product.

The selected phase-management structure is prototype variant A. Its interaction
contract is direct target selection, not a forced "next phase" sequence: the
user clicks any phase in the lifecycle rail or phase plan, reviews the editable
change timestamp, and confirms the switch. Drag-and-drop changes the displayed
order only. It must not constrain valid transitions or rewrite recorded phase
history.

### Cultivar/strain search

The partially working SeedFinder search is valuable and should be retained as a
capability, not copied blindly as UI. It should help find cultivar and breeder
information during setup. When reliable flowering/duration information is
available, PlantRun may use it to suggest an expected duration and end date.

The desired interaction is a search engine rather than a result-card picker: a
prominent Strain query updates a short result list while the user types, an
optional Breeder filter narrows it, and the highlighted result has a live detail
preview. Clicking a result must not overwrite current run data. Import happens
only through an explicit confirmation action.

The current `plantrun/search_cultivar` websocket searches within one required
Breeder and returns at most five matches. A global all-Breeder search is desired
but is not implemented by that contract yet. Extend the provider boundary rather
than faking a global result list in the production frontend. Preview fields must
identify whether they came from the result row, a fetched detail page, or manual
input.

Suggestions must be transparent and editable. A user can always enter the data
manually or continue without cultivar enrichment. Network/provider failure must
never block run creation.

### Notes and completed runs

Notes should feel like a lightweight journal: fast to add, chronological, easy
to edit, and visibly associated with a date/phase. Capture follows one clear
sequence: plant, event type or free text, content, editable occurrence time, and
save. Current Home Assistant sensor context is visibly attached rather than
hidden. History uses readable day-grouped events with separate plant and type
filters; do not compress the primary journal into a tiny wide table.

Quick capture must stay compact. Do not rebuild it as a large setup form with
plant cards, a row of action chips, separate date and time fields, a giant text
area, and an always-expanded sensor grid. Plant, event type, and occurrence time
are metadata around the text entry. Recorder context is attached automatically
and can be expanded for inspection. The selected journal structure is prototype
variant C, `Verlauf zuerst`: open on the chronological history and reveal the
compact side editor only after the user requests a new entry. Do not carry
variants A or B into implementation.

Completion should record the end time and optionally harvest/yield information.
Completed runs remain fully browsable and editable. The first version overwrites
corrected values and does not need a correction audit trail.

## Onboarding and new-run setup

The first-run experience must follow progressive disclosure and current UX best
practices. A new user should understand the value before being asked to configure
everything.

Every invocation of the creation flow creates one run for exactly one plant.
Creating another plant means starting the same flow again. Do not add batch or
multi-run creation.

The selected structure is the guided `create=A` flow:

1. breeder and Strain search with manual fallback, optional nickname, and
   planting date;
2. default or custom phases and optional sensor bindings;
3. review and create the run.

The production frontend must reuse the existing authenticated
`plantrun/search_cultivar` websocket and tolerant SeedFinder matching. The fixed
catalog in the disposable HTML is illustrative test data only. Search results,
images, sourced duration, and derived harvest windows are optional aids and
remain editable. Provider failure or no result must always lead to a complete
manual path. Show progress, allow back navigation without losing input, and
state that every value remains editable after creation.

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
- the persistent tent and one-plant run domain models;
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
- multiple active one-plant runs in one tent;
- custom phase configuration and a durable phase timeline;
- optional cultivar lookup with editable duration estimate;
- sensor binding without copying recorder data;
- exact run-window navigation into Home Assistant history;
- notes, completion, yield, archive, and completed-run browsing;
- light/dark and optional sound interactions;
- a clean new baseline schema for the owner's acceptance run;
- automated tests for domain, storage migration, APIs, and critical UI flows;
- installation and live validation through HACS on a current Home Assistant;
- screenshots or a short visual walkthrough for product-owner approval before a
  final release.

Most importantly: do not interpret "from scratch" as permission to discard the
useful Home Assistant integration behavior. It means creating a new product
experience and domain model without preserving unused test records or the
rejected interface.
