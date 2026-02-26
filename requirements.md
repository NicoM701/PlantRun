# PlantRun — System Requirements

Version: Draft (based on planning decisions from current sprint)
Audience: Any new agent/developer implementing PlantRun from scratch

---

## 1. Product Goal

PlantRun is a Home Assistant integration to track complete plant cultivation runs end-to-end.
It must support both hobby users and power users, while staying simple in first-use UX.

Core intent:
- Track runs, phases, metrics, notes, media, and outcomes.
- Support retrospective and live run management.
- Provide high-quality dashboard/history UX.
- Stay robust even if external data sources fail.

---

## 2. Scope

### 2.1 In Scope
- Home Assistant custom integration (HACS-installable)
- Run lifecycle management (new, import, active, ended)
- Cultivar/strain management with optional external enrichment
- Sensor/camera binding per run (including mid-run changes)
- Run-level metrics and summaries
- Dashboard-oriented entities and history
- Optional backup/snapshot strategy for long-term retention

### 2.2 Out of Scope (for initial baseline)
- Cloud service dependency
- Mandatory paid APIs
- Complex multi-user permission systems

---

## 3. Core Functional Requirements

## 3.1 Run Management
The system must support:
1. Create new run
2. Import already-running run (backdated start)
3. Import historical completed run (start + end)
4. End active run
5. Maintain one active phase per run
6. Maintain phase history timeline
7. Add freeform notes/comments/events

Run creation/import requirements:
- Must allow start date/time in the past.
- Must allow explicit phase selection at setup/import.
- Must provide user-friendly run identifiers (human-readable display labels) in addition to internal IDs.

### 3.2 Multi-Run Behavior
- System must support multiple stored runs.
- System must support **multiple active runs in parallel** (hard requirement).
- System must support selecting target run by friendly mechanism (not internal random IDs only).
- All services and UI flows must work with explicit run context selection when more than one run is active.
- Dashboard/state model must represent more than one active run without ambiguity.

### 3.3 Sensor & Camera Binding
The system must allow binding at any point during a run (not only at run start):
- Temperature
- Air humidity
- Soil moisture
- Energy
- Water
- Camera

Binding requirements:
- Must allow multiple sensors per metric type (future-proof design).
- Must track binding changes over time (history/event log).
- Must allow unbind/rebind without data loss.

### 3.4 Cultivar / Strain Handling
The system must support:
- Manual cultivar assignment
- External lookup/enrichment (SeedFinder/OpenPlantbook-style adapters)
- Local cache/fallback if provider fails
- Run-linked cultivar snapshot (so old runs remain stable even if source data changes)

Matching requirements:
- Fuzzy search tolerance
- Optional preference toggles (e.g. automatic variants)
- Breeder-aware search behavior

### 3.5 Metrics & Summaries
The system must provide run-level metric summaries for selected run period.

Primary data source strategy:
- Home Assistant recorder/history for period-based summaries.

Secondary strategy (optional backup):
- PlantRun snapshots for resilient long-term retention.

Key summary targets:
- Energy consumption (kWh)
- Energy cost (using user-entered electricity price)
- Soil moisture trends
- Air humidity trends
- Temperature trends
- Water trend/history

### 3.6 Media & Documentation
The system must support:
- Manual photo uploads/references per run
- Optional camera source linkage per run
- Media timeline in run history

Planned extension:
- Timelapse generation over full run and storage in run backlog

---

## 4. UI/UX Requirements

## 4.1 Setup UX
- Must provide Config Flow (no YAML required for normal users).
- Setup language must be human-friendly and self-explanatory.
- Avoid technical/internal naming in user-visible forms.

### 4.2 Run UX
- Must provide a **multi-step wizard** for:
  - New run (including inline SeedFinder search and sensor binding)
  - Import run
  - Backdated start
- Must avoid forcing users to manually copy internal IDs.
- Must provide friendly run selection controls via dropdowns.

### 4.3 Binding UX
- Must provide UI flow for sensor/camera binding.
- Must support selecting entities from Home Assistant entity list.
- Must support assigning multiple sensors per type in future iterations.

### 4.4 Cultivar UX
- Must provide UI to:
  - Search cultivar
  - Review result
  - Attach cultivar to active/selected run

### 4.5 Date/Time UX
- Must move away from raw ISO-only text inputs for end users.
- Must provide user-friendly date/time input controls or guided parsing.

