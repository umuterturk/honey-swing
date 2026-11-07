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
