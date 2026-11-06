import test from 'node:test';
import assert from 'node:assert/strict';
import {onboardingLevel} from '../src/casual/onboardingLevels.js';
import {LEVEL_START,levelStartPlan,startTap} from '../src/casual/presentationSequence.js';

test('level start settles by 0.300s and docks only L3, L5, L6, and L11',()=>{
  const plan=levelStartPlan(3);
  assert.equal(plan.motion,true);
  assert.equal(plan.settled,0.300);
  assert.equal(plan.badge.end,0.120);
  assert.equal(plan.badge.fromScale,0.98);
  assert.equal(plan.targetOutline.start,0.060);
  assert.equal(plan.targetOutline.end,0.300);
  assert.equal(plan.targetOutline.half,0.120);
  assert.equal(plan.handGlint.start,0.160);
  assert.equal(plan.handGlint.end,0.300);
  assert.equal(plan.handGlint.half,0.070);
  assert.equal(plan.dock.end,0.800);
  assert.equal(plan.idleAt,3);
  assert.deepEqual(plan.idlePulse,[[3,3.3],[3.3,3.6],[3.6,3.9],[3.9,4.2]]);
  assert.deepEqual(Object.keys(LEVEL_START.dockLevels).map(Number),[3,5,6,11]);
  for(const id of [3,5,6,11]){
    assert.equal(levelStartPlan(id).piece,onboardingLevel(id).dock);
    assert.equal(levelStartPlan(id).dock.end,0.800);
  }
  assert.equal(levelStartPlan(8).piece,null);
  assert.equal(levelStartPlan(8).dock,null);
  assert.equal(onboardingLevel(8).dock,null);
  assert.equal(levelStartPlan(1).piece,null);
});

test('a restored or reduced-motion level does not replay the arrival',()=>{
  assert.equal(levelStartPlan(5,{fresh:false}).motion,false);
  assert.equal(levelStartPlan(5,{reduced:true}).motion,false);
  assert.equal(levelStartPlan(5,{reduced:true}).idleOutline,true);
  assert.equal(levelStartPlan(5,{reduced:true}).dock,null);
});

test('the first tap finishes arrival and still reaches a legal control',()=>{
  assert.deepEqual(startTap({arrival:true}),{consume:false,finishArrival:true,pass:true});
  assert.deepEqual(startTap({action:true,arrival:true}),{consume:true,finishArrival:false,pass:false});
  assert.deepEqual(startTap({}),{consume:false,finishArrival:false,pass:true});
});
