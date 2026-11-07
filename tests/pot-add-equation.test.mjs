import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {potAddFlyerTerms,potAddFlyerPhases} from '../src/casual/presentation.js';

const factors=(swing,flip=1,jackpot=1)=>[
  {kind:'swing',value:swing},
  {kind:'flip',value:flip},
  {kind:'jackpot',value:jackpot}
];

test('levels 1–15 build icon terms only for visible factors above ×1',()=>{
  assert.deepEqual(potAddFlyerTerms({
    levelId:6,visibleFactors:['swing','flip'],
    addedToPot:12,signedCard:2,zeroBreak:false,
    factorsAfter:factors(2,3)
  }),{
    rank:2,
    added:12,
    terms:[{kind:'swing',value:2},{kind:'flip',value:3}]
  });
  assert.deepEqual(potAddFlyerTerms({
    levelId:8,visibleFactors:['swing','flip'],
    addedToPot:6,signedCard:3,
    factorsAfter:factors(2,1)
  }),{rank:3,added:6,terms:[{kind:'swing',value:2}]});
});

test('all visible factors ×1 keeps plain +N on early levels',()=>{
  assert.equal(potAddFlyerPhases({
    levelId:3,visibleFactors:['swing'],
    addedToPot:4,signedCard:-4,
    factorsAfter:factors(1)
  }).initial,'+4');
});

test('level 16+ always uses plain +N',()=>{
  assert.equal(potAddFlyerPhases({
    levelId:16,visibleFactors:['swing','flip'],
    addedToPot:20,signedCard:5,
    factorsAfter:factors(2,4)
  }).initial,'+20');
});

test('Zero Break equation uses factors before the reset',()=>{
  assert.deepEqual(potAddFlyerTerms({
    levelId:10,visibleFactors:['swing'],
    addedToPot:10,signedCard:5,zeroBreak:true,
    factorsBefore:factors(2),factorsAfter:factors(1)
  }),{rank:5,added:10,terms:[{kind:'swing',value:2}]});
});

