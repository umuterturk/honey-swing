# Snap Wasp Heart Feedback Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Linked Snap feedback — needle into hit-side wasp, wasp heartbeat, optional HUD heart flyer — on top of existing pot break/scatter.

**Architecture:** Extend `cardMotionMarks` snap schedule; teach `animateCardAction` snap branch to GSAP the marker into the measured wasp, pulse the wasp, and optionally fly a heart clone; split chance HUD update so it lands when the flyer spawns.

**Tech Stack:** GSAP timelines, React HUD in `SimplifiedGame.jsx`, `minimal.css`

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-07-snap-wasp-heart-feedback-design.md`
- Transform/opacity (+ marker left); ≤1 temp heart; cancel cleanup
- Heart flyer only when `showChances`
- Non-snap card timings unchanged

---

### Task 1: Snap schedule marks + test

**Files:** `src/casual/motionSchedule.js`, `tests/motion-order.test.mjs`

- [x] Extend snap return: `waspHit/snapAt:0.28`, `heartFly:0.32`, `heartHit:0.66`, `needleHome:0.72`, `end:1.10`, `meterEnd:0.28`, keep `copyStart:0.14`
- [x] Test asserts order: `copyStart ≤ snapAt ≤ heartFly ≤ heartHit ≤ needleHome ≤ end`

### Task 2: Snap needle + wasp + heart motion

**Files:** `src/casual/minimalMotion.js`, `src/casual/minimal.css`

- [x] Snap branch: GSAP marker to measured wasp `%`; numeral `|view.to|` during flight; home to `0%` band at `needleHome`
- [x] Pulse hit-side `.sgv-meter-wasp-*` at `snapAt`
- [x] `animateSnapHeartLoss`: clone last filled `.sgv-heart`, fly to wasp, fade; call `onChanceLost` on spawn
- [x] CSS: `.sgv-heart-flyer` (absolute, pointer-events none)

### Task 3: Wire game + verify

**Files:** `src/casual/SimplifiedGame.jsx`

- [x] Pass `showChances: level.showChances` into card motion view
- [x] `onSnap`: pot break + scatter only; `onChanceLost`: `setView` snaps
- [x] Reduced path still empties chance via existing `onSnap`/`onChanceLost` sync
- [x] Run `tests/motion-order.test.mjs` (+ related motion/UI smoke if quick)
