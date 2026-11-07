# Swing Meter Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the in-level swing meter into a glass-and-honey channel that matches Pot/Bank jars, with hybrid gold+glass rim and two-step near-Snap danger — without changing assets, layout, scale, or gameplay.

**Architecture:** Pure helper `edgeDangerLevel` in `meterScale.js` drives `data-edge-danger="warn"|"hot"` on `.sgv-meter-track`. All visual change lives in `minimal.css` (track gradient, hybrid rim, tick colors, warn/hot/snap/zero feedback). Honeycomb, tap, wasps, and needle art stay put.

**Tech Stack:** React JSX (`MinimalBoard.jsx`), `minimal.css`, Node test runner (`node --test`)

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-07-swing-meter-visual-redesign-design.md`
- Styling only (+ light danger-level attribute); no new image assets
- No gameplay, scoring, snap-limit, or numeric-scale changes
- No moves/resizes of honeycomb, honey tap, wasps, marker rail, or tick inset (`12px` / `METER_SCALE_INSET_X` sync stays)
- No new text or UI elements
- Geometry stable during animation; honor `prefers-reduced-motion`
- Prefer gradients / borders / inset shadows over new graphics or continuous effects
- Danger levels: `warn` when `|position| === limit - 2`; `hot` when `|position| >= limit - 1`; empty when safe or `!showDanger`

## File map

| File | Responsibility |
|------|----------------|
| `src/casual/meterScale.js` | Add `edgeDangerLevel(position, limit, showDanger)` |
| `src/casual/MinimalBoard.jsx` | Wire helper onto `.sgv-meter-track` `data-edge-danger` |
| `src/casual/minimal.css` | Track, rim, ticks, needle shadow, warn/hot/snap/zero styles |
| `tests/casual-meter.test.mjs` | Unit tests for `edgeDangerLevel` |
| `tests/swing-meter-visual.test.mjs` | CSS + JSX contract assertions for redesign |

---

### Task 1: `edgeDangerLevel` helper

**Files:**
- Modify: `src/casual/meterScale.js`
- Modify: `tests/casual-meter.test.mjs`

**Interfaces:**
- Produces: `edgeDangerLevel(position: number, limit: number, showDanger?: boolean) → '' | 'warn' | 'hot'`
- Consumes: none beyond existing meter scale module

- [ ] **Step 1: Write the failing tests**

Append to `tests/casual-meter.test.mjs`:

```js
import {meterPercent,meterMarks,edgeDangerLevel} from '../src/casual/meterScale.js';

test('edgeDangerLevel is empty when danger UI is off or far from Snap',()=>{
  assert.equal(edgeDangerLevel(6,8,false),'');
  assert.equal(edgeDangerLevel(5,8,true),'');
  assert.equal(edgeDangerLevel(0,8,true),'');
  assert.equal(edgeDangerLevel(-4,8,true),'');
});

test('edgeDangerLevel uses warn then hot near the Snap limit',()=>{
  assert.equal(edgeDangerLevel(6,8,true),'warn');
  assert.equal(edgeDangerLevel(-6,8,true),'warn');
  assert.equal(edgeDangerLevel(7,8,true),'hot');
  assert.equal(edgeDangerLevel(-7,8,true),'hot');
  assert.equal(edgeDangerLevel(8,8,true),'hot');
  assert.equal(edgeDangerLevel(11,8,true),'hot');
});
```

Keep the existing `meterPercent` / `meterMarks` import updated to include `edgeDangerLevel` (single import line).

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/casual-meter.test.mjs`  
Expected: FAIL — `edgeDangerLevel` not exported / not defined

- [ ] **Step 3: Implement helper**

Append to `src/casual/meterScale.js`:

```js
/** Near-Snap visual level for the meter track. Empty string = calm / omit attribute. */
export function edgeDangerLevel(position,limit,showDanger=true){
  if(!showDanger) return '';
  const distance=Math.abs(position);
  if(distance>=limit-1) return 'hot';
  if(distance===limit-2) return 'warn';
  return '';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/casual-meter.test.mjs`  
Expected: PASS (all tests in file)

- [ ] **Step 5: Commit**

```bash
git add src/casual/meterScale.js tests/casual-meter.test.mjs
git commit -m "$(cat <<'EOF'
Add edgeDangerLevel helper for two-step meter danger.

EOF
)"
```

---

### Task 2: Wire `data-edge-danger` on the track

