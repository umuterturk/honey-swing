# Honey Celebration Chrome & Motion Design

**Date:** 7 November 2026  
**Status:** Draft for user review  
**Approach:** Celebration chrome rebuild  
**Supersedes:** Motion sequence (§11), praise/particles/controls chrome (§10 partial), and overflow/count presentation from `2026-11-06-honey-celebration-visual-design.md`  
**Preserves:** Production jar stack, jar coordinate contract, mask alignment, honey lighting/fill max (78%), scrim/warm-light treatment, Reset/NEXT hit geometry, win semantics

## 1. Goal

Ship a Candy Crush–paced ~2.0s victory sequence where **honey filling the jar is the main event**. Surrounding UI matches `public/reference.png` using the provided chrome assets, while the existing glass/honey jar layers stay in production.

## 2. Scope

### In scope

- Rebuild win chrome to the reference vertical stack
- Wire these assets (no new image generation):
  - `public/score-board.png`
  - `public/victory-slogan-underline.png`
  - `public/victory-slogan-side-drops-left.png` (mirrored for the right side)
- Rewrite the GSAP victory timeline to the 2.0s fill-first beats
- Decouple honey fill from score count-up
- Remove overflow honey drips, plain count/subline chrome, and long confetti shower
- Tap/skip and reduced-motion settle to one shared final state

### Out of scope

- Replacing or regenerating jar PNGs / honey mask
- Changing win/lose game rules, score math, or praise tier selection
- New pedestal art (warm light / existing jar platform treatment only)
- Pouring stream, spinning jar, multi-bounce spam, or 3s score counting

## 3. Layout & chrome

Vertical stack (top → bottom), matching `public/reference.png`:

1. **Hiveful!** — existing praise lettering, plus:
   - `victory-slogan-underline.png` centered under the word
   - `victory-slogan-side-drops-left.png` on the left; horizontally mirrored copy on the right
2. **Jar** — current production stack (`empty-complete-jar` / honey mask / front glass). Geometry and CSS jar variables unchanged.
3. **Scoreboard** — `score-board.png` with DOM overlays:
   - **Honey Collected** above the yellow ribbon (same position as “FINAL SCORE” in the reference)
   - Big score number on the yellow ribbon
   - Green checkmark + `Target: N` below the ribbon when the revealed count reaches the level target
4. **NEXT** — existing CTA rectangle, label, safe-area inset, pressed behavior
5. **Reset** — top-right, secondary contrast

### Retired chrome

- Overflow honey marks / drip nodes
- Plain `.sgv-honey-count-slot` tally without scoreboard
- `.sgv-honey-subline` `score / target` text
- Continuous / long confetti shower

### Framing that may remain

- Cool scrim + warm radial light behind the jar
- Existing celebration foliage if it stays clear of Hiveful, jar mouth, scoreboard, Reset, and NEXT
- A few jar sparkles only if they do not compete with the fill or Hiveful pop

## 4. Motion timeline (2.0 seconds)

Honey fill is the hero. Later beats react to it.

| Beat | Time | Behavior |
|------|------|----------|
| Pause | 0–150 ms | Gameplay remains visible under a darkening scrim; empty jar settled at center |
| Jar entrance | 150–350 ms | Jar scales 92% → 103% → 100%; warm light / pedestal glow lifts subtly; no exaggerated bounce |
| Honey fills | 350–1,050 ms | Honey rises to fill height for this win (capped at 78% jar height = target completion). Ease-out cubic. Slight horizontal surface wobble; amber glow intensifies with fill. 1–2 small surface oscillations at the end |
| Hiveful! | 1,000–1,300 ms | Golden flash across the jar as fill completes. Hiveful lettering pops with one squash-and-stretch. Underline follows +80 ms. Side-drops burst outward |
| Score reveal | 1,250–1,750 ms | Scoreboard scales 85% → 100%. Score counts up to the secured total with a soft settle bounce. Target checkmark appears when the counting value passes the level target |
| NEXT | 1,750–2,000 ms | NEXT fades and rises into place, then one soft pulse. Scene settles calm |

### Fill rules

- Ease: cubic ease-out (GSAP `power2.out` / equivalent), not linear
- Jar max fill = target completed. Score above target is communicated by the score number and glow only — **no overflowing honey**
- Fill animation must not wait on score counting; score starts after / overlapping the Hiveful beat per the table

### Sound (when audio bus is wired)

- Soft rising liquid during fill
- One bright pop as Hiveful appears
- Short score-count ticks during the reveal
- Do not play all three at maximum volume

## 5. Interaction, skip, accessibility

- **NEXT** becomes tappable as soon as it appears (~1.75s). Decorative tail effects must not lock input.
- **Skip / cancel:** existing backdrop / skip paths kill the timeline and paint the settled final state immediately: filled jar, Hiveful + decorations, final score + target row, NEXT enabled.
- **Reset** remains available for the whole overlay; visually secondary.
- **`prefers-reduced-motion: reduce`:** show the settled final state immediately (no staged sequence).
- Preserve dialog semantics and the live status announcement (praise + score + target) from first paint.
- Decorative PNGs use empty alt / `aria-hidden`. Scoreboard text is the readable score surface.
- Reset and NEXT stay ≥ 44×44 CSS px with visible keyboard focus.

## 6. Implementation shape

Primary touch points:

- `src/casual/levelScreens.js` — win DOM: slogan decorations, scoreboard overlays; remove overflow/confetti/subline
- `src/casual/honeyWin.js` — replace `HONEY_MOTION` beat table for the 2.0s fill-first sequence; keep fill-max / layout helpers that still apply
- `src/casual/winMotion.js` — rewrite timeline: pause → jar entrance → fill → Hiveful → scoreboard count → NEXT; shared `paintFinal` for settle/skip/reduced
- `src/casual/minimal.css` — slots and layering for scoreboard + slogan assets; jar coordinate contract untouched

Jar lighting/mask rules from the 6 November visual design remain in force unless they conflict with this chrome/motion rebuild; if they conflict, this document wins for chrome and timing.

## 7. Acceptance criteria

1. Win stack reads Hiveful → jar → scoreboard → NEXT at thumbnail size, matching the reference composition with the production jar.
2. Only the listed existing PNGs are added to the win chrome; no new generated image assets.
3. Honey fill runs 350–1,050 ms with ease-out cubic and is visually primary.
4. Hiveful underline lags lettering by ~80 ms; side-drops burst with the praise pop.
5. Scoreboard shows **Honey Collected**, ribbon score, and target row with checkmark when count ≥ target.
6. Honey never overflows; over-target is score/glow only.
7. NEXT is visible and tappable by ~1.75–2.0s.
8. Skip, settle, and reduced-motion produce the same final layout.
9. Jar left/top/width/height contract and mask alignment remain unchanged.
10. Overflow drips, plain subline, and long confetti shower are gone.

## 8. Verification

- Before/after screenshots vs `public/reference.png` and current win screen
- Observe full 2.0s sequence, skip mid-fill, and reduced-motion path
- Confirm checkmark appears only once count crosses target
- Keyboard/pointer checks for Reset and NEXT
- Portrait sanity at 320×568 and 430×932 without moving the jar rectangle
