import test from 'node:test';
import assert from 'node:assert/strict';
import {honeyTier} from '../src/casual/starThresholds.js';
import {GARDEN} from '../src/casual/levels/garden.js';
// Appendix A / B. These numbers are the expected contract, not a re-export.
const EXPECTED = [
  {level:1, target:5, star2:5, star3:5, auto3:true},
  {level:2, target:6, star2:6, star3:6, auto3:true},
  {level:3, target:10, star2:13, star3:13, auto3:true},
  {level:4, target:12, star2:13, star3:14, auto3:false},
  {level:5, target:13, star2:18, star3:22, auto3:false},
  {level:6, target:10, star2:22, star3:34, auto3:false},
  {level:7, target:17, star2:28, star3:38, auto3:false},
  {level:8, target:24, star2:33, star3:41, auto3:false},
  {level:9, target:10, star2:14, star3:18, auto3:false},
  {level:10, target:12, star2:16, star3:20, auto3:false},
  {level:11, target:9, star2:21, star3:32, auto3:false},
  {level:12, target:9, star2:20, star3:30, auto3:false},
  {level:13, target:44, star2:51, star3:57, auto3:false},
  {level:14, target:56, star2:64, star3:73, auto3:false},
  {level:15, target:95, star2:109, star3:124, auto3:false},
  {level:16, target:38, star2:44, star3:49, auto3:false},
  {level:17, target:70, star2:80, star3:91, auto3:false},
  {level:18, target:110, star2:126, star3:143, auto3:false},
  {level:19, target:140, star2:161, star3:182, auto3:false},
  {level:20, target:40, star2:46, star3:52, auto3:false}
];

test('star thresholds match Appendix A for all 20 levels', () => {
  assert.equal(EXPECTED.length, 20);
  for(const row of EXPECTED){
    const stored = GARDEN.find(level => level.id === row.level);
    assert.equal(stored.target, row.target, 'L' + row.level + ' target');
    assert.equal(stored.star2, row.star2, 'L' + row.level + ' star2');
    assert.equal(stored.star3, row.star3, 'L' + row.level + ' star3');
    assert.equal(stored.auto3, row.auto3, 'L' + row.level + ' auto3');
    assert.equal(honeyTier(row.level, row.target - 1), 0, 'below target is not a win');
    const atTarget = honeyTier(row.level, row.target);
    if(row.auto3 || row.target >= row.star3)assert.equal(atTarget, 3, 'L' + row.level + ' target tier');
    else if(row.target >= row.star2)assert.equal(atTarget, 2, 'L' + row.level + ' target tier');
    else assert.equal(atTarget, 1, 'L' + row.level + ' target tier');
    if(row.star2 > row.target && row.star2 < row.star3){
      assert.equal(honeyTier(row.level, row.star2 - 1), 1);
      assert.equal(honeyTier(row.level, row.star2), 2);
      assert.equal(honeyTier(row.level, row.star3 - 1), 2);
    }
    if(row.star2 === row.star3){
      const below = row.star3 - 1;
      const expected = below >= row.target ? (row.auto3 ? 3 : 1) : 0;
      assert.equal(honeyTier(row.level, below), expected, 'equal thresholds skip 2★');
      assert.notEqual(honeyTier(row.level, row.star2), 2);
    }
    assert.equal(honeyTier(row.level, row.star3), 3);
    assert.equal(honeyTier(row.level, row.star3 + 25), 3);
  }
  const level11 = GARDEN.find(level => level.id === 11);
  const level18 = GARDEN.find(level => level.id === 18);
  assert.equal(level11.star2, 21);
  assert.equal(level11.star3, 32);
  assert.equal(level18.star2, 126);
  assert.equal(level18.star3, 143);
  assert.equal(honeyTier(1, 5), 3);
  assert.equal(honeyTier(1, 8), 3);
  assert.equal(honeyTier(2, 6), 3);
  assert.equal(honeyTier(5, 13), 1);
  assert.equal(honeyTier(5, 18), 2);
  assert.equal(honeyTier(5, 22), 3);
  assert.equal(honeyTier(11, 20), 1);
  assert.equal(honeyTier(11, 21), 2);
  assert.equal(honeyTier(11, 31), 2);
  assert.equal(honeyTier(11, 32), 3);
  assert.equal(honeyTier(11, 87), 3);
  assert.equal(honeyTier(18, 110), 1);
  assert.equal(honeyTier(18, 126), 2);
  assert.equal(honeyTier(18, 143), 3);
  assert.equal(honeyTier(20, 40), 1);
  assert.equal(honeyTier(20, 46), 2);
  assert.equal(honeyTier(20, 52), 3);
  assert.equal(honeyTier(9, 10), 1);
  assert.equal(honeyTier(9, 14), 2);
  assert.equal(honeyTier(9, 18), 3);
});
