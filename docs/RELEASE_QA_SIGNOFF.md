# Release QA Sign-off (Real Device)

Purpose: final go/no-go before tagging a release.

Scope focus:
- #78 visual parity on real devices
- #74 press behavior reliability

## 0) Test Matrix (minimum)

Run this checklist on at least:
- [ ] 1x Desktop browser (latest Chrome or Firefox)
- [ ] 1x Mobile device (Android or iOS companion/web)
- [ ] Home Assistant in light + dark theme

Record environment:
- HA version: __________
- PlantRun commit/tag: __________
- Devices tested: __________
- Tester: __________
- Date: __________

---

## 1) Preflight (must pass)

- [ ] Integration loads cleanly after restart (no startup errors)
- [ ] PlantRun sidebar dashboard opens (`/plantrun-dashboard`)
- [ ] At least one active run and one ended run available for checks

If any item fails: **STOP — FAIL**.

---

## 2) #78 Visual Parity Checks

Pass if desktop and mobile show equivalent information hierarchy and controls.

### Layout + information parity
- [ ] Run card title/status/phase are visible and readable on desktop + mobile
- [ ] Sensor chips/summary values show same labels and units on both
- [ ] Notes preview/count are present and consistent on both
- [ ] Images render with correct aspect and no overflow/cropping regressions

### Theme parity
- [ ] Light theme: text contrast is readable, no hidden controls
- [ ] Dark theme: text contrast is readable, no hidden controls

### Pass/Fail
- [ ] **PASS #78** (no parity regressions)
- [ ] **FAIL #78** (capture screenshot + route + device + expected/actual)

---

## 3) #74 Press Behavior Checks

Pass if every actionable control triggers once and only once, with expected result.

### Core actions
- [ ] Run selection press updates active context correctly
- [ ] Add note opens once and submits once
- [ ] Edit note opens correct note and saves once
- [ ] Delete note requires explicit confirmation and removes target note only
- [ ] Phase/action buttons fire once (no duplicate calls/double-submit)

### Robustness
- [ ] Fast repeated tapping does not create duplicate operations
- [ ] No stuck loading states after action completion
- [ ] Any error state is user-readable and recoverable

### Pass/Fail
- [ ] **PASS #74** (press behavior stable)
- [ ] **FAIL #74** (capture action + timing + logs + expected/actual)

---

## 4) Final Sign-off

Release decision:
- [ ] **GO**
- [ ] **NO-GO**

Blocking defects (if NO-GO):
1. __________________________
2. __________________________

Evidence attached:
- [ ] Screenshots (desktop + mobile)
- [ ] Short action log / reproduction notes
- [ ] Related issue links
