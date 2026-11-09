import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FEATURE_INTROS} from '../src/casual/featureIntroRegistry.js';

const {FeatureIntroOverlay} = await import('../src/casual/screens/featureIntro.jsx');

function markup(intro, reduced=false){
  return renderToStaticMarkup(createElement(FeatureIntroOverlay, {
    intro, reduced, onDismiss(){}
  }));
}

test('the six-card intro draws a hand and a Flip mark, not the Save demo', () => {
  assert.equal(FEATURE_INTROS.hand.copy, 'Six cards. Play and Flip to win.');
  assert.equal(FEATURE_INTROS.hand.copy.length, 32);
  const html = markup(FEATURE_INTROS.hand);
  assert.match(html, /data-feature="hand"/);
  assert.match(html, /Six cards\. Play and Flip to win\./);
  assert.match(html, /sgv-feature-intro-hand-icon/);
  assert.equal((html.match(/sgv-feature-intro-mini/g)||[]).length, 6);
  assert.match(html, /sgv-feature-intro-flip-mark/);
  assert.equal(html.includes('sgv-feature-intro-pot'), false);
  assert.equal(html.includes('sgv-feature-intro-chip'), false);
  assert.equal(html.includes('sgv-feature-intro-jar'), false);
  assert.equal(html.includes('M22 16h28'), false);
  const reduced = markup(FEATURE_INTROS.hand, true);
  assert.match(reduced, /data-frame="hand"/);
  assert.match(reduced, /data-frame="flip"/);
  assert.equal(reduced.includes('data-frame="pot"'), false);
  assert.equal(reduced.includes('sgv-feature-intro-pot'), false);
  assert.equal(reduced.includes('sgv-feature-intro-chip'), false);
  assert.equal(reduced.includes('sgv-feature-intro-jar'), false);
});

test('the Save intro still draws the jar icon and the pot demo', () => {
  const html = markup(FEATURE_INTROS.bank);
  assert.match(html, /data-feature="bank"/);
  assert.match(html, /M22 16h28/);
  assert.match(html, /sgv-feature-intro-pot/);
  assert.match(html, /sgv-feature-intro-chip/);
  assert.match(html, /sgv-feature-intro-jar/);
  assert.equal(html.includes('sgv-feature-intro-hand-icon'), false);
  assert.equal(html.includes('sgv-feature-intro-mini'), false);
  assert.equal(html.includes('sgv-feature-intro-flip-mark'), false);
  const reduced = markup(FEATURE_INTROS.bank, true);
  assert.match(reduced, /data-frame="pot"/);
  assert.match(reduced, /data-frame="arc"/);
  assert.match(reduced, /data-frame="jar"/);
  assert.equal(reduced.includes('data-frame="hand"'), false);
  assert.equal(reduced.includes('data-frame="flip"'), false);
});
