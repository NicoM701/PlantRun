"""Constants for the PlantRun integration."""

DOMAIN = "plantrun"
PLATFORMS = ["sensor"]

# Store constants
STORE_KEY = "plantrun_store"
STORE_VERSION = 2
STORE_SCHEMA_VERSION = 2

# Service attribute keys
ATTR_RUN_ID = "run_id"
ATTR_RUN_NAME = "run_name"
ATTR_USE_ACTIVE_RUN = "use_active_run"
ATTR_STRICT_ACTIVE_RESOLUTION = "strict_active_resolution"
ATTR_ACTIVE_RUN_STRATEGY = "active_run_strategy"

ACTIVE_RUN_STRATEGY_LEGACY = "legacy"
ACTIVE_RUN_STRATEGY_ACTIVE_RUN_ID = "active_run_id"
ACTIVE_RUN_STRATEGY_FIRST_ACTIVE = "first_active"
ACTIVE_RUN_STRATEGIES = [
    ACTIVE_RUN_STRATEGY_LEGACY,
    ACTIVE_RUN_STRATEGY_ACTIVE_RUN_ID,
    ACTIVE_RUN_STRATEGY_FIRST_ACTIVE,
]
