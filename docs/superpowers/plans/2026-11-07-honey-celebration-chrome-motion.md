# Honey Celebration Chrome & Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the win celebration chrome and GSAP timeline so honey fill is the 2.0s hero event, with Hiveful decorations, `score-board.png` (“Honey Collected”), and NEXT matching `public/reference.png` while keeping the production jar stack.

**Architecture:** Keep jar PNGs/mask/lighting. Replace win chrome DOM in `levelScreens.js`, retarget `HONEY_MOTION` + `countFrame`/`fillFrame` helpers in `honeyWin.js`, rewrite `playWinCelebration` in `winMotion.js`, and restyle slots in `minimal.css`. Tests in `tests/honey-win.test.mjs` and `tests/level-win.test.mjs` drive each change.

**Tech Stack:** React (createElement screens), GSAP timelines, CSS custom properties, Node test runner + happy-dom, existing FX bus sounds.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-07-honey-celebration-chrome-motion-design.md`
- Keep production jar stack and jar CSS coordinate contract (`--honey-jar-*`); do not regenerate jar/mask images
- Use only existing chrome assets: `public/score-board.png`, `public/victory-slogan-underline.png`, `public/victory-slogan-side-drops-left.png` (mirror for right)
- Scoreboard copy: **Honey Collected** (not “FINAL SCORE”); score on ribbon; `Target: N` + checkmark when count ≥ target
- Honey never overflows; over-target is number/glow only; `overflowMarks` unused / always empty in win UI
- No pouring stream, long confetti shower, spinning jar, or multi-bounce spam
- NEXT tappable as soon as it appears (~1.75s); skip/settle/reduced-motion share one final paint
- **Never use browser / browser MCP / screenshot automation**; ask the human for visual confirmation or missing info
- **Stop and ask the human for confirmation after every task** before starting the next task
- Do not commit unless the human explicitly asks to commit that task’s changes
- Working tree may already contain uncommitted celebration WIP — before Task 1, ask the human whether to stash it, discard it, or fold it into this plan

---

## File map

| File | Responsibility |
|------|----------------|
| `src/casual/honeyWin.js` | `HONEY_MOTION` beats, `fillFrame` / `countFrame`, layout vars for scoreboard, `overflowMarks` → always `[]` |
| `src/casual/starThresholds.js` | `COUNT_UP_SECONDS` → `0.5` to match score beat |
| `src/casual/presentationSequence.js` | `successPlan` reads new motion fields (no subline/burst confetti reliance) |
| `src/casual/levelScreens.js` | Win DOM: praise decorations + scoreboard; remove overflow/confetti/subline |
| `src/casual/winMotion.js` | 2.0s fill-first GSAP timeline + shared `paintFinal` |
| `src/casual/minimal.css` | Slots/layers for slogan PNGs + scoreboard overlays |
| `tests/honey-win.test.mjs` | Beat table, DOM chrome, motion, reduced-motion, no overflow/confetti |
| `tests/level-win.test.mjs` | Integration expectations for settle/skip/scoreboard |

---

### Task 0: Working-tree gate (human)

**Files:** none

- [ ] **Step 1: Ask the human**

Ask exactly:

> Your working tree already has uncommitted celebration changes (`levelScreens.js`, `winMotion.js`, `honeyWin.js`, `minimal.css`, tests) plus untracked PNG assets. For this plan, should I (A) stash code changes and keep the PNGs, (B) keep working on top of the current dirty tree, or (C) discard the uncommitted code changes and start from `HEAD` (keeping the PNG assets)?

- [ ] **Step 2: Wait for answer; do not edit code until they choose**

---

### Task 1: Motion beat table + fill/count helpers

**Files:**
- Modify: `src/casual/honeyWin.js`
- Modify: `src/casual/starThresholds.js` (`COUNT_UP_SECONDS`)
- Modify: `tests/honey-win.test.mjs`
- Test: `tests/honey-win.test.mjs`

**Interfaces:**
- Produces:
  - `HONEY_MOTION.cap === 2`
  - `HONEY_MOTION.fill = {start:0.35,end:1.05,ease:'power2.out'}`
  - `HONEY_MOTION.count = {start:1.25,duration:0.5,end:1.75,ease:'power2.out'}`
  - `HONEY_MOTION.jarEntrance = {start:0.15,end:0.35,fromScale:0.92,peakScale:1.03,toScale:1}`
  - `HONEY_MOTION.praise = {start:1.0,peakEnd:1.14,end:1.22,underlineAt:1.08,opacityEnd:1.1,fromScale:0.55,peakScale:1.14,toScale:1}`
  - `HONEY_MOTION.scoreboard = {start:1.25,end:1.55,fromScale:0.85,toScale:1}`
  - `HONEY_MOTION.cta = {start:1.75,end:2.0,from:0,to:1,leg:0.2}`
  - `HONEY_MOTION.scrim = {start:0,end:0.15,opacity:1}`
  - `HONEY_MOTION.settled === 1.75`
  - `fillFrame(time,secured,target) → {linear,eased,fraction,percent}`
  - `countFrame(time,secured,target) → {linear,eased,tally,shown,fraction,overflow:0,targetMet}`
  - `overflowMarks(...) → []` always
  - `COUNT_UP_SECONDS === 0.5`

- [ ] **Step 1: Write the failing test assertions**

In `tests/honey-win.test.mjs`, replace the old count-up timing test body with:

```js
test('celebration beats are fill-first 2.0s with a 0.5s score count',()=>{
  assert.equal(HONEY_MOTION.cap,2);
  assert.equal(HONEY_MOTION.settled,1.75);
  assert.equal(HONEY_MOTION.scrim.end,0.15);
  assert.equal(HONEY_MOTION.jarEntrance.start,0.15);
  assert.equal(HONEY_MOTION.jarEntrance.end,0.35);
  assert.equal(HONEY_MOTION.fill.start,0.35);
  assert.equal(HONEY_MOTION.fill.end,1.05);
  assert.equal(HONEY_MOTION.fill.ease,'power2.out');
  assert.equal(HONEY_MOTION.praise.start,1);
  assert.equal(HONEY_MOTION.praise.underlineAt,1.08);
  assert.equal(HONEY_MOTION.count.start,1.25);
  assert.equal(HONEY_MOTION.count.duration,0.5);
  assert.equal(HONEY_MOTION.count.end,1.75);
  assert.equal(countUpDuration(),0.5);
  assert.equal(HONEY_MOTION.cta.start,1.75);
  assert.equal(HONEY_MOTION.cta.end,2);
});

