# Snap → Wasp → Heart Feedback

**Date:** 7 November 2026  
**Status:** Approved (revised)  
**Scope:** In-level Snap presentation only (not engine rules)

## Goal

On Snap, teach causality in one glance: **overshoot hit the wasp → wasp takes a life**. Bank stays safe. Existing Pot crack + drop scatter stay.

## Approach

**Wasp sting (linked):** needle drives into the hit-side wasp → wasp heartbeats → that wasp C-arcs to the HUD heart (flipped C from the right), tumbling/flipping along the path → heart swells then falls → needle returns to 0.

## Sequence (absolute times)

| t (s) | What |
|------:|------|
| 0.00 | Card press + clone to center (existing) |
| 0.14 | Needle GSAP-glides toward hit-side wasp (measure wasp vs marker rail) |
| 0.24 | Card flies off snap edge (existing) |
| 0.28 | Hit wasp heartbeat (~2 pulses / 0.28 s); pot break + scatter (`onSnap`) |
| 0.34 | If `showChances`: hide meter wasp; C-arc dive (~0.66 s) with mid-flight flips |
| 1.00 | Wasp hits heart: ♥ grows big then falls + empty HUD (`onChanceLost`); wasp fades |
| 1.18 | Needle returns to center 0; meter wasp restored |
| 1.65 | Unlock input |

### Gating
- **Pre-hearts** (`!showChances`): needle → wasp pulse + pot loss; no wasp dive; chance count may still update at snap impact.
- **Reduced motion:** instant end state (needle 0, pot 0, one heart emptied); no flyer / pulses.

### Side
- `view.to >= 0` → right wasp; else left wasp.

## Constraints
- Motion: `transform` / `opacity` / marker `left` only; ≤1 wasp flyer + 1 heart-pop node; cleanup on cancel.
- Do not lengthen ordinary (non-snap) card plays.
- React must not clamp the needle to ±limit ticks during the wasp overshoot — GSAP owns marker `left` until home; needle numeral may show `|view.to|` via DOM during flight.
- Wasps stay `aria-hidden`; lives `aria-label` updates when the heart empties.

## Acceptance
- Cold player can answer: “The wasp on that side flew up and took my heart.”
- Needle visibly enters the wasp, not only the ±limit tick.
- Wasp dive only when chances are shown; always side-correct.
- Pot crack + drop scatter still fire; Bank glass untouched.
