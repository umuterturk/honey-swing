import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  STATIC_OUTCOME_MS,cardMotionMarks,reducedBankSummary,reducedCardSummary
} from '../src/casual/motionSchedule.js';

const flipReward=[{kind:'flip',value:3}];
const crossingFlip=[{kind:'swing',value:2},{kind:'flip',value:2}];

test('first Flip× reveals the face and meter before the reward particle',()=>{
  const marks=cardMotionMarks({type:'flip',rewards:flipReward});
  assert.equal(marks.reveal,0.22);
  assert.equal(marks.rewards,0.30);
  assert.ok(marks.reveal<marks.rewards);
  assert.ok(marks.rewards<=marks.factors);
  assert.ok(marks.factors<marks.add);
});

test('a crossing Flip reveals before either reward particle',()=>{
  const marks=cardMotionMarks({type:'flip',rewards:crossingFlip});
  assert.equal(marks.reveal,0.22);
  assert.equal(marks.rewards,0.30);
  assert.ok(marks.reveal<marks.rewards);
  assert.equal(marks.add,0.82);
});

test('a Steer cross still moves the meter before its reward',()=>{
  const marks=cardMotionMarks({type:'steer',rewards:[{kind:'swing',value:2}]});
  assert.equal(marks.reveal,0.08);
  assert.equal(marks.rewards,0.16);
  assert.ok(marks.reveal<marks.rewards);
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
