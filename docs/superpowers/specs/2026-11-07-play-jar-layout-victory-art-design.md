# Play Jar Layout + Victory Art

**Date:** 7 November 2026  
**Status:** Approved  
**Scope:** In-level Pot and Bank jars in `.sgv-bottle-pair` only

## Goal

Reposition the play jars so the pending **Pot** sits centered under the honey tap and the secured **Bank** jar sits at the left edge, both on the same baseline. Replace the current CSS bottle / chest art with the Victory layered jar (same assets and stack as the win hero jar). Bank remains clearly larger than Pot.

## Decisions

| Topic | Choice |
|-------|--------|
| Baseline | Same bottom edge for Pot and Bank |
| Bank horizontal | Near left safe edge (phone side padding / safe-left) |
| Pot horizontal | True center of the phone column (`left: 50%` + `translateX(-50%)`), under the honey tap |
| Layout technique | Absolute slots inside `.sgv-bottle-pair` (not flex centering / spacer / grid) |
| Jar art | Both jars use Victory stack; Bank ~1.35–1.5× Pot width |
| Bottom BANK button | Unchanged behavior |

## Layout

`.sgv-bottle-pair` becomes a full-width positioned stage in the middle column.

| Slot | Role | Position | Size |
|------|------|----------|------|
| **Bank** | Secured honey | `left` ≈ side padding (`16px`) + safe-left; bottom-aligned with Pot | Larger play jar — about **1.35–1.5×** Pot width; height from Victory art aspect |
| **Pot** | Pending honey | Horizontal center of `.sgv-phone` content; under `.sgv-honey-tap`; same baseline as Bank | Smaller — roughly today’s Pot footprint (~96–142px wide) |
| **Right** | Empty | No third jar | Intentional so Pot stays true center |

### Narrow / short viewports

- Prefer scaling **Bank** down before allowing overlap with Pot.
- Pot’s center X must not shift away from the tap centerline.
- Preserve readable labels at 320×568 and 430×932.

## Jar art & components

Reuse the Victory hero jar stack for both play jars:

1. `public/empty-complete-jar.png` — back
2. Masked honey fill via `public/honey-fill-mask.png` + existing fluid fill / surface / bubbles
3. Internal light / reflection / gleam layers (quieter on play than on victory is allowed)
4. `public/empty-front-jar.png` — front

### Pot (`PendingPot`)

- Same Victory stack at Pot scale
- Keep `POT` label + amount over the glass
- Keep `.sgv-pot-pour-lip` (or equivalent mouth anchor) for bank-pour geometry
- Fill percent = pending / prospective bank value (existing `fluidFillPercent` behavior)

### Bank (`GlassChest`)

- Same Victory stack at Bank scale (larger)
- Keep `BANK` + `banked / target` goal chip, re-anchored on the jar so it stays readable and does not cover the mouth
- Keep a mouth / receive anchor (today’s `.sgv-chest-mouth` or equivalent) for pour targeting
- Fill percent = secured banked value only

Extract or share the Victory jar layer markup (today’s `heroJar()` in `levelScreens.js`) so play and win do not diverge on asset order or mask wiring.

## Motion & interaction

- `animateBankPour` continues to measure Pot lip → Bank mouth; the stream path runs left/up into the larger left jar.
- Snap / pot-break / fill transitions keep current timing; only geometric targets change with the new slots.
- Bottom BANK command and assistive live region stay as they are.
- Pot remains non-interactive in the current SimplifiedGame wiring (`interactive={false}`); no new tap-target requirement from this change.

## Out of scope

- Victory chrome (scrim, praise, slogan drops, scoreboard, confetti, foliage)
- Meter / honeycomb / honey-tap placement (already specified separately)
- Economy, bank rules, or fill-percent formulas
- New jar assets beyond reusing Victory PNGs

## Acceptance

1. At the reference phone width, Pot’s horizontal center aligns with the honey tap’s horizontal center.
2. Bank sits at the left content edge with normal side padding; bottoms of Pot and Bank align.
3. Both jars visibly use the Victory back / fill-mask / front treatment (not the old CSS bottle/chest shapes).
4. Bank reads larger than Pot (~1.35–1.5× width).
5. Bank pour still lands in the Bank mouth; reduced-motion path still completes without layout jump.
6. Layout remains usable at 320×568 and 430×932 without Pot/Bank overlap that hides labels or mouths.
