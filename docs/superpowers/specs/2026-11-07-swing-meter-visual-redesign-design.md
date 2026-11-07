# Swing Meter Visual Redesign

**Date:** 7 November 2026  
**Status:** Approved  
**Scope:** In-level swing meter visual styling only (not win scoreboard, not engine rules)

## Goal

Restyle the swing meter so it reads as part of the same soft, glossy honey-collection machine as the Pot/Bank glass jars, honeycomb crown, and honey tap — replacing the saturated pink/purple arcade track without changing gameplay, layout, assets, or numeric scale.

## Approach

**CSS-first restyle + light data attributes.** Modify existing `.sgv-meter-track` / tick / needle / danger styles in `minimal.css`. Extend the existing `data-edge-danger` wiring in `HorizontalMeter` from a boolean to two near-Snap levels. No new image assets; no duplicate meter skin.

## Decisions

| Topic | Choice |
|-------|--------|
| Frame | Hybrid: thinner golden outer rim + pale blue glass inner channel |
| Zero tick | Cream/honey accent (calm, distinct from Snap; not brown-only, not red) |
| Near-Snap | Two-step escalation (`warn` then `hot`) from distance to level limit |
| Assets | Keep honeycomb, honey tap, wasps, needle honeycomb art; positions unchanged |
| Implementation | Restyle existing classes; no parallel visual system |

## 1. Meter track

Replace the pink/purple gradient and purple drop shadow with a symmetrical glass-and-honey gradient:

| Position | Color | Role |
|---|---|---|
| 0% | `#F3A59A` | Soft coral danger |
| 14% | `#FFDCAC` | Warm amber warning |
| 32% | `#FDF0CE` | Light honey cream |
| 50% | `#D8F4F7` | Pale glass blue (neutral) |
| 68% | `#FDF0CE` | Light honey cream |
| 86% | `#FFDCAC` | Warm amber warning |
| 100% | `#F3A59A` | Soft coral danger |

Gradient must stay symmetrical around zero. Avoid saturated red, purple, and pink backgrounds at rest.

## 2. Hybrid glass frame

The track is a shallow rounded glass channel that still seats against the honey tap:

- **Outer rim:** thinner golden border in the `#F7B536` family (same language as the honey-tap join; supersedes the solid 7px arcade-bar rim from the honey-tap placement spec so glass can read through)
- **Inner channel:** pale blue-white (`#E8F9FF`) highlight / inset edge matching Pot/Bank glass
- Soft white reflection along the upper interior
- Slightly darker warm lower interior for depth
- Soft diffuse under-shadow (low opacity) — no thick purple drop shadow, heavy outline, or excessive glow
- Keep current track geometry (height, absolute inset, radius family, scale insets) so honeycomb / tap / wasps / marker rail do not shift

## 3. Numbers and needle

### Numbers

- Non-zero ticks: warm brown `#75462F` with a subtle white highlight/shadow for readability on the glass track
- Equal spacing and alignment preserved (same `meterPercent` / `12px` inset / marker rail sync)
- Scale values and mark set unchanged
- **Zero tick:** cream/honey accent (brighter than brown ticks; never coral/red). Must not read as Snap danger at rest

### Honeycomb needle

- Keep `needle-honeycomb-cell.png`, size, shape, and movement
- Retain/tune the existing warm `filter: drop-shadow` for separation from the track (no permanent glow or pulsing)
- Optional slight desaturation only if screenshots show it too hot against the new center — default is shadow-only tweaks

## 4. Honeycomb, tap, and wasps

Keep all existing image assets and placements:

- Honeycomb crown above the meter
- Honey tap beneath the meter
- Wasps at the extremes (Snap danger indicators)

Visual connection to the track comes from the hybrid gold rim and shared soft shadows — not from moving or replacing art.

## 5. Danger feedback

Resting appearance stays calm. Stronger danger only when the needle approaches the level Snap limit (`showDanger` / `showChances` gating unchanged). Left and right stay symmetrical.

