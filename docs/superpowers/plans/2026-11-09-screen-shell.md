# Screen Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `SimplifiedGame` into a snapshot, an input policy, a presentational phone, and DOM hooks without changing what the player sees.

**Architecture:** `screenState.js` and `boardInput.js` are pure. `platform.js` is the only new `window` access. `screenEffects.js` owns the effects that exist today. `OnboardingPhone.jsx` renders the current tree. `SimplifiedGame.jsx` applies commands and passes field setters through to `startPlayMotion`.

**Tech Stack:** JavaScript ESM, React 19, Node test runner (`node --test`), existing GSAP motion modules left in place.

## Global Constraints

- Player-visible behavior stays the same. Payouts, onboarding rules, motion timing, copy, class names, storage keys, and event names stay as they are.
- `runPresentedAction` still commits before `startPlayMotion`.
- `startPlayMotion`'s parameter list stays. Setters accept a value or an updater function.
- `seenFactors` stays a `Set` ref. `playMotion.js` still mutates it.
- `screenState.js` and `boardInput.js` do not import React, GSAP, or `platform.js`.
- `bankLive` is not a snapshot field.
- `startOpen` is true only when the round is fresh and the intro gate is closed. A restored mid-level round leaves the start screen closed.
- Pointer start-dismiss clears the dock. Keyboard start-dismiss does not.
- A storage throw still becomes `null` or a failed write. A throw from cancel, fx settle, or `showFinal` during stop-arrival, stop-win, or level change is still swallowed.
- No new source-text assertions. Do not edit `winMotion.js`, `chrome.css`, `engines.js`, or the legacy screen files.

---

### Task 1: Platform adapter

**Files:**
- Create: `src/casual/platform.js`
- Test: `tests/platform.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces: `browserStorage()`, `prefersReducedMotion()`, `dispatchCasualEvent(name, details)`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {browserStorage, dispatchCasualEvent, prefersReducedMotion} from '../src/casual/platform.js';

test('browserStorage returns null when window is missing', () => {
  const previous=globalThis.window;
  delete globalThis.window;
  try{
    assert.equal(browserStorage(), null);
    assert.equal(prefersReducedMotion(), false);
    assert.doesNotThrow(()=>dispatchCasualEvent('level_start', {level:1}));
  }finally{
    if(previous===undefined)delete globalThis.window;
    else globalThis.window=previous;
  }
});

test('browserStorage returns null when localStorage throws', () => {
  const previous=globalThis.window;
  globalThis.window={
    get localStorage(){throw new Error('blocked');},
    dispatchEvent(){},
    matchMedia(){return {matches:true};}
  };
  try{
    assert.equal(browserStorage(), null);
    assert.equal(prefersReducedMotion(), true);
  }finally{
    if(previous===undefined)delete globalThis.window;
    else globalThis.window=previous;
  }
});

test('dispatchCasualEvent sends swing-casual-event', () => {
  const previous=globalThis.window;
  const events=[];
  globalThis.window={
    localStorage:{getItem(){return null;}, setItem(){}},
    matchMedia(){return {matches:false};},
    dispatchEvent(event){events.push(event);}
  };
  try{
    dispatchCasualEvent('hint_shown', {level:2, turn:1});
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'swing-casual-event');
    assert.deepEqual(events[0].detail, {name:'hint_shown', level:2, turn:1});
  }finally{
    if(previous===undefined)delete globalThis.window;
    else globalThis.window=previous;
  }
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/platform.test.mjs`

Expected: FAIL, cannot find module `../src/casual/platform.js`.

- [ ] **Step 3: Implement the adapter**

```js
export function browserStorage(){
  try{return window.localStorage;}catch{return null;}
}

export function prefersReducedMotion(){
  return typeof window!=='undefined'&&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function dispatchCasualEvent(name, details={}){
  if(typeof window==='undefined')return;
  window.dispatchEvent(new CustomEvent('swing-casual-event', {detail:{name, ...details}}));
}
```

- [ ] **Step 4: Re-run the test**

Run: `node --test tests/platform.test.mjs`

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/casual/platform.js tests/platform.test.mjs
git commit -m "$(cat <<'EOF'
Add a window adapter for storage, motion preference, and casual events.

