# PlantRun 🌱
[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)

A Home Assistant custom integration designed to relentlessly track and document complete plant cultivation runs, built with "infinite memory" in mind.

PlantRun turns Home Assistant into a dedicated grow diary. It groups your chosen environmental sensors, automatically fetches genetic data from Seedfinder.eu, and creates a unified Device for every plant run that permanently archives data – ensuring you never lose a harvest log just because a sensor went offline.

## ✨ Features
- **Guided Setup Wizard:** A multi-step UI Configuration Flow to easily create runs, search genetics, and bind sensors.
- **SeedFinder Integration:** Automatically scrapes and links detailed cultivar/genetic data directly from [Seedfinder.eu](https://en.seedfinder.eu/).
- **Intelligent Proxy Sensors:** Bind your existing Home Assistant sensors (Temperature, Soil Moisture, Light, Energy, etc.). PlantRun spawns dedicated "Proxy Sensors" attached directly to your Run's HA Device, allowing you to view all relevant stats on a single dashboard page.
- **Phase & Date Tracking:** Track the exact Planting Date, and log Phase changes (Seedling, Vegetative, Flowering). 
- **Auto-Harvest Timespan Locks:** Set a run's phase to `Harvest` to automatically lock the end date.
- **Permanent Archiving:** Your run data, notes, and exact phases are saved permanently in a local `plantrun_store.json` – surviving standard HA Recorder db purges.

## 📦 Installation via HACS

1. Go to **HACS** -> **Integrations**.
2. Click the three dots in the top right corner and select **Custom repositories**.
3. Add the URL of this repository and select category **Integration**.
4. Click **Add** and then **Download** the integration.
5. **Restart Home Assistant**.

## 🚀 Usage

1. Go to **Settings** -> **Devices & Services** -> **Add Integration**.
2. Search for **PlantRun**.
3. Use the guided UI Wizard to click **Start New Run**.
4. Follow the new 3-step setup flow: **Basics**, **Cultivar lookup**, and **Planning defaults**.
5. Use the clearer labels for cultivar, grow space, root medium, and target days. Default values now start from low-friction planning choices (`Main grow space`, `Soil`, `84` days).
6. Optional SeedFinder enrichment still works, and the underlying create/update payloads remain unchanged for compatibility.
7. Go to your **Devices** page and search for the newly created Run name to view your proxy sensors and run status!

## 📚 Sidebar Dashboard UI

PlantRun now exposes a dedicated sidebar panel at **PlantRun** (`/plantrun-dashboard`) with an app-like dashboard UI.

What it supports:
- Empty-state first-run initialization with planted-date defaulting and optional SeedFinder target-day suggestions
- Lower-cognitive-load setup defaults for grow space, medium, and target days
- Dynamic runtime cards for all runs with graceful missing-sensor handling
- Click sensor values to open Home Assistant more-info/details for the source entity
- Phase timeline dots with double-confirm before phase change service calls
- Full notes CRUD (add/edit/delete), with double-confirm on destructive deletes
- Run image management:
  - Upload from local file system (saved to `/config/www/plantrun_uploads`)
  - Use SeedFinder cultivar image when available
  - Clear source labeling (`uploaded`, `seedfinder`, fallback placeholder)

### Service hooks used by the sidebar

Existing:
- `plantrun.create_run`
- `plantrun.add_phase`
- `plantrun.add_note`
- `plantrun.end_run`
- `plantrun.set_cultivar`

Added for dashboard CRUD:
- `plantrun.update_note`
- `plantrun.delete_note`
- `plantrun.update_run`
- `plantrun.set_run_image`

## ⚙️ Managing Runs

You can manage active runs (change phases, add log notes, or end runs) by returning to the PlantRun Integration panel:
1. Click **Configure** on the PlantRun integration card.
2. Select **Manage Existing Run**.
3. Choose the run, select an action (e.g. Change Phase, Add Note), and submit.
