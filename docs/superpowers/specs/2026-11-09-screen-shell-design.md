# Screen Shell

**Date:** 9 November 2026
**Status:** Approved
**Scope:** Split `SimplifiedGame.jsx` into a session snapshot, an input policy, a presentational phone, and DOM effect hooks. Player-visible behavior stays the same.

## Goal

A new screen feature adds a command, an input result, or a hook. It does not add another branch to the phone markup, the three capture handlers, and the effect list in the same function.

Payouts, onboarding rules, motion timing, copy, class names, storage keys, and event names stay as they are. `playMotion.js` keeps its setter arguments. `runPresentedAction` still commits before motion.

## Out of scope

- Rewriting `winMotion.js`, `chrome.css`, or `src/external/engines.js`.
- Changing `startPlayMotion`'s parameter list.
- Deleting `CasualGame.jsx`, `firstLevel.js`, `animations.js`, or the legacy stylesheets.
- Moving `seenFactors` into the snapshot. `startPlayMotion` still mutates that `Set`.

## Platform

`src/casual/platform.js` is the only new module that reads `window`.

| Function | Contract |
|---|---|
| `browserStorage()` | `window.localStorage`, or `null` when it throws or `window` is missing |
| `prefersReducedMotion()` | `true` when `matchMedia('(prefers-reduced-motion: reduce)')` matches, otherwise `false` |
| `dispatchCasualEvent(name, details)` | Dispatches `swing-casual-event` with `{name, ...details}`. No-op when `window` is missing |

`screenState.js` and `boardInput.js` do not import this module.

## Snapshot

`src/casual/screenState.js` holds the screen data and the commands that change it. It imports the existing level, intro, presentation, and sequence helpers. It does not import React, GSAP, or `platform.js`.

One snapshot replaces the separate `useState` fields:

| Field | Role |
|---|---|
| `round` | Onboarding round |
| `view` | `displayOf(round)`, later patched during motion |
| `shownGold` | Secured total shown in the HUD |
| `animating` | Presentation lock for the view |
| `feedback` | Board feedback token, or `null` |
| `pulse` | Idle hint is showing |
| `beat` | Meter status line |
| `help` | Glossary is open |
| `docking` | Level-start dock is showing |
| `startOpen` | Level-start screen is up |
| `ack` | `{kind, text}` or `null` |
| `successSettled` | Win celebration has reached its end state |
| `arriving` | Level-arrival motion is running |
| `devMenuOpen` | Dev menu is open |
| `introGate` | Feature-intro gate is up |
| `introCard` | Current intro card, or `null` |
| `factorInfo` | Open factor kind, or `null` |
| `advanced` | This victory already claimed its level advance |

`bankLive` stays inside the bank-announcement effect. It is a live-region side effect of the current bank message, not a command result.

`initialScreen({storage, levelCount, reduced})` loads `loadSavedRound(storage, levelCount)`. When that is `null`, the round is `newOnboardingRound(readUnlockedOnboardingLevel(storage, levelCount))`. The snapshot then uses the same flag rules as `levelScreen` below, with `shownGold` taken from `round.game.deal.T`.

`levelScreen(id, {storage, reduced})` builds the snapshot for entering that level:

- `round` is `newOnboardingRound(id)`.
- `view` is `displayOf(round)`. `shownGold` is `0`.
- `animating`, `feedback`, `pulse`, `beat`, `help`, `ack`, `successSettled`, `devMenuOpen`, and `factorInfo` are cleared (`false`, `''`, or `null`).
- `advanced` is `false`.
- Opening comes from `featureIntroForEntry({round, storage, reduced})`. `introGate` and `introCard` copy `opening.gate` and `opening.intro`.
- `startOpen` is true only when the round is fresh and `opening.gate` is false. A restored mid-level round leaves the start screen closed.
- `docking` is `Boolean(onboardingLevel(id).dock)`.
- `arriving` is `false` when `opening.gate` is true. Otherwise it is `levelStartPlan(id, {fresh, reduced}).motion`, where `fresh` is `isFreshRound(round)`.

