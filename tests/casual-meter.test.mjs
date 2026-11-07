import test from 'node:test';
import assert from 'node:assert/strict';
import {meterPercent,meterMarks} from '../src/casual/meterScale.js';

test('all nine visible Level 1 numbers use accurate positions in the same meter scale',()=>{
  const marks=meterMarks(8);
  assert.deepEqual(marks,[-8,-6,-4,-2,0,2,4,6,8]);
  // Playable band is inset so snap-danger wasps sit past ±8.
  assert.deepEqual(marks.map(n=>meterPercent(n,8)),[11,20.75,30.5,40.25,50,59.75,69.5,79.25,89]);
  for(const n of marks){
    assert.equal(meterPercent(n,8),50+39*n/8);
  }
});

test('markers clamp within the same physical scale, including a Snap overshoot',()=>{
  assert.equal(meterPercent(-11,8),11);
  assert.equal(meterPercent(11,8),89);
  assert.equal(meterPercent(0,8),50);
  assert.equal(meterPercent(3,8),64.625);
  assert.equal(meterPercent(-1,8),45.125);
});

test('other integer Snap limits have a readable symmetric scale',()=>{
  for(const limit of [1,2,4,6,9,10,12]){
    const ticks=meterMarks(limit);
    assert.equal(ticks[0],-limit);
    assert.equal(ticks.at(-1),limit);
    assert.ok(ticks.includes(0));
    assert.ok(ticks.every(Number.isInteger));
    assert.deepEqual(ticks, ticks.toSorted((a,b)=>a-b));
    assert.equal(new Set(ticks).size,ticks.length);
    assert.equal(meterPercent(-limit,limit),11);
    assert.equal(meterPercent(limit,limit),89);
    assert.equal(meterPercent(0,limit),50);
  }
});
