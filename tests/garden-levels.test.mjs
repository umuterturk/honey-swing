import test from 'node:test';
import assert from 'node:assert/strict';
import {GARDEN} from '../src/casual/levels/garden.js';

test('every garden record keeps target, stars, pot cap, and hand in order', () => {
  for(const level of GARDEN){
    assert.ok(level.target<=level.star2&&level.star2<=level.star3, 'L'+level.id+' target <= star2 <= star3');
    assert.ok(level.potCap>=level.target, 'L'+level.id+' potCap >= target');
    assert.ok(level.hand<=level.deck.length, 'L'+level.id+' hand <= deck.length');
    if(level.auto3){
      assert.equal(level.target, level.star2, 'L'+level.id+' auto3 target === star2');
      assert.equal(level.star2, level.star3, 'L'+level.id+' auto3 star2 === star3');
    }
  }
});
