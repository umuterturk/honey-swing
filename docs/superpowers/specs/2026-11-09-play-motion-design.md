# Play Motion

**Date:** 9 November 2026
**Status:** Approved
**Scope:** Move the play-path animation wiring out of `SimplifiedGame`.

## Module

`src/casual/playMotion.js` starts the card or bank presentation after a commit. It also names the outcome, the feedback token, and the status line.

`startPlayMotion` receives the DOM nodes, the committed change, and the screen setters. It returns a cancel function for the timelines it started. A missing root or source still completes immediately. A bank that reaches the target still celebrates. A falling factor, a Snap, or a Zero Break still plays the factor reset.

The module does not step the engine or write the session. `SimplifiedGame` still commits first, then calls it.
