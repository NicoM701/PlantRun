# QA Wave Closure Report (Issues #66-#79)

Date: 2026-03-11  
Scope: Post-merge verification after PRs #80-#87

## Resolution matrix

| Issue | Title (short) | Status | Primary evidence |
|---|---|---|---|
| #66 | Run creation UX clutter | **Resolved** | PR #83 copy/onboarding simplification in panel + first-run flow hardening |
| #67 | Run creation mapping not bound | **Resolved** | PR #83 run-id binding normalization + lifecycle regression tests |
| #68 | SeedFinder autocomplete selection | **Resolved** | PR #82 selectable autocomplete + keyboard/click contracts + tests |
| #69 | Expansion leaks across cards | **Resolved** | PR #81 state isolation, followed by PR #84 missing handler hotfix |
| #70 | Run energy should be windowed | **Resolved** | PR #80 run-window summary math + tests |
| #71 | Humidity vs soil icon distinction | **Resolved** | PR #81/#86 distinct icon/class mapping in dashboard + card |
| #72 | Default Lovelace placeholder run_id fails | **Resolved** | PR #83 dashboard sample cleanup + PR #86 placeholder-safe onboarding fallback |
| #73 | Day-progress duplicate info | **Resolved** | PR #81/#86 removed duplicate copy and clarified progress context |
| #74 | Short tap history / long-press detail | **Resolved (contract-tested)** | PR #81 implementation, PR #84 handler restore, PR #87 contract tests |
| #75 | SeedFinder image picks generic logo | **Resolved** | PR #82 ranked artwork selection heuristics + provider tests |
| #76 | Energy price not clearly used for run cost | **Resolved** | PR #80 cost sensor + PR #85 UI clarity + entity attributes |
| #77 | Expanded card duplicates sensor info | **Resolved** | PR #85 expanded-view cleanup |
| #78 | Dashboard UX alignment (progress/phase/range bars) | **Partially resolved** | PR #81/#85 shipped substantial polish; reference-style parity remains subjective |
| #79 | Estimated run duration explicit in both flows | **Resolved (contract-tested)** | PR #83 implementation + PR #87 tests (panel + options flow) |

## Validation snapshot

- Local test run on latest `main`: `58 passed, 15 subtests passed` (`pytest -q`).
- PR #87 adds explicit contracts for #74 and #79 to prevent regressions.

## Known follow-ups / residual risk

1. **#78 visual parity is subjective**: functional UX requirements are met, but exact aesthetic match to a design reference may still need product-signoff screenshots across themes.
2. **Gesture behavior (#74) is contract-level tested**: source-contract tests are strong, but real-device long-press feel (touch vs desktop) should be periodically spot-validated.
3. **Run-summary WS load**: per-run summary refresh can scale linearly with many runs; monitor if installations have high run counts.

## Recommended closeout process

- Close issues: #66, #67, #68, #69, #70, #71, #72, #73, #74, #75, #76, #77, #79.
- Keep #78 open for one final UX signoff pass (or close as delivered if product owner accepts current alignment).