EOF
)"
```

---

### Task 2: Screen snapshot

**Files:**
- Create: `src/casual/screenState.js`
- Test: `tests/screen-state.test.mjs`

**Interfaces:**
- Consumes: `displayOf`, `levelStartPlan`, `isFreshRound`, `featureIntroForEntry`, `loadSavedRound`, `newOnboardingRound`, `onboardingLevel`, `readUnlockedOnboardingLevel`
- Produces:
  - `initialScreen({storage, levelCount, reduced})` → snapshot
  - `levelScreen(id, {storage, reduced})` → snapshot
  - `nextLevelId(levelId, levelCount)` → number
  - `dismissedIntro(screen, outcome)` → snapshot
  - `ackAfterCommit(screen, {outcome, first, text})` → snapshot
  - `settledScreen(screen, settled)` → snapshot
  - `closedStart`, `clearedDock`, `toggledHelp`, `toggledDevMenu`, `closedDevMenu`, `openedFactor(screen, kind)`, `closedFactor`, `shownPulse`, `dockExpired`, `arrivalSettled`, `successMarked`, `clearedAck(screen, token)` → snapshot
  - `endTransition(screen, decision, levelCount)` → `{screen, enterLevel}`
  - `phoneClassName(screen, {levelId, garden, feedback, eventType})` → string

Snapshot fields: `round`, `view`, `shownGold`, `animating`, `feedback`, `pulse`, `beat`, `help`, `docking`, `startOpen`, `ack`, `successSettled`, `arriving`, `devMenuOpen`, `introGate`, `introCard`, `factorInfo`, `advanced`.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {ONBOARDING_SESSION_KEY, SEEN_FEATURE_INTROS_KEY} from '../src/casual/onboardingProgress.js';
import {newOnboardingRound, ONBOARDING_COUNT} from '../src/casual/onboardingLevels.js';
import {dismissLevelScreen} from '../src/casual/levelScreens.js';
import {
  ackAfterCommit, arrivalSettled, clearedAck, closedStart, dismissedIntro,
  endTransition, initialScreen, levelScreen, nextLevelId, phoneClassName,
  settledScreen, successMarked
} from '../src/casual/screenState.js';

function memoryStorage(seed={}){
  const data={...seed};
  return {
    getItem(key){return Object.prototype.hasOwnProperty.call(data, key)?data[key]:null;},
    setItem(key, value){data[key]=String(value);},
    removeItem(key){delete data[key];}
  };
}

test('initialScreen opens a fresh level 1 behind the bank intro', () => {
  const screen=initialScreen({storage:memoryStorage(), levelCount:ONBOARDING_COUNT, reduced:false});
  assert.equal(screen.round.levelId, 1);
  assert.equal(screen.shownGold, screen.round.game.deal.T);
  assert.equal(screen.introGate, true);
  assert.equal(screen.introCard.id, 'bank');
  assert.equal(screen.startOpen, false);
  assert.equal(screen.arriving, false);
  assert.equal(screen.docking, false);
  assert.equal(screen.advanced, false);
});

test('initialScreen resumes a mid-level round with the start screen closed', () => {
  const round=newOnboardingRound(2);
  round.turn=1;
  const storage=memoryStorage({[ONBOARDING_SESSION_KEY]:JSON.stringify(round)});
  const screen=initialScreen({storage, levelCount:ONBOARDING_COUNT, reduced:false});
  assert.equal(screen.round.levelId, 2);
  assert.equal(screen.round.turn, 1);
  assert.equal(screen.shownGold, round.game.deal.T);
  assert.equal(screen.startOpen, false);
  assert.equal(screen.introGate, false);
  assert.equal(screen.arriving, false);
});

test('levelScreen resets gold and opens the start screen when no intro is waiting', () => {
  const motion=levelScreen(3, {storage:memoryStorage(), reduced:false});
  assert.equal(motion.round.levelId, 3);
  assert.equal(motion.shownGold, 0);
  assert.equal(motion.view.position, motion.round.game.deal.S);
  assert.equal(motion.startOpen, true);
  assert.equal(motion.introGate, false);
  assert.equal(motion.docking, true);
  assert.equal(motion.arriving, true);
  assert.equal(motion.animating, false);
  assert.equal(motion.help, false);
  assert.equal(motion.devMenuOpen, false);
  const reduced=levelScreen(3, {storage:memoryStorage(), reduced:true});
  assert.equal(reduced.arriving, false);
  assert.equal(reduced.docking, true);
});

test('a seen bank intro lets level 1 open the start screen', () => {
  const storage=memoryStorage({[SEEN_FEATURE_INTROS_KEY]:JSON.stringify(['bank'])});
  const screen=levelScreen(1, {storage, reduced:false});
  assert.equal(screen.introGate, false);
  assert.equal(screen.startOpen, true);
  assert.equal(screen.arriving, true);
});

test('nextLevelId stays on the last level', () => {
  assert.equal(nextLevelId(12, 20), 13);
  assert.equal(nextLevelId(20, 20), 20);
});

test('dismissedIntro opens the start screen only for a level-start handoff', () => {
  const screen=levelScreen(1, {storage:memoryStorage(), reduced:true});
  const queued=dismissedIntro(screen, {
    dismissed:true, gate:true, intro:{id:'next'}, handoff:null
  });
  assert.equal(queued.introGate, true);
  assert.equal(queued.introCard.id, 'next');
  assert.equal(queued.startOpen, screen.startOpen);
  const handed=dismissedIntro(screen, {
    dismissed:true, gate:false, intro:null, handoff:'level-start'
  });
  assert.equal(handed.introGate, false);
  assert.equal(handed.introCard, null);
  assert.equal(handed.startOpen, true);
  assert.equal(dismissedIntro(screen, {dismissed:false, gate:true, intro:screen.introCard}), screen);
});

test('ackAfterCommit sets the first outcome and clears a later one', () => {
  const screen={ack:null};
  const first=ackAfterCommit(screen, {outcome:'snap', first:{kind:'snap'}, text:'Pot lost. Savings safe.'});
  assert.deepEqual(first.ack, {kind:'snap', text:'Pot lost. Savings safe.'});
  const later=ackAfterCommit(first, {outcome:'flip', first:null, text:null});
  assert.equal(later.ack, null);
  assert.equal(ackAfterCommit(first, {outcome:null, first:null, text:null}), first);
});

test('settledScreen copies the presentation fields and keeps the ack', () => {
  const screen={ack:{kind:'flip', text:'FLIP'}, help:true, round:{levelId:1}};
  const settled=settledScreen(screen, {
    round:{levelId:1, turn:1}, view:{position:2}, shownGold:4, feedback:null, animating:false
  });
  assert.equal(settled.round.turn, 1);
  assert.equal(settled.view.position, 2);
  assert.equal(settled.shownGold, 4);
  assert.equal(settled.feedback, null);
  assert.equal(settled.animating, false);
  assert.deepEqual(settled.ack, screen.ack);
  assert.equal(settled.help, true);
});

test('closedStart leaves the dock flag alone', () => {
  const screen={startOpen:true, docking:true};
  assert.deepEqual(closedStart(screen), {startOpen:false, docking:true});
});

test('end decisions settle, advance once, or replay', () => {
  const playing={round:{levelId:12}, advanced:false, successSettled:false};
  const win=endTransition(playing, dismissLevelScreen('win', 'cta'), 20);
  assert.equal(win.enterLevel, 13);
  assert.equal(win.screen.advanced, true);
  assert.equal(win.screen.successSettled, true);
  const backdrop=endTransition(playing, dismissLevelScreen('win', 'backdrop'), 20);
  assert.equal(backdrop.enterLevel, null);
  assert.equal(backdrop.screen.successSettled, true);
  assert.equal(backdrop.screen.advanced, false);
  const lose=endTransition(playing, dismissLevelScreen('lose', 'cta'), 20);
  assert.equal(lose.enterLevel, 12);
  const again=endTransition({...playing, advanced:true}, dismissLevelScreen('win', 'cta'), 20);
  assert.equal(again.enterLevel, null);
  assert.equal(again.screen.advanced, true);
  const locked=endTransition(playing, {lock:true, advance:true}, 20);
  assert.equal(locked.enterLevel, null);
  assert.equal(locked.screen, playing);
});

test('clearedAck ignores a newer token and arrival can settle', () => {
  const ack={kind:'cross', text:'CROSS'};
  const screen={ack, arriving:true, successSettled:false};
  assert.equal(clearedAck(screen, {kind:'other'}).ack, ack);
  assert.equal(clearedAck(screen, ack).ack, null);
  assert.equal(arrivalSettled(screen).arriving, false);
  assert.equal(successMarked(screen).successSettled, true);
});

test('phoneClassName keeps the orchard, event, and arrival classes', () => {
  const name=phoneClassName({arriving:true}, {
    levelId:13, garden:2, feedback:null, eventType:'start'
  });
  assert.equal(name, 'sgv-phone sgv-onboarding sgv-onboarding-13 sgv-orchard sgv-event-start sgv-level-arrival');
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/screen-state.test.mjs`

Expected: FAIL, cannot find module `../src/casual/screenState.js`.

- [ ] **Step 3: Implement the snapshot**

```js
import {displayOf} from './presentation.js';
import {levelStartPlan} from './presentationSequence.js';
import {featureIntroForEntry, isFreshRound} from './featureIntroRegistry.js';
import {loadSavedRound} from './sessionRecords.js';
import {newOnboardingRound, onboardingLevel} from './onboardingLevels.js';
import {readUnlockedOnboardingLevel} from './onboardingProgress.js';

function cleared(){
  return {
    animating:false, feedback:null, pulse:false, beat:'', help:false,
    ack:null, successSettled:false, devMenuOpen:false, factorInfo:null, advanced:false
  };
}

function flagsFor(round, {storage, reduced}){
  const opening=featureIntroForEntry({round, storage, reduced});
  const fresh=isFreshRound(round);
  const plan=levelStartPlan(round.levelId, {fresh, reduced});
  return {
    ...cleared(),
    docking:Boolean(onboardingLevel(round.levelId).dock),
    startOpen:fresh&&!opening.gate,
    arriving:opening.gate?false:plan.motion,
    introGate:opening.gate,
    introCard:opening.intro
  };
}

export function levelScreen(id, env){
  const round=newOnboardingRound(id);
  return {round, view:displayOf(round), shownGold:0, ...flagsFor(round, env)};
}

export function initialScreen({storage, levelCount, reduced}){
  const saved=loadSavedRound(storage, levelCount);
  const round=saved||newOnboardingRound(readUnlockedOnboardingLevel(storage, levelCount));
  return {
    round, view:displayOf(round), shownGold:round.game.deal.T,
    ...flagsFor(round, {storage, reduced})
  };
}

export function nextLevelId(levelId, levelCount){
  return levelId>=levelCount?levelCount:levelId+1;
}

export function dismissedIntro(screen, outcome){
  if(!outcome?.dismissed)return screen;
  return {
    ...screen,
    introGate:outcome.gate,
    introCard:outcome.intro,
    startOpen:outcome.handoff==='level-start'?true:screen.startOpen
  };
}

export function ackAfterCommit(screen, {outcome, first, text}){
  if(first)return {...screen, ack:{kind:first.kind, text}};
  if(outcome)return {...screen, ack:null};
  return screen;
}

export function settledScreen(screen, settled){
  return {
    ...screen,
    round:settled.round,
    view:settled.view,
    shownGold:settled.shownGold,
    feedback:settled.feedback,
    animating:settled.animating
  };
}

export const closedStart=screen=>({...screen, startOpen:false});
export const clearedDock=screen=>({...screen, docking:false});
export const toggledHelp=screen=>({...screen, help:!screen.help});
export const toggledDevMenu=screen=>({...screen, devMenuOpen:!screen.devMenuOpen});
export const closedDevMenu=screen=>({...screen, devMenuOpen:false});
export const openedFactor=(screen, kind)=>({...screen, factorInfo:kind});
export const closedFactor=screen=>({...screen, factorInfo:null});
export const shownPulse=screen=>({...screen, pulse:true});
export const dockExpired=screen=>({...screen, docking:false});
export const arrivalSettled=screen=>({...screen, arriving:false});
export const successMarked=screen=>({...screen, successSettled:true});

export function clearedAck(screen, token){
  return screen.ack===token?{...screen, ack:null}:screen;
}

export function endTransition(screen, decision, levelCount){
  if(!decision||decision.lock)return {screen, enterLevel:null};
  let next=screen;
  let enterLevel=null;
  if(decision.settle)next={...next, successSettled:true};
  if(decision.advance){
    const already=next.advanced;
    next={...next, successSettled:true, advanced:true};
    if(!already)enterLevel=nextLevelId(next.round.levelId, levelCount);
  }
  if(decision.replay)enterLevel=next.round.levelId;
  return {screen:next, enterLevel};
}

export function phoneClassName(screen, {levelId, garden, feedback, eventType}){
  return 'sgv-phone sgv-onboarding sgv-onboarding-'+levelId+
    (garden===2?' sgv-orchard':'')+
    ' sgv-event-'+(feedback||eventType)+
    (screen.arriving?' sgv-level-arrival':'');
}
```

