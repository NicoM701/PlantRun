# PlantRun Runs Card (Starter)

TypeScript starter scaffold for a Home Assistant Lovelace custom card.

## Dev

```bash
cd ui/plantrun-runs-card
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output bundle: `dist/plantrun-runs-card.js`

## Home Assistant setup (manual)

1. Copy `dist/plantrun-runs-card.js` to `<config>/www/plantrun/`.
2. In Dashboard resources, add `/local/plantrun/plantrun-runs-card.js` as `JavaScript Module`.
3. Add card YAML:

```yaml
type: custom:plantrun-runs-card
title: PlantRun Runs
maxRows: 8
```

## Scope

This scaffold intentionally stays lightweight and separate from backend integration logic.
Next step: wire chart components and richer run detail panes.
