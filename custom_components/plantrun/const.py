"""Constants for PlantRun."""

DOMAIN = "plantrun"
PLATFORMS = ["sensor"]
DATA_STORAGE = "storage"
DATA_MANAGER = "manager"
STORAGE_KEY = DOMAIN
STORAGE_VERSION = 1

SERVICE_START_RUN = "start_run"
SERVICE_IMPORT_RUN = "import_run"
SERVICE_END_RUN = "end_run"
SERVICE_SET_PHASE = "set_phase"
SERVICE_ADD_NOTE = "add_note"
SERVICE_SEARCH_CULTIVAR = "search_cultivar"
SERVICE_ATTACH_CULTIVAR_TO_RUN = "attach_cultivar_to_run"
SERVICE_REFRESH_CULTIVAR = "refresh_cultivar"
SERVICE_BIND_SENSOR_TO_RUN = "bind_sensor_to_run"
SERVICE_UNBIND_SENSOR_FROM_RUN = "unbind_sensor_from_run"
SERVICE_LIST_RUNS = "list_runs"

SIGNAL_DATA_UPDATED = f"{DOMAIN}_data_updated"

PHASE_GROWTH = "growth"
PHASE_FLOWER = "flower"
PHASE_HARVEST_READY = "harvest_ready"
PHASES = [PHASE_GROWTH, PHASE_FLOWER, PHASE_HARVEST_READY]

ATTR_RUN_ID = "run_id"
ATTR_RUN_NAME = "run_name"
ATTR_PHASE = "phase"
ATTR_NOTE = "note"
ATTR_SPECIES = "species"
ATTR_BREEDER = "breeder"
ATTR_CULTIVAR_ID = "cultivar_id"
ATTR_BINDING_KEY = "binding_key"
ATTR_ENTITY_ID = "entity_id"
ATTR_PREFER_AUTOMATIC = "prefer_automatic"
ATTR_STARTED_AT = "started_at"
ATTR_ENDED_AT = "ended_at"
ATTR_USE_ACTIVE_RUN = "use_active_run"

BINDABLE_SENSOR_KEYS = [
    "temperature",
    "air_humidity",
    "soil_moisture",
    "energy",
    "camera",
    "water",
]

DEFAULT_DATA = {
    "active_run_id": None,  # legacy single-run field (migrated → active_run_ids)
    "active_run_ids": [],    # list of currently active run ids
    "last_event": None,
    "runs": {},
    "cultivars": {},
}