The function does not write storage and does not cancel motion. The shell saves `screen.round` with `saveRound` after it cancels in-flight motion.

`nextLevelId(levelId, levelCount)` returns `levelCount` when `levelId >= levelCount`, otherwise `levelId + 1`.

`dismissedIntro(screen, outcome)` returns `screen` when `outcome.dismissed` is false. Otherwise it sets `introGate` and `introCard` from the outcome. When `outcome.handoff === 'level-start'` it sets `startOpen` to `true`. Any other handoff leaves `startOpen` as it was.

`ackAfterCommit(screen, {outcome, first, text})` sets `ack` to `{kind: first.kind, text}` when `first` is present. When `first` is absent and `outcome` is present, it sets `ack` to `null`. When both are absent, it returns `screen`.

`settledScreen(screen, settled)` copies `settled.round`, `settled.view`, `settled.shownGold`, `settled.feedback`, and `settled.animating`. Other fields stay.

`closedStart(screen)` sets `startOpen` to `false`. It leaves `docking` alone.

`clearedDock(screen)`, `toggledHelp(screen)`, `toggledDevMenu(screen)`, `closedDevMenu(screen)`, `openedFactor(screen, kind)`, `closedFactor(screen)`, `shownPulse(screen)`, `dockExpired(screen)`, `arrivalSettled(screen)`, and `successMarked(screen)` each change that one field.

`clearedAck(screen, token)` sets `ack` to `null` only when `screen.ack === token`. A newer ack stays.

`endTransition(screen, decision, levelCount)` returns `{screen, enterLevel}`:

- Missing `decision`, or `decision.lock`, returns the same screen and `enterLevel: null`.
- `decision.settle` marks success settled.
- `decision.advance` marks success settled and sets `advanced` to `true`. `enterLevel` is `nextLevelId(screen.round.levelId, levelCount)` only when `screen.advanced` was already `false`. A second claim keeps `enterLevel` null.
- `decision.replay` sets `enterLevel` to `screen.round.levelId`.
- Settle is applied before advance, and advance before replay. A replay's `levelScreen` replaces the settled snapshot, so a losing replay does not stay success-settled.

The shell turns `enterLevel` into a level change: cancel motion, `levelScreen`, `saveRound`.

`phoneClassName(screen, {levelId, garden, feedback, eventType})` returns the current `sgv-phone sgv-onboarding sgv-onboarding-<id>` string, including `sgv-orchard` when `garden === 2`, `sgv-event-<feedback or eventType>`, and `sgv-level-arrival` when `screen.arriving` is true.

## Input

`src/casual/boardInput.js` decides what a pointer, click, or key does. It calls the existing `introPointerDecision`, `dismissLevelScreen`, `startTap`, and `isSkipKey`. It does not touch the DOM, the presentation lock, or React state.

`boardPointerDecision({gate, inIntro, presenting, startOpen, arriving, docking})` returns `{prevent, stop, steps}`. `steps` is an ordered list. The shell runs every step:

| Condition | Result |
|---|---|
| Intro handled outside the intro card | `prevent` and `stop`, no steps |
| Intro handled inside the intro card | no prevent, no stop, no steps |
| Start screen is open and nothing is presenting, and start-tap dismiss is allowed | `prevent`, `stop`, steps `stopArrival`, `closeStart`, and `clearDock` when `docking` |
| A presentation is in progress (`startTap.consume`) | `prevent`, `stop`, step `skipPresentation` |
| Otherwise | no prevent yet. Steps are `stopArrival` when the arrival should finish, `clearDock` when `docking`, then `consultPointer` |

`skipPresentation` calls `acceptPointerDown` and does not look at its return. `consultPointer` calls `acceptPointerDown`; `prevent` and `stop` happen only when that returns `'skip'`.