| State | Trigger | Visual |
|---|---|---|
| Safe | Far from limit, or danger UI off | Glass track + hybrid rim only |
| Near Snap — `warn` | `showDanger` and `\|position\| === limit - 2` | Soft coral/amber inset on both ends; restrained warm glow |
| Near Snap — `hot` | `showDanger` and `\|position\| >= limit - 1` | Stronger coral inset + warmer edge glow; still no flash/shake |
| Snap | Existing `.sgv-event-snap` | Brief coral/red flash on track + keep existing short shake; no continuous loop |
| Exact zero / Zero Break | Resting at 0, or `.sgv-event-zero_break` | Cream/honey zero tick; cool/neutral zero-break flash (not red) |

### Wiring

In `HorizontalMeter` (`MinimalBoard.jsx`), replace:

```js
data-edge-danger={showDanger&&Math.abs(position)>=limit-2}
```

with a two-level attribute, e.g.:

- omit / empty / `false` when safe or `!showDanger`
- `data-edge-danger="warn"` when `|position| === limit - 2`
- `data-edge-danger="hot"` when `|position| >= limit - 1`

CSS selectors target those values. No changes to snap limit rules, scoring, or when wasps/hearts appear.

Respect `prefers-reduced-motion`: disable shake/flash animations as today’s reduced-motion block already does for snap/zero-break.

## 6. Material vocabulary

| Material | Treatment |
|---|---|
| Glass | Pale blue, translucent, white reflections |
| Honey / gold | Golden yellow, amber, soft highlights (rim + tap join) |
| Text | Warm dark brown; zero = cream/honey accent |
| Danger | Soft coral at rest ends; stronger red/coral only on Snap flash |
| Shadows | Soft, diffuse, low opacity |
| Borders | Rounded, layered, subtle highlights |

## 7. Constraints

- Styling changes only (plus the light danger-level attribute)
- No new image assets
- No gameplay or scoring changes
- No changes to meter numeric scale or mark positions
- No changes to existing images’ positions
- No new text or UI elements
- Preserve existing animations/interactions except the danger restyle and Snap flash color alignment above
- Keep meter geometry stable during animation (no resize/jump)
- Maintain readability on narrow portrait mobile
- Respect reduced-motion preferences
- Avoid expensive continuous visual effects
- Prefer gradients, borders, inset shadows, and pseudo-elements over new graphics

## Surfaces

- `src/casual/minimal.css` — track, rim/depth, ticks, needle shadow, `warn`/`hot`/snap/zero styles, reduced-motion
- `src/casual/MinimalBoard.jsx` — `HorizontalMeter` `data-edge-danger` levels
- Tests — update only if anything asserts the old boolean `true` attribute (none expected beyond visual)

## Out of scope

- New warning indicators or icons
- Replacing honeycomb / tap / wasp / needle art
- Win-screen scoreboard meter
- Changing snap limits, factor rules, or wasp→heart Snap motion (separate specs)
- Layout redesign of the meter section
- Moving or resizing the honey tap / honeycomb (placement remains per honey-tap design)

## Acceptance

1. Meter no longer looks like a separate pink arcade component.
2. Glass appearance matches Pot/Bank jar language.
3. Honeycomb, tap, and wasp artwork remain unchanged in asset and placement.
4. Honeycomb needle stays clearly distinguishable across the whole track.
5. Every meter number remains readable; exact zero is not mistaken for Snap.
6. Both danger regions are visually symmetrical.
7. Snap danger is obvious without dominating the resting UI.
8. Meter does not resize, shift, or jump during gameplay.
9. Design works on narrow mobile portrait screens.
10. Before/after screenshots at the same viewport cover neutral, near-Snap (`warn` + `hot`), and Snap states.

## Success

The meter feels like a **single polished honey-collection mechanism** with the honeycomb and tap — not a separate arcade gauge placed under a honeycomb.
