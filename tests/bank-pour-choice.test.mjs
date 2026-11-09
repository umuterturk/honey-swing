import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseBankPour} from '../src/casual/minimalMotion.js';

test('chooseBankPour builds a timeline only when a scored pour can animate', () => {
  assert.deepEqual(chooseBankPour({
    reduced: false, hasRoot: true, hasSource: true, fromScore: 0, toScore: 5
  }), {timeline: true, static: false});
});

test('chooseBankPour keeps a static gain under reduced motion and skips a zero pour', () => {
  assert.deepEqual(chooseBankPour({
    reduced: true, hasRoot: true, hasSource: true, fromScore: 2, toScore: 5
  }), {timeline: false, static: true});
  assert.deepEqual(chooseBankPour({
    reduced: false, hasRoot: true, hasSource: true, fromScore: 5, toScore: 5
  }), {timeline: false, static: false});
  assert.deepEqual(chooseBankPour({
    reduced: false, hasRoot: false, hasSource: true, fromScore: 0, toScore: 5
  }), {timeline: false, static: false});
});