test('fillFrame drives the jar; countFrame drives the score and never overflows',()=>{
  assert.equal(fillFrame(0.35,32,9).percent,0);
  assert.equal(fillFrame(1.05,32,9).percent,78);
  assert.ok(fillFrame(0.7,32,9).percent>0&&fillFrame(0.7,32,9).percent<78);
  assert.equal(countFrame(1.25,32,9).shown,0);
  assert.equal(countFrame(1.75,32,9).shown,32);
  assert.equal(countFrame(1.75,32,9).overflow,0);
  assert.equal(countFrame(1.75,32,9).targetMet,true);
  assert.equal(countFrame(1.4,1500,2000).targetMet,false);
  assert.equal(overflowMarks(3,6,5).length,0);
  assert.equal(overflowMarks(1,9,8).length,0);
});
```

Add `fillFrame` to the existing `honeyWin.js` import list at the top of the test file. Update the intensity test so it expects `overflowMarks(...).length === 0`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/honey-win.test.mjs`

Expected: FAIL on new beat assertions / missing `fillFrame` / overflow length.

- [ ] **Step 3: Implement minimal helpers**

Replace `HONEY_MOTION` in `src/casual/honeyWin.js` with:

```js
export const HONEY_MOTION=Object.freeze({
  cap:2,
  settled:1.75,
  scrim:Object.freeze({start:0,end:0.15,opacity:1}),
  foliage:Object.freeze({start:0,end:0.25,fromY:12}),
  jarEntrance:Object.freeze({
    start:0.15,end:0.35,fromScale:0.92,peakScale:1.03,toScale:1
  }),
  fill:Object.freeze({start:0.35,end:1.05,ease:'power2.out'}),
  praise:Object.freeze({
    start:1,peakEnd:1.14,end:1.22,underlineAt:1.08,opacityEnd:1.1,
    fromScale:0.55,peakScale:1.14,toScale:1
  }),
  scoreboard:Object.freeze({start:1.25,end:1.55,fromScale:0.85,toScale:1}),
  count:Object.freeze({start:1.25,duration:0.5,end:1.75,ease:'power2.out'}),
  flight:Object.freeze({
    emitStart:0.1,emitEnd:0.16,life:0.32,
    fadeIn:0.04,hold:0.2,fadeOut:0.08,lift:48
  }),
  burst:Object.freeze({start:1.05,life:0.01}),
  subline:Object.freeze({start:1.25,end:1.25,opacity:0}),
  cta:Object.freeze({start:1.75,end:2,from:0,to:1,leg:0.2})
});
```

