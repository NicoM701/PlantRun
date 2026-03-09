# PlantRun Bug Intake (2026-03-09)

Status: collecting (do not fix yet)

## Format
- ID
- Time
- Area
- Steps
- Expected
- Actual
- Evidence (screenshot/log)
- Severity

## Bugs

### BUG-001
- Time: 2026-03-09
- Area: Integration setup / static path registration
- Steps: Add/configure PlantRun on current HA core
- Expected: Entry setup succeeds
- Actual: `AttributeError: 'HomeAssistantHTTP' object has no attribute 'register_static_path'`
- Evidence: user screenshot/log (msg 1827)
- Severity: Critical
- Notes: already hotfixed in PR #22 (merged)

### BUG-002
- Time: 2026-03-09
- Area: Options Flow / "Configure Run Details" save step
- Steps: Start new grow run, assign multiple sensors, click save/submit
- Expected: Run is created and bindings persisted
- Actual: Generic UI error: `Unknown error occurred`
- Evidence: user screenshot (msg 1832) + traceback (msg 1834)
- Severity: High
- Root cause (from traceback): `KeyError` in `config_flow._storage` because `self.hass.data[DOMAIN][self.plantrun_config_entry.entry_id]` missing during options flow step.
- Stack clue: `/config/custom_components/plantrun/config_flow.py` line 158 (`await self._storage.async_add_run(new_run)`) -> line 67 (`_storage` property)
- Notes: reproducible; likely race/lifecycle mismatch when options flow accesses runtime storage via entry_id lookup.

### BUG-003
- Time: 2026-03-09
- Area: Sidebar panel visibility / integration startup UX
- Steps: Open PlantRun integration page after setup errors
- Expected: PlantRun sidebar panel visible when integration is loaded and usable
- Actual: Sidebar entry not visible; integration card shows setup warning and no entries
- Evidence: user screenshot (msg 1836)
- Severity: High (blocks practical feature testing)
- Notes: likely secondary effect of setup failure and/or panel registration lifecycle conditions.

### BUG-004
- Time: 2026-03-09
- Area: Sensor proxy state updates / thread safety
- Steps: Run integration on newer HA core, wait for source sensor state updates
- Expected: Proxy sensor updates without thread-safety violations
- Actual: Repeated runtime errors: `Detected that custom integration 'plantrun' calls async_write_ha_state from a thread other than the event loop` at `sensor.py:252`
- Evidence: user log upload (msg 1849)
- Severity: High (runtime spam + potential instability)
- Root cause: state-change callback path can execute off event loop context while calling `async_write_ha_state()` directly.
- Fix status: ready for review in hotfix PR (callback path switched to `schedule_update_ha_state()` for thread-safe scheduling).
