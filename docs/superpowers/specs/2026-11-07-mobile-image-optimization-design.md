# Mobile Image Optimization

**Date:** 7 November 2026  
**Status:** Approved  
**Scope:** Archive full-res PNG masters outside the Vite package; ship resized/compressed PNGs for mobile.

## Goal

Cut download weight of game art without changing asset URLs, formats, or game code. Keep original masters in-repo as non-packaged reference.

## Decisions

| Topic | Choice |
|-------|--------|
| Format | Keep PNG (same filenames); no WebP |
| Originals location | `assets/originals/` mirroring `public/` paths |
| Packaging | Originals live outside `public/` so Vite never ships them |
| Optimization tool | ImageMagick `magick` |
| Resize target | ~3× on-screen CSS size; never upscale |
| Unused art in `public/` | Remove from `public/` (keep only under `assets/originals/`) |
| `icon.svg` | Unchanged |

## Unship from `public/` (originals only)

Design refs / unused runtime art:

- `reference.png`, `actual.png`
- `honey-jar.png`, `bee-smiling-open-hands-jump.png`
- `drop1.png`, `drop-small.png`, `drop-long.png`, `drop-fat.png`, `drop-fat-curved.png`
- `celebration/waterfall.png`, `celebration/bush-biggest.png`
- `celebration/cloud-small.png`, `celebration/cloud-big.png`, `celebration/cloud-biggest.png`
- `celebration/leaf-small.png`

## Shipped assets — max long-edge caps (px)

Caps are ~3× display size. Magick must not enlarge.

| Asset | Cap (long edge) |
|-------|-----------------|
| `wasp-looking-right.png` | 160 |
| `needle-honeycomb-cell.png` | 160 |
| `honey-tap.png` | 180 |
| `bee-smiling-closed-eyes.png` | 96 |
| `celebration/daisy-*.png` | 96 |
| Other celebration foliage | 480 |
| `empty-complete-jar.png`, `empty-front-jar.png`, `honey-fill-mask.png` | 750 |
| `honeycomb.png` | 1200 |
| `score-board.png` | 1200 |
| `victory-slogan-underline.png` | 720 |
| `victory-slogan-side-drops-left.png` | 200 |

Default for any other shipped PNG: long edge ≤ 1200.

## Magick pipeline

From `assets/originals/<path>` → `public/<path>`:

1. Resize with `>` (shrink only) to the cap
2. Strip profiles/comments
3. Write PNG with compression (e.g. `-define png:compression-level=9`)

Preserve alpha. Do not change color type in a way that breaks CSS masks (`honey-fill-mask.png`).

## Script

`scripts/optimize-images.sh` regenerates all shipped PNGs from originals. Idempotent; safe to re-run after dropping new masters into `assets/originals/`.

## Out of scope

- WebP / AVIF conversion
- Code path changes
- Touching `.worktrees/`
- Committing unless asked
