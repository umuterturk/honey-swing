import test from 'node:test';
import assert from 'node:assert/strict';
import {fillFrame, honeyLayout} from '../src/casual/honeyWin.js';

test('honey layout keeps the jar above the scoreboard and the button below it', () => {
  const layout = honeyLayout(390, 700, {top:20, right:0, bottom:20, left:0});
  assert.ok(layout.jar.y + layout.jar.h <= layout.scoreboard.y);
  assert.ok(layout.cta.y > layout.scoreboard.y);
});

test('the jar fill is empty before the pour and full when the celebration ends', () => {
  assert.equal(fillFrame(0, 10, 10).fraction, 0);
  assert.equal(fillFrame(2, 10, 10).fraction, 1);
});