Add:

```js
export function fillFrame(time,secured,target){
  const start=HONEY_MOTION.fill.start;
  const duration=HONEY_MOTION.fill.end-start;
  let linear=0;
  if(time>=start+duration)linear=1;
  else if(time>start)linear=(time-start)/duration;
  const eased=power2Out(linear);
  const fraction=fillFraction(secured*eased,target);
  return {linear,eased,fraction,percent:FILL_MAX*fraction};
}
```

Rewrite `countFrame` so score uses `HONEY_MOTION.count`, `overflow` is always `0`, and `targetMet` is `shown >= goal` when `goal > 0`.

Rewrite `overflowMarks` to `return []`.

In `starThresholds.js` set `export const COUNT_UP_SECONDS=0.5;`.

Keep `overflowReveal` returning `0` always (or leave unused).

- [ ] **Step 4: Run tests to verify the new beat tests pass**

Run: `node --test tests/honey-win.test.mjs`

Expected: new beat/fillFrame tests PASS; other tests may still FAIL until later tasks — that is OK if failures are clearly old timing/DOM expectations. If the suite aborts early, run the two new tests by filtering names.

- [ ] **Step 5: Ask human for confirmation before Task 2**

Report: what changed, which tests pass/fail, and wait for “go” / corrections. Do not commit unless asked.

---

### Task 2: Layout vars for scoreboard slot

**Files:**
- Modify: `src/casual/honeyWin.js` (`honeyLayout`, `applyHoneyLayout`)
- Modify: `tests/honey-win.test.mjs` (layout assertions that mention count/subline tops)

**Interfaces:**
- Produces layout fields:
  - `scoreboard:{x,y,w,h}` under the jar with clearance above CTA
  - CSS vars: `--honey-scoreboard-top/left/width/height`
  - Retains `--honey-jar-*` and `--honey-praise-*`
  - Stops requiring `--honey-sub-top` for win chrome (may keep for back-compat set to scoreboard area or omit)

- [ ] **Step 1: Write failing layout expectations**

Add/adjust a test that `honeyLayout(390,844)` returns a `scoreboard` rect below `jar` and above `cta`, with positive width/height, and that `applyHoneyLayout` sets `--honey-scoreboard-top`.

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Implement layout**

In `honeyLayout`, replace the old `number` + `subline` stack with one scoreboard block (~120–140px tall) between jar and CTA. Keep jar sizing rules that protect jar geometry.

In `applyHoneyLayout`, set:

```js
set('--honey-scoreboard-top',layout.scoreboard.y+'px');
set('--honey-scoreboard-left',layout.scoreboard.x+'px');
set('--honey-scoreboard-width',layout.scoreboard.w+'px');
set('--honey-scoreboard-height',layout.scoreboard.h+'px');
```

Do not change `--honey-jar-left/top/width/height` formulas except as needed to leave vertical room for the scoreboard (jar must still honor prior short-screen clamps).

- [ ] **Step 4: Run layout tests — expect PASS**

- [ ] **Step 5: Ask human for confirmation before Task 3**

---

### Task 3: Win DOM chrome rebuild

**Files:**
- Modify: `src/casual/levelScreens.js`
- Modify: `tests/honey-win.test.mjs`, `tests/level-win.test.mjs`

