# PlantRun Release Checklist

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
