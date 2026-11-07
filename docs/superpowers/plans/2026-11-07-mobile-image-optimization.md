# Mobile Image Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Archive full-res PNGs under `assets/originals/` and ship mobile-resized PNGs in `public/` without changing game URLs.

**Architecture:** Copy current `public/**/*.png` into `assets/originals/`, remove unused files from `public/`, then regenerate remaining `public` PNGs from originals via ImageMagick caps defined in the design spec.

**Tech Stack:** ImageMagick 7 (`magick`), bash, Vite `public/` static assets

## Global Constraints

- Keep PNG filenames/paths for shipped assets
- Never upscale
- Do not modify game JS/CSS except if a mask path is already broken and in scope (it is not)
- Do not touch `.worktrees/`

---

### Task 1: Archive originals

**Files:**
- Create: `assets/originals/**` (mirror of current `public/**/*.png`)

- [ ] Copy all PNGs from `public/` into `assets/originals/` preserving relative paths
- [ ] Confirm `assets/originals/reference.png` and celebration trees exist

### Task 2: Unship unused from `public/`

**Files:**
- Delete from `public/` only (keep under originals): list in design spec

- [ ] Remove unused PNGs from `public/`
- [ ] Confirm `public/` no longer contains `reference.png` / drop assets / unused celebration

### Task 3: Optimize script + regenerate shipped PNGs

**Files:**
- Create: `scripts/optimize-images.sh`
- Modify: `public/**/*.png` (shipped set only)

- [ ] Write script that maps each relative path → long-edge cap and runs `magick`
- [ ] Run script; report before/after total size of `public/`
- [ ] Spot-check `honey-fill-mask.png` still has alpha (`magick identify`)

### Task 4: Verify

- [ ] `npm test` (or focused public-url / honey-win tests)
- [ ] `npm run build` and confirm `dist/` has no `assets/originals` and no `reference.png`
