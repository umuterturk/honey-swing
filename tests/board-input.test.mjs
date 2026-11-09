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