**Files:**
- Modify: `src/casual/MinimalBoard.jsx` (HorizontalMeter track attribute)
- Create: `tests/swing-meter-visual.test.mjs`

**Interfaces:**
- Consumes: `edgeDangerLevel` from `./meterScale.js`
- Produces: `.sgv-meter-track` with `data-edge-danger="warn"|"hot"` or attribute omitted when calm

- [ ] **Step 1: Write the failing contract test**

Create `tests/swing-meter-visual.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>readFileSync(join(root,rel),'utf8');

test('HorizontalMeter maps edge danger through edgeDangerLevel',()=>{
  const board=read('src/casual/MinimalBoard.jsx');
  assert.match(board,/edgeDangerLevel/);
  assert.match(board,/data-edge-danger=\{edgeDangerLevel\(/);
  assert.doesNotMatch(board,/data-edge-danger=\{showDanger&&Math\.abs\(position\)>=limit-2\}/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/swing-meter-visual.test.mjs`  
Expected: FAIL — still uses boolean `>=limit-2` expression

- [ ] **Step 3: Wire the helper**

In `src/casual/MinimalBoard.jsx`:

1. Update the meterScale import:

```js
import {meterPercent,meterMarks,edgeDangerLevel} from './meterScale.js';
```

2. Replace the track `data-edge-danger` prop:

```jsx
<div className="sgv-meter-track" role="img"
  data-edge-danger={edgeDangerLevel(position,limit,showDanger)||undefined}
  aria-label={'Swing position '+directionalValue(position)}>
```

Do not change honeycomb / tap / wasp / marker / multiplier markup or positions.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/swing-meter-visual.test.mjs tests/casual-meter.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/casual/MinimalBoard.jsx tests/swing-meter-visual.test.mjs
git commit -m "$(cat <<'EOF'
Wire two-step edge danger onto the swing meter track.

