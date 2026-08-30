# PlantRun agent guide

- Read `PROJECT_CONTEXT.md` before planning or changing product behavior, UI, or the stored data model.
- Read `CONTEXT.md` when work touches PlantRun terminology or domain boundaries.
- Read `docs/PRODUCT_DISCOVERY.md` when work touches cultivation workflows, the accepted prototype direction, or V1 scope.
- Treat `custom_components/plantrun/www/prototype/` as disposable review material. Production code lives outside that folder.
- Keep repository checks, installation in Home Assistant, and real HACS use as separate validation states.
- Preserve unrelated working-tree changes.
- On every release, bump the version everywhere listed in `docs/RELEASE_CHECKLIST.md` section **0) Version bump**. Run `python -m unittest tests.test_release_version -q` before tagging. The Git tag, `manifest.json`, panel cache keys, docs, and harness must all match.
