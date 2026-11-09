# More Flower / More Bee Factor Flyers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Swing/Flip `×value` chip flyers with labeled **More Flower** / **More Bee** text+icon flights timed to zero-cross and Flip face reveal.

A crossing Flip grows Swing and Flip. There is no third multiplier.

**Tech Stack:** GSAP timelines, DOM flyers, Vite/React board (`MinimalBoard` / `SimplifiedGame`), Node test runner

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-07-more-flower-bee-factor-flyers-design.md`
- Copy exact: `More Flower` (Swing) / `More Bee` (Flip)
- Art: `/celebration/daisy-2.png` (Swing), `/bee-smiling-closed-eyes.png` (Flip)
- Motion: `transform` / `opacity` only on flyers; ≤2 reward flyers per play; cancel cleans nodes + pill scale
A crossing Flip grows Swing and Flip. There is no third multiplier.
- Snap path: no factor flyers (`rewards: null`)
- Do not lengthen ordinary (non-reward) card plays
- Remove Swing `CROSS` tip and reduced `CROSS` string

## File map

| File | Responsibility |
|------|----------------|
| `src/casual/motionSchedule.js` | `zeroCrossMark`, per-kind flyer starts on `cardMotionMarks`, reduced summary copy |
A crossing Flip grows Swing and Flip. There is no third multiplier.
| `src/casual/minimal.css` | `.sgv-factor-flyer` icon+text chip |
| `tests/motion-order.test.mjs` | Marks, zero-cross math, reduced copy |

---

### Task 1: Schedule helpers + reduced copy

**Files:**
- Modify: `src/casual/motionSchedule.js`
- Modify: `tests/motion-order.test.mjs`

**Interfaces:**
- Produces:
  - `zeroCrossMark({from,to,meterStart,meterEnd}) → number|null` — absolute time when meter **value** hits 0 along linear `from→to`; `null` if the segment never reaches 0
  - `cardMotionMarks({type,snap,rewards,from,to})` also returns `swingFlyer` / `flipFlyer` (start times or `null`) and keeps `rewards` as the earliest flyer start (or `null`) for pour/factors shift math
  - `reducedCardSummary` → `{ flower: 'More Flower'|null, bee: 'More Bee'|null, cross: null, ... }` (drop meaningful `cross`)

- [ ] **Step 1: Write the failing tests**

Append to `tests/motion-order.test.mjs`:

```js
import {
  STATIC_OUTCOME_MS,cardMotionMarks,flyerOrigin,reducedBankSummary,reducedCardSummary,
  zeroCrossMark
} from '../src/casual/motionSchedule.js';

test('zeroCrossMark hits 0 during a sign-changing glide',()=>{
  // from 3 → -2 crosses 0 at 3/5 of the meter window
  assert.equal(zeroCrossMark({from:3,to:-2,meterStart:0.420,meterEnd:0.620}),0.540);
  assert.equal(zeroCrossMark({from:-2,to:3,meterStart:0.480,meterEnd:0.680}),0.560);
  assert.equal(zeroCrossMark({from:2,to:0,meterStart:0.420,meterEnd:0.620}),0.620);
  assert.equal(zeroCrossMark({from:2,to:5,meterStart:0.420,meterEnd:0.620}),null);
  assert.equal(zeroCrossMark({from:0,to:3,meterStart:0.420,meterEnd:0.620}),0.420);
});

test('Swing flyer starts at zeroCross; Flip flyer at faceEnd; both may coexist',()=>{
  const steer=cardMotionMarks({
    type:'steer',rewards:[{kind:'swing',value:2}],from:3,to:-2
  });
  assert.equal(steer.swingFlyer,0.540);
  assert.equal(steer.flipFlyer,null);
  assert.equal(steer.rewards,steer.swingFlyer);

  const flip=cardMotionMarks({
    type:'flip',rewards:[{kind:'flip',value:3}],from:1,to:4
  });
  assert.equal(flip.faceEnd,0.140);
  assert.equal(flip.flipFlyer,0.140);
  assert.equal(flip.swingFlyer,null);
  assert.equal(flip.rewards,0.140);

  const both=cardMotionMarks({
    type:'flip',rewards:[{kind:'swing',value:2},{kind:'flip',value:2}],from:3,to:-2
  });
  assert.equal(both.flipFlyer,0.140);
  assert.equal(both.swingFlyer,0.600); // meterStart 0.480 + 0.2*(3/5)
  assert.equal(both.rewards,0.140);
  assert.ok(both.flipFlyer<both.swingFlyer);
});