**Interfaces:**
- Consumes: praise text/tier; `score`; `target`
- Produces markup classes:
  - `.sgv-honey-praise-slot` containing `.sgv-win-praise` plus:
    - `img.sgv-honey-slogan-underline` → `/victory-slogan-underline.png`
    - `img.sgv-honey-slogan-drops.sgv-honey-slogan-drops-left` → `/victory-slogan-side-drops-left.png`
    - `img.sgv-honey-slogan-drops.sgv-honey-slogan-drops-right` → same src, flipped in CSS
  - `.sgv-honey-scoreboard` with:
    - `img.sgv-honey-scoreboard-art` → `/score-board.png`
    - `.sgv-honey-scoreboard-label` text `Honey Collected`
    - `.sgv-win-tally` score
    - `.sgv-honey-scoreboard-target` with checkmark + `Target: {target}` (checkmark visible in static/settled when `score >= target`)
  - No `.sgv-honey-overflow`, `.sgv-honey-mark`, `.sgv-honey-confetti`, `.sgv-honey-subline`

- [ ] **Step 1: Write failing DOM tests**

Update markup expectations to require scoreboard/slogan assets and forbid confetti/overflow/subline:

```js
assert.match(won,/score-board\.png/);
assert.match(won,/Honey Collected/);
assert.match(won,/victory-slogan-underline\.png/);
assert.match(won,/victory-slogan-side-drops-left\.png/);
assert.match(won,/sgv-honey-slogan-drops-right/);
assert.match(won,/Target:\s*9/); // use the fixture target
assert.doesNotMatch(won,/sgv-honey-confetti|sgv-confetti|sgv-honey-subline|sgv-honey-mark/);
```

Update `level-win` assertions that read `.sgv-honey-subline` to read scoreboard tally/target instead.

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement DOM**

In `levelScreens.js`:

1. Extend `praiseMark` to append underline + left/right drops (`alt=""`, `aria-hidden`).
2. Replace count slot + subline with `scoreboard(score,target,staticCard)`.
3. Change `heroJar()` to take no marks / always omit overflow.
4. Remove `CONFETTI`, `confettiBits`, and confetti mount.
5. Stop importing/using `overflowMarks` in the win path.

Scoreboard helper sketch:

```js
function scoreboard(score,target,staticCard){
  const met=Number(score)>=Number(target);
  return createElement('div',{className:'sgv-honey-scoreboard','aria-hidden':'true'},
    createElement('img',{
      className:'sgv-honey-scoreboard-art',src:'/score-board.png',alt:'',draggable:'false'
    }),
    createElement('p',{className:'sgv-honey-scoreboard-label'},'Honey Collected'),
    createElement('p',{className:'sgv-win-tally'},staticCard?String(score):'0'),
    createElement('p',{
      className:'sgv-honey-scoreboard-target'+(met&&staticCard?' is-met':'')
    },
      createElement('span',{className:'sgv-honey-target-check','aria-hidden':'true'},'✓'),
      'Target: '+target
    )
  );
}
```

- [ ] **Step 4: Run DOM-focused tests — expect PASS for new selectors**

- [ ] **Step 5: Ask human for confirmation before Task 4**

---

### Task 4: CSS slots for slogan + scoreboard

**Files:**
- Modify: `src/casual/minimal.css`
- Modify: `tests/honey-win.test.mjs` (CSS source assertions)

**Interfaces:**
- `.sgv-honey-scoreboard` absolute using `--honey-scoreboard-*`
- Label above ribbon; `.sgv-win-tally` centered on ribbon band; target row below
- Slogan underline + drops positioned relative to `.sgv-honey-praise-slot`
- `.sgv-honey-slogan-drops-right { transform: scaleX(-1); }`
- Target check hidden until `.is-met` or motion adds class
- Remove reliance on confetti keyframes for win acceptance
- Jar rules untouched (`.sgv-honey-hero-art`, `.sgv-jar-mask`, etc.)

- [ ] **Step 1: Write failing CSS assertion tests** for scoreboard/slogan selectors and absence of required confetti rules in acceptance paths

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement CSS** matching reference positions as closely as possible with the three PNGs; keep Reset/NEXT geometry

