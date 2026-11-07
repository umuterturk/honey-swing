import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  STATIC_OUTCOME_MS,cardMotionMarks,flyerOrigin,reducedBankSummary,reducedCardSummary
} from '../src/casual/motionSchedule.js';

const flipReward=[{kind:'flip',value:3}];
const crossingFlip=[{kind:'swing',value:2},{kind:'flip',value:2}];

test('first Flip× reveals the face, centers, then arrives at the needle before rewards',()=>{
  const marks=cardMotionMarks({type:'flip',rewards:flipReward});
  assert.equal(marks.faceEnd,0.140);
  assert.equal(marks.centerAt,0.280);
  assert.equal(marks.cardArrive,0.480);
  assert.equal(marks.meterStart,0.480);
  assert.equal(marks.meterEnd,0.680);
  assert.equal(marks.rewards,0.680);
  assert.equal(marks.pourStart,0.680);
  assert.equal(marks.pourEnd,1.400);
  assert.ok(marks.faceEnd<=marks.centerAt);
  assert.ok(marks.centerAt<=marks.cardArrive);
  assert.ok(marks.cardArrive<=marks.meterStart);
  assert.ok(marks.meterEnd<=marks.rewards);
  assert.ok(marks.pourStart<=marks.pourEnd);
  assert.ok(marks.pourEnd<=marks.end);
});

test('a crossing Flip reveals before either reward particle',()=>{
  const marks=cardMotionMarks({type:'flip',rewards:crossingFlip});
  assert.equal(marks.faceEnd,0.140);
  assert.equal(marks.meterEnd,0.680);
  assert.equal(marks.rewards,0.680);
  assert.ok(marks.meterEnd<=marks.rewards);
  assert.equal(marks.pourStart,0.680);
  assert.equal(marks.add,0.680);
});

test('a Steer cross finishes the meter glide before its reward and tap pour',()=>{
  const marks=cardMotionMarks({type:'steer',rewards:[{kind:'swing',value:2}]});
  assert.equal(marks.centerAt,0.220);
  assert.equal(marks.cardArrive,0.420);
  assert.equal(marks.meterStart,0.420);
  assert.equal(marks.meterEnd,0.620);
  assert.equal(marks.rewards,0.620);
  assert.equal(marks.pourStart,0.620);
  assert.equal(marks.pourEnd,1.340);
  assert.ok(marks.centerAt<=marks.cardArrive);
  assert.ok(marks.meterEnd<=marks.rewards);
  assert.ok(marks.meterEnd<=marks.pourStart);
  assert.ok(marks.pourEnd<=marks.end);
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

test('reduced motion keeps add and CROSS and does not shake Snap',()=>{
  assert.equal(STATIC_OUTCOME_MS,1100);
  const card=reducedCardSummary({to:4,rawPotAfter:9,addedToPot:4,rewards:[],factorsAfter:[]});
  assert.equal(card.add,'+4');
  assert.equal(card.cross,null);
  assert.equal(card.position,4);
  assert.equal(card.shake,false);
  const cross=reducedCardSummary({
    to:-2,rawPotAfter:13,addedToPot:10,rewards:[{kind:'swing',value:2}],factorsAfter:[{kind:'swing',value:2}]
  });
  assert.equal(cross.cross,'CROSS');
  assert.equal(cross.add,'+10');
  assert.equal(cross.shake,false);
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
