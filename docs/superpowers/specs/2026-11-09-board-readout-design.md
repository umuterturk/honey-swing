# Board Readout

**Date:** 9 November 2026
**Status:** Approved
**Scope:** Move the board's derived HUD values out of `SimplifiedGame`.

## Module

`src/casual/boardReadout.js` exports `boardReadout`. It reads a committed round plus the flags the screen already has: `view`, `feedback`, `animating`, `introGate`, `factorInfo`, `startOpen`, and `pulse`.

It returns the level, deal, victory, finished flag, whether factor info may open, the legal actions, Save and Flip availability, auto-bank, the pot number, cards left, hearts, the visible hand, the Save message, the idle hint, and the win-button label.

A bank pour still uses `visiblePotPayout`. Every other beat shows `view.rawPot`. Animation, the intro gate, a finished round, and an open factor popup still clear the legal actions.

The function does not save, emit events, or start motion. `SimplifiedGame` still owns those.