- [ ] **Step 4: Re-run the test**

Run: `node --test tests/screen-state.test.mjs`

Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/casual/screenState.js tests/screen-state.test.mjs
git commit -m "$(cat <<'EOF'
Move onboarding screen transitions into a pure snapshot.

EOF
)"
```

---

### Task 3: Input policy

**Files:**
- Create: `src/casual/boardInput.js`
- Test: `tests/board-input.test.mjs`

**Interfaces:**
- Consumes: `introPointerDecision`, `dismissLevelScreen`, `startTap`, `isSkipKey`
- Produces:
  - `boardPointerDecision({gate, inIntro, presenting, startOpen, arriving, docking})` → `{prevent, stop, steps}`
  - `boardClickDecision({gate, inIntro})` → `{prevent, stop, consultClick}`
  - `boardKeyDecision({key, gate, presenting, finished, victory, startOpen, onButton})` → `{handled, prevent, stop, dismissIntro, skipPresentation, stopWin, endVia, stopArrival, closeStart}`

`steps` values are `stopArrival`, `closeStart`, `clearDock`, `skipPresentation`, and `consultPointer`. The shell prevents a `consultPointer` result only when `acceptPointerDown()` returns `'skip'`.

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import {boardClickDecision, boardKeyDecision, boardPointerDecision} from '../src/casual/boardInput.js';

const idle={gate:false, inIntro:false, presenting:false, startOpen:false, arriving:false, docking:false};

test('pointer blocks a tap outside the intro card', () => {
  const decision=boardPointerDecision({...idle, gate:true, inIntro:false});
  assert.equal(decision.prevent, true);
  assert.equal(decision.stop, true);
  assert.deepEqual(decision.steps, []);
});

test('pointer lets the intro card handle its own tap', () => {
  const decision=boardPointerDecision({...idle, gate:true, inIntro:true});
  assert.equal(decision.prevent, false);
  assert.equal(decision.stop, false);
  assert.deepEqual(decision.steps, []);
});

test('pointer start dismiss stops arrival and clears a dock', () => {
  const decision=boardPointerDecision({...idle, startOpen:true, docking:true});
  assert.equal(decision.prevent, true);
  assert.deepEqual(decision.steps, ['stopArrival', 'closeStart', 'clearDock']);
});

test('pointer presentation skip does not also consult the lock', () => {
  const decision=boardPointerDecision({...idle, presenting:true, docking:true});
  assert.equal(decision.prevent, true);
  assert.deepEqual(decision.steps, ['skipPresentation']);
});

test('pointer arrival finishes and a passing tap clears the dock', () => {
  const decision=boardPointerDecision({...idle, arriving:true, docking:true});
  assert.equal(decision.prevent, false);
  assert.deepEqual(decision.steps, ['stopArrival', 'clearDock', 'consultPointer']);
});

test('click consults the presentation unless the intro already handled it', () => {
  assert.equal(boardClickDecision({gate:false, inIntro:false}).consultClick, true);
  const inside=boardClickDecision({gate:true, inIntro:true});
  assert.equal(inside.prevent, false);
  assert.equal(inside.consultClick, false);
  const outside=boardClickDecision({gate:true, inIntro:false});
  assert.equal(outside.prevent, true);
  assert.equal(outside.consultClick, false);
});

test('keyboard decisions follow the skip order', () => {
  const base={key:'Escape', gate:false, presenting:false, finished:false, victory:false, startOpen:false, onButton:false};
  assert.equal(boardKeyDecision({...base, key:'a'}).handled, false);
  assert.equal(boardKeyDecision({...base, gate:true}).dismissIntro, true);
  assert.equal(boardKeyDecision({...base, presenting:true}).skipPresentation, true);
  assert.equal(boardKeyDecision({...base, finished:true, onButton:true}).handled, false);
  const win=boardKeyDecision({...base, finished:true, victory:true, onButton:false});
  assert.equal(win.stopWin, true);
  assert.equal(win.endVia, 'backdrop');
  const lose=boardKeyDecision({...base, finished:true, victory:false});
  assert.equal(lose.stopWin, false);
  assert.equal(lose.endVia, 'backdrop');
  const start=boardKeyDecision({...base, startOpen:true});
  assert.equal(start.stopArrival, true);
  assert.equal(start.closeStart, true);
  assert.equal(start.handled, true);
  assert.equal(boardKeyDecision(base).handled, false);
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `node --test tests/board-input.test.mjs`

Expected: FAIL, cannot find module `../src/casual/boardInput.js`.

- [ ] **Step 3: Implement the policy**

```js
import {introPointerDecision} from './featureIntroRegistry.js';
import {dismissLevelScreen} from './levelScreens.js';
import {startTap} from './presentationSequence.js';
import {isSkipKey} from './skipFocus.js';

export function boardPointerDecision({gate, inIntro, presenting, startOpen, arriving, docking}){
  const intro=introPointerDecision({gate, inIntro});
  if(intro.handled)return {prevent:!intro.dismiss, stop:!intro.dismiss, steps:[]};
  if(startOpen&&!presenting){
    const opening=dismissLevelScreen('start', 'tap');
    if(opening.dismiss&&!opening.lock){
      const steps=['stopArrival', 'closeStart'];
      if(docking)steps.push('clearDock');
      return {prevent:true, stop:true, steps};
    }
  }
  const tap=startTap({action:presenting, arrival:arriving});
  if(tap.consume)return {prevent:true, stop:true, steps:['skipPresentation']};
  const steps=[];
  if(tap.finishArrival)steps.push('stopArrival');
  if(docking)steps.push('clearDock');
  steps.push('consultPointer');
  return {prevent:false, stop:false, steps};
}

export function boardClickDecision({gate, inIntro}){
  const intro=introPointerDecision({gate, inIntro});
  if(intro.handled)return {prevent:!intro.dismiss, stop:!intro.dismiss, consultClick:false};
  return {prevent:false, stop:false, consultClick:true};
}

function keyResult(overrides){
  return {
    handled:false, prevent:false, stop:false, dismissIntro:false,
    skipPresentation:false, stopWin:false, endVia:null,
    stopArrival:false, closeStart:false, ...overrides
  };
}

