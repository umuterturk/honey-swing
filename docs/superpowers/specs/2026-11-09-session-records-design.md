# Session Records

**Date:** 9 November 2026
**Status:** Approved
**Scope:** Extract play-commit persistence and event facts from `SimplifiedGame.jsx`. React state, motion, and screen events stay in the component.

## Goal

Give the next feature one tested place that answers “what did this move persist, and what should we report?” Payouts, onboarding rules, and the visible flow stay the same.

## Module

`src/casual/sessionRecords.js` imports `ONBOARDING_SESSION_KEY` and `ONBOARDING_PROGRESS_KEY` from `onboardingProgress.js`. It does not import React, motion, or the engine.

Victory stays `onboardingVictory(next)` in the component. The module receives that boolean as `won`.

Storage is any object with `getItem(key)` and `setItem(key, value)`. A missing storage or a throw is a failed read or write, never an exception to the caller.

| Function | Contract |
|---|---|
| `loadSavedRound(storage, levelCount)` | Saved round, or `null` |
| `saveRound(storage, round)` | `true` when the session key is written, otherwise `false` |
| `commitPlay(storage, facts)` | `{saved, unlockedLevel, events}` |

`facts` is `{next, turnBefore, action, change, levelId, levelCount, won}`.

`loadSavedRound` accepts a value only when all of these hold:

- `levelId` is an integer from 1 through `levelCount`
- `turn`, `snaps`, `flipCount`, and `zeroBreakCount` are integers
- `game.game === 'overswing'` and `game.deal` is present

Anything else, including broken JSON, returns `null`. The component then opens `newOnboardingRound(readUnlockedOnboardingLevel(...))`.

`commitPlay` writes `facts.next` to the session key. When `won` is true it writes `String(min(levelCount, levelId + 1))` to the progress key and returns that number as `unlockedLevel`. Otherwise it leaves the progress key alone and `unlockedLevel` is `null`.

## Events

`events` is a list of plain objects. Each object has a `name` and the detail fields. The component dispatches them with the existing `swing-casual-event` helper after `commitPlay` returns. Order:

1. Action event. `steer` is named `card_play`. Other action types keep their `type`. Detail: `level`, `turn` (from `next.turn`), `card` (`change.signedCard`), `snap`, `zeroBreak`, `bankGain`.
2. `first_action` with `{level}` when `turnBefore === 0`.
3. `snap` with `{level}` when `change.snap` is true.
4. `zero_break` with `{level}` when `change.zeroBreak` is true.
5. One `factor_changed` per `change.rewards` entry, detail `{level, kind, value}`, in reward order.
6. When `won`: `level_complete` with `{level, actions: next.turn}`, then `onboarding_complete` with no extra fields when `levelId === levelCount`.

The session write and the unlock write both finish before the function returns, so they are stored before those events are dispatched.

These events stay in `SimplifiedGame`: `level_start`, `hint_shown`, `feature_intro_shown`, `feature_intro_dismiss`, `tutorial_skip`, `onboarding_reset`, `debug_goto_level`. Skip, reset, and debug jump keep their current storage writes.

## Call sites

- Open: `loadSavedRound(browserStorage(), ONBOARDING_COUNT)`.
- `startLevel`: `saveRound(browserStorage(), next)`.
- `play` `onCommit`: `commitPlay`, then dispatch each returned event.

## Errors

A storage throw on read returns `null`. A storage throw on write returns `false` from `saveRound`, and `commitPlay` still returns the event list. A failed unlock write sets `unlockedLevel` to `null` while `won` events are still present.

## Tests

`tests/session-records.test.mjs` uses an in-memory storage object. It covers a valid resume, each rejection reason, a swallowed write failure, an ordinary play, a first-action play, snap and zero-break with factor rewards, a mid-ladder win unlock, a last-level win, and a win whose progress write throws. No DOM and no React.
