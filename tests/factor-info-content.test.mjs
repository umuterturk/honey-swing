import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTOR_INFO,factorInfoFor} from '../src/casual/factorInfoContent.js';

test('factor info copy and art match the approved popup spec',()=>{
  assert.deepEqual(Object.keys(FACTOR_INFO).sort(),['flip','swing']);
  const flower=factorInfoFor('swing');
  assert.equal(flower.title,'More Flower');
  assert.equal(flower.copy,'Cross 0 for more flowers.');
  assert.equal(flower.iconSrc,'/celebration/daisy-2.png');
  assert.equal(flower.buttonLabel,'Got it');
  const bee=factorInfoFor('flip');
  assert.equal(bee.title,'More Bee');
  assert.equal(bee.copy,'Flip for more bees.');
  assert.equal(bee.iconSrc,'/bee-smiling-closed-eyes.png');
  assert.equal(bee.buttonLabel,'Got it');
  assert.equal(factorInfoFor('jackpot'),null);
  assert.equal(factorInfoFor('nope'),null);
});
