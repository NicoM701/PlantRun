# Performance Notes (Maintainer Lightweight Guide)

Purpose: quick guidance for scaling confidence around run-summary behavior.

## 1) Scaling Considerations (Run Summary)

### Data growth vectors
- Number of total runs (active + ended)
- Notes count per run
- Frequency of summary recalculation triggers
- Retained historical windows in local store

### Practical risk points
- Large run history can increase load/serialize time of store-backed state
- Summary recomputation can feel slow if triggered too often in bursty updates
- UI rendering cost grows with long lists (ended runs + dense notes)

## 2) Quick Local Performance Checkpoints

Use this as a pre-merge smell test (not a benchmark suite):

- [ ] Startup: integration initializes without noticeable stall
- [ ] Dashboard open: first render feels responsive (<~2s on dev machine)
- [ ] Run switch: changing selected run updates without visible lag spikes
- [ ] Summary update: energy/cost summary refreshes correctly after relevant changes
- [ ] No repeated log spam from summary/store paths under normal interaction

Pass/Fail:
- [ ] **PASS** — no obvious regressions in local checks
- [ ] **FAIL** — capture steps + logs before merge

## 3) Observability Checkpoints

Before release, verify logs provide enough signal to debug perf regressions:

- [ ] Integration startup logs include version/context needed for triage
- [ ] Summary/update paths emit actionable warnings/errors (not generic failures)
- [ ] Noisy debug loops are absent at default log level
- [ ] Failures can be correlated to a run/action (run id/name visible where possible)

## 4) If Performance Regresses

Capture minimum triage bundle:
1. HA version + PlantRun commit/tag
2. Approx dataset size (runs, notes)
3. Repro path (exact click/action sequence)
4. Relevant log lines (startup + summary/store)
5. Screen recording if UI lag is user-visible

This keeps follow-up issues reproducible and merge-safe.