---

## 5. Dashboard & Entities Requirements

The system must expose entities sufficient for dashboarding:
- Active run
- Active phase
- Active cultivar name
- Active cultivar breeder
- Active cultivar flower window
- Total runs
- Last event

Target dashboard capabilities:
- Current run overview
- KPI cards (energy, humidity, moisture, temperature, water)
- Phase/status visibility
- Run history/backlog
- Media/timelapse visibility

---

## 6. Data Model Requirements

Each run must support at least:
- Internal ID
- Friendly display identifier
- Name
- Start/end timestamps
- Current phase
- Phase history
- Notes/events
- Metric fields/summaries
- Sensor/camera bindings
- Cultivar reference
- Cultivar snapshot
- Media references

System-level storage must support:
- Multiple runs
- Cultivar cache/library
- Last event log
- Optional snapshot backups

Data compatibility requirement:
- Schema evolution must be backward-compatible with migration/normalization.

---

## 7. Reliability & Resilience Requirements

- External provider failures must not break run tracking.
- Critical functionality must work offline/local after initial setup.
- Fallback strategies required for cultivar lookup and data fetch.
- Errors must be human-readable and actionable.

---

## 8. Integration & Distribution Requirements

- Must be installable via HACS custom integration.
- Must maintain clear install + quickstart docs.
- Branding assets should be prepared for HA brands compatibility.

---

## 9. Quality Process Requirements

Development workflow must include:
- Explicit mid-sprint code reviews
- Refactor at pain points before continuing feature expansion
- Clear, scoped commit messages
- Push-ready validation before merge/push

---

## 10. Future Requirement Tracks

Planned major tracks:
1. Recorder-based run summary engine
2. Optional backup snapshot scheduler
3. Full no-YAML UX for run and binding workflows
4. Multi-sensor-per-type support at scale
5. Rich media workflow + timelapse pipeline
6. Cultivar provider adapter architecture (multiple sources)

---

## 11. Acceptance Criteria (High-Level)

A baseline version is acceptable when a non-technical user can:
1. Install via HACS
2. Create or import runs without YAML
3. Keep more than one run active in parallel
4. Assign cultivar and sensor bindings through UI
5. Track run phases and notes per selected run
6. View run state via dashboard entities
7. Retrieve meaningful run summaries for each run period

A robust version is acceptable when the above still works even if external cultivar sources fail, with local fallback and optional backup retention. User firendlyness is the key to this getting a great project!

Build this in a new branch "antigravity" on https://github.com/NicoM701/PlantRun (another agent did a version but im not happy so just ignore it)

---

## 12. Developer Context & Agent Handoff (V1 MVP Lessons)

### The OptionsFlow 500 Error Pain Point
Home Assistant's `OptionsFlow` is notoriously tricky for multi-step configuration of custom sensors. During the initial MVP build, we hit repetitive `500 Internal Server Errors` because we were attempting to return `self.async_show_form` inside an outer try-except loop where the exception lacked a proper `ValueError` handler, or we failed to pass an empty `data_schema`. **Rule of thumb for future agents**: Always validate inputs manually and construct the schema dictionary dynamically based on `vol.Optional`.

### SeedFinder Integration 
The `seedfinder.eu` API/Search acts via an obscure `AJAX` endpoint (`/ajax/search.php`). We abandoned pure JSON scraping because it often returned a generic 'Skip' string.
- *Solution:* We ported python code to do direct HTML scraping using `beautifulsoup4` targeting the specific structure of their result cards. 
- *Pain point:* `beautifulsoup4` types conflict heavily with Pyre2 strict-typing in HA configurations. Do not use complex inline typing when parsing HTML tags.

### The Problem of "Infinite Memory" vs HA Recorder
The user specifically wants 'infinite memory'. HA's `recorder` usually purges data after 10 days.
- *Architecture Choice:* We implemented `plantrun_store.json` via `Store` as the ultimate, permanent ledger.
- *Proxy Sensors:* To show metrics on the dashboard without losing data if a sensor dies, we created `PlantRunProxySensor` in `sensor.py`. These sensors mirror user-bound entities but group them directly onto the PlantRun Device.
- *Auto-Harvest Lock:* When the `Phase` is set to "Harvest" (or similar), a lock snaps the `end_time` shut so the exact historical timespan is forever frozen in JSON, regardless of HA's Recorder history.
