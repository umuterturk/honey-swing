# Factor Pill Info Popup

**Date:** 7 November 2026  
**Status:** Approved  
**Scope:** Tap Swing / Flip multiplier pills for a short how-it-works popup. Jackpot pill unchanged.

## Goal

When the player taps a visible **More Flower** (Swing) or **More Bee** (Flip) pill, show a small info popup that explains how that multiplier grows — using the same cream-card language as the Save feature intro.

## Decisions

| Topic | Choice |
|-------|--------|
| Triggers | Tap Swing pill or Flip pill when that factor is visible |
| Jackpot | No popup |
| Content | Short how-it-works only (no score math, no “NEW!”) |
| Dismiss | **Got it** button **or** tap outside (scrim); Escape also closes |
| Visual approach | Mini feature card (reuse Save intro chrome) |
| Play lock | Board actions locked while open (`data-factor-info` gate) |

## Content

| Pill | Icon (72×72, same assets as pills) | Title | Copy | Button |
|------|-------------------------------------|-------|------|--------|
| Swing | `/celebration/daisy-2.png` | **More Flower** | Cross 0 for more flowers. | Got it |
| Flip | `/bee-smiling-closed-eyes.png` | **More Bee** | Flip for more bees. | Got it |

Icons sit above the title inside the card (feature-intro icon slot). Same daisy / smiling bee art used on the pills and factor flyers.

## Interaction

### Open

- Swing / Flip pills become real buttons (`type="button"`) with accessible names (e.g. “More Flower info”).
- Disabled while: card/bank animation running, intro gate, level-start overlay, end / victory / fail screens.
- Opening one while another is open swaps content (single dialog instance).

### Close

- Tap **Got it**, tap scrim, or press Escape.
- Restore focus to the pill that opened the dialog.

### While open

- Full-phone overlay over the board (`z-index` aligned with feature intro, ~40).
- Scrim: `#1a1020` at ~0.55 opacity (matches `.sgv-feature-intro-scrim`).
- Phone gets `data-factor-info="true"` so hand / action buttons ignore pointer events (same pattern as `data-intro-gate`).

## Chrome

Reuse feature-intro card styling:

- Centered cream card (`#fffef8`, `#f4e7cf` border, purple-brown text `#704b69`).
- Icon → title (`font-weight: 900`) → one-line copy → gold **Got it** button (`#f0c14a`).
- No demo animation strip, no “NEW!” badge.
- `role="dialog"`, `aria-modal="true"`, labelled by title; primary focus on Got it when opened.

## Surfaces

- `MinimalBoard.jsx` — pill buttons + dialog mount (or thin child component)
- `minimal.css` — `data-factor-info` pointer lock; reuse / light extend feature-intro classes (prefer reuse over parallel skin)
- Parent / board state — `factorInfo: null | 'swing' | 'flip'`; clear on dismiss and on level/end transitions
- Tests — open/close, copy per pill, gated when animating / intro / end

## Out of scope

- Jackpot pill popup
- Changing multiplier rules or flyer motion
- First-time auto-show / coach marks
- Localizing copy beyond the two English lines above

## Success

- Tapping a visible Swing or Flip pill opens the matching card with icon + copy above.
- Got it and scrim both dismiss; play resumes.
- UI matches Save intro look without feeling like a second design system.