test('Swing without a zero cross falls back to meterStart',()=>{
  // Engine should not award swing without a cross, but the schedule must not invent one.
  const marks=cardMotionMarks({
    type:'steer',rewards:[{kind:'swing',value:2}],from:2,to:5
  });
  assert.equal(marks.swingFlyer,marks.meterStart);
});

test('reduced motion uses More Flower / More Bee and never CROSS',()=>{
  assert.equal(STATIC_OUTCOME_MS,1100);
  const quiet=reducedCardSummary({to:4,rawPotAfter:9,addedToPot:4,rewards:[],factorsAfter:[]});
  assert.equal(quiet.add,'+4');
  assert.equal(quiet.flower,null);
  assert.equal(quiet.bee,null);
  assert.equal(quiet.cross,null);
  const swing=reducedCardSummary({
    to:-2,rawPotAfter:13,addedToPot:10,
    rewards:[{kind:'swing',value:2}],factorsAfter:[{kind:'swing',value:2}]
  });
  assert.equal(swing.flower,'More Flower');
  assert.equal(swing.bee,null);
  assert.equal(swing.cross,null);
  const flip=reducedCardSummary({
    to:4,rawPotAfter:9,addedToPot:4,
    rewards:[{kind:'flip',value:3}],factorsAfter:[{kind:'flip',value:3}]
  });
  assert.equal(flip.bee,'More Bee');
  assert.equal(flip.flower,null);
  const both=reducedCardSummary({
    to:-2,rawPotAfter:13,addedToPot:10,
    A crossing Flip grows Swing and Flip. There is no third multiplier.
    factorsAfter:[]
  });
  assert.equal(both.flower,'More Flower');
  assert.equal(both.bee,'More Bee');
  assert.equal(both.cross,null);
});
```

Update the existing test name/body that asserts `cross.cross==='CROSS'` so it matches the new assertions above (delete the old CROSS expectation).

Keep existing Flip/Steer mark order tests, but where they assert `marks.rewards===meterEnd`, update Flip-with-flip-reward cases to expect `rewards===faceEnd` (0.140) and Steer-with-swing to expect `rewards===zeroCross` (needs `from`/`to` args). For Steer swing without `from`/`to`, treat as fallback `meterStart`.

Concrete updates to existing tests:

```js
test('first Flip× reveals the face, centers, then arrives at the needle before rewards',()=>{
  const marks=cardMotionMarks({type:'flip',rewards:flipReward,from:1,to:4});
  assert.equal(marks.faceEnd,0.140);
  assert.equal(marks.flipFlyer,0.140);
  assert.equal(marks.rewards,0.140);
  // meter / pour unchanged
  assert.equal(marks.meterEnd,0.680);
  assert.equal(marks.pourStart,0.680);
  assert.ok(marks.faceEnd<=marks.flipFlyer);
  assert.ok(marks.flipFlyer<=marks.meterEnd);
});

test('a crossing Flip reveals before either reward particle',()=>{
  const marks=cardMotionMarks({
    type:'flip',rewards:crossingFlip,from:3,to:-2
  });
  assert.equal(marks.flipFlyer,0.140);
  assert.equal(marks.swingFlyer,0.600);
  assert.equal(marks.rewards,0.140);
  assert.ok(marks.flipFlyer<marks.swingFlyer);
  assert.ok(marks.swingFlyer<=marks.meterEnd);
});

