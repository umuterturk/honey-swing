# Factor Pill Info Popup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let players tap visible Swing / Flip multiplier pills to open a short how-it-works popup (icon + title + copy + Got it / scrim / Escape).

**Architecture:** `src/casual/screens/factorInfo.jsx` is the Swing/Flip how-it-works popup. A crossing Flip grows Swing and Flip. There is no third multiplier.

**Tech Stack:** React (createElement / JSX), existing `minimal.css` feature-intro chrome, Node test runner + happy-dom mount tests

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-07-factor-pill-info-popup-design.md`
- Copy exact: Swing → title `More Flower`, body `Cross 0 for more flowers.`; Flip → title `More Bee`, body `Flip for more bees.`; button `Got it`
- Art exact: Swing `/celebration/daisy-2.png`; Flip `/bee-smiling-closed-eyes.png` (72×72 via `.sgv-feature-intro-icon`)
A crossing Flip grows Swing and Flip. There is no third multiplier.
- Dismiss: Got it, scrim tap, Escape; restore focus to opening pill
- Gate: disabled while `animating`, `introGate`, `startOpen`, or `finished`
- Prefer reuse of `.sgv-feature-intro*` classes over a parallel skin; no NEW! badge, no demo strip
- Do not change multiplier rules or factor flyer motion

## File map

| File | Responsibility |
|------|----------------|
| `src/casual/factorInfoContent.js` | `FACTOR_INFO` map + `factorInfoFor(kind)` |
| `src/casual/screens/factorInfo.jsx` | Dialog: scrim, icon img, title, copy, Got it; Escape |
| `src/casual/MinimalBoard.jsx` | Swing/Flip pills as buttons; `onFactorInfo` / `factorInfoOpen` |
| `src/casual/SimplifiedGame.jsx` | `factorInfo` state, gate attrs, mount overlay, clear on transitions |
| `src/casual/minimal.css` | `data-factor-info` pointer lock; raise multipliers so swap taps work |
| `tests/factor-info-content.test.mjs` | Copy/art contract |
| `tests/factor-info-mount.test.mjs` | Open/close/swap/gate via SimplifiedGame |

---

### Task 1: Content map

**Files:**
- Create: `src/casual/factorInfoContent.js`
- Create: `tests/factor-info-content.test.mjs`

**Interfaces:**
- Produces:
  - `FACTOR_INFO` — frozen map keyed by `'swing'` | `'flip'`
  A crossing Flip grows Swing and Flip. There is no third multiplier.

- [ ] **Step 1: Write the failing test**

Create `tests/factor-info-content.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTOR_INFO,factorInfoFor} from '../src/casual/factorInfoContent.js';