`boardClickDecision({gate, inIntro})` returns `{prevent, stop, consultClick}`. A handled intro uses the same prevent rule as the pointer. Any other click sets `consultClick`. The shell then calls `acceptClick` and prevents the click when the result is not `'action'`.

`boardKeyDecision({key, gate, presenting, finished, victory, startOpen, onButton})` returns `{handled, prevent, stop, dismissIntro, skipPresentation, stopWin, endVia, stopArrival, closeStart}` with unused flags false:

| Condition | Result |
|---|---|
| Key is not Escape, Enter, or Space | `handled: false` |
| Intro gate is up | prevent, stop, `dismissIntro` |
| A presentation is in progress | prevent, stop, `skipPresentation` |
| The round is finished and the event target is a button | `handled: false` |
| The round is finished otherwise | prevent, stop, `stopWin` when `victory`, `endVia: 'backdrop'` |
| Start screen is closed | `handled: false` |
| Start-skip dismiss is allowed | prevent, stop, `stopArrival`, `closeStart` |
| Start-skip dismiss is not allowed | `handled: false` |

The shell chooses the intro dismiss `via`: `'play'` when the target is inside `.sgv-feature-intro-play`, otherwise `'scrim'`. The keyboard start dismiss does not clear the dock. That difference from the pointer start dismiss stays.

## Phone

`src/casual/OnboardingPhone.jsx` renders the current `main.sgv-page` tree. It receives the snapshot, the `boardReadout` result, `ending`, `bankLive`, `reduced`, and callbacks. It does not read storage, dispatch events, start GSAP, or decide input policy.

Callbacks cover play, factor info, reset, dev menu, go-to-level, help, skip to level 13, dismiss factor, dismiss intro, dismiss start, end primary, end backdrop, finish presentation, and the three capture handlers. Disabled cards, the save label, the flip visibility, the glossary, and the overlays keep today's conditions. Those conditions read the readout and the snapshot; they are not recomputed from the engine inside new helpers.

## Effects

`src/casual/screenEffects.js` exports the DOM and timer hooks. Each hook cleans up on unmount the same way the matching effect does today. Cancel and settle calls stay inside `try/catch` with the current empty catches.

| Hook | Owns |
|---|---|
| `useDebugBridge({fx, changeLevel})` | `__swingFxEmit` in dev, and `__swingGoToLevel`. The jump still goes through `prepareOnboardingJump`. A bad id warns and returns `false`. A reload option stores the jump, dispatches `debug_goto_level`, and reloads. A direct jump dispatches `debug_goto_level` and calls `changeLevel` |
| `useLevelArrival({rootRef, fx, screen, onArrivingSettled})` | Level-start event, arrival banner, `playLevelStart`, and `stopArrival`. Returns `stopArrival` |
| `useWinCelebration({rootRef, fx, screen, readout, onSuccessSettled})` | `playWinCelebration` query list and `stopWin`. Returns `stopWin`. Runs only when the round is finished and a victory |
| `useHoneyLayout(rootRef, {active})` | Resize layout and `inert` on the HUD, middle, and controls while the honey win is up |
| `useSkipFocus(rootRef, animating)` | Remember focus, focus the skip surface, restore focus after |
| `useBoardChrome({rootRef, screen, readout, play, setScreen})` | Dock timer, intro-shown event, idle hint, ack timer, factor-info clears, bank-seen mark, bank live region, auto-bank |

`useLevelArrival` starts from a level-id change. That run dispatches `level_start`, stores the level id on the level-ready ref, and calls the intro-start ref. When the intro gate is already up it does not start the banner. It starts again when the intro gate closes onto an open start screen for a fresh round that is not already arriving. `beginArrival` still no-ops, and clears `arriving`, when the root is missing, the round is not fresh, or the gate ref is up. `onArrivingSettled` applies `arrivalSettled`. The banner node is still created by the hook and removed on cancel. The hook returns `{stopArrival, active}`. The shell passes `screen.arriving || active` into the pointer decision, because a tap can land after the handle exists and before `arriving` is rendered.

