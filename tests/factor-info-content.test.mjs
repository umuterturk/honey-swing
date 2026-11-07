import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {FACTOR_INFO,factorInfoFor} from '../src/casual/factorInfoContent.js';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const overlay=readFileSync(join(root,'src/casual/FactorInfoOverlay.jsx'),'utf8');
const css=readFileSync(join(root,'src/casual/minimal.css'),'utf8');

test('factor info copy and art match the approved popup spec',()=>{
  assert.deepEqual(Object.keys(FACTOR_INFO).sort(),['flip','swing']);
  const flower=factorInfoFor('swing');
  assert.equal(flower.title,'More Flower');
  assert.equal(flower.copy,'Cross 0 for more flowers.');
  assert.match(flower.iconSrc,/celebration\/daisy-2\.png$/);
  assert.equal(flower.buttonLabel,'Got it');
  const bee=factorInfoFor('flip');
  assert.equal(bee.title,'More Bee');
  assert.equal(bee.copy,'Flip for more bees.');
  assert.match(bee.iconSrc,/bee-smiling-closed-eyes\.png$/);
  assert.equal(bee.buttonLabel,'Got it');
  assert.equal(factorInfoFor('jackpot'),null);
  assert.equal(factorInfoFor('nope'),null);
});

test('FactorInfoOverlay reuses feature-intro chrome without NEW! or demo',()=>{
  assert.match(overlay,/sgv-feature-intro/);
  assert.match(overlay,/sgv-feature-intro-scrim/);
  assert.match(overlay,/sgv-feature-intro-card/);
  assert.match(overlay,/sgv-feature-intro-icon/);
  assert.match(overlay,/Got it|buttonLabel/);
  assert.doesNotMatch(overlay,/sgv-feature-intro-new|NEW!/);
  assert.doesNotMatch(overlay,/sgv-feature-intro-demo/);
  assert.match(overlay,/Escape|escape/);
  assert.match(overlay,/role:\s*['"]dialog['"]|role=['"]dialog['"]/);
});

test('data-factor-info locks controls and keeps multiplier pills tappable',()=>{
  assert.match(css,/\.sgv-phone\[data-factor-info="true"\] \.sgv-controls\{[^}]*pointer-events:none/);
  assert.match(css,/\.sgv-phone\[data-factor-info="true"\] \.sgv-hand\{[^}]*pointer-events:none/);
  assert.match(css,/\.sgv-phone\[data-factor-info="true"\] \.sgv-actions\{[^}]*pointer-events:none/);
  assert.match(css,/\.sgv-phone\[data-factor-info="true"\] \.sgv-multipliers\{[^}]*pointer-events:\s*auto/);
  assert.match(css,/\.sgv-phone\[data-factor-info="true"\] \.sgv-meter-section\{[^}]*z-index:\s*41/);
});