EOF
)"
```

---

### Task 3: Restyle track, ticks, and needle (calm state)

**Files:**
- Modify: `src/casual/minimal.css` (`.sgv-meter-track`, `.sgv-meter-tick`, `.sgv-meter-tick-zero`, `.sgv-meter-needle` filter if needed)
- Modify: `tests/swing-meter-visual.test.mjs`

**Interfaces:**
- Consumes: existing class names and geometry (`inset:4px 0 auto`, `height:60px`, scale `inset:0 12px`)
- Produces: glass-honey gradient + hybrid gold/glass rim + brown/cream ticks

- [ ] **Step 1: Extend failing CSS contract tests**

Append to `tests/swing-meter-visual.test.mjs`:

```js
test('meter track uses glass-honey gradient and drops pink/purple arcade colors',()=>{
  const css=read('src/casual/minimal.css');
  const track=css.match(/\.sgv-meter-track\{[^}]+\}/)?.[0]??'';
  assert.match(track,/#F3A59A/i);
  assert.match(track,/#D8F4F7/i);
  assert.match(track,/#E8F9FF/i);
  assert.match(track,/#f7b536/i);
  assert.doesNotMatch(track,/#ec6e89/i);
  assert.doesNotMatch(track,/#dec7f2/i);
  assert.doesNotMatch(track,/#9b6e94/i);
  assert.doesNotMatch(track,/#655998/i);
});

test('meter ticks use warm brown and cream zero, not red-danger zero',()=>{
  const css=read('src/casual/minimal.css');
  assert.match(css,/\.sgv-meter-tick\{[^}]*#75462[Ff]/);
  const zero=css.match(/\.sgv-meter-tick-zero\{[^}]+\}/)?.[0]??'';
  assert.doesNotMatch(zero,/#a12f51/i);
  assert.doesNotMatch(zero,/#e14d8d/i);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/swing-meter-visual.test.mjs`  
Expected: FAIL — old pink/purple track and red-tinted zero still present

- [ ] **Step 3: Apply calm-state CSS**

Replace the `.sgv-meter-track` rule (keep `position/inset/height/border-radius` geometry) with:

```css
.sgv-meter-track{
  position:absolute;inset:4px 0 auto;height:60px;border-radius:18px;
  border:5px solid #f7b536;
  background:linear-gradient(90deg,#F3A59A 0%,#FFDCAC 14%,#FDF0CE 32%,#D8F4F7 50%,#FDF0CE 68%,#FFDCAC 86%,#F3A59A 100%);
  box-shadow:
    0 6px 12px #5a7a6840,
    inset 0 0 0 2px #E8F9FF,
    inset 0 3px 5px #ffffffb8,
    inset 0 -5px 7px #c9a56a4d;
}
```

Update ticks:

```css
.sgv-meter-tick{
  position:absolute;top:50%;transform:translate(-50%,-50%);
  color:#75462F;font-size:clamp(10px,2.9vw,13px);font-weight:1000;
  line-height:1;white-space:nowrap;font-variant-numeric:tabular-nums;
  text-shadow:0 1px 2px #fffce5,0 0 3px #fffce5;
}
.sgv-meter-tick-zero{
  color:#FFF3C8;
  text-shadow:0 1px 2px #8a623888,0 0 3px #ffffffd0;
}
```

Needle: keep existing warm `filter:drop-shadow` on `.sgv-meter-needle` unless the new track makes it muddy — then only soften opacity, do not add glow/pulse. Do not change honeycomb / tap / wasp rules.

Do not change `.sgv-honeycomb`, `.sgv-honey-tap`, `.sgv-meter-wasp*` positions or sizes.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/swing-meter-visual.test.mjs tests/casual-meter.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/casual/minimal.css tests/swing-meter-visual.test.mjs
git commit -m "$(cat <<'EOF'
Restyle swing meter track and ticks to glass-and-honey.

EOF
)"
```

---

### Task 4: Warn / hot / Snap / zero-break feedback styles

**Files:**
- Modify: `src/casual/minimal.css` (danger + snap + zero-break + reduced-motion)
- Modify: `tests/swing-meter-visual.test.mjs`

**Interfaces:**
- Consumes: `data-edge-danger="warn"|"hot"`, `.sgv-event-snap`, `.sgv-event-zero_break`
- Produces: graduated coral edge glow; brief Snap flash+shake; cool zero-break; reduced-motion disables animations

- [ ] **Step 1: Write failing feedback contract tests**

Append to `tests/swing-meter-visual.test.mjs`:

```js
test('meter danger styles use warn/hot levels and coral, not magenta arcade glow',()=>{
  const css=read('src/casual/minimal.css');
  assert.match(css,/\.sgv-meter-track\[data-edge-danger="warn"\]/);
  assert.match(css,/\.sgv-meter-track\[data-edge-danger="hot"\]/);
  assert.doesNotMatch(css,/\.sgv-meter-track\[data-edge-danger="true"\]/);
  assert.doesNotMatch(css,/#e94b72/i);
});

test('snap flash and reduced-motion still cover the meter track',()=>{
  const css=read('src/casual/minimal.css');
  assert.match(css,/\.sgv-event-snap\s+\.sgv-meter-track\{[^}]*animation:/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)[\s\S]*\.sgv-event-snap\s+\.sgv-meter-track/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/swing-meter-visual.test.mjs`  
Expected: FAIL — still has `[data-edge-danger="true"]` and `#e94b72`

- [ ] **Step 3: Replace danger / snap / zero CSS**

Remove:

```css
.sgv-meter-track[data-edge-danger="true"]{ ... #e94b72 ... }
```

Add:

```css
.sgv-meter-track[data-edge-danger="warn"]{
  box-shadow:
    0 6px 12px #5a7a6840,
    inset 0 0 0 2px #E8F9FF,
    inset 0 3px 5px #ffffffb8,
    inset 0 -5px 7px #c9a56a4d,
    inset 10px 0 12px #F3A59A66,
    inset -10px 0 12px #F3A59A66;
}
.sgv-meter-track[data-edge-danger="hot"]{
  box-shadow:
    0 6px 12px #5a7a6840,
    inset 0 0 0 2px #E8F9FF,
    inset 0 3px 5px #ffffffb8,
    inset 0 -5px 7px #c9a56a4d,
    inset 12px 0 14px #E87A6Aaa,
    inset -12px 0 14px #E87A6Aaa,
    0 0 10px #F3A59A55;
}
```

Update Snap animation (keep shake distance/timing family; add brief coral flash via box-shadow):

```css
.sgv-event-snap .sgv-meter-track{animation:sgv-meter-snap-flash .4s ease}
@keyframes sgv-meter-snap-flash{
  0%,100%{translate:0 0;filter:none}
  20%,60%{translate:-7px 0;filter:saturate(1.25) brightness(1.05)}
  35%{box-shadow:
    0 6px 12px #5a7a6840,
    inset 0 0 0 2px #E8F9FF,
    inset 0 3px 5px #ffffffb8,
    inset 0 -5px 7px #c9a56a4d,
    inset 14px 0 16px #E25A5Acc,
    inset -14px 0 16px #E25A5Acc,
    0 0 14px #E25A5A66}
  40%,80%{translate:7px 0}
}
```

Remove the old `@keyframes sgv-meter-shake` if unused, or leave it unused-free by deleting both the old animation reference and keyframes.

Keep zero-break cool/neutral (existing cyan-ish `sgv-zero-reset` on needle is fine). Ensure `.sgv-meter-tick-zero` never gets red treatment during zero-break.

In `@media(prefers-reduced-motion:reduce)`, keep:

```css
.sgv-event-snap .sgv-meter-track{animation:none}
```

(alongside existing zero-break / pot rules).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/swing-meter-visual.test.mjs tests/casual-meter.test.mjs tests/motion-order.test.mjs`  
Expected: PASS (motion-order still finds reduced-motion track rule)

- [ ] **Step 5: Commit**

```bash
git add src/casual/minimal.css tests/swing-meter-visual.test.mjs
git commit -m "$(cat <<'EOF'
Add graduated coral danger and Snap flash for the meter.

EOF
)"
```

---

### Task 5: Visual verification screenshots

**Files:**
- None required (dev server + browser). Optional: save captures under a local scratch path — do not commit binary screenshots unless asked.

**Interfaces:**
- Consumes: running `npm run dev` board at a fixed phone viewport (e.g. 390×844)

- [ ] **Step 1: Start the app**

Run: `npm run dev`  
Open the casual board at the same viewport size for before/after mental compare (after is current branch).

- [ ] **Step 2: Capture / inspect states**

At one viewport width, verify:

1. **Neutral** (center / mid-safe): glass-honey track, hybrid gold rim, brown ticks, cream zero, calm — no pink arcade, no edge glow
2. **Near Snap `warn`**: position at `limit-2` with `showDanger` (Level ≥9 / chances on) — soft coral insets both ends
3. **Near Snap `hot`**: position at `limit-1` — stronger coral, still no shake
4. **Snap**: trigger Snap — brief coral flash + short shake; wasps/honeycomb/tap unmoved
5. **Zero**: resting 0 and Zero Break — cream zero, cool flash; not Snap-red
6. **Narrow**: ~320–365px wide — ticks readable, track not jumping, tap/honeycomb alignment intact
7. **Reduced motion**: OS preference on — no continuous/shake flash loops

- [ ] **Step 3: Full test suite smoke**

Run: `npm test`  
Expected: PASS (or only pre-existing unrelated failures — do not leave new meter failures)

- [ ] **Step 4: Mark design status Approved if not already**

In `docs/superpowers/specs/2026-11-07-swing-meter-visual-redesign-design.md`, set:

```md
**Status:** Approved
```

- [ ] **Step 5: Commit status + any CSS polish from screenshot pass**

```bash
git add docs/superpowers/specs/2026-11-07-swing-meter-visual-redesign-design.md src/casual/minimal.css
git commit -m "$(cat <<'EOF'
Approve meter redesign spec after visual verification.

EOF
)"
```

Only include `minimal.css` if the screenshot pass required shadow/desaturation tweaks within spec bounds.

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Symmetrical glass-honey gradient | Task 3 |
| Hybrid gold outer + `#E8F9FF` glass inner | Task 3 |
| Brown ticks + cream/honey zero | Task 3 |
| Needle shadow only (no glow/pulse) | Task 3 |
| Honeycomb / tap / wasps unchanged | Tasks 2–4 (no edits) |
| `warn` / `hot` two-step danger | Tasks 1–2, 4 |
| Snap brief coral flash + shake | Task 4 |
| Zero ≠ Snap; cool zero-break | Tasks 3–4 |
| Reduced motion | Task 4 |
| No geometry / scale / asset changes | Global + Tasks 2–4 |
| Screenshot states | Task 5 |

## Self-review notes

- No TBD/placeholder steps
- `edgeDangerLevel` signatures match across Tasks 1–2
- CSS selectors use `"warn"` / `"hot"` consistently (not boolean `true`)
- Honey-tap placement spec’s 7px rim is intentionally superseded by 5px hybrid rim (called out in design spec)
