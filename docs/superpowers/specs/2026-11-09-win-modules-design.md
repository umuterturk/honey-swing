# Win Modules

**Date:** 9 November 2026
**Status:** Approved
**Scope:** Split `honeyWin.js` by job. `honeyWin.js` stays the import path. Scores are still not written here.

## Layout

| File | Owns |
|---|---|
| `src/casual/win/tokens.js` | `HONEY_MOTION` timing and `HONEY_TOKENS` colors |
| `src/casual/win/ease.js` | Easing curves and contrast math |
| `src/casual/win/layout.js` | Phone geometry and `applyHoneyLayout` |
| `src/casual/win/frames.js` | Jar fill and score count at a given time |
| `src/casual/win/particles.js` | Flight droplets and confetti |
| `src/casual/honeyWin.js` | Re-exports the public functions |

`winMotion.js` still runs GSAP. These modules only answer where things sit and what the celebration should show at time `t`.
