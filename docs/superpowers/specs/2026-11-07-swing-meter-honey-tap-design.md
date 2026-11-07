# Swing Meter Honey Tap

**Date:** 7 November 2026  
**Status:** Approved  
**Scope:** In-level swing meter only (not win scoreboard)

## Goal

Attach `public/honey-tap.png` under the swing meter so meter + tap read as one fixture, and thicken the meter track border.

## Placement

### Honey tap (below)
- Decorative `<img>` inside `.sgv-meter` (`aria-hidden`, `pointer-events: none`, `draggable={false}`)
- Display height **54.8px** (⅕ of the 274px asset), width auto (asset is 419×274, RGBA)
- Horizontally centered on the meter
- Top edge overlaps the track bottom by **1.6px** (⅕ of the 8px asset overlap)
- `z-index`: track &lt; tap &lt; multipliers / marker

### Honeycomb (above)
- Decorative `<img class="sgv-honeycomb">` from `public/honeycomb.png` (1758×464, RGBA)
- `width: 100%` of the meter so it scales to fit
- Bottom **117 native px** overlap the track (scales with the 0.9× display width)
- Crown height reserved via `.sgv-meter { margin-top: calc(90% * 347 / 1758) }` (464−117)
- Same z-band as the tap (above track, below needle/multipliers)
- SWING caption hidden — honeycomb crowns the meter

## Border

- `.sgv-meter-track` border **5px → 7px**, color **`#f7b536`** (sampled from the tap’s top rim)
- `border-radius` **22px → 24px** to keep the pill shape

## Out of scope

- Pour / fill animation
- Win-screen scoreboard tap