# Pot-Add Equation Flyer (Levels 1–15)

**Date:** 7 November 2026  
**Status:** Implemented  
**Scope:** Onboarding levels **1–15** only. Scoring card plays that add honey to the Pot.

## Goal

Make **card rank × multipliers → Pot add** obvious on every scoring play during early levels, without permanent HUD chrome.

## Decisions

| Topic | Choice |
|-------|--------|
| Where | Replace the Pot `+N` flyer for levels 1–15 when math is non-trivial |
| Levels 16+ | Keep today’s simple `+N` |
| Form | Short equation near the pour / Pot meniscus, then settle on `+N` |
| ×1 silence | If every **visible** factor is ×1 (or no factors visible), show only `+N` — no fake `3 × ×1` |
A crossing Flip grows Swing and Flip. There is no third multiplier.
| Rank | Absolute card rank used by the engine (`\|signed\|`) |
| Timing | Same beat as today’s `sgv-pot-fly` (with tap pour); equation holds briefly, then collapses to `+addedToPot` |
| Cap overflow | Show full product intent, then arrow to **actual** add: e.g. `4 × ×3 → +5` when room was 5 |
| Snap / no deposit | No equation (unchanged Snap / discard paths) |
| Reduced motion | Static equation string once (or static `+N` if trivial), same as other static outcomes |

## Equation rules

Engine deposit (running Pot): `desired = payoutMultiplier × rank`, then soft-clamp to `potCap` → `addedToPot`.

**Payout factors** (must match the deposit, not the post–Zero-Break board):

- Normal / Flip / Swing growth plays: use **post-play** factor values (`factorsAfter`) — growth is applied before `payoutMultiplier` in the engine.
- **Zero Break**: growth is skipped; deposit uses pre-reset board; then multipliers reset. Use **`factorsBefore`** for the equation (reset beat stays separate: “Pot safe.”).

**Build string**

1. Start with `rank` (integer).
2. Append each contributing visible factor as ` × ×{value}` (values > 1 only).
3. Append ` → +{addedToPot}`.

Examples:

| Situation | Flyer |
|-----------|--------|
| No / all-×1 factors | `+4` |
| Swing ×2 only | `3 × ×2 → +6` |
| Swing ×2, Flip ×3 | `2 × ×2 × ×3 → +12` |
| Overflow (desired 12, room 5) | `4 × ×3 → +5` |
| Zero Break with prior ×2 | `5 × ×2 → +10` (then existing reset feedback) |

Do **not** invent UI math. Prefer deriving parts from `actionPresentation` + `level.visibleFactors`. If the engine does not expose `payoutMultiplier` / desired add cleanly for overflow copy, add a presentation field from committed `lastAction` (e.g. store `payoutMultiplier` at deposit time) rather than recomputing in the view.

## Motion

1. Tap pour / Pot fill as today.
2. At the current `+N` spawn: show equation flyer (`sgv-pot-fly` variant or sibling class) at the honey surface.
3. Hold ~0.35–0.45s readable, then morph / crossfade to `+{added}` for the remaining fly-away (or fade equation and emphasize `+N` if morph is costly).
4. Total beat length stays within the existing card-action timeline (no extra input lock beyond today’s pour).

**Copy / a11y:** `aria-hidden` on decorative flyer; optional polite live region already covered by Pot amount update — no new spoken essay.

## Out of scope

- Persistent formula strip under the meter
- Pill-pulse “chain” tutorial
- Changing engine scoring or factor growth rules
A crossing Flip grows Swing and Flip. There is no third multiplier.
- Levels 16–20 equation flyers
- Rewriting factor info popup copy

## Acceptance

1. On level ≤ 15, a play that adds honey with any visible factor > ×1 shows `rank × … → +added` at the Pot.
2. On level ≤ 15 with all visible factors ×1 (or none), flyer is still plain `+added`.
3. On level ≥ 16, flyer remains plain `+added`.
4. Overflow shows `→ +addedToPot` (clamped), not the uncapped product as the final +N.
5. Zero Break equation uses pre-reset factors; multipliers still reset afterward.
6. Reduced-motion path still completes with a readable static string and no layout jump.
7. Tests cover string builder + level gate; motion still presentation-only.

## Surfaces (expected)

- `presentation.js` — pure `potAddEquation({…})` (or similar) from committed change + visible factors
- `minimalMotion.js` / `motionSchedule.js` — spawn equation vs `+N` for levels 1–15
- `SimplifiedGame.jsx` — pass level id / visible factors into card motion view
- `minimal.css` — equation flyer typography (readable, not louder than Pot total)
- Tests — equation cases + gate; no engine rule changes unless adding `payoutMultiplier` on `lastAction` for honesty
