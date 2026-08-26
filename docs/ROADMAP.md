# PlantRun roadmap

## Direction

PlantRun will not wait for every screen and later feature before it becomes useful. The rebuild will ship as a sequence of production-quality vertical slices. Each slice must work inside Home Assistant, persist real data, and use the accepted visual direction.

The first target is deliberately narrow: record the cultivation cycle that has already started without depending on the rejected PlantRun interface.

## Current truth

- Home Assistant currently runs the HACS release `v0.4.2`.
- The repository branch declares `0.6.1`, but that code is the rejected earlier overhaul rather than the accepted rebuild.
- The accepted `Clean development` workspace, guided creation flow, journal, and phase interactions exist only as disposable prototypes.
- The live `v0.4.2` store contains two legacy runs. One of them stores multiple plants inside one run, which conflicts with the settled one-plant-per-run model.
- The current cultivation cycle has begun. New acceptance data is real data and must survive every later update.

## Working rule

Build the smallest honest PlantRun first, then use it during the current cycle. Do not polish all review screens before the core capture loop works. Do not publish the old `0.6.1` overhaul as if it were the rebuild.

## Phase 0: protect the current cycle

Goal: make the gap before the first usable rebuild short and recoverable.

Work:

- Record the planting date, plants, strains, breeders, and any events that have already happened in a temporary import ledger.
- Export the current PlantRun runs through its supported websocket contract and take a Home Assistant backup before changing the installed integration.
- Classify the existing Amnesia and Purple Cookie Kush records as either keep or discard. No migration may silently decide this.
- Define a small import format for the temporary ledger so the first rebuilt version can ingest it once.
- Freeze HACS updates and Home Assistant restarts related to PlantRun until the backup and import path have been tested.

Gate:

- Every fact recorded since the current cycle began exists in a readable export or ledger with an explicit timestamp and plant target.
- The owner has decided which legacy runs matter.

## Phase 1: usable capture slice

Goal: replace the temporary ledger with PlantRun as soon as possible.

Production scope:

- one persistent Tent;
- one Plant and one Run per creation flow;
- durable Runs that move to the Archive automatically and are deleted only through an explicit permanent-deletion flow;
- the selected three-step creation flow with manual Strain entry;
- Germination as a valid initial Stage for seeds sown directly into their final container;
- a chronological Journal using the selected `Verlauf zuerst` interaction;
- free-text entries with an editable occurrence time;
- the first structured event types: Water, Change stage, Inspect, and Harvest;
- optional structured details without making them required;
- edit and delete for Journal Entries;
- persistence across integration reload, Home Assistant restart, and browser reload;
- desktop and mobile layouts built from the accepted PlantRun visual system;
- one supported import of the Phase 0 ledger.

Architecture:

- Put Tent, Plant, Run, Stage, and Journal Entry rules behind a small domain interface.
- Put storage versioning and migration behind one persistence module.
- Expose commands and queries through a documented Home Assistant websocket interface.
- Keep Home Assistant transport out of domain calculations.
- Build the frontend as focused workflow modules rather than another single large custom element.

Gate:

- Create the current real plant and run inside Home Assistant.
- Add, edit, and delete a real Journal Entry.
- Reload the integration, restart Home Assistant, and reopen the browser. The Run and Journal remain correct.
- Import the temporary ledger and verify every imported timestamp and target.
- Complete keyboard and phone-width checks for the creation and Journal paths.

Explicitly excluded:

- Recorder charts;
- global Strain search;
- comparison and archive analytics;
- reminders, notifications, camera, voice, and NFC;
- the full Lovelace companion card.

## Phase 2: daily cultivation workspace

Goal: make PlantRun useful for daily work, not only data entry.

Scope:

- the accepted plant workspace with lifecycle progress and latest Journal context;
- a Tent overview that supports multiple active one-plant Runs at unrelated Stages;
- direct Stage selection with an editable timestamp;
- custom Stage creation and display reordering without transition restrictions;
- plant photos and honest image fallbacks;
- separate Tent and Plant sensor ownership;
- fast capture from the Tent overview and plant workspace;
- clear empty, offline, loading, and error states.

Gate:

- Log real entries for more than one Plant without target ambiguity.
- Move a Run to another Stage, including a backward or custom Stage, without rewriting its history.
- Reassign a Plant Sensor while retaining the earlier binding period.
- Validate the full daily loop on desktop and mobile.

## Phase 3: Recorder and environmental context

Goal: make Home Assistant history a reason to use PlantRun instead of a separate journal.

Scope:

- Recorder-backed raw history for recent detail;
- long-term statistics for permanent Run history;
- one focused metric chart with target range, current value, change, latest related event, minimum, average, and maximum;
- dated Sensor Bindings for the Tent and individual Runs;
- compatibility checks for metric units and long-term statistics;
- exact Run-window history navigation;
- correction of the current power-versus-energy binding warning.

Gate:

- A temperature or humidity chart uses the configured Tent aggregate entity.
- A Plant Sensor reassignment shows the correct entity for each historical period.
- A completed Run retains its long-term view after raw Recorder data expires.
- Unit mismatches fail visibly and never present power as accumulated energy.

## Phase 4: finish and revisit a cycle

Goal: cover the complete cultivation lifecycle.

Scope:

- Harvest and completion flow;
- end time, dry yield, and optional harvest details;
- post-harvest Journal Entries without extending the cultivation sensor window;
- browsable and editable completed Runs;
- archive filtering and a useful completed-Run summary;
- full retention of Stages, Journal Entries, Sensor Bindings, images, sourced Strain data, and harvest details after archival;
- a separate danger area for Permanent Deletion that explains the lost PlantRun data, requires the exact Run name, and has no in-app undo;
- replacement Lovelace card using native Home Assistant styling.

Gate:

- Complete a real or rehearsed Run and reopen it after a Home Assistant restart.
- Verify the Recorder window ends at harvest while later Journal Entries remain visible.
- Correct a completed Run and confirm the updated values everywhere they are shown.

## Phase 5: HACS baseline release

Goal: turn the owner-tested rebuild into the maintained HACS version.

Requirements:

- migration or explicit import for every data shape the owner chose to preserve;
- automated tests for the domain, storage, websocket contracts, and critical frontend flows;
- clean installation and update checks on the current supported Home Assistant release;
- deterministic frontend cache busting;
- unload, reload, restart, backup, restore, and rollback checks;
- final desktop and mobile screenshots approved by the owner;
- a release checklist that distinguishes repository checks, installed files, loaded integration state, and functional live proof.

The version number is chosen only after deciding whether the old unreleased `0.6.1` history will be replaced, retained, or skipped.

## Later work

These features stay outside the first HACS baseline unless real use proves one is needed sooner:

- reminders and tent-door capture prompts;
- scheduled follow-ups from Journal Entries;
- automation-originated Journal Entries and cultivation events;
- Run comparison;
- global all-Breeder Strain search and richer provider adapters;
- camera snapshots;
- voice, Assist, NFC, and physical-button capture;
- optional sound and deeper appearance customization.

## Execution order

The next implementation work starts with Phase 0 and Phase 1. Remaining prototype review must not block them because the selected creation, Journal, phase, and plant-workspace directions already define the first usable paths. Review of archive, comparison, settings, and later states can continue while the capture slice is built.

No phase is complete because its files exist or its tests pass. A phase ends only after the listed Home Assistant live gate passes with the current cultivation data.
