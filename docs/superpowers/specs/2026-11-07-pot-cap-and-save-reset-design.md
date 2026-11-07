# Pot Cap & Save Multiplier Reset

**Date:** 7 November 2026  
**Status:** Implemented (not committed; ready for playtest)  
**Scope:** Soft pot capacity + visible limit; honest feedback when Save resets multipliers.

## Goal

1. The Pot has a maximum. Extra honey from a play that would exceed the cap is discarded from scoring only — no Snap, no break, no multiplier punishment.
2. The player can see that limit on the Pot.
3. Save already resets multipliers in the engine; show that so the rule is honest.

## Decisions

| Topic | Choice |
|-------|--------|
| Cap value | Levels **1–15**: `potCap = target` (same as Savings to pass). Levels **16+**: `max(star3×2, target×2)` headroom for gift/overscore. |
| Engine rule | Opt-in `potCap` on casual rules (`null` default). Campaign Overswing unchanged. |
| Overflow | Clamp `addedToPot` / `potValue` only. Card still enters the Pot; factors / swing / Flip rules unchanged. |
| Cap UI | Pot amount shows **value only** (no `/ cap`). Fill meter still uses `potCap`. |
| Save reset feedback | When any visible multiplier drops on Save: meter beat **Multipliers reset.** + existing `animateFactorReset` on the pills when the Pot empties into Savings. Silent when all visible factors were already ×1 or none are shown. |

## Engine

- `OVERSWING_BASE_RULES.potCap = null`
- Validate: `null` or positive integer
- On `runningPot` deposit: `addedToPot = min(desired, max(0, potCap - potValue))`; then add
- `overswingPayout` for running Pot also clamps to `potCap` if set (dirty-state guard)
- `lastAction.potOverflow = desired > addedToPot` when a deposit was attempted (tests / clarity)

## Surfaces

- `engines.js` — clamp + rule
- `onboardingLevels.js` — levels 1–15 `potCap = target`; later `max(star3×2, target×2)`
- `MinimalBoard.jsx` / `minimal.css` — Pot amount only; fill still tracks `potCap`
- `SimplifiedGame.jsx` / `minimalMotion.js` — fill target + Save reset beat/motion
- Tests — overflow clamp, no side effects, UI string, Save feedback path

## Out of scope

- Punishing overflow (break / Snap / tax)
- Changing Hiveful thresholds or level decks
- New Save feature-intro card copy
- Auto-save when the Pot hits the cap

## Success

- Playing into a full Pot leaves `potValue === potCap`; multipliers still update as before.
- Pot label shows amount only; jar fill tracks the cap.
- Saving with boosted visible multipliers shows the reset beat and pill desaturate pulse.
