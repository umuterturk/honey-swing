import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {equationKinds} from '../src/casual/factors.js';
import {multiplierParts} from '../src/casual/multiplierView.js';
import {potAddFlyerTerms} from '../src/casual/presentation.js';
import {ONBOARDING_LEVELS} from '../src/casual/onboardingLevels.js';
import {introFeatureIdsForLevel} from '../src/casual/featureIntroRegistry.js';
import {reducedCardSummary} from '../src/casual/motionSchedule.js';

register(new URL('./jsx-loader.mjs', import.meta.url));

const INTROS = [
  ['bank'],
  [],
  ['swing'],
  [],
  ['flip','flip_mult'],
  [],
  [],
  [],
  ['zero'],
  [],
  ['flip','flip_mult','snap'],
  [],
  ['hand'],
  [],
  [],
  [],
  [],
  [],
  [],
  []
];

test('multiplier parts and the pot equation list Swing then Flip', () => {
  const deal = {W:1, flipFactor:2};
  assert.deepEqual(multiplierParts(deal).map(part => part.kind), ['swing','flip']);
  assert.deepEqual(equationKinds(), ['swing','flip']);
  const flyer = potAddFlyerTerms({
    levelId:6,
    visibleFactors:['flip','swing'],
    addedToPot:4,
    signedCard:2,
    factorsAfter:[
      {kind:'flip', value:3},
      {kind:'swing', value:2}
    ]
  });
  assert.deepEqual(flyer.terms.map(term => term.kind), ['swing','flip']);
});

test('feature intros for levels 1-20 match main', () => {
  assert.equal(ONBOARDING_LEVELS.length, 20);
  assert.equal(INTROS.length, 20);
  let previous = null;
  const actual = ONBOARDING_LEVELS.map(level => {
    const ids = introFeatureIdsForLevel(level, previous);
    previous = level;
    return ids;
  });
  assert.deepEqual(actual, INTROS);
});

test('a swing and flip award keeps More Flower and More Bee', () => {
  const summary = reducedCardSummary({
    rewards:[{kind:'swing'},{kind:'flip'}],
    snap:false,
    addedToPot:4,
    to:1,
    rawPotAfter:4,
    factorsAfter:[]
  });
  assert.equal(summary.flower, 'More Flower');
  assert.equal(summary.bee, 'More Bee');
});

test('multiplier pills render Swing then Flip under the Multipliers group', async () => {
  const {HorizontalMeter} = await import('../src/casual/MinimalBoard.jsx');
  const html = renderToStaticMarkup(createElement(HorizontalMeter, {
    position:0,
    limit:8,
    multipliers:[
      {kind:'flip', value:3, label:'Flip multiplier'},
      {kind:'swing', value:2, label:'Swing multiplier'}
    ],
    visibleFactors:['swing','flip']
  }));
  assert.match(html, /aria-label="Multipliers"/);
  assert.deepEqual(
    [...html.matchAll(/data-factor="([^"]+)"/g)].map(match => match[1]),
    ['swing','flip']
  );
});
