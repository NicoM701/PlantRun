# PlantRun Release Checklist

## 0) Version bump

`custom_components/plantrun/manifest.json` is the single source of truth. Every release must update **all** of these to the same version before tagging:

- [ ] `custom_components/plantrun/manifest.json` → `"version"`
- [ ] `custom_components/plantrun/www/plantrun-panel.js` → every `?v=` import query
- [ ] `custom_components/plantrun/www/plantrun-panel-views.js` → `?v=` import query
- [ ] `custom_components/plantrun/www/plantrun-panel-dialogs.js` → `?v=` import query
- [ ] `CHANGELOG.md` → new `## X.Y.Z` section at the top
- [ ] `README.md` → opening “Version X.Y.Z …” sentence
- [ ] `docs/ROADMAP.md` → “Current truth” GitHub/HACS tag and live Home Assistant version lines
- [ ] `tests/frontend_harness.html` → mock `version` field
- [ ] GitHub release tag `vX.Y.Z` points at the commit that contains the bump

Automated gate:

```bash
python -m unittest tests.test_release_version -q
```

HACS uses the Git tag name; Home Assistant and the PlantRun UI read `manifest.json`. A tag without a manifest bump produces the mismatch where HACS shows the new tag but the logo peek still shows the old version.

## 1) Automated QA Gate
- [ ] CI green on PR (`PlantRun QA Gate`)
- [ ] Migration tests pass (`test_store_migration.py`)
- [ ] Run-resolution tests pass (`test_run_resolution.py`)
- [ ] Dynamic entity tests pass (`test_sensor_bindings.py`)
- [ ] Summary/retention tests pass (`test_summary.py`, `test_retention.py`)

## 2) Manual Verification
### Fresh install
- [ ] Add integration via UI
- [ ] Create first run via options flow
- [ ] Add phase, note, and binding

### Upgrade path (v1 -> v2 schema)
- [ ] Start with legacy store (no `schema_version`)
- [ ] Restart HA and verify migration is automatic
- [ ] Confirm no run/phase/note/binding data loss
- [ ] Confirm entities still resolve with stable IDs

### Multi-run & dashboard
- [ ] Run 2+ active runs in parallel
- [ ] Verify deterministic run targeting + clear error text when ambiguous
- [ ] Verify sidebar dashboard can handle active + ended runs

## 3) Upgrade Notes Template
Copy into release notes:

```
### Upgrade impact
- Schema: <none | v1->v2 automatic migration>
- Entity IDs: <stable | notes>
- Breaking changes: <none or explicit list>
- Operator action required: <none or explicit steps>
```