test('a Steer cross finishes the meter glide before its reward and tap pour',()=>{
  // Rename intent: swing flyer starts mid-glide at zeroCross; pour still at meterEnd
  const marks=cardMotionMarks({
    type:'steer',rewards:[{kind:'swing',value:2}],from:3,to:-2
  });
  assert.equal(marks.meterStart,0.420);
  assert.equal(marks.meterEnd,0.620);
  assert.equal(marks.swingFlyer,0.540);
  assert.equal(marks.rewards,0.540);
  assert.equal(marks.pourStart,0.620);
  assert.ok(marks.meterStart<=marks.swingFlyer);
  assert.ok(marks.swingFlyer<=marks.meterEnd);
  assert.ok(marks.meterEnd<=marks.pourStart);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/motion-order.test.mjs`

Expected: FAIL — `zeroCrossMark` not exported / `swingFlyer` undefined / `CROSS` still returned

- [ ] **Step 3: Implement schedule helpers**

In `src/casual/motionSchedule.js`:

```js
export function zeroCrossMark({from,to,meterStart,meterEnd}){
  if(!Number.isFinite(from)||!Number.isFinite(to)||
     !Number.isFinite(meterStart)||!Number.isFinite(meterEnd))return null;
  if(from===0)return thirds(meterStart);
  const crosses=(from<0&&to>=0)||(from>0&&to<=0);
  if(!crosses)return null;
  const span=from-to;
  if(span===0)return thirds(meterStart);
  const t=Math.max(0,Math.min(1,from/span));
  return thirds(meterStart+(meterEnd-meterStart)*t);
}
```

Extend `cardMotionMarks` signature with optional `from`/`to`. When building the rewards branch:

```js
const hasSwing=rewards.some(r=>r?.kind==='swing');
const hasFlip=rewards.some(r=>r?.kind==='flip');
const swingFlyer=hasSwing
  ?(zeroCrossMark({from,to,meterStart,meterEnd})??meterStart)
  :null;
const flipFlyer=hasFlip&&faceEnd!=null?faceEnd:null;
const rewardStarts=[swingFlyer,flipFlyer].filter(t=>t!=null);
const rewardStart=rewardStarts.length?Math.min(...rewardStarts):meterEnd;
// use rewardStart for shift / marks.rewards as today
return {
  ...base,
  rewards:rewardStart,
  swingFlyer,
  flipFlyer,
  pourStart,pourEnd,
  factors:thirds(Math.max(
    ...(hasSwing?[swingFlyer+0.45]:[]),
    ...(hasFlip?[flipFlyer+0.45]:[]),
    0.58+shift
  )),
  // keep add/travel/pot/end as today using shift from rewardStart
  ...
};
```

For snap / no-rewards branches, set `swingFlyer:null`, `flipFlyer:null`.

Update `reducedCardSummary`:

```js
const rewards=view?.rewards||[];
const snap=!!view?.snap;
const kinds=new Set(rewards.map(r=>r.kind));
return {
  position:snap?0:view.to,
  rawPot:view.rawPotAfter,
  factors:view.factorsAfter,
  add:!snap&&view.addedToPot>0?'+'+view.addedToPot:null,
  flower:!snap&&kinds.has('swing')?'More Flower':null,
  bee:!snap&&kinds.has('flip')?'More Bee':null,
  cross:null,
  shake:false
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/motion-order.test.mjs`

Expected: PASS (all tests in file)

- [ ] **Step 5: Commit**

```bash
git add src/casual/motionSchedule.js tests/motion-order.test.mjs
git commit -m "$(cat <<'EOF'
Add zero-cross and More Flower/Bee schedule marks.

EOF
)"
```

---

### Task 2: Labeled flyers + reduced static labels

**Files:**
- Modify: `src/casual/minimalMotion.js`
- Modify: `src/casual/minimal.css`
- Modify: `tests/motion-order.test.mjs` (optional source-grep smoke if useful)

**Interfaces:**
- Consumes: `marks.swingFlyer`, `marks.flipFlyer`, `zeroCrossMark` / marks from Task 1; `view.from`, `view.to`, `view.rewards`
A crossing Flip grows Swing and Flip. There is no third multiplier.

- [ ] **Step 1: Write a failing source contract test**

Add to `tests/motion-order.test.mjs`:

```js
test('factor flyer motion uses More Flower / More Bee art and drops CROSS chips',()=>{
  const motion=readFileSync(new URL('../src/casual/minimalMotion.js',import.meta.url),'utf8');
  assert.match(motion,/More Flower/);
  assert.match(motion,/More Bee/);
  assert.match(motion,/daisy-2\.png/);
  assert.match(motion,/bee-smiling-closed-eyes\.png/);
  assert.doesNotMatch(motion,/OBJECT_WORDS/);
  assert.doesNotMatch(motion,/textContent='CROSS'/);
  const css=readFileSync(new URL('../src/casual/minimal.css',import.meta.url),'utf8');
  assert.match(css,/\.sgv-factor-flyer\b/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/motion-order.test.mjs --test-name-pattern="factor flyer motion"`

Expected: FAIL — strings / class missing

- [ ] **Step 3: CSS for the labeled flyer**

In `src/casual/minimal.css`, replace or supplement `.sgv-bonus-flyer` with:

```css
.sgv-factor-flyer{
  position:absolute;z-index:25;display:inline-flex;align-items:center;gap:5px;
  min-height:32px;padding:4px 10px 5px;border-radius:17px;
  border:3px solid #fff8cd;background:linear-gradient(#fff6bb,#ffd35f);
  box-shadow:0 3px 0 #d69b42,0 5px 10px #a8764d70;
  color:#885326;font-size:13px;font-weight:1000;line-height:1;white-space:nowrap;
  pointer-events:none;transform-origin:center;will-change:transform,opacity;
}
.sgv-factor-flyer img{
  width:20px;height:20px;object-fit:contain;flex:none;pointer-events:none;
}
.sgv-factor-flyer-swing{/* optional tint if needed — keep honey default */}
.sgv-factor-flyer-flip{/* optional cool tint — keep honey default unless contrast fails */}
```

Keep `.sgv-bonus-flyer` only if something else still references it; otherwise remove dead rules after motion migrates.

- [ ] **Step 4: Implement flyers in `minimalMotion.js`**

1. Delete `OBJECT_WORDS` and the chip/`CROSS` body of `flyMultiplierRewards`.
2. Add:

```js
const FACTOR_FLYER=Object.freeze({
  swing:Object.freeze({
    copy:'More Flower',
    src:'/celebration/daisy-2.png',
    alt:'',
    flight:0.45
  }),
  flip:Object.freeze({
    copy:'More Bee',
    src:'/bee-smiling-closed-eyes.png',
    alt:'',
    flight:0.45
  })
});

function makeFactorFlyer(kind){
  const spec=FACTOR_FLYER[kind];
  if(!spec)return null;
  const node=document.createElement('span');
  node.className='sgv-factor-flyer sgv-factor-flyer-'+kind;
  node.setAttribute('aria-hidden','true');
  const img=document.createElement('img');
  img.src=spec.src;img.alt='';img.draggable=false;
  const label=document.createElement('span');
  label.textContent=spec.copy;
  node.append(img,label);
  return node;
}

export function flyFactorLabels({root,plan}){
  // plan: [{kind:'swing'|'flip', start:number, origin:{x,y}}]
  if(!root||!plan?.length||reducedMotion())return ()=>{};
  const nodes=[],tweens=[];
  for(const {kind,start,origin} of plan){
    const target=root.querySelector('[data-factor="'+kind+'"]');
    const flyer=makeFactorFlyer(kind);
    if(!target||!flyer||!origin)continue;
    const end=point(target,root);
    Object.assign(flyer.style,{
      left:origin.x+'px',top:origin.y+'px',
      marginLeft:'-40px',marginTop:'-16px'
    });
    root.appendChild(flyer);nodes.push(flyer);
    const flight=FACTOR_FLYER[kind].flight;
    const tl=gsap.timeline({onComplete:()=>flyer.remove()});
    tl.fromTo(flyer,{opacity:0,scale:.82},{opacity:1,scale:1.06,duration:.10},start);
    tl.to(flyer,{
      x:end.x-origin.x,y:end.y-origin.y,scale:.72,
      duration:flight-0.20,ease:'power2.inOut'
    },start+0.10);
    tl.to(flyer,{opacity:0,scale:.35,duration:.10},start+flight-0.10);
    tl.call(()=>{
      const bounce=gsap.fromTo(target,{scale:.88},
        {scale:1,duration:.26,ease:'back.out(2.1)'});
      tweens.push(bounce);
    },[],start+flight-0.10);
    tweens.push(tl);
  }
  return ()=>{
    for(const t of tweens)t.kill?.();
    removeNodes(nodes);
    for(const {kind} of plan){
      const pill=root.querySelector('[data-factor="'+kind+'"]');
      if(pill)gsap.set(pill,{clearProps:'scale'});
    }
  };
}
```

3. In `animateCardAction`, replace the single `marks.rewards` → `flyMultiplierRewards` call with:

```js
const plan=[];
if(marks.swingFlyer!=null&&(view.rewards||[]).some(r=>r.kind==='swing')){
  const origin=marker?point(marker,root):(finalOrigin||needleHere);
  plan.push({kind:'swing',start:marks.swingFlyer,origin});
}
if(marks.flipFlyer!=null&&(view.rewards||[]).some(r=>r.kind==='flip')){
  const flipBtn=root.querySelector('.sgv-flip');
  const origin=flipBtn?point(flipBtn,root):
    {x:root.clientWidth*.5,y:root.clientHeight*.82};
  plan.push({kind:'flip',start:marks.flipFlyer,origin});
}
if(plan.length){
  tl.call(()=>{
    if(!alive)return;
    animations.push(flyFactorLabels({root,plan:plan.map(entry=>({
      ...entry,
      // Swing origin must be the LIVE needle at fire time (zero-cross),
      // not the precomputed final seat.
      origin:entry.kind==='swing'&&marker?point(marker,root):entry.origin
    }))}));
  },[],0);
}
```

Important: schedule flyer timelines with absolute `start` offsets on a child timeline started at t=0 of the card timeline (as above), **or** fire `tl.call` at `marks.swingFlyer` / `marks.flipFlyer` separately. Prefer separate calls so Swing reads the needle position at the actual zero-cross:

```js
if(marks.swingFlyer!=null&&hasSwing){
  tl.call(()=>{
    if(!alive||!marker)return;
    animations.push(flyFactorLabels({
      root,
      plan:[{kind:'swing',start:0,origin:point(marker,root)}]
    }));
  },[],marks.swingFlyer);
}
if(marks.flipFlyer!=null&&hasFlip){
  tl.call(()=>{
    if(!alive)return;
    const flipBtn=root.querySelector('.sgv-flip');
    const origin=flipBtn?point(flipBtn,root):
      {x:root.clientWidth*.5,y:root.clientHeight*.82};
    animations.push(flyFactorLabels({
      root,
      plan:[{kind:'flip',start:0,origin}]
    }));
  },[],marks.flipFlyer);
}
```

When using per-call `start:0`, `flyFactorLabels` durations are relative to call time.

4. Pass `from`/`to` into `cardMotionMarks`:

```js
const marks=cardMotionMarks({
  type:action.type,snap:!!view.snap,rewards:view.rewards||[],
  from:view.from,to:view.to
});
```

5. Update `showReducedCard` to place static flower/bee labels near pills:

```js
if(summary.flower){
  const pill=root.querySelector('[data-factor="swing"]');
  const origin=pill?point(pill,root):{x:root.clientWidth/2,y:root.clientHeight*.4};
  const node=document.createElement('span');
  node.className='sgv-factor-flyer sgv-static-outcome';
  node.setAttribute('aria-hidden','true');
  node.innerHTML='<img src="/celebration/daisy-2.png" alt=""><span>More Flower</span>';
  Object.assign(node.style,{left:origin.x+'px',top:origin.y+28+'px'});
  root.appendChild(node);nodes.push(node);
}
// same pattern for summary.bee → flip pill + bee art
```

Remove the old `summary.cross` / `sgv-factor-tip` path.

A crossing Flip grows Swing and Flip. There is no third multiplier.

- [ ] **Step 5: Run tests**

Run: `node --test tests/motion-order.test.mjs`

Expected: PASS

Also run: `npm test`  
Expected: PASS (fix any leftover `CROSS` / `cross` assertions in motion/UI tests)

- [ ] **Step 6: Commit**

```bash
git add src/casual/minimalMotion.js src/casual/minimal.css tests/motion-order.test.mjs
git commit -m "$(cat <<'EOF'
Fly More Flower and More Bee to multiplier pills.

EOF
)"
```

---

### Task 3: Factors bump timing + verify

**Files:**
- Modify: `src/casual/minimalMotion.js` (factors mark only if Task 2 left a flash-early bug)
- Modify: `src/casual/motionSchedule.js` if factors mark needs retune

**Interfaces:**
- Consumes: `FACTOR_FLYER.*.flight` (0.45), `swingFlyer`, `flipFlyer`
- Produces: `onFactors(view.factorsAfter)` at or after the last relevant flyer arrival

- [ ] **Step 1: Confirm factors mark**

If Task 1 already set:

```js
factors: thirds(Math.max(
  hasSwing ? swingFlyer + 0.45 : 0,
  hasFlip ? flipFlyer + 0.45 : 0,
  meterEnd + 0.02
))
```

verify with:

```js
test('factors update after the last Flower/Bee flyer arrives',()=>{
  const both=cardMotionMarks({
    type:'flip',rewards:crossingFlip,from:3,to:-2
  });
  assert.ok(both.factors>=both.swingFlyer+0.45);
  assert.ok(both.factors>=both.flipFlyer+0.45);
});
```

- [ ] **Step 2: Run full verification**

Run:

```bash
npm test
npm run build
npm run verify:release
```

Expected: all pass / build ok / release ok

- [ ] **Step 3: Commit if anything changed**

```bash
git add src/casual/motionSchedule.js src/casual/minimalMotion.js tests/motion-order.test.mjs
git commit -m "$(cat <<'EOF'
Land factor value updates after Flower/Bee flyers.

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| More Flower from needle at zero-cross | 1 + 2 |
| More Bee from Flip button at face reveal | 1 + 2 |
| Replace × chips for Swing/Flip | 2 |
A crossing Flip grows Swing and Flip. There is no third multiplier.
| Both can run together | 1 + 2 |
| Remove CROSS tip / reduced CROSS | 1 + 2 |
| Reduced motion static labels | 2 |
| ≤2 flyers, transform/opacity, cancel cleanup | 2 |
| Snap unchanged / no lengthen non-reward plays | 1 (snap branch untouched) |
| Factors not early vs flyer | 3 |
