# Release Notes

## Unreleased

### Multi-active run resolution
- Added `active_run_strategy` for services that support `use_active_run`.
- Supported strategies:
  - `legacy` (default): preserve previous compatibility fallback (`active_run_id` when valid, otherwise first active).
  - `active_run_id`: require a valid `active_run_id` when multiple runs are active.
  - `first_active`: always choose the first active run deterministically.
- `strict_active_resolution: true` still takes precedence and requires explicit `run_id` or `run_name` when multiple runs are active.

### Automation guidance
- For reliable automations and scripts, pass explicit `run_id` (preferred) or `run_name`.
- Active-run fallback is primarily for backward compatibility and ad-hoc/manual service calls.
