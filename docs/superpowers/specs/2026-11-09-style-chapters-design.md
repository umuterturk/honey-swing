# Style Chapters

**Date:** 9 November 2026
**Status:** Approved
**Scope:** Split `minimal.css` into ordered chapters. The cascade is unchanged.

## Layout

`src/casual/minimal.css` only `@import`s these files, in this order:

| File | Owns |
|---|---|
| `src/casual/styles/shell.css` | Tokens, page, phone, clouds |
| `src/casual/styles/hud.css` | Level, score, hearts |
| `src/casual/styles/meter.css` | Play stack, meter, factors, flight center |
| `src/casual/styles/board.css` | Chest, cards, opening objective |
| `src/casual/screens/levelEnd.css` | Victory card and celebration |
| `src/casual/styles/currency.css` | Pot, coins, glass, needle, goal |
| `src/casual/styles/bottles.css` | Pending cup, two-bottle pair, lips |
| `src/casual/styles/pour.css` | Bank action, streams, ambient, fractures |
| `src/casual/styles/direction.css` | Left/right card language |
| `src/casual/styles/onboarding.css` | Teaching layout |
| `src/casual/styles/chrome.css` | Dev reset, level start, intros, factor info, layered jar |

Later files still override earlier ones. Do not sort selectors across files.

Vite loads the imports. Tests inline them through `tests/helpers/styles.mjs` because the mounted page does not resolve CSS `@import`.
