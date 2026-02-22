"""Constants for PlantRun."""

DOMAIN = "plantrun"
STORAGE_KEY = DOMAIN
STORAGE_VERSION = 1

SERVICE_START_RUN = "start_run"
SERVICE_END_RUN = "end_run"
SERVICE_SET_PHASE = "set_phase"
SERVICE_ADD_NOTE = "add_note"

PHASE_GROWTH = "growth"
PHASE_FLOWER = "flower"
PHASE_HARVEST_READY = "harvest_ready"
PHASES = [PHASE_GROWTH, PHASE_FLOWER, PHASE_HARVEST_READY]

ATTR_RUN_ID = "run_id"
ATTR_RUN_NAME = "run_name"
ATTR_PHASE = "phase"
ATTR_NOTE = "note"

DEFAULT_DATA = {
    "active_run_id": None,
    "runs": {},
}