export function boardKeyDecision({key, gate, presenting, finished, victory, startOpen, onButton}){
  if(!isSkipKey(key))return keyResult();
  if(gate)return keyResult({handled:true, prevent:true, stop:true, dismissIntro:true});
  if(presenting)return keyResult({handled:true, prevent:true, stop:true, skipPresentation:true});
  if(finished){
    if(onButton)return keyResult();
    return keyResult({handled:true, prevent:true, stop:true, stopWin:!!victory, endVia:'backdrop'});
  }
  if(!startOpen)return keyResult();
  const opening=dismissLevelScreen('start', 'skip');
  if(opening.dismiss&&!opening.lock){
    return keyResult({handled:true, prevent:true, stop:true, stopArrival:true, closeStart:true});
  }
  return keyResult();
}
```

- [ ] **Step 4: Re-run the test**

Run: `node --test tests/board-input.test.mjs`

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/casual/boardInput.js tests/board-input.test.mjs
git commit -m "$(cat <<'EOF'
Share one input policy across pointer, click, and keyboard.

EOF
)"
```

---

### Task 4: Effects, phone, and shell

**Files:**
- Create: `src/casual/screenEffects.js`
- Create: `src/casual/OnboardingPhone.jsx`
- Modify: `src/casual/SimplifiedGame.jsx`
- Test: existing `npm test` and `npm run simulate:casual`

**Interfaces:**
- Consumes: every produce from Tasks 1–3, plus the current motion, readout, intro, and session modules.
- Produces:
  - `useDebugBridge({fxRef, changeLevel})`
  - `useLevelArrival({rootRef, fxRef, levelId, fresh, introGate, startOpen, reduced, introStartRef, levelReadyRef, onArrivingSettled})` → `{stopArrival, active}`
  - `useWinCelebration({rootRef, fxRef, active, levelId, secured, target, reduced, onSuccessSettled})` → `{stopWin}`
  - `useHoneyLayout(rootRef, {active})`
  - `useSkipFocus(rootRef, animating)`
  - `useBoardChrome({...})` → `bankLive`
  - `OnboardingPhone` props listed in Step 3

`import.meta.env` is only defined for `.jsx` files in the Node test loader. In `screenEffects.js` read it as `import.meta.env?.DEV` so a missing `env` does not throw.

`stopArrival({notify})` and `stopWin({notify})` default `notify` to true. `changeLevel` calls both with `{notify:false}` before installing `levelScreen`, so a swallowed settle cannot overwrite the new snapshot.

`useDebugBridge` keeps `changeLevel` in a ref and registers `__swingGoToLevel` once. Do not put `play` in the auto-bank effect dependency list. The dock effect depends only on `levelId` and the level dock id, matching today.

The mounted hotfix and onboarding tests are the behavior check. Do not add a source-text test.

- [ ] **Step 1: Record the current suite**

Run: `npm test`

Expected: PASS. This is the baseline the move must keep.

- [ ] **Step 2: Add `src/casual/screenEffects.js`**