test('factor info copy and art match the approved popup spec',()=>{
  assert.deepEqual(Object.keys(FACTOR_INFO).sort(),['flip','swing']);
  const flower=factorInfoFor('swing');
  assert.equal(flower.title,'More Flower');
  assert.equal(flower.copy,'Cross 0 for more flowers.');
  assert.equal(flower.iconSrc,'/celebration/daisy-2.png');
  assert.equal(flower.buttonLabel,'Got it');
  const bee=factorInfoFor('flip');
  assert.equal(bee.title,'More Bee');
  assert.equal(bee.copy,'Flip for more bees.');
  assert.equal(bee.iconSrc,'/bee-smiling-closed-eyes.png');
  assert.equal(bee.buttonLabel,'Got it');
  A crossing Flip grows Swing and Flip. There is no third multiplier.
  assert.equal(factorInfoFor('nope'),null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/factor-info-content.test.mjs`  
Expected: FAIL (module not found)

- [ ] **Step 3: Implement content map**

Create `src/casual/factorInfoContent.js`:

```js
export const FACTOR_INFO=Object.freeze({
  swing:Object.freeze({
    kind:'swing',
    title:'More Flower',
    copy:'Cross 0 for more flowers.',
    iconSrc:'/celebration/daisy-2.png',
    buttonLabel:'Got it'
  }),
  flip:Object.freeze({
    kind:'flip',
    title:'More Bee',
    copy:'Flip for more bees.',
    iconSrc:'/bee-smiling-closed-eyes.png',
    buttonLabel:'Got it'
  })
});

export function factorInfoFor(kind){
  return FACTOR_INFO[kind]||null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/factor-info-content.test.mjs`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/casual/factorInfoContent.js tests/factor-info-content.test.mjs
git commit -m "$(cat <<'EOF'
Add factor pill info content map.

EOF
)"
```

---

### Task 2: Overlay + CSS gate

**Files:**
- Create: `src/casual/screens/factorInfo.jsx`
- Modify: `src/casual/minimal.css` (after intro-gate block ~1407)
- Test: extend `tests/factor-info-content.test.mjs` with a source/CSS contract **or** add assertions in a tiny overlay render test — prefer static source/CSS checks here so Task 3 owns mount behavior

**Interfaces:**
- Consumes: `factorInfoFor` shape `{title,copy,iconSrc,buttonLabel,kind}`
- Produces: `FactorInfoOverlay({info,onDismiss})` — `info` is a FACTOR_INFO entry; `onDismiss(reason)` with `'got-it'|'scrim'|'escape'`

- [ ] **Step 1: Write the failing CSS / source contracts**

Append to `tests/factor-info-content.test.mjs`:

```js
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const overlay=readFileSync(join(root,'src/casual/screens/factorInfo.jsx'),'utf8');
const css=readFileSync(join(root,'src/casual/minimal.css'),'utf8');

test('FactorInfoOverlay reuses feature-intro chrome without NEW! or demo',()=>{
  assert.match(overlay,/sgv-feature-intro/);
  assert.match(overlay,/sgv-feature-intro-scrim/);
  assert.match(overlay,/sgv-feature-intro-card/);
  assert.match(overlay,/sgv-feature-intro-icon/);
  assert.match(overlay,/Got it|buttonLabel/);
  assert.doesNotMatch(overlay,/sgv-feature-intro-new|NEW!/);
  assert.doesNotMatch(overlay,/sgv-feature-intro-demo/);
  assert.match(overlay,/Escape|escape/);
  assert.match(overlay,/role:\s*['"]dialog['"]|role=['"]dialog['"]/);
});

test('data-factor-info locks controls and keeps multiplier pills tappable',()=>{
  assert.match(css,/\.sgv-phone\[data-factor-info="true"\] \.sgv-controls\{[^}]*pointer-events:none/);
  assert.match(css,/\.sgv-phone\[data-factor-info="true"\] \.sgv-hand\{[^}]*pointer-events:none/);
  assert.match(css,/\.sgv-phone\[data-factor-info="true"\] \.sgv-actions\{[^}]*pointer-events:none/);
  assert.match(css,/\.sgv-phone\[data-factor-info="true"\] \.sgv-multipliers\{[^}]*pointer-events:\s*auto/);
  assert.match(css,/\.sgv-phone\[data-factor-info="true"\] \.sgv-multipliers\{[^}]*z-index:\s*41/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/factor-info-content.test.mjs`  
Expected: FAIL (overlay missing / CSS missing)

- [ ] **Step 3: Implement overlay**

Create `src/casual/screens/factorInfo.jsx`:

```jsx
import {createElement,useEffect,useRef} from 'react';

// Short how-it-works card for Swing / Flip pills. Reuses feature-intro skin;
// no NEW! badge and no demo strip.
export function FactorInfoOverlay({info,onDismiss}){
  const gotItRef=useRef(null);
  useEffect(()=>{gotItRef.current?.focus?.();},[info?.kind]);
  useEffect(()=>{
    if(!info)return;
    const onKey=event=>{
      if(event.key==='Escape'){
        event.preventDefault();
        onDismiss?.('escape');
      }
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[info,onDismiss]);
  if(!info)return null;
  return createElement('div',{
    className:'sgv-feature-intro sgv-factor-info',
    role:'dialog','aria-modal':'true','aria-labelledby':'sgv-factor-info-title',
    'data-factor-info':info.kind,
    onClick(event){
      if(event.target?.closest?.('.sgv-feature-intro-play'))return;
      onDismiss?.('scrim');
    }
  },
  createElement('div',{className:'sgv-feature-intro-scrim','aria-hidden':'true'}),
  createElement('div',{className:'sgv-feature-intro-card'},
    createElement('img',{
      className:'sgv-feature-intro-icon',src:info.iconSrc,alt:'',
      'aria-hidden':'true',draggable:'false'
    }),
    createElement('h2',{id:'sgv-factor-info-title',className:'sgv-feature-intro-name'},info.title),
    createElement('p',{className:'sgv-feature-intro-copy'},info.copy),
    createElement('button',{
      ref:gotItRef,type:'button',className:'sgv-feature-intro-play',
      onClick(event){
        event.stopPropagation();
        onDismiss?.('got-it');
      }
    },info.buttonLabel)
  ));
}
```

- [ ] **Step 4: Add CSS gate**

In `src/casual/minimal.css`, immediately after the `data-intro-gate` rules (~1407–1409), add:

```css
/* Factor pill info: lock play; keep pills above the dialog so a second tap can swap. */
.sgv-phone[data-factor-info="true"] .sgv-controls{pointer-events:none}
.sgv-phone[data-factor-info="true"] .sgv-hand{pointer-events:none}
.sgv-phone[data-factor-info="true"] .sgv-actions{pointer-events:none}
.sgv-phone[data-factor-info="true"] .sgv-multipliers{
  position:relative;z-index:41;pointer-events:auto;
}
```

Also ensure `.sgv-feature-intro-icon` works for `<img>` (it already sets `width:72px;height:72px;flex:none` — if object-fit missing, add):

```css
img.sgv-feature-intro-icon{object-fit:contain;display:block}
```

near `.sgv-feature-intro-icon`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test tests/factor-info-content.test.mjs`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/casual/screens/factorInfo.jsx src/casual/minimal.css tests/factor-info-content.test.mjs
git commit -m "$(cat <<'EOF'
Add factor info overlay and pointer gate.

EOF
)"
```

---

### Task 3: Wire pills + SimplifiedGame

**Files:**
- Modify: `src/casual/MinimalBoard.jsx` (`HorizontalMeter`)
- Modify: `src/casual/SimplifiedGame.jsx`
- Create: `tests/factor-info-mount.test.mjs`

**Interfaces:**
- Consumes: `FactorInfoOverlay`, `factorInfoFor`
- Produces:
  - `HorizontalMeter` props: `onFactorInfo?: (kind:'swing'|'flip')=>void`, `factorInfoEnabled?: boolean` (default false means pills not clickable)
  - `SimplifiedGame` state: `factorInfo: null|'swing'|'flip'`; phone `data-factor-info={factorInfo?true:undefined}`; clears when `animating|introGate|startOpen|finished|levelId` changes to a blocking state

- [ ] **Step 1: Write the failing mount test**

Create `tests/factor-info-mount.test.mjs`. Copy the happy-dom + `jsx-loader` bootstrap verbatim from `tests/feature-intro-mount.test.mjs` (Window, exposes, `register`, `act`/`createRoot`/`SimplifiedGame` imports). Then:

```js
import {
  ONBOARDING_SESSION_KEY,prepareOnboardingJump
} from '../src/casual/onboardingProgress.js';
import {derivedFeatureUnlocks} from '../src/casual/featureIntroRegistry.js';
import {ONBOARDING_COUNT} from '../src/casual/onboardingLevels.js';

function tap(node){
  node.dispatchEvent(new win.PointerEvent('pointerdown',{
    bubbles:true,cancelable:true,pointerId:1
  }));
  node.dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true}));
}

async function mountAtLevel(levelId){
  win.localStorage.clear();
  prepareOnboardingJump(win.localStorage,levelId,{
    levelCount:ONBOARDING_COUNT,
    introUnlocks:derivedFeatureUnlocks()
  });
  const host=document.createElement('div');
  document.body.appendChild(host);
  const root=createRoot(host);
  await act(async()=>{
    root.render(createElement(StrictMode,null,createElement(SimplifiedGame)));
  });
  // Fresh jump has no session → level-start may show; dismiss like feature-intro-mount.
  if(host.querySelector('.sgv-level-start')){
    await act(async()=>{tap(host.querySelector('.sgv-card')||host.querySelector('.sgv-level-start'));});
  }
  assert.equal(host.querySelector('.sgv-feature-intro:not(.sgv-factor-info)'),null);
  return {host,root};
}

after(()=>{
  gsap.globalTimeline.clear();
  win.happyDOM.abort();
});

test('tapping Swing and Flip pills opens matching info; Got it and scrim dismiss',async()=>{
  const {host}=await mountAtLevel(16);
  const flowerPill=host.querySelector('.sgv-multiplier-pill[data-factor="swing"]');
  const beePill=host.querySelector('.sgv-multiplier-pill[data-factor="flip"]');
  assert.ok(flowerPill);
  assert.ok(beePill);
  assert.equal(flowerPill.tagName,'BUTTON');
  assert.equal(beePill.tagName,'BUTTON');
  A crossing Flip grows Swing and Flip. There is no third multiplier.
  A crossing Flip grows Swing and Flip. There is no third multiplier.

  await act(async()=>{tap(flowerPill);});
  const phone=host.querySelector('.sgv-phone');
  assert.equal(phone.getAttribute('data-factor-info'),'true');
  assert.ok(host.querySelector('.sgv-factor-info'));
  assert.match(host.querySelector('#sgv-factor-info-title').textContent,/More Flower/);
  assert.match(host.querySelector('.sgv-factor-info .sgv-feature-intro-copy').textContent,
    /Cross 0 for more flowers/);
  assert.ok(host.querySelector('.sgv-factor-info img.sgv-feature-intro-icon[src="/celebration/daisy-2.png"]'));

  await act(async()=>{tap(beePill);});
  assert.match(host.querySelector('#sgv-factor-info-title').textContent,/More Bee/);
  assert.match(host.querySelector('.sgv-factor-info .sgv-feature-intro-copy').textContent,
    /Flip for more bees/);

  await act(async()=>{tap(host.querySelector('.sgv-factor-info .sgv-feature-intro-play'));});
  assert.equal(host.querySelector('.sgv-factor-info'),null);
  assert.equal(phone.getAttribute('data-factor-info'),null);

  await act(async()=>{tap(flowerPill);});
  await act(async()=>{tap(host.querySelector('.sgv-factor-info .sgv-feature-intro-scrim'));});
  assert.equal(host.querySelector('.sgv-factor-info'),null);
});

test('factor info pills stay disabled during intro gate',async()=>{
  win.localStorage.clear();
  const host=document.createElement('div');
  document.body.appendChild(host);
  const root=createRoot(host);
  await act(async()=>{
    root.render(createElement(StrictMode,null,createElement(SimplifiedGame)));
  });
  assert.equal(host.querySelector('.sgv-phone').getAttribute('data-intro-gate'),'true');
  // Level 1 has no swing pill; assert Save intro is up and no factor-info dialog exists.
  assert.ok(host.querySelector('.sgv-feature-intro'));
  assert.equal(host.querySelector('.sgv-factor-info'),null);
});
```

Note: `prepareOnboardingJump(storage, levelId, {levelCount, introUnlocks})` — first arg is storage (see `onboardingProgress.js`). Level 16 uses `SWING_FLIP` so both pills show. `ONBOARDING_SESSION_KEY` is unused after a jump (session cleared); initial round comes from unlocked progress.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/factor-info-mount.test.mjs`  
Expected: FAIL (pills are spans / no overlay)

- [ ] **Step 3: Update HorizontalMeter pills**

In `src/casual/MinimalBoard.jsx`, extend `HorizontalMeter`:

```jsx
export function HorizontalMeter({
  position,limit=8,multipliers=[],visibleFactors=null,showDanger=true,beat='',dock=null,
  onFactorInfo=null,factorInfoEnabled=false
}){
  // …unchanged meter chrome…
  // Inside the multipliers map:
  const infoKind=kind==='swing'||kind==='flip'?kind:null;
  const interactive=!!(infoKind&&onFactorInfo&&factorInfoEnabled);
  const Tag=interactive?'button':'span';
  return <Tag key={kind} type={interactive?'button':undefined}
    className={'sgv-multiplier-pill sgv-multiplier-'+kind+
      ((dock==='swing'&&kind==='swing')||(dock==='flip-pill'&&kind==='flip')||
       A crossing Flip grows Swing and Flip. There is no third multiplier.
    data-factor={kind} title={label}
    aria-label={interactive?label+' info':label+': times '+value}
    disabled={interactive?false:undefined}
    onClick={interactive?()=>onFactorInfo(infoKind):undefined}>
    <span className="sgv-multiplier-value">×{value}</span>
    {/* icons unchanged */}
  </Tag>;
}
```

When `factorInfoEnabled` is false but `onFactorInfo` exists, still render `button` with `disabled` so a11y stays stable during gates:

```jsx
const canInfo=!!(infoKind&&onFactorInfo);
const Tag=canInfo?'button':'span';
disabled={canInfo?!factorInfoEnabled:undefined}
onClick={canInfo&&factorInfoEnabled?()=>onFactorInfo(infoKind):undefined}
```

Ensure CSS allows `button.sgv-multiplier-pill` to inherit pill look (reset border/background/font if buttons get UA styles). Add if needed:

```css
button.sgv-multiplier-pill{
  font:inherit;color:inherit;appearance:none;cursor:pointer;
}
button.sgv-multiplier-pill:disabled{cursor:default;opacity:1}
```

(Inspect existing `.sgv-multiplier-pill` — only add resets that are missing.)

- [ ] **Step 4: Wire SimplifiedGame**

In `src/casual/SimplifiedGame.jsx`:

1. Import `FactorInfoOverlay` and `factorInfoFor`.
2. Add `const [factorInfo,setFactorInfo]=useState(null);` and `const factorInfoOpenerRef=useRef(null);`.
3. `const factorInfoEnabled=!animating&&!introGate&&!startOpen&&!finished;`
4. Clear info when blocked:

```jsx
useEffect(()=>{
  if(!factorInfoEnabled&&factorInfo)setFactorInfo(null);
},[factorInfoEnabled,factorInfo]);
```

5. Also clear on `round.levelId` change:

```jsx
useEffect(()=>{setFactorInfo(null);},[round.levelId]);
```

6. On phone root: `data-factor-info={factorInfo?true:undefined}`
7. Pass to meter:

```jsx
<HorizontalMeter … 
  factorInfoEnabled={factorInfoEnabled}
  onFactorInfo={kind=>{
    factorInfoOpenerRef.current=rootRef.current?.querySelector(
      '.sgv-multiplier-pill[data-factor="'+kind+'"]'
    )||null;
    setFactorInfo(kind);
  }}/>
```

8. Mount overlay near FeatureIntroOverlay:

```jsx
{factorInfo&&factorInfoFor(factorInfo)&&<FactorInfoOverlay
  info={factorInfoFor(factorInfo)}
  onDismiss={()=>{
    setFactorInfo(null);
    queueInfoOpenerRef.current?.focus?.();
    factorInfoOpenerRef.current=null;
  }}/>}
```

9. Gate play while open — extend available empty check:

```jsx
const available=finished||animating||introGate||factorInfo?[]:onboardingActions(round);
```

(Also fold `factorInfo` into any existing “board tap during intro” guards only if taps would otherwise play through the overlay; the overlay + CSS lock should be enough.)

- [ ] **Step 5: Run mount tests**

Run: `node --test tests/factor-info-mount.test.mjs tests/factor-info-content.test.mjs`  
Expected: PASS

Fix session seeding until Level 16 shows both pills without intro. If Flip pill is absent on that level, pick the smallest level where `visibleFactors` includes both `swing` and `flip` (see `onboardingLevels.js`).

- [ ] **Step 6: Run a broader smoke**

Run: `node --test tests/feature-intro-mount.test.mjs tests/casual-onboarding.test.mjs`  
Expected: PASS (no regressions on meter markup assertions — update any source tests that require `<span class="sgv-multiplier-pill` if they are brittle)

- [ ] **Step 7: Commit**

```bash
git add src/casual/MinimalBoard.jsx src/casual/SimplifiedGame.jsx src/casual/minimal.css tests/factor-info-mount.test.mjs
git commit -m "$(cat <<'EOF'
Wire factor pill info popups into the board.

EOF
)"
```

---

## Spec coverage checklist

| Spec item | Task |
|-----------|------|
| Swing / Flip copy + daisy / bee icons | 1, 2 |
| Got it + scrim + Escape | 2, 3 |
| Mini feature-intro card, no NEW! / demo | 2 |
A crossing Flip grows Swing and Flip. There is no third multiplier.
| Disabled during animating / intro / start / end | 3 |
| `data-factor-info` lock + swap via second pill | 2, 3 |
| Focus restore to opener | 3 |
| Tests open/close/copy/gate | 1, 3 |

## Placeholder / consistency scan

- `factorInfo` kind strings always `'swing'|'flip'`
- Dismiss reasons `'got-it'|'scrim'|'escape'` (mount test may only exercise got-it + scrim)
- Overlay class `sgv-factor-info` for query; still uses `sgv-feature-intro` for skin
- Button label from `info.buttonLabel` (`Got it`), not hardcoded in multiple places beyond content map
