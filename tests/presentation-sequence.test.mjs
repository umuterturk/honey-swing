import test from 'node:test';
import assert from 'node:assert/strict';
import {onboardingLevel} from '../src/casual/onboardingLevels.js';
import {LEVEL_START,claimLevelAdvance,introCopy,levelStartPlan,startTap,successPlan,successTap,takeFirstOutcome} from '../src/casual/presentationSequence.js';

test('a fresh level arrival settles by 0.880s, caps at 2.5s, and still docks L3, L5, L6, and L11',()=>{
  const plan=levelStartPlan(3);
  assert.equal(plan.motion,true);
  assert.equal(plan.replay,true);
  assert.equal(plan.settled,0.880);
  assert.equal(plan.cap,2.5);
  assert.ok(plan.settled<=plan.cap);
  assert.equal(plan.dim,0.35);
  assert.equal(plan.banner.end,0.220);
  assert.equal(plan.banner.fromScale,0.85);
  assert.equal(plan.banner.peakScale,1.06);
  assert.equal(plan.banner.toScale,1);
  assert.equal(plan.banner.fromY,-24);
  assert.equal(plan.banner.outStart,0.700);
  assert.equal(plan.banner.outEnd,0.880);
  assert.equal(plan.jar.start,0.120);
  assert.equal(plan.jar.end,0.480);
  assert.equal(plan.jar.scale,1.35);
  assert.equal(plan.board.start,0.400);
  assert.equal(plan.board.end,0.700);
  assert.equal(plan.board.fromOpacity,0.35);
  assert.equal(plan.board.fromY,16);
  assert.equal(plan.board.toY,0);
  assert.equal(plan.reducedBanner,0.400);
  assert.equal(plan.idleAt,3);
  assert.equal(plan.idleHint,'after-dismiss');
  assert.deepEqual(plan.idlePulse,[[3,3.3],[3.3,3.6],[3.6,3.9],[3.9,4.2]]);
  assert.equal(plan.dock.end,0.800);
  assert.deepEqual(Object.keys(LEVEL_START.dockLevels).map(Number),[3,5,6,11]);
  for(const id of [3,5,6,11]){
    assert.equal(levelStartPlan(id).piece,onboardingLevel(id).dock);
    assert.equal(levelStartPlan(id).dock.end,0.800);
  }
  assert.equal(levelStartPlan(8).piece,null);
  assert.equal(levelStartPlan(8).dock,null);
  assert.equal(onboardingLevel(8).dock,null);
  assert.equal(levelStartPlan(1).piece,null);
  assert.equal(plan.badge,undefined);
  assert.equal(plan.targetOutline,undefined);
  assert.equal(plan.handGlint,undefined);
});

test('a restored level does not replay and reduced motion is the static final state',()=>{
  const restored=levelStartPlan(5,{fresh:false});
  assert.equal(restored.motion,false);
  assert.equal(restored.replay,false);
  assert.equal(restored.settled,0);
  const reduced=levelStartPlan(5,{reduced:true});
  assert.equal(reduced.motion,false);
  assert.equal(reduced.replay,false);
  assert.equal(reduced.static,true);
  assert.equal(reduced.settled,0);
  assert.equal(reduced.idleOutline,true);
  assert.equal(reduced.dock,null);
  assert.equal(reduced.piece,null);
  assert.equal(reduced.reducedBanner,0.400);
  assert.equal(reduced.cap,2.5);
});

test('a win shows the committed score and CTA at t=0, and a loss does not',()=>{
  const win=successPlan({victory:true,levelId:4,bank:true});
  assert.equal(win.effects,true);
  assert.equal(win.scoreAt,0);
  assert.equal(win.ctaAt,0);
  assert.equal(win.cta,'NEXT');
  assert.equal(win.star,null);
  assert.equal(win.praiseMotion.start,1);
  assert.equal(win.praiseMotion.end,1.22);
  assert.equal(win.praiseMotion.peakScale,1.14);
  assert.equal(win.count.start,1.3);
  assert.equal(win.count.end,1.75);
  assert.equal(win.count.ease,'power2.out');
  assert.equal(win.burst.start,1.05);
  assert.equal(win.settled,1.75);
  assert.equal(win.cap,2);
  assert.equal(win.pour.end,0.650);
  assert.equal(win.pour.tip,42);
  assert.ok(win.pour.end<=0.650);
  assert.equal(win.orchard,null);
  const last=successPlan({victory:true,levelId:12,bank:true});
  assert.equal(last.cta,'LOWER ORCHARD');
  assert.equal(last.orchard,null);
  const fail=successPlan({victory:false,levelId:4,bank:true});
  assert.equal(fail.effects,false);
  assert.equal(fail.cta,'TRY AGAIN');
  assert.equal(fail.pour,null);
  assert.equal(fail.star,null);
  assert.equal(fail.tier,0);
  assert.equal(fail.praise,null);
  assert.equal(fail.particles,0);
  assert.equal(fail.count,null);
  assert.equal(fail.burst,null);
  assert.deepEqual(successTap('backdrop'),{settle:true,advance:false});
  assert.deepEqual(successTap('cta'),{settle:true,advance:true});
  assert.equal(claimLevelAdvance(false).advance,true);
  assert.equal(claimLevelAdvance(true).advance,false);
});

test('first outcomes use the audit copy once, with no Jackpot and no L8 pill',()=>{
  assert.equal(introCopy('bank',17),'SAVE 17');
  assert.equal(introCopy('cross'),'CROSS');
  assert.equal(introCopy('flip'),'FLIP');
  assert.equal(introCopy('flipFactor',3),'×3');
  assert.equal(introCopy('zero'),'Pot safe.');
  assert.equal(introCopy('snap'),'Pot lost. Savings safe.');
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
