# Motion Modules

**Date:** 9 November 2026
**Status:** Approved
**Scope:** Split `minimalMotion.js` by effect. Timelines stay presentation-only. `minimalMotion.js` remains the import path.

## Layout

| File | Owns |
|---|---|
| `src/casual/motion/stage.js` | Reduced-motion check, geometry, pour-stream mount, jar fill paint, and the single static-label lock (`clearStatic`) |
| `src/casual/motion/potEquation.js` | Pot equation flyer DOM |
| `src/casual/motion/factorFlyer.js` | Flower and bee flyers, including `flyFactorLabels` |
| `src/casual/motion/reducedOutcomes.js` | Static card and bank summaries that share the label lock |
| `src/casual/motion/cardMotion.js` | Flying card, wasp, heart loss, `animateCardAction` |
| `src/casual/motion/potMotion.js` | Tap pour, pot fracture, snap loss, factor reset |
| `src/casual/motion/bankMotion.js` | `chooseBankPour`, bank pour, target celebration |
| `src/casual/minimalMotion.js` | Re-exports the public functions |

`cardMotion` may call the pot pour and factor flyers. Those files do not call back into card motion. The static-label lock stays one binding in `stage.js`, so a bank pour still clears a card's reduced-motion label.

## Public functions

Unchanged names and arguments: `animateSnapHeartLoss`, `animateCardAction`, `flyFactorLabels`, `animatePotBreak`, `animateSnapLoss`, `animateFactorReset`, `animateTapPour`, `chooseBankPour`, `animateBankPour`, `animateBankTargetCelebrate`.

## Tests

`tests/bank-pour-choice.test.mjs` locks the pure bank-pour choice: timeline when a scored pour can animate, static label under reduced motion, and no pour when the score does not rise or the nodes are missing. Timeline code is not re-tested here; `npm test` covers the game that calls these functions.
