import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  STATIC_OUTCOME_MS,FACTOR_FLYER_FLIGHT,cardMotionMarks,flyerOrigin,reducedBankSummary,reducedCardSummary,
  zeroCrossMark
} from '../src/casual/motionSchedule.js';

const flipReward=[{kind:'flip',value:3}];
const crossingFlip=[{kind:'swing',value:2},{kind:'flip',value:2}];

test('first Flip× reveals the face, centers, then arrives at the needle before rewards',()=>{
  const marks=cardMotionMarks({type:'flip',rewards:flipReward,from:1,to:4});
  assert.equal(marks.faceEnd,0.140);
  assert.equal(marks.flipFlyer,0.140);
  assert.equal(marks.rewards,0.140);
  assert.equal(marks.centerAt,0.280);
  assert.equal(marks.cardArrive,0.480);
  assert.equal(marks.meterStart,0.480);
  assert.equal(marks.meterEnd,0.680);
  assert.equal(marks.pourStart,0.680);
  assert.equal(marks.pourEnd,1.400);
  assert.ok(marks.faceEnd<=marks.flipFlyer);
  assert.ok(marks.flipFlyer<=marks.meterEnd);
  assert.ok(marks.faceEnd<=marks.centerAt);
  assert.ok(marks.centerAt<=marks.cardArrive);
  assert.ok(marks.cardArrive<=marks.meterStart);
  assert.ok(marks.pourStart<=marks.pourEnd);
  assert.ok(marks.pourEnd<=marks.end);
});

test('a crossing Flip reveals before either reward particle',()=>{
  const marks=cardMotionMarks({
    type:'flip',rewards:crossingFlip,from:3,to:-2
  });
  assert.equal(marks.flipFlyer,0.140);
  assert.equal(marks.swingFlyer,0.533);
  assert.equal(marks.rewards,0.140);
  assert.ok(marks.flipFlyer<marks.swingFlyer);
  assert.ok(marks.swingFlyer<=marks.meterEnd);
  assert.equal(marks.pourStart,0.680);
  assert.equal(marks.add,0.680);
});

test('a Steer cross finishes the meter glide before its reward and tap pour',()=>{
  const marks=cardMotionMarks({
    type:'steer',rewards:[{kind:'swing',value:2}],from:3,to:-2
  });
  assert.equal(marks.meterStart,0.420);
  assert.equal(marks.meterEnd,0.620);
  assert.equal(marks.swingFlyer,0.473);
  assert.equal(marks.rewards,0.473);
  assert.equal(marks.pourStart,0.620);
  assert.ok(marks.meterStart<=marks.swingFlyer);
  assert.ok(marks.swingFlyer<=marks.meterEnd);
  assert.ok(marks.meterEnd<=marks.pourStart);
});

test('Snap schedule moves the needle only after the card arrives',()=>{
  const marks=cardMotionMarks({type:'steer',snap:true});
  assert.equal(marks.centerAt,0.220);
  assert.equal(marks.cardArrive,0.420);
  assert.equal(marks.meterStart,0.420);
  assert.equal(marks.copyStart,0.420);
  assert.equal(marks.meterEnd,0.600);
  assert.equal(marks.snapAt,0.600);
  assert.equal(marks.waspHit,0.600);
  assert.equal(marks.heartFly,0.660);
  assert.equal(marks.heartHit,1.320);
  assert.equal(marks.needleHome,1.500);
  assert.equal(marks.end,1.970);
  assert.ok(marks.centerAt<=marks.cardArrive);
  assert.ok(marks.cardArrive<=marks.meterStart);
  assert.ok(marks.copyStart<=marks.snapAt);
  assert.ok(marks.snapAt<=marks.heartFly);
  assert.ok(marks.heartFly<=marks.heartHit);
  assert.ok(marks.heartHit<=marks.needleHome);
  assert.ok(marks.needleHome<=marks.end);
});

test('ordinary plays center first, then land on the needle before it moves',()=>{
  const steer=cardMotionMarks({type:'steer'});
  assert.equal(steer.centerAt,0.220);
  assert.equal(steer.cardArrive,0.420);
  assert.equal(steer.meterStart,0.420);
  assert.equal(steer.pourStart,0.620);
  assert.equal(steer.pourEnd,1.340);
  assert.ok(steer.centerAt<=steer.cardArrive);
  assert.ok(steer.meterStart<=steer.meterEnd);
  assert.ok(steer.meterEnd<=steer.pourStart);
  assert.ok(steer.pourEnd<=steer.end);
  const flip=cardMotionMarks({type:'flip'});
  assert.equal(flip.faceEnd,0.140);
  assert.equal(flip.centerAt,0.280);
  assert.equal(flip.cardArrive,0.480);
  assert.equal(flip.meterStart,0.480);
  assert.ok(flip.faceEnd<=flip.centerAt);
  assert.ok(flip.centerAt<=flip.meterStart);
  assert.ok(flip.meterEnd<=flip.pourStart);
});