```js
import {useEffect, useRef, useState} from 'react';
import {playWinCelebration} from './winMotion.js';
import {playLevelStart} from './levelStartMotion.js';
import {applyHoneyLayout} from './honeyWin.js';
import {levelStartPlan} from './presentationSequence.js';
import {successPlan} from './presentationSequence.js';
import {nextBankAnnouncement} from './bankStatus.js';
import {focusTargetAfterSkip, rememberFocus} from './skipFocus.js';
import {takeFirstOutcome} from './presentationSequence.js';
import {prepareOnboardingJump} from './onboardingProgress.js';
import {derivedFeatureUnlocks} from './featureIntroRegistry.js';
import {ONBOARDING_COUNT} from './onboardingLevels.js';
import {browserStorage, dispatchCasualEvent} from './platform.js';
import {closedFactor, dockExpired, shownPulse} from './screenState.js';

function devBuild(){return !!import.meta.env?.DEV;}

export function useDebugBridge({fxRef, changeLevel}){
  const changeLevelRef=useRef(changeLevel);
  changeLevelRef.current=changeLevel;
  useEffect(()=>{
    if(!devBuild()||typeof window==='undefined')return;
    const emit=spec=>fxRef.current.emit(spec);
    window.__swingFxEmit=emit;
    return ()=>{if(window.__swingFxEmit===emit)delete window.__swingFxEmit;};
  }, [fxRef]);
  useEffect(()=>{
    if(typeof window==='undefined')return;
    window.__swingGoToLevel=(levelId, options={})=>{
      const id=prepareOnboardingJump(browserStorage(), Number(levelId), {
        levelCount:ONBOARDING_COUNT, introUnlocks:derivedFeatureUnlocks()
      });
      if(id==null){
        console.warn('__swingGoToLevel: need an integer 1..'+ONBOARDING_COUNT);
        return false;
      }
      dispatchCasualEvent('debug_goto_level', {level:id});
      if(options.reload){
        window.location.reload();
        return id;
      }
      changeLevelRef.current(id);
      return id;
    };
    return ()=>{if(window.__swingGoToLevel)delete window.__swingGoToLevel;};
  }, []);
}

export function useLevelArrival({
  rootRef, fxRef, levelId, fresh, introGate, startOpen, reduced,
  introStartRef, levelReadyRef, onArrivingSettled
}){
  const arrivalRef=useRef(null);
  const [handleOn, setHandleOn]=useState(false);
  function stopArrival({notify=true}={}){
    const handle=arrivalRef.current;
    arrivalRef.current=null;
    setHandleOn(false);
    try{handle?.cancel();}catch{/* a half-played arrival still has to show its end */}
    try{fxRef.current.settle();}catch{/* settle must not block the tap */}
    try{handle?.showFinal?.();}catch{/* the inline end state is enough */}
    if(notify)onArrivingSettled();
  }
  function beginArrival(){
    const root=rootRef.current;
    if(!root||!fresh||introGate){
      onArrivingSettled();
      return ()=>{};
    }
    try{arrivalRef.current?.cancel();}catch{/* the previous banner is already gone */}
    arrivalRef.current=null;
    const banner=document.createElement('div');
    banner.className='sgv-level-banner';
    banner.setAttribute('aria-hidden', 'true');
    banner.textContent='Level '+levelId;
    root.appendChild(banner);
    let alive=true;
    const handle=playLevelStart({
      banner,
      jar:root.querySelector('.sgv-chest-area'),
      goal:root.querySelector('.sgv-goal-progress'),
      board:[...root.querySelectorAll('.sgv-meter-section, .sgv-hand, .sgv-actions, .sgv-pending-pot')],
      reduced, bus:fxRef.current,
      onSettled(){if(alive)onArrivingSettled();}
    });
    arrivalRef.current=handle;
    setHandleOn(true);
    return ()=>{
      alive=false;
      if(arrivalRef.current===handle)arrivalRef.current=null;
      setHandleOn(false);
      handle.cancel();
    };
  }
  useEffect(()=>{
    dispatchCasualEvent('level_start', {level:levelId});
    levelReadyRef.current=levelId;
    introStartRef.current?.();
    if(introGate)return;
    return beginArrival();
    // fresh, reduced, and the gate are the values for this level entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);
  useEffect(()=>{
    if(introGate||!startOpen)return;
    if(levelReadyRef.current!==levelId)return;
    if(arrivalRef.current)return;
    return beginArrival();
    // beginArrival reads the latest fresh/reduced for this open start screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introGate, startOpen, levelId]);
  return {stopArrival, active:handleOn||!!arrivalRef.current};
}

export function useWinCelebration({
  rootRef, fxRef, active, levelId, secured, target, reduced, onSuccessSettled
}){
  const winMotionRef=useRef(null);
  function stopWin({notify=true}={}){
    const handle=winMotionRef.current;
    winMotionRef.current=null;
    try{handle?.cancel();}catch{/* a half-played celebration still shows its end */}
    try{fxRef.current.settle();}catch{/* settle must not block the tap */}
    try{handle?.showFinal?.();}catch{/* the inline end state is enough */}
    if(notify)onSuccessSettled();
  }
  useEffect(()=>{
    if(!active)return;
    const root=rootRef.current;
    if(!root)return;
    const plan=successPlan({victory:true, levelId, secured, reduced});
    let alive=true;
    const handle=playWinCelebration({
      victory:true, secured, target, tier:plan.tier||0,
      praise:root.querySelector('.sgv-win-praise'),
      tally:root.querySelector('.sgv-win-tally'),
      scoreboard:root.querySelector('.sgv-honey-scoreboard'),
      underline:root.querySelector('.sgv-honey-slogan-underline'),
      drops:[...root.querySelectorAll('.sgv-honey-slogan-drops-art')],
      targetRow:root.querySelector('.sgv-honey-scoreboard-target'),
      liquid:root.querySelector('.sgv-honey-hero-art .sgv-fluid-fill'),
      scrim:root.querySelector('.sgv-honey-scrim'),
      mouth:root.querySelector('.sgv-honey-mouth'),
      source:root.querySelector('.sgv-gold-counter'),
      pot:root.querySelector('.sgv-pending-pot'),
      layer:root.querySelector('.sgv-fx-layer'),
      cta:root.querySelector('.sgv-end-cta'),
      card:root.querySelector('.sgv-honey-win'),
      reduced, bus:fxRef.current,
      onSettled(){if(alive)onSuccessSettled();}
    });
    winMotionRef.current=handle;
    return ()=>{
      alive=false;
      if(winMotionRef.current===handle)winMotionRef.current=null;
      handle.cancel();
    };
    // onSuccessSettled goes through the shell ref. Depending on it restarts the win every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, levelId, secured]);
  return {stopWin};
}

export function useHoneyLayout(rootRef, {active}){
  useEffect(()=>{
    const phone=rootRef.current;
    if(!phone)return;
    const apply=()=>{
      const box=phone.getBoundingClientRect?.();
      const height=box?.height||phone.clientHeight||0;
      const width=box?.width||phone.clientWidth||0;
      if(!(height>0)||!(width>0))return;
      const style=getComputedStyle(phone);
      const top=parseFloat(style.paddingTop)||0;
      const right=parseFloat(style.paddingRight)||0;
      const bottom=parseFloat(style.paddingBottom)||0;
      const left=parseFloat(style.paddingLeft)||0;
      phone.classList.toggle('sgv-honey-short', height-top-bottom<520);
      applyHoneyLayout(phone.querySelector('.sgv-honey-win'), width, height, {top, right, bottom, left});
    };
    const nodes=[...phone.querySelectorAll(':scope > .sgv-hud, :scope > .sgv-middle, :scope > .sgv-controls')];
    for(const node of nodes){
      if(active){
        node.setAttribute('aria-hidden', 'true');
        node.setAttribute('inert', '');
      }else{
        node.removeAttribute('aria-hidden');
        node.removeAttribute('inert');
      }
    }
    apply();
    window.addEventListener('resize', apply);
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(apply):null;
    ro?.observe(phone);
    return ()=>{
      window.removeEventListener('resize', apply);
      ro?.disconnect();
    };
  }, [rootRef, active]);
}

export function useSkipFocus(rootRef, animating){
  const priorFocusRef=useRef(null);
  const skipFocusedRef=useRef(false);
  useEffect(()=>{
    const root=rootRef.current;
    if(!root)return;
    if(animating){
      priorFocusRef.current=rememberFocus(document.activeElement, root);
      root.querySelector('.sgv-skip-surface')?.focus();
      skipFocusedRef.current=true;
      return;
    }
    if(!skipFocusedRef.current)return;
    skipFocusedRef.current=false;
    const active=document.activeElement;
    const inside=active&&root.contains(active)?active:null;
    const controls=[...root.querySelectorAll('.sgv-card, .sgv-bank-command, .sgv-flip, .sgv-end-card button')];
    const target=focusTargetAfterSkip({active:inside, previous:priorFocusRef.current, controls});
    priorFocusRef.current=null;
    if(target&&target!==active)target.focus();
  }, [rootRef, animating]);
}

export function useBoardChrome({
  rootRef, screen, readout, play, seenFactorsRef, setScreen
}){
  const bankAnnounceRef=useRef(null);
  const [bankLive, setBankLive]=useState('');
  const {round, animating, introGate, introCard, startOpen, arriving, ack, factorInfo}=screen;
  const levelId=round.levelId;
  const fresh=round.turn===0&&!round.game.deal.plays;
  const writeRef=useRef(setScreen);
  writeRef.current=setScreen;
  function write(recipe){writeRef.current(recipe);}
  useEffect(()=>{
    const plan=levelStartPlan(levelId, {fresh, reduced:prefersReducedMotion()});
    if(!plan.dock)return;
    write(current=>({...current, docking:true}));
    const timer=setTimeout(()=>write(dockExpired), plan.dock.end*1000);
    return ()=>clearTimeout(timer);
    // fresh is the value at level entry. A later play must not restart the dock.
    // write reads the shell ref, so it stays out of the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, readout.level.dock]);
  useEffect(()=>{
    if(!introGate||!introCard)return;
    dispatchCasualEvent('feature_intro_shown', {feature:introCard.id, level:levelId});
  }, [introGate, introCard, levelId]);
  useEffect(()=>{
    write(current=>current.pulse?{...current, pulse:false}:current);
    if(animating||readout.finished||introGate||startOpen)return;
    const timer=setTimeout(()=>{
      write(shownPulse);
      dispatchCasualEvent('hint_shown', {level:levelId, turn:round.turn});
    }, 3000);
    return ()=>clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animating, round.turn, levelId, readout.finished, introGate, startOpen]);
  useEffect(()=>{
    if(!ack)return;
    const token=ack;
    const timer=setTimeout(()=>write(current=>current.ack===token?{...current, ack:null}:current), 1100);
    return ()=>clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ack]);
  useEffect(()=>{
    if(!readout.factorInfoEnabled&&factorInfo)write(closedFactor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readout.factorInfoEnabled, factorInfo]);
  useEffect(()=>{write(closedFactor);}, [levelId]);
  useEffect(()=>{
    if(!readout.canBank)return;
    takeFirstOutcome(seenFactorsRef.current, 'bank');
  }, [readout.canBank, round.turn, levelId, seenFactorsRef]);
  useEffect(()=>{
    const result=nextBankAnnouncement(bankAnnounceRef.current, readout.bankMessage);
    bankAnnounceRef.current=result.previous;
    if(result.text)setBankLive(result.text);
  }, [readout.bankMessage]);
  useEffect(()=>{
    if(readout.finished||animating||introGate||startOpen||arriving||!readout.autoBank)return;
    const source=rootRef.current?.querySelector('.sgv-pending-pot');
    const timer=setTimeout(()=>play({type:'bank'}, source), 280);
    return ()=>clearTimeout(timer);
    // play is current whenever turn or level changes. Do not depend on its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readout.autoBank, readout.finished, animating, introGate, startOpen, arriving, round.turn, levelId]);
  return bankLive;
}
```

`closedFactor` on level change matches today's effect, including the first mount. `write` always calls the latest shell setter.

- [ ] **Step 3: Add `src/casual/OnboardingPhone.jsx`**

