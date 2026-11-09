# Session Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move play-commit save, win unlock, and event facts into a pure module without changing payouts or motion.

**Architecture:** `sessionRecords.js` reads and writes the existing onboarding keys and returns the event list. `SimplifiedGame` calls it at open, level start, and play commit, then dispatches the returned events.

**Tech Stack:** JavaScript ESM, Node test runner, React component left in place.

## Global Constraints

- Victory is `onboardingVictory(next)` in the component, passed in as `won`.
- Storage throws never escape the module.
- Unlock is written before `commitPlay` returns.
- `steer` is reported as `card_play`.
- Screen events, skip, reset, and debug jump stay in `SimplifiedGame`.
- No gameplay, motion, or copy changes.

---

### Task 1: Records module

**Files:**
- Create: `src/casual/sessionRecords.js`
- Test: `tests/session-records.test.mjs`

- [x] Write failing tests for load, save, and commitPlay
- [x] Run `node --test tests/session-records.test.mjs` and confirm failure
- [x] Implement the module to the spec
- [x] Re-run that file and confirm pass

### Task 2: Wire the component

**Files:**
- Modify: `src/casual/SimplifiedGame.jsx`

- [x] Replace `initialRound`, `save`, and the play `onCommit` persistence and event block with the module
- [x] Run `npm test`

### Task 3: Self-review

- [x] Confirm screen events and skip/reset/debug writes are still in the component
- [x] Confirm `sessionRecords.js` does not import React, motion, or the engine
