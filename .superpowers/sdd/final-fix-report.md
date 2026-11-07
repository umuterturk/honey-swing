Status: DONE
Findings fixed:
- Eased zero-cross now inverts the shared `NEEDLE_GLIDE_EASE` (`power2.out`) so flyers fire when the eased needle reaches zero.
- Factor flyers and reduced-motion labels now center on their pill/origin; animated flyer points clamp inside the root.
- Removed empty factor flyer modifier CSS and dead `firstFactorAwards` argument plumbing while preserving `seenFactorsRef.add`.
TDD:
- Updated `tests/motion-order.test.mjs`, observed RED with old linear marks, then observed GREEN after the fix.
Tests:
- `node --test tests/motion-order.test.mjs`: PASS, 13/13.
- `npm test`: PASS, 177/177.
- IDE diagnostics for edited files: no linter errors.

---
Status: DONE (power2.out cubic inverse)
Fix:
- `inverseNeedleGlideEase` now uses `1 - Math.cbrt(1-p)` for GSAP `power2.out` (cubic), not `sqrt`.
- Recomputed `zeroCrossMark` / swing flyer marks in `tests/motion-order.test.mjs` (e.g. steer 0.473, flip 0.533, reverse cross 0.511).
Tests:
- `node --test tests/motion-order.test.mjs`: PASS, 13/13.
- `npm test`: PASS, 177/177.

## Final-Review Fix Pass — 2026-11-07

**Branch:** factor-pill-info-popup  
**Commit:** 1a8a2e9 — "Fix factor-info pill look, swap stacking, and a11y label."

### Fixes Applied
1. **Pill look regression** (`minimal.css`): Removed `font:inherit;color:inherit` from `button.sgv-multiplier-pill` — global `button{font:inherit}` already handles font; `color:inherit` overrode `--pill-text` via specificity.
2. **Swap stacking / layout jump** (`minimal.css`): Replaced `position:relative;z-index:41` on `.sgv-multipliers` with `z-index:41` on `.sgv-meter-section` and kept only `pointer-events:auto` on `.sgv-multipliers`.
3. **aria-label a11y** (`MinimalBoard.jsx`): Changed interactive pill label from `label+' info'` to `label+' info, times '+value`.
4. **Gate test** (`factor-info-mount.test.mjs`): Added test that mounts Level 16 without dismissing level-start, asserts Swing pill is `disabled===true`, and tapping it does not open `.sgv-factor-info`.

### Test Results
`node --test tests/factor-info-mount.test.mjs tests/factor-info-content.test.mjs`  
✔ 6 / 6 pass, 0 fail — duration 4057 ms