```jsx
import {signed} from '../external/engines.js';
import {GardenScene} from './CasualArt.jsx';
import {FactorInfoOverlay} from './screens/factorInfo.jsx';
import {factorInfoFor} from './factorInfoContent.js';
import {FeatureIntroOverlay} from './screens/featureIntro.jsx';
import {FxLayer} from './fx/FxLayer.jsx';
import {LevelEndScreen} from './screens/levelEnd.jsx';
import {LevelStartScreen} from './screens/levelStart.jsx';
import {HorizontalMeter, GlassChest, PendingPot, SimpleCard} from './MinimalBoard.jsx';
import {GARDEN_2_START, wouldSnap} from './onboardingLevels.js';

export function OnboardingPhone({
  screen, readout, ending, bankLive, reduced, fx, rootRef, introStartRef, levelReadyRef, phoneClass,
  onPointerDownCapture, onClickCapture, onKeyDownCapture, onPlay, onFactorInfo, onReset, onToggleDev,
  onGotoLevel, onToggleHelp, onSkipGarden, onDismissFactor, onDismissIntro, onDismissStart,
  onEndPrimary, onEndBackdrop, onFinishPresentation
}){
  const {
    level, deal, victory, finished, factorInfoEnabled, available, canBank, canFlip,
    potDisplay, remaining, hearts, shownHand, bankMessage, bankPulse, flipPulse, pulseIndex, winLabel
  }=readout;
  const {view, shownGold, animating, introGate, introCard, docking, help, devMenuOpen, factorInfo, startOpen, ack, beat, successSettled}=screen;
  return <main className="sgv-page">
    <div ref={rootRef}
      data-honey-win={finished&&victory?'true':undefined}
      data-factor-info={factorInfo?true:undefined}
      className={phoneClass}
      aria-busy={animating}
      data-intro-gate={introGate?true:undefined}
      onPointerDownCapture={onPointerDownCapture}
      onClickCapture={onClickCapture}
      onKeyDownCapture={onKeyDownCapture}>
      <GardenScene/>
      <FxLayer bus={fx}/>
      <div className="sgv-atmosphere" aria-hidden="true"/>
      <header className="sgv-hud sgv-tutorial-hud">
        <div className="sgv-level" aria-label={'Level '+level.id+(level.telegraph?' '+level.name:'')}>
          <span>★</span><strong>Level {level.id}</strong>
          {level.telegraph&&<small className="sgv-level-name">{level.name}</small>}
        </div>
        <div className="sgv-hud-right">
          <div className="sgv-gold-counter" aria-label={shownGold+' drops secured'}>
            <span className="sgv-gold-icon">●</span><strong>{shownGold}</strong>
          </div>
          {level.showChances&&<div className={'sgv-lives'+(docking&&level.dock==='hearts'?' sgv-dock':'')}
            aria-label={hearts+' chances remaining'}>
            {Array.from({length:level.maxSnaps}, (_, i)=><span key={i}
              className={i<hearts?'sgv-heart':'sgv-heart sgv-heart-empty'}>♥</span>)}
          </div>}
          <div className="sgv-tutorial-tools">
            <button type="button" className="sgv-reset-progress"
              onClick={onReset} aria-label="Reset onboarding progress and restart Level 1"
              title="Reset onboarding progress">
              <span aria-hidden="true" className="sgv-reset-icon">↺</span>
              <span className="sgv-reset-label">Reset</span>
            </button>
            <button type="button" className="sgv-dev-menu-toggle"
              onClick={onToggleDev}
              aria-label="More onboarding tools" aria-expanded={devMenuOpen}>⋯</button>
            {devMenuOpen&&<div className="sgv-dev-menu" role="group" aria-label="Onboarding tools">
              <button type="button" onClick={onGotoLevel}>Go to level…</button>
              <button type="button" onClick={onToggleHelp}>{help?'Hide help':'Show help'}</button>
              {level.id<GARDEN_2_START&&<button type="button" onClick={onSkipGarden}>Skip to Level 13</button>}
            </div>}
          </div>
        </div>
      </header>
      <div className="sgv-spring-top" aria-hidden="true"/>
      <div className="sgv-middle">
        <HorizontalMeter position={view.position} limit={level.rules.snapLimit}
          multipliers={view.factors} visibleFactors={level.visibleFactors}
          showDanger={level.showChances} beat={ack?ack.text:beat} dock={docking?level.dock:null}
          factorInfoEnabled={factorInfoEnabled}
          onFactorInfo={onFactorInfo}/>
        <span className="sgv-flight-center" aria-hidden="true"/>
        <div className="sgv-bottle-pair" aria-label="Pending Pot and secured glass">
          <PendingPot value={potDisplay} cap={level.rules.potCap} target={level.target}
            bankable={canBank} interactive={false}/>
          <GlassChest banked={shownGold} target={level.target}/>
        </div>
      </div>
      <section className="sgv-controls sgv-tutorial-controls" aria-label="Card actions">
        <div className="sgv-card-shelf" aria-hidden="true"/>
        <div className="sgv-hand" aria-label="Your cards">
          {shownHand.map((id, i)=><SimpleCard key={id} id={id} index={i}
            value={signed(id)} showDirection={true}
            risky={level.showChances&&wouldSnap(screen.round, {type:'steer', index:i})}
            highlighted={pulseIndex===i}
            disabled={finished||animating||!available.some(action=>action.type==='steer'&&action.index===i)}
            onPlay={(index, element)=>onPlay({type:'steer', index}, element)}/>)}
        </div>
        <div className="sgv-actions sgv-tutorial-actions">
          <button type="button"
            className={'sgv-action sgv-bank sgv-bank-command'+(bankPulse?' sgv-attention':'')}
            disabled={!canBank}
            onClick={()=>onPlay({type:'bank'}, rootRef.current?.querySelector('.sgv-pending-pot'))}
            aria-label={canBank?'Save '+potDisplay+' pending drops':bankMessage}>
            <span>SAVE{canBank?' '+potDisplay:''}</span>
          </button>
          <p className="sgv-bank-live" aria-live="polite" aria-atomic="true">{bankLive}</p>
          {level.showFlip&&remaining>0&&<button type="button"
            className="sgv-action sgv-flip"
            data-dock={docking&&level.dock==='flip'?true:undefined}
            data-hint={flipPulse?true:undefined}
            disabled={!canFlip}
            onClick={event=>onPlay({type:'flip'}, event.currentTarget.querySelector('.sgv-next-card'))}
            aria-label={'Flip a hidden card. '+remaining+' remain'}>
            <span className="sgv-action-icon">⟳</span>
            <span>FLIP</span>
            <span className="sgv-flip-next"><span className="sgv-next-card">?</span>
              <small>{remaining} left</small></span>
          </button>}
        </div>
      </section>
      <div className="sgv-spring-bottom" aria-hidden="true"/>
      {help&&!finished&&<ul className="sgv-glossary" role="note">
        <li>Card → meter → Pot</li>
        <li>SAVE → Savings</li>
        <li>Pill × this card</li>
        <li>0 keeps the Pot. Snap empties it.</li>
      </ul>}
      {factorInfo&&factorInfoFor(factorInfo)&&<FactorInfoOverlay
        info={factorInfoFor(factorInfo)} onDismiss={onDismissFactor}/>}
      {introGate&&introCard&&<FeatureIntroOverlay intro={introCard}
        reduced={reduced} bus={fx} onDismiss={onDismissIntro}
        levelId={screen.round.levelId} introStartRef={introStartRef} levelReadyRef={levelReadyRef}/>}
      {startOpen&&!introGate&&!finished&&!animating&&<LevelStartScreen
        levelId={level.id} target={level.target} onDismiss={onDismissStart}/>}
      {finished&&<LevelEndScreen victory={victory} score={deal.T} target={level.target}
        label={victory?winLabel:'TRY AGAIN'} orchard={!!ending.orchard} settled={successSettled}
        praise={ending.praise} reduced={victory&&!ending.motion}
        onPrimary={onEndPrimary} onBackdrop={onEndBackdrop} onReset={onReset}/>}
      {animating&&<button type="button" className="sgv-skip-surface" aria-label="Skip animation"
        onPointerDown={event=>{event.preventDefault(); event.stopPropagation(); onFinishPresentation();}}
        onClick={event=>{event.preventDefault(); event.stopPropagation(); onFinishPresentation();}}/>}
    </div>
  </main>;
}
```

- [ ] **Step 4: Replace `SimplifiedGame.jsx` with the shell**

