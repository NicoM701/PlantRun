# PlantRun UI Architecture Options (Runs + Charts)

## Goal
Define a UI path that provides beautiful run views (timeline, KPIs, charts) while preserving Home Assistant native UX and low operational risk.

## Option 1: Lovelace custom card (TypeScript)
- Pros: Native HA dashboard usage, easy per-view placement, HACS-friendly, fast iteration, minimal backend coupling.
- Cons: No full-page navigation shell by default; advanced workflows can become cramped.
- Fit for PlantRun now: Best fit for near-term run overview, chart blocks, run selection, and metric cards.

## Option 2: HA custom panel (TypeScript)
- Pros: Full-screen app-like UX, ideal for rich workflows/history/media management.
- Cons: Higher integration complexity (routing, state wiring, lifecycle), larger maintenance surface.
- Fit for PlantRun now: Good future phase after card stabilizes and data model/services settle.

## Option 3: External app (separate frontend)
- Pros: Maximum UI freedom and performance tuning.
- Cons: Highest complexity, auth/session integration overhead, less HA-native user journey.
- Fit for PlantRun now: Not recommended for MVP stabilization phase.

## Recommendation
Use **Option 1 (Lovelace custom card)** as the first UI layer. It delivers HA-native value quickly, supports chart/data views, and avoids destabilizing the integration during backend refactor.

## Execution Plan
1. Build a typed custom card shell with run list + selected run details.
2. Add chart abstraction layer for run metrics (line/area charts, phase markers).
3. Bind data source to PlantRun entities/services (or future websocket endpoint).
4. After card maturity, evaluate a custom panel for full run history/media workflows.
