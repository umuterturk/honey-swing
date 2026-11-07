# Play Stack Springs

**Date:** 7 November 2026  
**Status:** Approved for implementation  
**Scope:** `.sgv-phone` column layout only — meter, jars, and CTA height behavior

## Goal

Eliminate the "components feel apart" problem on tall phones by mirroring how top casual titles (Candy Crush, Royal Match) handle tall screens: a fixed-height play group, outer springs that absorb extra height, bottom-biased so the garden breathes.

## Pattern (top-title reference)

```
HUD           flex: none         ← always pinned
─────────────────────────────
top spring    flex: 1 1 0        ← small share of leftover (~1/3.5)
─────────────────────────────
meter         flex: none  }
jars          flex: none  }  play stack — tight, never stretches
CTA           flex: none  }
─────────────────────────────
bottom spring flex: 2.5 1 0      ← most leftover (~2.5/3.5) → garden
```

## Fixed heights (reference ~390×844)

| Band | Fixed height | 730 breakpoint | 580 breakpoint |
|------|-------------|----------------|----------------|
| Meter section | auto (content-sized ~178px) | auto (~136px) | auto (~102px) |
| Jar stage | 206px | 184px | 148px |
| Controls (CTA) | 240px | 196px | 168px |

Jar stage height = max bank jar height + 8px top offset + 14px bottom padding.

## Key CSS changes

**`.sgv-middle`**: `flex:1` → `flex:none`; remove `justify-content:space-between`; add `gap:4px`.

**`.sgv-bottle-pair`**: `flex:1; min-height:dvh` → `flex:none; height:206px`; `--jar-top` simplified to `8px` (fixed offset; replaces the spare-stage sink formula).

**`.sgv-controls`**: `height:clamp(196px,28.5dvh,248px)` → `height:240px`.

**Springs**: Two empty `div.sgv-spring-top` and `div.sgv-spring-bottom` siblings in `SimplifiedGame.jsx`; CSS flex ratios 1 and 2.5.

## Acceptance

1. At 430×932 — meter, jars, cards, SAVE keep the same relative distances as at 390×844; extra space is below SAVE and a small amount under HUD.
2. At 320×568 — stack still fits via 580 breakpoints; springs collapse to ≈0.
3. Pot remains centered under honey tap; Bank left-aligned; SAVE in thumb zone above safe-area.
4. Jar Y shift doesn't break GSAP bank-pour / card-flight paths (all measured at animation time from live DOM).

## Out of scope

- Victory chrome
- Jar art / Victory stack swap (separate approved spec)
- Factor-pill popup, economy, motion timings
