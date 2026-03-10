# PlantRun Requirements (Current Baseline)

Version: 2026-03 (living spec)
Audience: maintainers and implementation agents

---

## 1) Product Goal

PlantRun must provide a reliable, user-friendly Home Assistant experience for complete cultivation run tracking:
- setup without YAML,
- clear run lifecycle handling,
- practical dashboard interaction,
- persistent historical context.

Primary quality bar: **runnable, safe, understandable UX per merge**.

---

## 2) Scope

### In Scope
- HACS-installable custom integration
- Run lifecycle management (create, update, end)
- Multi-run support with explicit run selection
- Optional cultivar enrichment via SeedFinder
- Sensor bindings and run-level proxy sensor behavior
- Sidebar dashboard for operational run management
- Run summaries including configurable energy pricing/currency
- Persistent local store for long-term run context

### Out of Scope (for baseline)
- mandatory cloud dependency
- paid-only API requirements
- enterprise multi-user permission systems

---

## 3) Functional Requirements

### 3.1 Run Lifecycle
System must support:
1. create run,
2. maintain active phase,
3. phase transitions,
4. notes/events,
5. end-run locking behavior,
6. preserving historical run state.

### 3.2 Multi-Run Behavior
- Multiple runs must be supported concurrently.
- UI and service actions must avoid ambiguous run targeting.
- Mutating actions require explicit or unambiguous run context.

### 3.3 Cultivar/Seed Data
- Manual cultivar assignment is required.
- SeedFinder enrichment is optional but supported.
- Cultivar snapshot must be retained with run data.
- Flowering window parsing should handle common day/week formats (including locale variants).

### 3.4 Sensor & Metric Layer
- Sensor bindings must be robust to unit variants where practical.
- Light sensor handling must normalize known illuminance aliases safely.
- Summary outputs must include:
  - energy consumption,
  - configurable price per kWh,
  - explicit currency metadata.

### 3.5 Dashboard UX
Dashboard must provide:
- clear run overview,
- phase/state visibility,
- run-age visibility,
- notes workflow,
- image workflow,
- phase-aware field visibility (e.g., harvest-only fields).

---

## 4) UX Requirements

### Setup Flow
- Human-readable naming/copy (no internal jargon)
- Reduced ambiguity for setup fields (cultivar/breeder/strain; grow space/medium)
- Guardrails and helper hints for empty/unclear input
- Progressive simplification in small, mergeable slices

### Action Safety
- Avoid dangerous fallback behavior for mutating actions in multi-run scenarios.
- Surface clear guidance when user configuration is required.

---

## 5) Data & Compatibility

- Storage schema changes must remain backward-compatible.
- Legacy summary records without currency must be handled safely.
- Existing installs must continue to function with defaults:
  - `electricity_price_per_kwh`: `0.0`
  - `currency`: `EUR`

---

## 6) Quality Gate (per PR)

Each PR must satisfy:
1. Scope is issue-focused and minimal.
2. Integration remains runnable.
3. Relevant tests/checks pass (local and/or CI).
4. Review pass (Codex + maintainer sanity).
5. No force-push/history rewrite.

---

## 7) Current Delivery State

Already delivered recently:
- #27, #32, #33, #34, #36, #37, #38, #39, #40, #41, #42, #43, #44
- #25 closed as resolved

Remaining tracked epic:
- #35 (setup-flow simplification epic; slice-based completion)

---

## 8) Next Requirement Track

Complete #35 through incremental slices:
- Slice A: flow structure and wording simplification
- Slice B: empty states + guardrails
- Slice C: final polish/consistency pass and issue closure criteria

Epic is complete when setup feels clear to first-time users without sacrificing advanced flexibility.