- [ ] **Step 4: Run CSS assertion tests — expect PASS**

- [ ] **Step 5: Ask human for visual confirmation**

Ask them to glance at the win screen in their usual local preview (you will not drive a browser). Ask whether label/score/target sit correctly on the ribbon before Task 5.

---

### Task 5: Rewrite `playWinCelebration` timeline

**Files:**
- Modify: `src/casual/winMotion.js`
- Modify: `src/casual/presentationSequence.js` (align plan fields; drop confetti sound expectation)
- Modify: `tests/honey-win.test.mjs`, `tests/level-win.test.mjs`

**Interfaces:**
- Consumes nodes: `scrim`, `praise`, `liquid`, hero jar, scoreboard root, tally, target row, `cta`, optional underline/drops
- Produces timeline:
  1. 0–0.15 scrim
  2. 0.15–0.35 jar 0.92→1.03→1
  3. 0.35–1.05 fill via `fillFrame` / `fillHeightPercent` with surface wobble
  4. 1.00–1.22 Hiveful squash-stretch; underline at 1.08; drops burst; flash/gleam once; praise sound once
  5. 1.25–1.75 scoreboard scale + count; toggle `.is-met` when `shown >= target`; short score ticks
  6. 1.75–2.0 CTA fade/rise + pulse; enable CTA at appear; `onSettled` at 1.75
- Cap timeout = 2000ms
- No `fx.confetti` emit
- `paintFinal` sets full jar, praise+decor visible, final tally, `.is-met` if earned, CTA enabled

- [ ] **Step 1: Rewrite motion tests**

Replace “count and jar rise together / confetti at 0.800s” with:

- At t=0.5s: jar fill mid-progress, tally still `0`, praise not finished
- At t=1.05s: fill ≈78% for over-target fixture
- At t=1.5s: tally between 0 and final
- At t=1.75s+: CTA enabled; settled callback fired
- Sounds include praise + score ticks; **do not** require `fx.confetti`
- Reduced motion still paints final immediately

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement timeline** in `winMotion.js` using `HONEY_MOTION` constants only (no magic times duplicated). Accept optional refs:

```js
scoreboard=null, underline=null, drops=null, targetRow=null
```

Wire callers in `SimplifiedGame.jsx` if needed to pass the new nodes from the card querySelector.

- [ ] **Step 4: Run** `node --test tests/honey-win.test.mjs tests/level-win.test.mjs`

Expected: PASS

- [ ] **Step 5: Ask human for confirmation before Task 6**

---

### Task 6: Suite cleanup + hotfix regressions

**Files:**
- Modify: `tests/hotfix-regressions.test.mjs` if it asserts old subline/confetti/timing
- Modify: any remaining broken assertions in honey/level win tests

- [ ] **Step 1: Run full related suite**

Run: `node --test tests/honey-win.test.mjs tests/level-win.test.mjs tests/hotfix-regressions.test.mjs`

- [ ] **Step 2: Fix only failures caused by this feature** (no drive-by refactors)

- [ ] **Step 3: Re-run until PASS**

- [ ] **Step 4: Ask human for final confirmation**

Ask whether to commit, and whether they want any visual tweaks after they check the local preview (no browser automation).

---

## Self-review vs spec

| Spec requirement | Task |
|------------------|------|
| Vertical stack Hiveful → jar → scoreboard → NEXT | 3, 4 |
| Assets: score-board, underline, side-drops | 3, 4 |
| Honey Collected label position | 3, 4 |
| Keep production jar / mask / 78% max | 0–5 (jar untouched) |
| 2.0s fill-first timeline | 1, 5 |
| Ease-out fill; no overflow honey | 1, 3, 5 |
| Hiveful +80ms underline; side-drops | 3, 5 |
| Scoreboard count + checkmark at target | 3, 5 |
| NEXT ~1.75s tappable | 5 |
| Skip / reduced-motion same final | 5 |
| No confetti shower / pouring / spin | 3, 5 |
| No browser automation; confirm each task | Global + Task gates |
