import test from 'node:test';
import assert from 'node:assert/strict';
import {GARDEN} from '../src/casual/levels/garden.js';

test('every garden record keeps target, stars, pot cap, and hand in order', () => {
  for(const level of GARDEN){
    assert.ok(level.target<=level.star2&&level.star2<=level.star3, 'L'+level.id+' target <= star2 <= star3');
    assert.ok(Number.isInteger(level.potCap)&&level.potCap>=1, 'L'+level.id+' potCap');
    // L1–12 still clear the target inside one pot. L13–20 bank more than once,
    // so the single-pot cap can sit under the multi-bank target.
    if(level.id<=12)assert.ok(level.potCap>=level.target, 'L'+level.id+' potCap >= target');
    assert.ok(level.hand<=level.deck.length, 'L'+level.id+' hand <= deck.length');
    if(level.auto3){
      assert.equal(level.star2, level.star3, 'L'+level.id+' auto3 star2 === star3');
      // L3's only total is 3★, and the pass number sits under that pair.
      if(level.id===3)assert.ok(level.target<level.star3, 'L3 target is below its 3★ pair');
      else assert.equal(level.target, level.star2, 'L'+level.id+' auto3 target === star2');
    }
  }
});

test('potCap matches the copied contract for levels 1-20', () => {
  const copied = [
    {id:1,potCap:5},{id:2,potCap:6},{id:3,potCap:13},{id:4,potCap:14},{id:5,potCap:13},
    {id:6,potCap:10},{id:7,potCap:17},{id:8,potCap:24},{id:9,potCap:10},{id:10,potCap:20},
    {id:11,potCap:9},{id:12,potCap:60},{id:13,potCap:40},{id:14,potCap:45},{id:15,potCap:55},
    {id:16,potCap:35},{id:17,potCap:50},{id:18,potCap:60},{id:19,potCap:70},{id:20,potCap:35}
  ];
  assert.equal(copied.length, 20);
  for(const row of copied){
    const stored = GARDEN.find(level => level.id === row.id);
    assert.equal(stored && stored.id, row.id, 'L'+row.id);
    assert.equal(stored.potCap, row.potCap, 'L'+row.id+' potCap');
  }
});
