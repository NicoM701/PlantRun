# PlantRun Project - Comprehensive Agent Knowledge Base

## 1. Project Overview & Identity
**PlantRun** is a custom Home Assistant (HACS) integration for end-to-end telemetry and lifecycle tracking of plant cultivation (specifically targeting cannabis/home-grow setups).
**Core Value Proposition:** It provides robust parallel run tracking, phase history, and local-first storage, decoupled from the cloud, but with optional internet-enriched features (like pulling Cultivar details from SeedFinder).

## 2. Technical Architecture
**Platform:** Home Assistant Custom Component
**Path:** `custom_components/plantrun/`
**State Management:**
- The integration uses Home Assistant's `UpdateCoordinator` combined with the JSON `Store` helper API.
- All runs, phases, and notes are persisted into a local `plantrun_store` data structure. This ensures aggressive resilience against core HA restarts and avoids the unreliability of native `input_text` or `recorder` long-term limitations.
- It is a **local-polling / local-push** component.

## 3. Core Capabilities & Differences from Original Version
The original concept was severely limited. This rebuilt `antigravity` version solves major architectural flaws:
1. **True Parallel Runs**: The system tracks multiple concurrent active runs by utilizing internally generated UUIDs instead of global singletons.
2. **Phase History Tracking**: Changing a phase (e.g., "Vegetative" to "Flower") doesn't just overwrite a string. It appends a `Phase` object with `start_time` and `end_time`, keeping an immutable historical timeline.
3. **SeedFinder Integration**: Cultivar profiles are fetched via web scraping (using `beautifulsoup4`) from `en.seedfinder.eu` inside `providers_seedfinder.py`. It features a local proxy fallback so runs don't break if SeedFinder goes offline.
4. **Sensor Binding**: Users can attach specific HA entities (e.g., `sensor.tent_temp`, `sensor.soil_moisture`) directly to a run metric, dynamically locking telemetry to the grow context.

## 4. Domain Models (`models.py`)
- **`RunData`**: The aggregate root. Contains UUID, friendly name, start/end timestamps, status (active/ended), and lists of nested objects.
- **`Phase`**: Represents a time block (e.g., Seedling, Veg, Flower, Drying). Has a name, start, and end time.
- **`Note`**: A timestamped journal entry text.
- **`Binding`**: Maps a conceptual metric (e.g., "temperature") to a real HA `sensor_id`.
- **`CultivarSnapshot`**: A denormalized record of the strain's name and breeder fetched from SeedFinder.

## 5. Home Assistant Services (`services.yaml`)
Automations and user interactions flow through these explicit services:
- `plantrun.create_run`: Initializes a new UUID and tracking state.
- `plantrun.end_run`: Flags the run as completed and caps the final phase.
- `plantrun.add_phase`: Rolls over the current active phase into the next one.
- `plantrun.add_note`: Appends a journal entry.
- `plantrun.set_cultivar`: Triggers the SeedFinder search strategy.
- `plantrun.add_binding`: Connects an external sensor to the run context.

## 6. entity Generation (`sensor.py`)
For every active run, PlantRun spins up tracking sensors:
- `sensor.plantrun_status_<uuid>`
- `sensor.plantrun_active_phase_<uuid>`
- `sensor.plantrun_cultivar_<uuid>`
It also creates a global `sensor.plantrun_total_runs` counter.

## 7. Future Roadmap (The Power User Features)
The integration is laying the groundwork for highly advanced automation features currently documented in `task.md`. Any future agent should prioritize implementing these over rebuilding the core:
1. **Dynamic VPD (Vapor Pressure Deficit) Tracking**: Correlating bound temp & humidity sensors against phase targets.
2. **Auto-Adjusting Light Automations**: Linking phase transitions directly to HA Smart Plug automations (e.g., 18/6 to 12/12).
3. **DLI Accumulation**: Integrating PAR sensor data over 24-hour periods.
4. **Nutrient/Watering Log**: Expanding `add_note` into rigid `volume`, `pH`, and `EC` parameters.
5. **Drying/Curing Context**: Establishing specific late-stage phases to monitor humidor moisture.
6. **Automated Timelapse**: Tying bound cameras to a daily snapshot compiler.

## 8. HACS & Dependencies
- Contains `hacs.json` for repository parsing.
- Manifest explicitly requires `beautifulsoup4>=4.12.0` for web scraping parsing.

## 9. Next Steps for New Agents
When loaded into a new conversation block:
1. Acknowledge this context document.
2. Check `task.md` and `implementation_plan.md` for current sprint goals.
3. Review `custom_components/plantrun/__init__.py` for service logic handling.
4. Do not recreate the wheel on storage. Use the `PlantRunStorage` class.
