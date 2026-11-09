import test from 'node:test';
import assert from 'node:assert/strict';
import {ONBOARDING_LEVELS} from '../src/casual/onboardingLevels.js';
import {enumerateLevel, solveLevel} from '../scripts/solve-level.mjs';

test('every 6-card level is solvable only with both Steer and Flip', () => {
  const levels=ONBOARDING_LEVELS.filter(level=>level.visibleHandSlots>=5);
  assert.equal(levels.length, 8);
  for(const level of levels){
    const proof=solveLevel(level.id);
    assert.equal(proof.truncated, false, 'truncated L'+level.id);
    assert.equal(proof.solvable, true, 'solvable L'+level.id);
    assert.equal(proof.winWithoutFlip, false, 'no-flip L'+level.id);
    assert.equal(proof.winWithoutSteer, false, 'no-steer L'+level.id);
    assert.equal(proof.duplicateIds, false, 'duplicate L'+level.id);
    assert.equal(level.initialHandSize, 6, 'hand L'+level.id);
    assert.equal(level.rules.flipOnly, true, 'flip pile L'+level.id);
  }
});

test('garden 1 reachable hands never repeat a card id', () => {
  for(let id=1;id<=12;id++){
    const row=enumerateLevel(id,{maxStates:200000});
    assert.equal(row.truncated, false, 'truncated L'+id);
    assert.equal(row.duplicateIds, false, 'duplicate L'+id);
  }
});

test('level 8 cannot reach a Snap', () => {
  const row=enumerateLevel(8,{maxStates:200000});
  assert.equal(row.truncated, false);
  assert.equal(row.snapReached, false);
  assert.equal(row.maxAbsS, 6);
});
