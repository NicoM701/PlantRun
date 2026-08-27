# PlantRun roadmap

## Direction

PlantRun will not wait for every screen and later feature before it becomes useful. The rebuild will ship as a sequence of production-quality vertical slices. Each slice must work inside Home Assistant, persist real data, and use the accepted visual direction.

The first target is deliberately narrow: record the cultivation cycle that has already started without depending on the rejected PlantRun interface.

## Current truth

- GitHub and HACS publish `v0.7.0` as the first usable rebuild.
- The current branch now contains the first Journal media slice: authenticated photo upload, caption/source metadata, safe PlantRun-owned file cleanup, and explicit Plant Cover selection. Its Home Assistant live gate is still pending.
- Home Assistant runs `v0.7.0` with the PlantRun config entry loaded.
- The live v3 store contains one Growzelt, the Diesel Auto and Tangerine Dream Auto Runs, and five accepted Journal Entries from August 25, 2026.
- A second Home Assistant restart preserved the complete v3 state and the rebuilt sidebar rendered both Plants afterward.
- The authenticated live SeedFinder search returns matching results for Diesel Automatic by Royal Queen Seeds and Tangerine Dream Automatic by Zamnesia. The current live responses do not yet include a duration or image, and the imported acceptance Runs do not prove the full create-flow interaction.
- Home Assistant currently exposes the Growzelt light through an enabled 20:00 on automation, an enabled 14:00 off automation, the SmartPlug switch, a power sensor in W, and an accumulated energy sensor in kWh. The former 16:00 off automation still exists but is disabled.
- The former Amnesia and Purple Cookie Kush records remain in the hidden legacy bucket and the full Home Assistant backup `Before_PlantRun_v0.7.0_rebuild_2026-08-26`. They do not appear in the rebuilt sidebar.
- The permanent-deletion flow remains the only supported way for a user to remove a rebuilt Run.

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
- one or more photo attachments on a Journal Entry, with capture time, optional caption, visible source, and a clear upload state;
- an explicit `Als Pflanzenbild verwenden` action for a Journal photo instead of silently replacing the current image;
- a Plant Cover fallback order of selected Journal photo, sourced Strain image, then the neutral sprout placeholder;
- a chronological photo timeline that shows visible development without separating photos from their Journal context;
- media retention rules: archival keeps PlantRun-owned photos, Permanent Deletion names them in its warning, and externally owned Home Assistant media is never deleted by PlantRun;
- separate Tent and Plant sensor ownership;
- fast capture from the Tent overview and plant workspace;
- clear empty, offline, loading, and error states.

Gate:

- Log real entries for more than one Plant without target ambiguity.
- Move a Run to another Stage, including a backward or custom Stage, without rewriting its history.
- Reassign a Plant Sensor while retaining the earlier binding period.
- Add a photo to a real Journal Entry, select it as the Plant Cover, and verify both survive a Home Assistant restart and remain visible in the Archive.
- Validate the full daily loop on desktop and mobile.

## Phase 3: smart environmental context

Goal: make Home Assistant history a reason to use PlantRun instead of a separate journal.

Scope:

- Recorder-backed raw history for recent detail;
- long-term statistics for permanent Run history;
- one focused metric chart with target range, current value, change, latest related event, minimum, average, and maximum;
- dated Sensor Bindings for the Tent and individual Runs;
- compatibility checks for metric units and long-term statistics;
- exact Run-window history navigation;
- strict separation of the light control source, actual switch state, current power in W, and accumulated energy in kWh;
- guided discovery of Home Assistant entities and enabled automations that target the selected light switch, without installation-specific entity IDs in PlantRun code;
- support for deterministic time automations and Home Assistant Schedule helpers as Lighting Sources;
- an honest `dynamische Regel` state for sun, template, event, or conditional automations whose future cycle cannot be reduced to fixed on and off times;
- a planned-versus-actual light view that shows the source, last evaluation time, and any gap inferred from switch or power history;
- visible light exceptions when the planned switch event and the measured switch or power history disagree, with a direct path to record the incident in the Journal;
- Run-window energy consumption and optional cost derived from Recorder statistics rather than copied counter readings;
- small factual summaries such as minimum, maximum, trend, missing data, and time outside a configured target range. Every derived value names its source and window.

Gate:

- A temperature or humidity chart uses the configured Tent aggregate entity.
- A Plant Sensor reassignment shows the correct entity for each historical period.
- A completed Run retains its long-term view after raw Recorder data expires.
- Unit mismatches fail visibly and never present power as accumulated energy.
- Selecting the Growzelt SmartPlug discovers the enabled 14:00 off and 20:00 on automations, ignores the disabled 16:00 rule, and displays the resulting 18/6 plan without storing those times as installation-specific defaults.
- Changing or disabling a linked automation updates the displayed plan and preserves the earlier Lighting Source period for historical Runs.
- A rule that PlantRun cannot resolve shows its actual Home Assistant source and never invents a fixed light cycle.

## Phase 4: finish and revisit a cycle

Goal: cover the complete cultivation lifecycle.

Scope:

- Harvest and completion flow;
- end time, dry yield, and optional harvest details;
- post-harvest Journal Entries without extending the cultivation sensor window;
- browsable and editable completed Runs;
- archive filtering and a useful completed-Run summary;
- an exportable Run report containing identity, Stages, Journal Entries, selected photos, harvest facts, and sourced environmental summaries;
- full retention of Stages, Journal Entries, Sensor Bindings, images, sourced Strain data, and harvest details after archival;
- a separate danger area for Permanent Deletion that explains the lost PlantRun data, requires the exact Run name, and has no in-app undo;
- replacement Lovelace card using native Home Assistant styling.

Gate:

- Complete a real or rehearsed Run and reopen it after a Home Assistant restart.
- Verify the Recorder window ends at harvest while later Journal Entries remain visible.
- Correct a completed Run and confirm the updated values everywhere they are shown.
- Export a completed Run and verify that the report remains readable without access to the PlantRun frontend.

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
- optional Home Assistant camera-entity linkage at Tent level;
- manual camera snapshots as Journal Attachments, with the same caption, cover, retention, and deletion rules as uploaded photos;
- live camera preview and opt-in time-lapse generation only after fixture-based tests and a real-camera validation are possible. PlantRun does not copy or delete an external camera stream or recording;
- voice, Assist, NFC, and physical-button capture;
- optional sound and deeper appearance customization.

## Execution order

Phase 0 is complete. The first live Phase 1 data and persistence gates pass on Home Assistant. The next release should follow the owner's real daily loop:

1. finish the remaining Journal interaction checks and make multi-Plant targeting unambiguous;
2. add Journal photo attachments and Plant Cover selection;
3. run one harmless end-to-end creation rehearsal with the live SeedFinder search, then remove the rehearsal Run through the confirmed Permanent Deletion flow;
4. add custom Stage editing;
5. introduce Lighting Source discovery and the planned-versus-actual light view;
6. build the richer harvest and completed-Run correction flow.

Camera linkage follows the same attachment model after photo storage is proven. Reminders, comparison, live video, and appearance settings stay behind the daily capture and environmental-context work.

No phase is complete because its files exist or its tests pass. A phase ends only after the listed Home Assistant live gate passes with the current cultivation data.