`useWinCelebration` passes the same nodes `playWinCelebration` receives today. `onSuccessSettled` applies `successMarked`.

`useBoardChrome` keeps the current effect bodies. The dock effect returns immediately when `levelStartPlan(...).dock` is null, so a restored round keeps the docking flag `levelScreen` already set. When a dock plan exists it sets docking and clears it after `plan.dock.end * 1000`. The idle hint waits 3000 ms, the ack waits 1100 ms, and auto-bank waits 280 ms. Auto-bank still calls `play({type:'bank'}, pot node)` and still waits until the round is playable: not finished, not animating, not gated, start closed, not arriving, and `readout.autoBank`. The idle hint dispatches `hint_shown`. The intro-shown effect dispatches `feature_intro_shown`. Opening the bank for the first time still calls `takeFirstOutcome(seenFactors, 'bank')`.

Factor info clears when the readout says it is disabled, and whenever `round.levelId` changes.

## Shell

`SimplifiedGame.jsx` keeps the wiring:

- One `useState` snapshot from `initialScreen`, plus a ref that always holds the latest snapshot for handlers.
- Refs the motion system already uses: root, fx bus, action presentation, cancel, reset, loss, break, seen factors, and the intro-start / level-ready refs the feature intro overlay writes.
- `changeLevel(id)` cancels arrival, win, fx, presentation, and the four motion refs, applies `levelScreen`, and `saveRound`s the new round. It also clears the seen-factor set and stores the opening on the intro refs.
- `play` keeps the `runPresentedAction` order. `onCommit` calls `commitPlay` and dispatches each returned event, then `ackAfterCommit`. `onSettle` clears the four motion refs and applies `settledScreen`. `startMotion` still calls `startPlayMotion` with field setters. Each setter patches that one snapshot field and accepts either a value or an updater function, so the pour and meter callbacks keep working.
- Reset clears onboarding progress, then `changeLevel(1)`, then dispatches `onboarding_reset`.
- Skip dispatches `tutorial_skip`, writes `GARDEN_2_START` to the progress key, then `changeLevel(GARDEN_2_START)`.
- Go-to-level still uses `window.prompt` and `prepareOnboardingJump`. An invalid id only closes the dev menu. A valid id dispatches `debug_goto_level` and calls `changeLevel`.
- Dismiss intro, end decisions, and capture handlers apply the matching command or input result. Closing factor info still returns focus to the pill that opened it.
- Render is `OnboardingPhone` plus the readout. `boardReadout` stays the display selector.

Unmount still settles fx, abandons the presentation, and cancels the motion refs.

## Errors

A storage throw still becomes `null` or a failed write through the existing record helpers and `clearOnboardingProgress`. A throw from cancel, fx settle, or `showFinal` during stop-arrival, stop-win, or level change is still swallowed so the tap can finish. `platform.js` swallows a storage getter throw and a missing `window`.

## Tests

`tests/screen-state.test.mjs` uses in-memory storage and a fixed `reduced` flag. It covers a resumed round, a fresh round with no save, an intro-gated level versus a start-open level, `shownGold` 0 on level entry, the last-level next id, a dismissed intro that opens the start screen, a dismissed intro that queues another card, a rejected intro dismiss, first-outcome ack versus a later outcome clearing ack, settle copying only the presentation fields, win call-to-action entering the next level, win backdrop only marking success, a losing replay entering the same level, and a second advance claim entering nothing.

`tests/board-input.test.mjs` covers each row of the two decision tables above, including the pointer dock clear and the keyboard start dismiss that does not clear the dock.

`npm test` and `npm run simulate:casual` stay green. The mounted hotfix and onboarding tests cover the screen the player sees. No new source-text assertions.