```jsx
import React, {useEffect, useRef, useState} from 'react';
import {createActionPresentation, runPresentedAction} from './actionPresentation.js';
import {boardClickDecision, boardKeyDecision, boardPointerDecision} from './boardInput.js';
import {boardReadout} from './boardReadout.js';
import {createFxBus} from './fx/fxBus.js';
import {boardTapDuringIntro, dismissFeatureIntro, derivedFeatureUnlocks} from './featureIntroRegistry.js';
import {clearWinMemo} from './idleHint.js';
import {dismissLevelScreen} from './levelScreens.js';
import {GARDEN_2_START, ONBOARDING_COUNT, onboardingFinished, onboardingLevel, onboardingVictory} from './onboardingLevels.js';
import {ONBOARDING_PROGRESS_KEY, clearOnboardingProgress, prepareOnboardingJump} from './onboardingProgress.js';
import {OnboardingPhone} from './OnboardingPhone.jsx';
import {browserStorage, dispatchCasualEvent, prefersReducedMotion} from './platform.js';
import {introCopy, successPlan, takeFirstOutcome} from './presentationSequence.js';
import {settledPresentation} from './presentation.js';
import {playOutcome, startPlayMotion} from './playMotion.js';
import {
  ackAfterCommit, arrivalSettled, clearedDock, closedDevMenu, closedFactor, closedStart,
  dismissedIntro, endTransition, initialScreen, levelScreen, openedFactor, phoneClassName,
  settledScreen, successMarked, toggledDevMenu, toggledHelp
} from './screenState.js';
import {commitPlay, saveRound} from './sessionRecords.js';
import {
  useBoardChrome, useDebugBridge, useHoneyLayout, useLevelArrival, useSkipFocus, useWinCelebration
} from './screenEffects.js';

export default function SimplifiedGame(){
  const reduced=prefersReducedMotion();
  const [screen, setScreen]=useState(()=>initialScreen({
    storage:browserStorage(), levelCount:ONBOARDING_COUNT, reduced:prefersReducedMotion()
  }));
  const screenRef=useRef(screen);
  const rootRef=useRef(null);
  const fxRef=useRef(null);
  if(!fxRef.current)fxRef.current=createFxBus();
  const presentationRef=useRef(null);
  if(!presentationRef.current)presentationRef.current=createActionPresentation({fx:fxRef.current});
  const cancelRef=useRef(null);
  const resetMotionRef=useRef(null);
  const lossMotionRef=useRef(null);
  const breakMotionRef=useRef(null);
  const seenFactorsRef=useRef(new Set());
  const introStartRef=useRef(null);
  const levelReadyRef=useRef(null);
  const introGateRef=useRef(screen.introGate);
  const factorInfoOpenerRef=useRef(null);
  introGateRef.current=screen.introGate;

  function commitScreen(next){
    screenRef.current=next;
    setScreen(next);
  }
  function updateScreen(recipe){
    commitScreen(recipe(screenRef.current));
  }
  function patchField(field){
    return value=>updateScreen(current=>{
      const patched=typeof value==='function'?value(current[field]):value;
      return {...current, [field]:patched};
    });
  }
  const setScreenStable=useRef(updateScreen);
  setScreenStable.current=updateScreen;
  function setFromEffect(recipe){
    setScreenStable.current(recipe);
  }

  const readout=boardReadout({
    round:screen.round, view:screen.view, feedback:screen.feedback, animating:screen.animating,
    introGate:screen.introGate, factorInfo:screen.factorInfo, startOpen:screen.startOpen, pulse:screen.pulse
  });
  const fresh=screen.round.turn===0&&!screen.round.game.deal.plays;
  const arrival=useLevelArrival({
    rootRef, fxRef, levelId:screen.round.levelId, fresh, introGate:screen.introGate,
    startOpen:screen.startOpen, reduced, introStartRef, levelReadyRef,
    onArrivingSettled:()=>setFromEffect(arrivalSettled)
  });
  const win=useWinCelebration({
    rootRef, fxRef, active:readout.finished&&readout.victory, levelId:screen.round.levelId,
    secured:readout.deal.T, target:readout.level.target, reduced,
    onSuccessSettled:()=>setFromEffect(successMarked)
  });
  useHoneyLayout(rootRef, {active:readout.finished&&readout.victory});
  useSkipFocus(rootRef, screen.animating);
  useDebugBridge({fxRef, changeLevel});

  function cancelHandles(){
    try{arrival.stopArrival({notify:false});}catch{/* the level change settles next */}
    try{win.stopWin({notify:false});}catch{/* the level change settles next */}
    try{fxRef.current.settle();}catch{/* settle must not block the tap */}
    presentationRef.current.abandon();
    try{cancelRef.current?.();}catch{/* the level change settles next */}
    try{resetMotionRef.current?.();}catch{/* the level change settles next */}
    try{lossMotionRef.current?.();}catch{/* the level change settles next */}
    try{breakMotionRef.current?.();}catch{/* the level change settles next */}
    cancelRef.current=null;
    resetMotionRef.current=null;
    lossMotionRef.current=null;
    breakMotionRef.current=null;
  }
  function changeLevel(id){
    clearWinMemo();
    cancelHandles();
    const next=levelScreen(id, {storage:browserStorage(), reduced:prefersReducedMotion()});
    saveRound(browserStorage(), next.round);
    seenFactorsRef.current=new Set();
    commitScreen(next);
  }

  function play(action, source){
    const current=screenRef.current;
    if(onboardingFinished(current.round))return;
    if(!boardTapDuringIntro(introGateRef.current).play)return;
    const root=rootRef.current;
    const level=onboardingLevel(current.round.levelId);
    runPresentedAction(current.round, action, presentationRef.current, {
      onCommit({next, change}){
        const record=commitPlay(browserStorage(), {
          next, turnBefore:current.round.turn, action, change,
          levelId:level.id, levelCount:ONBOARDING_COUNT, won:onboardingVictory(next)
        });
        for(const entry of record.events){
          const {name, ...details}=entry;
          dispatchCasualEvent(name, details);
        }
        const outcome=playOutcome(change, action);
        const first=takeFirstOutcome(seenFactorsRef.current, outcome);
        updateScreen(state=>ackAfterCommit(state, {
          outcome, first, text:first?introCopy(first.kind, change.rewards[0]?.value):null
        }));
      },
      onSettle({next}){
        cancelRef.current=null;
        resetMotionRef.current=null;
        lossMotionRef.current=null;
        breakMotionRef.current=null;
        updateScreen(state=>settledScreen(state, settledPresentation(next)));
      },
      startMotion({change}, complete){
        return startPlayMotion({
          root, source, action, change, level,
          firstTap:current.round.levelId===1&&current.round.turn===0,
          seenFactors:seenFactorsRef.current,
          cancelRef, resetMotionRef, lossMotionRef, breakMotionRef,
          setView:patchField('view'), setFeedback:patchField('feedback'), setBeat:patchField('beat'),
          setShownGold:patchField('shownGold'), setAnimating:patchField('animating'),
          setPulse:patchField('pulse'), setHelp:patchField('help')
        }, complete);
      }
    });
  }
  const bankLive=useBoardChrome({
    rootRef, screen, readout, play, seenFactorsRef, setScreen:setFromEffect
  });

  useEffect(()=>()=>{
    fxRef.current.settle();
    presentationRef.current.abandon();
    cancelRef.current?.();
    resetMotionRef.current?.();
    lossMotionRef.current?.();
    breakMotionRef.current?.();
  }, []);

  function dismissIntro(via){
    if(!introGateRef.current)return;
    introGateRef.current=false;
    const outcome=dismissFeatureIntro({
      levelId:screenRef.current.round.levelId, storage:browserStorage(), via, fx:fxRef.current
    });
    if(!outcome.dismissed){
      introGateRef.current=true;
      return;
    }
    const next=dismissedIntro(screenRef.current, outcome);
    introGateRef.current=next.introGate;
    commitScreen(next);
    dispatchCasualEvent('feature_intro_dismiss', {feature:outcome.id, level:next.round.levelId, via});
  }
  function applyEndDecision(decision){
    const result=endTransition(screenRef.current, decision, ONBOARDING_COUNT);
    if(result.enterLevel!=null)changeLevel(result.enterLevel);
    else commitScreen(result.screen);
  }
  function resetProgress(){
    try{clearOnboardingProgress(window.localStorage);}catch{/* startLevel saves the fresh round */}
    changeLevel(1);
    dispatchCasualEvent('onboarding_reset', {level:1});
  }
  function skip(){
    dispatchCasualEvent('tutorial_skip', {level:screenRef.current.round.levelId});
    try{browserStorage()?.setItem(ONBOARDING_PROGRESS_KEY, String(GARDEN_2_START));}catch{/* the jump still starts the level */}
    changeLevel(GARDEN_2_START);
  }
  function goToLevelPrompt(){
    const raw=typeof window!=='undefined'
      ?window.prompt('Go to level (1–'+ONBOARDING_COUNT+')', String(screenRef.current.round.levelId))
      :null;
    if(raw==null)return;
    const wanted=Number.parseInt(String(raw).trim(), 10);
    const id=prepareOnboardingJump(browserStorage(), wanted, {
      levelCount:ONBOARDING_COUNT, introUnlocks:derivedFeatureUnlocks()
    });
    if(id==null){
      updateScreen(closedDevMenu);
      return;
    }
    dispatchCasualEvent('debug_goto_level', {level:id});
    changeLevel(id);
  }
  function runSteps(steps){
    let consultSkip=false;
    for(const step of steps){
      if(step==='stopArrival')arrival.stopArrival();
      if(step==='closeStart')updateScreen(closedStart);
      if(step==='clearDock')updateScreen(clearedDock);
      if(step==='skipPresentation')presentationRef.current.acceptPointerDown();
      if(step==='consultPointer'&&presentationRef.current.acceptPointerDown()==='skip')consultSkip=true;
    }
    return consultSkip;
  }

  const ending=successPlan({
    victory:readout.victory, levelId:readout.level.id, secured:readout.deal.T,
    bank:screen.round.game.lastAction?.type==='bank', reduced
  });
  return <OnboardingPhone
    screen={screen} readout={readout} ending={ending} bankLive={bankLive} reduced={reduced}
    fx={fxRef.current} rootRef={rootRef} introStartRef={introStartRef} levelReadyRef={levelReadyRef}
    phoneClass={phoneClassName(screen, {
      levelId:readout.level.id, garden:readout.level.garden,
      feedback:screen.feedback, eventType:screen.round.event.type
    })}
    onPointerDownCapture={event=>{
      const decision=boardPointerDecision({
        gate:introGateRef.current,
        inIntro:!!event.target?.closest?.('.sgv-feature-intro'),
        presenting:presentationRef.current.isPresenting(),
        startOpen:screenRef.current.startOpen,
        arriving:screenRef.current.arriving||arrival.active,
        docking:screenRef.current.docking
      });
      const consultSkip=runSteps(decision.steps);
      if(decision.prevent||consultSkip)event.preventDefault();
      if(decision.stop||consultSkip)event.stopPropagation();
    }}
    onClickCapture={event=>{
      const decision=boardClickDecision({
        gate:introGateRef.current,
        inIntro:!!event.target?.closest?.('.sgv-feature-intro')
      });
      const block=decision.consultClick&&presentationRef.current.acceptClick()!=='action';
      if(decision.prevent||block)event.preventDefault();
      if(decision.stop||block)event.stopPropagation();
    }}
    onKeyDownCapture={event=>{
      const decision=boardKeyDecision({
        key:event.key, gate:introGateRef.current,
        presenting:presentationRef.current.isPresenting(),
        finished:onboardingFinished(screenRef.current.round),
        victory:onboardingVictory(screenRef.current.round),
        startOpen:screenRef.current.startOpen,
        onButton:!!event.target?.closest?.('button')
      });
      if(!decision.handled)return;
      if(decision.prevent)event.preventDefault();
      if(decision.stop)event.stopPropagation();
      if(decision.dismissIntro){
        dismissIntro(event.target?.closest?.('.sgv-feature-intro-play')?'play':'scrim');
      }
      if(decision.skipPresentation)presentationRef.current.acceptPointerDown();
      if(decision.stopWin)win.stopWin();
      if(decision.endVia){
        applyEndDecision(dismissLevelScreen(
          onboardingVictory(screenRef.current.round)?'win':'lose', decision.endVia
        ));
      }
      if(decision.stopArrival)arrival.stopArrival();
      if(decision.closeStart)updateScreen(closedStart);
    }}
    onPlay={play}
    onFactorInfo={kind=>{
      factorInfoOpenerRef.current=rootRef.current?.querySelector(
        '.sgv-multiplier-pill[data-factor="'+kind+'"]'
      )||null;
      updateScreen(state=>openedFactor(state, kind));
    }}
    onReset={resetProgress}
    onToggleDev={()=>updateScreen(toggledDevMenu)}
    onGotoLevel={goToLevelPrompt}
    onToggleHelp={()=>{updateScreen(toggledHelp); updateScreen(closedDevMenu);}}
    onSkipGarden={()=>{updateScreen(closedDevMenu); skip();}}
    onDismissFactor={()=>{
      updateScreen(closedFactor);
      factorInfoOpenerRef.current?.focus?.();
      factorInfoOpenerRef.current=null;
    }}
    onDismissIntro={dismissIntro}
    onDismissStart={()=>{
      const opening=dismissLevelScreen('start', 'cta');
      if(opening.dismiss&&!opening.lock){
        arrival.stopArrival();
        updateScreen(closedStart);
      }
    }}
    onEndPrimary={()=>{
      if(readout.victory)win.stopWin({notify:false});
      applyEndDecision(dismissLevelScreen(readout.victory?'win':'lose', 'cta'));
    }}
    onEndBackdrop={()=>{
      if(readout.victory)win.stopWin({notify:false});
      applyEndDecision(dismissLevelScreen(readout.victory?'win':'lose', 'backdrop'));
    }}
    onFinishPresentation={()=>{
      fxRef.current.settle();
      presentationRef.current.finishPresentation();
    }}
  />;
}
```

