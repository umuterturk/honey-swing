import test from 'node:test';
import assert from 'node:assert/strict';
import {onboardingLevel} from '../src/casual/onboardingLevels.js';
import {LEVEL_START,claimLevelAdvance,introCopy,levelStartPlan,startTap,successPlan,successTap,takeFirstOutcome} from '../src/casual/presentationSequence.js';

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

test('a win shows the committed score and CTA at t=0, and a loss does not',()=>{
  const win=successPlan({victory:true,levelId:4,bank:true});
  assert.equal(win.effects,true);
  assert.equal(win.scoreAt,0);
  assert.equal(win.ctaAt,0);
  assert.equal(win.cta,'NEXT');
  assert.equal(win.star.start,0.520);
  assert.equal(win.star.end,0.820);
  assert.equal(win.pour.end,0.650);
  assert.equal(win.pour.tip,42);
  assert.ok(win.pour.end<=0.650);
  assert.equal(win.orchard,null);
  const last=successPlan({victory:true,levelId:12,bank:true});
  assert.equal(last.cta,'LOWER ORCHARD');
  assert.equal(last.orchard.start,0.820);
  assert.equal(last.orchard.end,1.500);
  const fail=successPlan({victory:false,levelId:4,bank:true});
  assert.equal(fail.effects,false);
  assert.equal(fail.cta,'TRY AGAIN');
  assert.equal(fail.pour,null);
  assert.equal(fail.star,null);
  assert.deepEqual(successTap('backdrop'),{settle:true,advance:false});
  assert.deepEqual(successTap('cta'),{settle:true,advance:true});
  assert.equal(claimLevelAdvance(false).advance,true);
  assert.equal(claimLevelAdvance(true).advance,false);
});

test('first outcomes use the audit copy once, with no Jackpot and no L8 pill',()=>{
  assert.equal(introCopy('bank',17),'BANK 17');
  assert.equal(introCopy('cross'),'CROSS');
  assert.equal(introCopy('flip'),'FLIP');
  assert.equal(introCopy('flipFactor',3),'×3');
  assert.equal(introCopy('zero'),'Pot safe.');
  assert.equal(introCopy('snap'),'Pot lost. Bank safe.');
  assert.equal(introCopy('jackpot',2),null);
  const seen=new Set();
  assert.equal(takeFirstOutcome(seen,'flip').kind,'flip');
  assert.equal(takeFirstOutcome(seen,'flip'),null);
  assert.equal(takeFirstOutcome(seen,'jackpot'),null);
  assert.equal(takeFirstOutcome(seen,'cross').max,1.100);
});

test('the first tap finishes arrival and still reaches a legal control',()=>{
  assert.deepEqual(startTap({arrival:true}),{consume:false,finishArrival:true,pass:true});
  assert.deepEqual(startTap({action:true,arrival:true}),{consume:true,finishArrival:false,pass:false});
  assert.deepEqual(startTap({}),{consume:false,finishArrival:false,pass:true});
});
