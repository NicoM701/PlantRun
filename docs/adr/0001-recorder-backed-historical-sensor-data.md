# Use Recorder statistics for permanent sensor history

PlantRun will not store copies of Home Assistant sensor samples. Recent detailed charts query raw Recorder history, while full-run and completed-run charts query Recorder's hourly long-term minimum, average, and maximum statistics. Sensor binding must warn when an entity cannot produce long-term statistics, and PlantRun will not promise permanent history for binary entities such as doors or lamps. This avoids a second time-series store inside PlantRun at the cost of losing raw detail after the user's Recorder retention period.
