import test from 'node:test';
import assert from 'node:assert/strict';
import {cardMotionView,factorsFell,playBeat,playFeedback,playOutcome} from '../src/casual/playMotion.js';

function change(overrides = {}){
  return {
    snap:false, zeroBreak:false, rewards:[],
    factorsBefore:[{value:1}], factorsAfter:[{value:1}],
    ...overrides
  };
}

test('play outcome names the first thing the player should notice', () => {
  assert.equal(playOutcome(change({snap:true, rewards:[{kind:'swing'}]}), {type:'steer'}), 'snap');
  assert.equal(playOutcome(change({zeroBreak:true}), {type:'steer'}), 'zero');
  assert.equal(playOutcome(change({rewards:[{kind:'swing'}]}), {type:'steer'}), 'cross');
  assert.equal(playOutcome(change({rewards:[{kind:'flip'}]}), {type:'steer'}), 'flipFactor');
  assert.equal(playOutcome(change(), {type:'flip'}), 'flip');
  assert.equal(playOutcome(change(), {type:'steer'}), null);
});

test('play feedback and beat follow snap, zero break, then a multiplier reset', () => {
  assert.equal(playFeedback(change({snap:true}), {type:'steer'}), 'snap');
  assert.equal(playFeedback(change({zeroBreak:true}), {type:'bank'}), 'zero_break');
  assert.equal(playFeedback(change(), {type:'bank'}), 'bank');
  assert.equal(playBeat(change({snap:true})), 'Pot lost. Savings safe.');
  assert.equal(playBeat(change({zeroBreak:true})), 'Pot safe.');
  assert.equal(playBeat(change({snap:true}), {reset:true}), 'Multipliers reset.');
  assert.equal(playBeat(change()), '');
});

test('a falling factor asks for the reset motion', () => {
  assert.equal(factorsFell(change()), false);
  assert.equal(factorsFell(change({
    factorsBefore:[{value:2},{value:1}],
    factorsAfter:[{value:2},{value:0}]
  })), true);
});

test('the card motion view carries the level limits and the pour plan', () => {
  const level = {
    id:4, target:11, showChances:true, visibleFactors:['swing'],
    rules:{snapLimit:8, potCap:11}
  };
  const view = cardMotionView(change({addedToPot:3}), {firstTap:true, level});
  assert.equal(view.firstTap, true);
  assert.equal(view.meterLimit, 8);
  assert.equal(view.showChances, true);
  assert.equal(view.potTarget, 11);
  assert.equal(view.levelId, 4);
  assert.deepEqual(view.visibleFactors, ['swing']);
  assert.ok(view.pourFly);
});
