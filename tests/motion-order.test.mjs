import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  STATIC_OUTCOME_MS,cardMotionMarks,flyerOrigin,reducedBankSummary,reducedCardSummary
} from '../src/casual/motionSchedule.js';

const flipReward=[{kind:'flip',value:3}];
const crossingFlip=[{kind:'swing',value:2},{kind:'flip',value:2}];

test('first Flip× reveals the face, glides the meter, then launches the reward',()=>{
  const marks=cardMotionMarks({type:'flip',rewards:flipReward});
  assert.equal(marks.faceEnd,0.140);
  assert.equal(marks.meterStart,0.140);
  assert.equal(marks.meterEnd,0.300);
  assert.equal(marks.rewards,0.300);
  assert.ok(marks.faceEnd<=marks.meterStart);
  assert.ok(marks.meterEnd<=marks.rewards);
  assert.ok(marks.factors<marks.add);
});

test('a crossing Flip reveals before either reward particle',()=>{
  const marks=cardMotionMarks({type:'flip',rewards:crossingFlip});
  assert.equal(marks.faceEnd,0.140);
  assert.equal(marks.meterEnd,0.300);
  assert.equal(marks.rewards,0.300);
  assert.ok(marks.meterEnd<=marks.rewards);
  assert.equal(marks.add,0.82);
});

test('a Steer cross finishes the meter glide before its reward',()=>{
  const marks=cardMotionMarks({type:'steer',rewards:[{kind:'swing',value:2}]});
  assert.equal(marks.meterStart,0);
  assert.equal(marks.meterEnd,0.180);
  assert.equal(marks.rewards,0.180);
  assert.ok(marks.meterEnd<=marks.rewards);
});

test('reward flyers use the final meter position, not a mid-glide marker',()=>{
  const origin=flyerOrigin({
    track:{left:100,top:40,width:200,height:20},
    root:{left:10,top:5},
    finalPercent:75
  });
  assert.equal(origin.x,100-10+150);
  assert.equal(origin.y,40-5+10);
  assert.equal(flyerOrigin({
    track:{left:0,top:0,width:80,height:10},root:{left:0,top:0},finalPercent:0
  }).x,0);
  assert.equal(flyerOrigin({
    track:{left:0,top:0,width:80,height:10},root:{left:0,top:0},finalPercent:100
  }).x,80);
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
