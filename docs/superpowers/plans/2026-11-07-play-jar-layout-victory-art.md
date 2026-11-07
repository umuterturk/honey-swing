# Play Jar Layout + Victory Art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Center the pending Pot under the honey tap, put the larger Bank jar at the left edge on the same baseline, and render both with the Victory layered jar stack.

**Architecture:** Extract a shared `VictoryJarArt` layer component (back PNG → masked honey → lights → front PNG + mouth anchor) used by play Pot/Bank and by the win `heroJar`. Switch `.sgv-bottle-pair` from a centered flex row to an absolute-positioned stage so Pot stays true screen-center regardless of Bank width. Keep pour lip/mouth selectors working for `animateBankPour`.

**Tech Stack:** React JSX (`MinimalBoard.jsx`), `createElement` win screens (`levelScreens.js`), CSS in `minimal.css`, Node test runner source assertions in `tests/casual-ui-currency.test.mjs`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-07-play-jar-layout-victory-art-design.md`
- Reuse only Victory jar assets: `public/empty-complete-jar.png`, `public/empty-front-jar.png`, `public/honey-fill-mask.png`
- Bank ~**1.35–1.5×** Pot width; same **top** edge; Pot `left: 50%` + `translateX(-50%)`; Bank near left content padding
- Absolute slots in `.sgv-bottle-pair` (not flex centering / spacer / grid)
- Keep bottom BANK button, assistive live region, fill-percent formulas, meter/tap placement unchanged
- Keep pour anchors: `.sgv-pot-pour-lip` on Pot, `.sgv-chest-mouth` on Bank; measurement host for pour scale remains queryable (`.sgv-chest-body` or Bank root — Task 3 locks the selector)
- Do not change victory chrome (scrim, praise, scoreboard, confetti, foliage)
- **Never use browser / browser MCP / screenshot automation**; ask the human for visual confirmation
- **Stop and ask the human for confirmation after every task** before starting the next task
- Do not commit unless the human explicitly asks to commit that task’s changes
- Working tree may contain unrelated uncommitted WIP — do not revert or fold unrelated files; touch only files listed in each task

---

## File map

| File | Responsibility |
|------|----------------|
| `src/casual/VictoryJarArt.jsx` | Shared Victory jar layer stack + optional fill height |
| `src/casual/MinimalBoard.jsx` | `PendingPot` / `GlassChest` consume `VictoryJarArt`; drop CSS bottle/chest body art |
| `src/casual/levelScreens.js` | Win `heroJar` consumes same stack (or thin wrapper) so asset order cannot diverge |
| `src/casual/minimal.css` | Absolute bottle-pair slots; shared `.sgv-jar-*` rules usable outside `.sgv-honey-win`; play label overlays |
| `src/casual/minimalMotion.js` | Only if Bank measurement selector must change after markup swap |
| `tests/casual-ui-currency.test.mjs` | Source/CSS expectations for layout, Victory art, anchors |
| `tests/honey-win.test.mjs` | Only if shared jar export changes win markup class names (keep assertions green) |

---

### Task 1: Shared `VictoryJarArt` + failing play-jar tests

**Files:**
- Create: `src/casual/VictoryJarArt.jsx`
- Modify: `tests/casual-ui-currency.test.mjs`
- Test: `tests/casual-ui-currency.test.mjs`

**Interfaces:**
- Produces:
  - `VictoryJarArt({ fillPercent=0, className='', showIdleStars=false, mouthClassName='sgv-chest-mouth' })` → JSX element
  - Layer order (DOM): `.sgv-jar-back` → `.sgv-jar-honey-layer.sgv-jar-mask` (`.sgv-fluid-fill` with height) → `.sgv-jar-lights.sgv-jar-mask` → `.sgv-jar-front` → optional idle stars → mouth span
  - Assets: `/empty-complete-jar.png`, `/empty-front-jar.png`; mask stays CSS `honey-fill-mask.png`

- [ ] **Step 1: Write the failing test**

Append to `tests/casual-ui-currency.test.mjs`:

```js
test('play jars use Victory layered art and absolute Bank-left / Pot-center slots',()=>{
  const art=read('src/casual/VictoryJarArt.jsx');
  const board=read('src/casual/MinimalBoard.jsx');
  const screens=read('src/casual/levelScreens.js');
  const css=read('src/casual/minimal.css');
  assert.match(art,/export function VictoryJarArt/);
  assert.match(art,/empty-complete-jar\.png/);
  assert.match(art,/empty-front-jar\.png/);
  assert.match(art,/sgv-jar-honey-layer/);
  assert.match(art,/sgv-jar-lights/);
  assert.match(board,/VictoryJarArt/);
  assert.match(board,/className="sgv-pot-pour-lip"/);
  assert.match(board,/sgv-chest-mouth|mouthClassName/);
  assert.match(screens,/VictoryJarArt|from ['\"]\.\/VictoryJarArt/);
  assert.match(css,/\.sgv-bottle-pair\{[\s\S]*?position:\s*relative/);
  assert.match(css,/\.sgv-bottle-pair \.sgv-pending-pot\{[\s\S]*?left:\s*50%/);
  assert.match(css,/\.sgv-bottle-pair \.sgv-bank-bottle\{[\s\S]*?left:\s*0/);
  assert.match(css,/\.sgv-jar-mask\{[\s\S]*?honey-fill-mask\.png/);
  assert.doesNotMatch(board,/sgv-pot-bottle-glass|sgv-pot-liquid/);
});
```

Also update the existing test `'two adjacent bottles...'` so it no longer requires:

```js
assert.match(board,/className="sgv-pot-liquid"/);
assert.match(css,/\.sgv-bottle-pair\{[\s\S]*?display:flex/);
```

Replace those two asserts with:

```js
assert.match(board,/VictoryJarArt/);
assert.match(css,/\.sgv-bottle-pair\{[\s\S]*?position:\s*relative/);
```

Keep the remaining asserts in that test (PendingPot export, bank command, etc.).

Update `'only interactive bankable Pots shine...'` to drop CSS selectors that target `.sgv-pot-bottle-glass` / `.sgv-pot-glass-shine` if those nodes are removed — retarget shine to `.sgv-pot-bankable .sgv-jar-front` (or delete shine asserts if bankable shine is deferred; prefer retarget):

```js
assert.match(css,/\.sgv-bottle-pair \.sgv-pot-bankable/);
```

Keep keyframe name asserts only if those keyframes remain; otherwise remove the keyframe asserts in the same edit.

Update `'no visual bottle lids...'` to still require pour lip + chest mouth; drop `sgv-chest-rim` asserts if rim markup is gone, or keep `doesNotMatch` for rim class on board.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/casual-ui-currency.test.mjs`

Expected: FAIL — `VictoryJarArt.jsx` missing and/or old pot-liquid / flex asserts fail after Step 1 edits.

- [ ] **Step 3: Create `VictoryJarArt.jsx`**

```jsx
export function VictoryJarArt({
  fillPercent=0,
  className='',
  showIdleStars=false,
  mouthClassName='sgv-chest-mouth'
}){
  const fill=Math.max(0,Math.min(100,Number(fillPercent)||0));
  return (
    <div className={'sgv-chest-art sgv-victory-jar-art '+className} aria-hidden="true">
      <img className="sgv-jar-layer sgv-jar-back" src="/empty-complete-jar.png" alt="" draggable={false}/>
      <div className="sgv-jar-mask sgv-jar-honey-layer">
        <div className="sgv-fluid-fill" style={{height:fill+'%',opacity:fill>0?1:0}}>
          <span className="sgv-fluid-surface"/>
          <span className="sgv-fluid-bubble sgv-fluid-bubble-a"/>
          <span className="sgv-fluid-bubble sgv-fluid-bubble-b"/>
          <span className="sgv-fluid-bubble sgv-fluid-bubble-c"/>
        </div>
      </div>
      <div className="sgv-jar-mask sgv-jar-lights" aria-hidden="true">
        <span className="sgv-honey-internal-light"/>
        <span className="sgv-honey-reflection"/>
        <span className="sgv-honey-gleam-sweep"/>
      </div>
      <img className="sgv-jar-layer sgv-jar-front" src="/empty-front-jar.png" alt="" draggable={false}/>
      {showIdleStars?(
        <div className="sgv-honey-idle-stars" aria-hidden="true">
          <span className="sgv-honey-idle-star sgv-honey-idle-star-a">✦</span>
          <span className="sgv-honey-idle-star sgv-honey-idle-star-b">✦</span>
          <span className="sgv-honey-idle-star sgv-honey-idle-star-c">✦</span>
          <span className="sgv-honey-idle-star sgv-honey-idle-star-d">✦</span>
          <span className="sgv-honey-idle-star sgv-honey-idle-star-e">✦</span>
          <span className="sgv-honey-idle-star sgv-honey-idle-star-f">✦</span>
        </div>
      ):null}
      <span className={mouthClassName}/>
    </div>
  );
}
```

- [ ] **Step 4: Run the new test alone — expect still FAIL on MinimalBoard / CSS / levelScreens wiring**

Run: `node --test tests/casual-ui-currency.test.mjs --test-name-pattern "play jars use Victory"`

Expected: FAIL on `MinimalBoard` / CSS / `levelScreens` asserts (file exists; wiring incomplete).

- [ ] **Step 5: Ask human to confirm Task 1 before Task 2** (do not commit unless asked)

---

### Task 2: Wire Pot + Bank + win hero to `VictoryJarArt`

**Files:**
- Modify: `src/casual/MinimalBoard.jsx`
- Modify: `src/casual/levelScreens.js`
- Test: `tests/casual-ui-currency.test.mjs`, `tests/honey-win.test.mjs`

**Interfaces:**
- Consumes: `VictoryJarArt` from Task 1
- Produces:
  - `PendingPot` renders `VictoryJarArt` + `POT` label + amount + `.sgv-pot-pour-lip`
  - `GlassChest` renders `VictoryJarArt` + `GoalProgress` + a measurement host with class `sgv-chest-body` wrapping or sibling to the art (required by `animateBankPour` today)
  - `heroJar()` in `levelScreens.js` uses `VictoryJarArt` with `showIdleStars` and `className="sgv-honey-hero-art"`

- [ ] **Step 1: Rewrite `PendingPot` body in `MinimalBoard.jsx`**

Add import:

```js
import {VictoryJarArt} from './VictoryJarArt.jsx';
```

Replace the inner CSS-bottle markup with:

```jsx
export function PendingPot({value,target=24,bankable=false,onBank,className='',interactive=true}){
  const fill=fluidFillPercent(value,target,{max:76,smooth:true});
  const Tag=interactive?'button':'div';
  return <Tag type={interactive?'button':undefined}
    className={'sgv-pending-pot sgv-pot-bottle'+(bankable&&interactive?' sgv-pot-bankable':'')+(!interactive?' sgv-pot-display':'')+' '+className}
    disabled={interactive?!bankable:undefined}
    onClick={interactive?event=>onBank?.(event.currentTarget):undefined}
    aria-label={!interactive?'Pot has '+value+' pending drops':bankable
      ?'Tap Pot to bank '+value+' drops'
      :'Pot has '+value+' potential drops. Banking not yet available'}>
    <VictoryJarArt fillPercent={fill} className="sgv-pot-victory-art"/>
    <span className="sgv-pot-pour-lip" aria-hidden="true"/>
    <span className="sgv-pot-label">POT</span>
    <span className="sgv-pot-amount"><DropletIcon className="sgv-pot-drop"/>{value}</span>
  </Tag>;
}
```

- [ ] **Step 2: Rewrite `GlassChest` in `MinimalBoard.jsx`**

```jsx
export function GlassChest({banked,target}){
  const fill=fluidFillPercent(banked,target,{max:78});
  return <div className="sgv-chest-area sgv-bank-bottle"
    aria-label={banked+' of '+target+' drops secured'} data-gold={banked}>
    <div className="sgv-chest-glow" aria-hidden="true"/>
    <div className="sgv-chest-body" aria-hidden="true">
      <VictoryJarArt fillPercent={fill} className="sgv-bank-victory-art"/>
    </div>
    <span className="sgv-chest-mouth" aria-hidden="true"/>
    <GoalProgress banked={banked} target={target}/>
  </div>;
}
```

Note: `VictoryJarArt` already includes a mouth span. Prefer **one** visible mouth for pour targeting — either:

- pass `mouthClassName="sgv-chest-mouth"` only inside Bank art and remove the extra sibling mouth, **or**
- pass `mouthClassName="sgv-honey-mouth"` on art and keep the sibling `.sgv-chest-mouth` for pour

Lock to: Bank art uses `mouthClassName="sgv-chest-mouth"` and **do not** duplicate a second mouth sibling. Pot art mouth can be `sgv-honey-mouth` (unused by pour); Pot pour still uses `.sgv-pot-pour-lip`.

So Bank becomes:

```jsx
<div className="sgv-chest-body" aria-hidden="true">
  <VictoryJarArt fillPercent={fill} className="sgv-bank-victory-art" mouthClassName="sgv-chest-mouth"/>
</div>
<GoalProgress banked={banked} target={target}/>
```

- [ ] **Step 3: Refactor `heroJar` in `levelScreens.js`**

Because `levelScreens.js` is `createElement`-based, either:

**Option A (preferred):** import React and the JSX component if the module already supports it via the app bundler — check how other JSX imports work from `.js` files. If Vite resolves JSX from JS imports, use:

```js
import {VictoryJarArt} from './VictoryJarArt.jsx';
```

and in `heroJar`:

```js
function heroJar(){
  return createElement(VictoryJarArt,{
    fillPercent:0,
    className:'sgv-honey-hero-art',
    showIdleStars:true,
    mouthClassName:'sgv-chest-mouth sgv-honey-mouth'
  });
}
```

Win fill height continues to be driven by CSS / GSAP on `.sgv-fluid-fill` inside the hero art (existing win motion). Keep `fillPercent={0}` as the mount default.

If importing JSX into `levelScreens.js` breaks tests, duplicate is forbidden by spec — instead move `VictoryJarArt` to `VictoryJarArt.js` using `createElement` only (no JSX), and have `MinimalBoard.jsx` import that. Prefer createElement shared module if any loader friction appears:

```js
// src/casual/VictoryJarArt.js
import {createElement} from 'react';
export function VictoryJarArt(props){ /* same tree via createElement */ }
```

Then delete the `.jsx` file or re-export from it. Task 1 file path becomes `VictoryJarArt.js` if this path is taken — update the test path asserts accordingly in the same task.

- [ ] **Step 4: Run tests**

Run: `node --test tests/casual-ui-currency.test.mjs tests/honey-win.test.mjs tests/level-win.test.mjs tests/hotfix-regressions.test.mjs`

Expected: markup/source asserts for Victory art pass; CSS absolute-slot asserts may still fail until Task 3; honey-win jar layer asserts still pass.

- [ ] **Step 5: Ask human to confirm Task 2 before Task 3**

---

### Task 3: Absolute layout CSS + shared jar layer styles

**Files:**
- Modify: `src/casual/minimal.css`
- Modify: `tests/casual-ui-currency.test.mjs` (goal-progress position if needed)
- Test: `tests/casual-ui-currency.test.mjs`

**Interfaces:**
- Consumes: play markup classes from Task 2 (`.sgv-bottle-pair`, `.sgv-pending-pot`, `.sgv-bank-bottle`, `.sgv-victory-jar-art`, `.sgv-jar-*`)
- Produces: absolute slots; Bank larger than Pot; shared mask rules not gated only under `.sgv-honey-win`

- [ ] **Step 1: Lift shared jar layer CSS out of `.sgv-honey-win`-only selectors**

Duplicate or broaden these rules so they apply to `.sgv-victory-jar-art` as well as `.sgv-honey-win .sgv-honey-hero-art`:

- `.sgv-jar-layer`, `.sgv-jar-mask` (position, mask-image URL, mask-size, translateY/scale)
- `.sgv-jar-back|honey-layer|lights|front` z-index / front opacity
- `.sgv-jar-honey-layer .sgv-fluid-fill` gradient
- Internal light / reflection / gleam absolute rules

Keep win-only filters, `::before` glow, and idle-star animation under `.sgv-honey-win`.

Concrete pattern:

```css
.sgv-victory-jar-art,
.sgv-honey-win .sgv-honey-hero-art{
  position:relative;width:100%;height:100%;overflow:visible;
}
.sgv-jar-layer,
.sgv-jar-mask{
  position:absolute;inset:0;width:100%;height:100%;pointer-events:none;
}
.sgv-jar-layer{object-fit:fill;display:block;user-select:none}
.sgv-jar-mask{
  mask-image:url('/honey-fill-mask.png');
  -webkit-mask-image:url('/honey-fill-mask.png');
  mask-size:100% 100%;
  -webkit-mask-size:100% 100%;
  mask-position:50% 50%;
  -webkit-mask-position:50% 50%;
  mask-repeat:no-repeat;
  -webkit-mask-repeat:no-repeat;
  transform-origin:50% 50%;
  transform:translateY(7%) scale(0.82);
}
.sgv-jar-back{z-index:1}
.sgv-jar-honey-layer{z-index:2}
.sgv-jar-lights{z-index:3}
.sgv-jar-front{z-index:4;opacity:.78}
```

Remove obsolete duplicate blocks that only lived under `.sgv-honey-win .sgv-jar-*` once the shared rules cover them (keep win-specific overrides).

- [ ] **Step 2: Replace `.sgv-bottle-pair` flex layout with absolute stage**

Replace the current `.sgv-bottle-pair` / child flex rules with:

```css
.sgv-bottle-pair{
  position:relative;z-index:2;flex:1;min-height:0;min-width:0;
  width:100%;max-width:480px;
  /* Stage height must fit Bank jar; Pot/Bank share bottom edge */
  min-height:clamp(150px,28dvh,230px);
  padding:4px 0 clamp(8px,2dvh,18px);
  display:block;
}
.sgv-bottle-pair .sgv-pending-pot{
  position:absolute;left:50%;bottom:0;
  transform:translateX(-50%);
  width:clamp(96px,27vw,130px);
  height:clamp(120px,22dvh,162px);
  margin:0;border:0;border-radius:0;background:none;
  padding:0;display:block;overflow:visible;
  box-shadow:none;appearance:none;
  pointer-events:auto;touch-action:manipulation;
  color:#865a3b;text-shadow:none;cursor:pointer;
  transform-origin:50% 82%;will-change:transform;
  z-index:3;
}
.sgv-bottle-pair .sgv-bank-bottle{
  position:absolute;left:0;bottom:0;
  width:clamp(130px,36vw,190px); /* ~1.35–1.5× Pot */
  height:clamp(162px,30dvh,230px);
  z-index:2;
}
.sgv-bottle-pair .sgv-chest-body{
  position:absolute;inset:0;width:100%;height:100%;
}
.sgv-bottle-pair .sgv-victory-jar-art,
.sgv-bottle-pair .sgv-chest-art{
  position:absolute;inset:0;width:100%;height:100%;
  max-width:none;max-height:none;filter:drop-shadow(0 6px 8px #488c665a);
}
```

Keep Pot label/amount absolute overlays readable over glass (reuse existing top % rules; tweak if Victory proportions bury them).

Re-anchor `.sgv-bottle-pair .sgv-goal-progress` to remain centered on Bank glass without covering the mouth — e.g. `left:50%; top:55%; transform:translate(-50%,-50%)` (update the existing currency test that expects `top:50%` if the value changes).

Narrow viewport: add a max-width rule that shrinks Bank first:

```css
@media(max-width:365px){
  .sgv-bottle-pair .sgv-bank-bottle{width:118px;height:148px}
  .sgv-bottle-pair .sgv-pending-pot{width:88px;height:110px}
}
```

Ensure Pot center stays `left:50%` in all breakpoints.

Remove obsolete `.sgv-bottle-pair .sgv-pot-bottle-glass` / `::before` cork-base rules that no longer apply, or leave harmless if unused.

- [ ] **Step 3: Bankable shine retarget (if interactive Pot still supports bankable class)**

```css
.sgv-bottle-pair .sgv-pot-bankable .sgv-jar-front{
  filter:brightness(1.08);
}
```

Keep or delete breathe/shine keyframes to match updated tests from Task 1.

- [ ] **Step 4: Verify `animateBankPour` selectors**

Confirm `minimalMotion.js` still finds:

- `root.querySelector('.sgv-chest-body')`
- `root.querySelector('.sgv-chest-mouth')`
- `source.querySelector('.sgv-pot-pour-lip')`

If mouth is inside `.sgv-chest-body`, `querySelector` on root still finds it. No motion change required unless a selector breaks — then update only the broken selector to `.sgv-bank-bottle .sgv-chest-mouth`.

- [ ] **Step 5: Run tests**

Run: `node --test tests/casual-ui-currency.test.mjs tests/honey-win.test.mjs tests/level-win.test.mjs tests/hotfix-regressions.test.mjs tests/casual-onboarding.test.mjs`

Expected: PASS for layout/Victory asserts; honey-win mask/front opacity asserts still PASS.

- [ ] **Step 6: Ask human for visual confirmation on device/simulator** (Pot under tap, Bank left, same baseline, Bank larger, Victory art). Do not use browser MCP.

- [ ] **Step 7: Ask human to confirm Task 3 complete** (commit only if asked)

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Pot centered under tap (`left:50%` + translate) | Task 3 |
| Bank at left safe/content edge | Task 3 |
| Same baseline | Task 3 (`bottom:0` both) |
| Absolute slots | Task 3 |
| Both jars Victory stack | Tasks 1–2 |
| Bank 1.35–1.5× Pot | Task 3 widths |
| Shared markup so win/play do not diverge | Tasks 1–2 |
| Pour lip / Bank mouth preserved | Task 2 (+ Task 3 verify) |
| Bottom BANK unchanged | no task (untouched) |
| Victory chrome out of scope | no task |
| Narrow viewport scale Bank first | Task 3 media query |
| Acceptance: reduced-motion pour still settles | Task 3 selector verify + existing motion tests |

## Plan self-review

- No TBD/placeholder steps; code blocks included for component, CSS, and tests.
- `VictoryJarArt` signature consistent across Tasks 1–2.
- Mouth / `.sgv-chest-body` pour contract called out explicitly.
- Unrelated WIP called out in Global Constraints.
