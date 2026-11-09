import test from 'node:test';
import assert from 'node:assert/strict';
import {displayOf} from '../src/casual/presentation.js';
import {newOnboardingRound, ONBOARDING_COUNT, GARDEN_2_START} from '../src/casual/onboardingLevels.js';
import {boardReadout} from '../src/casual/boardReadout.js';

function readout(round, flags = {}){
  return boardReadout({round, view:displayOf(round), ...flags});
}

test('a fresh level offers its visible cards and hides the rest of the deck', () => {
  const round = newOnboardingRound(1);
  const board = readout(round);
  assert.equal(board.finished, false);
  assert.equal(board.canBank, false);
  assert.equal(board.shownHand.length, board.level.visibleHandSlots);
  assert.ok(board.available.some(action => action.type === 'steer'));
  assert.equal(board.hearts, board.level.maxSnaps);
  assert.equal(board.winLabel, 'NEXT');
  assert.equal(readout(newOnboardingRound(GARDEN_2_START - 1)).winLabel, 'LOWER ORCHARD');
  assert.equal(readout(newOnboardingRound(ONBOARDING_COUNT)).winLabel, 'PLAY AGAIN');
});

test('animation and an intro lock the board, and a factor popup only blocks play', () => {
  const round = newOnboardingRound(1);
  for(const flags of [{animating:true}, {introGate:true}]){
    const board = readout(round, flags);
    assert.deepEqual(board.available, []);
    assert.equal(board.factorInfoEnabled, false);
  }
  const popup = readout(round, {factorInfo:'swing'});
  assert.deepEqual(popup.available, []);
  assert.equal(popup.factorInfoEnabled, true);
});

test('a bank pour shows the draining payout instead of the animated pot', () => {
  const round = newOnboardingRound(1);
  const view = {...displayOf(round), rawPot:99};
  assert.equal(boardReadout({round, view}).potDisplay, 99);
  assert.equal(boardReadout({round, view, feedback:'bank'}).potDisplay, 0);
});