Remove the prose sentence inside that component before saving the file. `function changeLevel` is hoisted, so `useDebugBridge({fxRef, changeLevel})` above it is valid. Do not also pass `(id)=>changeLevel(id)` and a second hook call. One call only.

`onToggleHelp` today toggles help and closes the dev menu in one event. Two `updateScreen` calls both read `screenRef` after the previous write, so the second sees the toggled help. Keep that order.

Hooks must be called in the same order every render. `useBoardChrome` stays after `play` is defined and is not inside a branch. `useDebugBridge` stays with the other hooks, once.

- [ ] **Step 5: Run the suites**

Run: `npm test`

Expected: PASS, including `platform.test.mjs`, `screen-state.test.mjs`, and `board-input.test.mjs`.

Run: `npm run simulate:casual`

Expected: PASS. Every onboarding level still has a win.

- [ ] **Step 6: Commit**

```bash
git add src/casual/screenEffects.js src/casual/OnboardingPhone.jsx src/casual/SimplifiedGame.jsx
git commit -m "$(cat <<'EOF'
Split the onboarding screen into snapshot, input, phone, and effects.

EOF
)"
```

---

### Task 5: Self-review

- [ ] Confirm `screenState.js` and `boardInput.js` do not import React, GSAP, or `platform.js`.
- [ ] Confirm `play` still calls `commitPlay` inside `onCommit` before `startPlayMotion`.
- [ ] Confirm `changeLevel` cancels arrival and win with `{notify:false}` before `commitScreen(levelScreen(...))`.
- [ ] Confirm keyboard start-dismiss does not include `clearDock`, and pointer start-dismiss does.
- [ ] Confirm `SimplifiedGame.jsx` no longer contains the phone markup or the three inline decision trees.