test('reward flyers use the final meter position, not a mid-glide marker',()=>{
  // Marker % lives in .sgv-meter-scale (12px inset each side), not full track width.
  const origin=flyerOrigin({
    track:{left:100,top:40,width:200,height:20},
    root:{left:10,top:5},
    finalPercent:75
  });
  assert.equal(origin.x,100-10+12+(200-24)*0.75);
  assert.equal(origin.y,40-5+10);
  assert.equal(flyerOrigin({
    track:{left:0,top:0,width:80,height:10},root:{left:0,top:0},finalPercent:0
  }).x,12);
  assert.equal(flyerOrigin({
    track:{left:0,top:0,width:80,height:10},root:{left:0,top:0},finalPercent:100
  }).x,68);
});

test('zeroCrossMark hits 0 during a sign-changing glide',()=>{
  assert.equal(zeroCrossMark({from:3,to:-2,meterStart:0.420,meterEnd:0.620}),0.473);
  assert.equal(zeroCrossMark({from:-2,to:3,meterStart:0.480,meterEnd:0.680}),0.511);
  assert.equal(zeroCrossMark({from:2,to:0,meterStart:0.420,meterEnd:0.620}),0.620);
  assert.equal(zeroCrossMark({from:2,to:5,meterStart:0.420,meterEnd:0.620}),null);
  assert.equal(zeroCrossMark({from:0,to:3,meterStart:0.420,meterEnd:0.620}),0.420);
});

test('Swing flyer starts at zeroCross; Flip flyer at faceEnd; both may coexist',()=>{
  const steer=cardMotionMarks({
    type:'steer',rewards:[{kind:'swing',value:2}],from:3,to:-2
  });
  assert.equal(steer.swingFlyer,0.473);
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
  assert.equal(both.swingFlyer,0.533);
  assert.equal(both.rewards,0.140);
  assert.ok(both.flipFlyer<both.swingFlyer);
});

test('factors update after the last Flower/Bee flyer arrives',()=>{
  const both=cardMotionMarks({
    type:'flip',rewards:crossingFlip,from:3,to:-2
  });
  const afterSwing=Math.round((both.swingFlyer+FACTOR_FLYER_FLIGHT)*1000)/1000;
  const afterFlip=Math.round((both.flipFlyer+FACTOR_FLYER_FLIGHT)*1000)/1000;
  assert.ok(both.factors>=afterSwing);
  assert.ok(both.factors>=afterFlip);
});

test('Swing without a zero cross falls back to meterStart',()=>{
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
    rewards:[{kind:'swing',value:2},{kind:'flip',value:2},{kind:'jackpot',value:2}],
    factorsAfter:[]
  });
  assert.equal(both.flower,'More Flower');
  assert.equal(both.bee,'More Bee');
  assert.equal(both.cross,null);
});

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

test('reduced motion Snap keeps add hidden and does not shake',()=>{
  const zero=reducedCardSummary({to:0,rawPotAfter:17,addedToPot:4,rewards:[],factorsAfter:[],snap:false});
  assert.equal(zero.position,0);
  assert.equal(zero.add,'+4');
  assert.equal(zero.cross,null);
  assert.equal(zero.shake,false);
  const snap=reducedCardSummary({
    snap:true,to:9,rawPotAfter:0,addedToPot:0,rewards:[],factorsAfter:[],securedAfter:6
  });
  assert.equal(snap.position,0);
  assert.equal(snap.rawPot,0);
  assert.equal(snap.add,null);
  assert.equal(snap.cross,null);
  assert.equal(snap.shake,false);
  const bank=reducedBankSummary(4,12);
  assert.deepEqual(bank,{pot:0,secured:12,gain:'+8'});
  const css=readFileSync(new URL('../src/casual/minimal.css',import.meta.url),'utf8');
  const blocks=[...css.matchAll(/@media\(prefers-reduced-motion:reduce\)\{([^}]*)\}/g)].map(match=>match[1]);
  assert.ok(blocks.some(block=>block.includes('.sgv-event-snap .sgv-meter-track')&&block.includes('animation:none')));
});
