# More Flower / More Bee Factor Flyers

**Date:** 7 November 2026  
**Status:** Approved  
**Scope:** In-level Swing and Flip multiplier presentation only (not engine rules, not Jackpot flyer redesign)

## Goal

Make multiplier gains readable at a glance: **cause → travel → pill bump**. Replace the Swing/Flip `×value` chip flyers with labeled icon+text flyers. Jackpot awards get no flying cue in this change.

## Decisions

| Topic | Choice |
|-------|--------|
| Swing origin | Needle / meter at **zero-cross** while the needle is still gliding |
| Flip origin | Flip button |
| Flip start | When the flipped card **face is revealed** (`faceEnd`) |
| Chip flyers | **Replaced** for Swing and Flip (text flight is the only flying reward) |
| Jackpot | **No** flying cue in this change |
| Simultaneous | Both flyers may run in one play when both rewards fire |
| Old Swing tip | Remove `CROSS` under-pill tip |

## Flyer content

| Award | Copy | Art | Spawn | Land |
|-------|------|-----|-------|------|
| Swing | **More Flower** | `/celebration/daisy-2.png` (same as Swing pill) | Needle position at zero-cross during meter glide | Swing pill → pop |
| Flip | **More Bee** | `/bee-smiling-closed-eyes.png` (same as Flip pill) | Flip button at `faceEnd` | Flip pill → pop |

Flyer chrome: horizontal chip with icon + short text (not a bare `×N`). Reuse existing honey/pill visual language.

## Approach

**Dual flyers on the card timeline.** Schedule independent GSAP flyers inside `animateCardAction` / `cardMotionMarks`. No separate toast layer after settle.

## Timing

### New / used marks

- `zeroCross` — absolute time when the needle glide reaches meter **0** (marker at 50% left), interpolated from `view.from` → `view.to` over `[meterStart → meterEnd]`.
  - If the glide never crosses 0, start the Swing flyer at `meterStart` from the needle’s live seat (do not invent a fake cross).
- Flip flyer starts at existing `faceEnd` (~0.140s on Flip plays).
- Snap path stays `rewards: null` — no factor flyers.

### Per-reward flight (~0.45s)

1. Spawn at origin (opacity 0 → 1, slight scale-up)
2. Travel to the matching multiplier pill
3. Fade out + pill `back.out` pop
4. Factor value update (`onFactors`) must not flash the new ×value before the matching flyer arrives; use the existing factors mark or the later of {Swing arrival, Flip arrival} when both fire

Swing and Flip flyers are independent nodes; they overlap freely when both rewards are present. Jackpot entries in `rewards` are ignored by the flyer builder.

## Surfaces

- `motionSchedule.js` — `zeroCross` helper; `reducedCardSummary` uses More Flower / More Bee (no `CROSS`)
- `minimalMotion.js` — Swing/Flip labeled flyers; Flip at `faceEnd`, Swing at `zeroCross`; drop Jackpot flyers; remove Swing `CROSS` tip
- `minimal.css` — icon+text flyer chip styles
- Tests — motion-order / reduced-summary expectations for new copy and marks

## Constraints

- Motion: `transform` / `opacity` only on flyers; ≤2 reward flyers per play; cancel cleans nodes + pill scale
- Do not lengthen ordinary (non-reward) card plays
- Snap presentation unchanged
- Flyers are `aria-hidden`; pill `aria-label` still reflects the new ×value when factors update

## Reduced motion

Static labels near the awarded pills: **More Flower** / **More Bee** with icons. No travel. Replaces today’s static `CROSS` string.

## Acceptance

- Cold player can answer: “Crossing zero gave me More Flower” / “Flip gave me More Bee”
- Swing text visibly starts while the needle is still moving through 0 (not after settle)
- Flip text leaves the Flip button at face reveal
- Both visible together when both rewards fire
- Jackpot award does not spawn a flyer
- Reduced motion: static labels, no travel
