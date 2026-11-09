import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FACTORS, equationKinds} from '../src/casual/factors.js';
import {multiplierParts} from '../src/casual/multiplierView.js';
import {potAddFlyerTerms} from '../src/casual/presentation.js';
import {ONBOARDING_LEVELS} from '../src/casual/onboardingLevels.js';
import {introFeatureIdsForLevel} from '../src/casual/featureIntroRegistry.js';
import {reducedCardSummary} from '../src/casual/motionSchedule.js';

register(new URL('./jsx-loader.mjs', import.meta.url));

// Literals copied from the main 3eaf859 board. Do not read these from factors.js.
const EXPECTED = [
  {
    kind:'swing',
    label:'Swing multiplier',
    copy:'Cross 0 for more flowers.',
    flyer:'More Flower',
    icon:'celebration/daisy-2.png',
    iconClass:'sgv-multiplier-daisy',
    introId:'swing',
    dock:'swing',
    info:true,
    pillOrder:0,
    equationOrder:0,
    hold:0.05,
    flyerAt:'cross',
    flyerFrom:'marker',
    outcome:'cross',
    rulesFlag:'enableSwingFactor',
    dealField:'W',
    dealAdd:1,
    gainedFlag:'swingTierGained'
  },
  {
    kind:'flip',
    label:'Flip multiplier',
    copy:'Flip for more bees.',
    flyer:'More Bee',
    icon:'bee-smiling-closed-eyes.png',
    iconClass:'sgv-multiplier-bee',
    introId:'flip_mult',
    dock:'flip-pill',
    info:true,
    pillOrder:2,
    equationOrder:1,
    hold:0,
    flyerAt:'face',
    flyerFrom:'flip-button',
    outcome:'flipFactor',
    rulesFlag:'enableFlipFactor',
    dealField:'flipFactor',
    dealAdd:0,
    gainedFlag:'flipTierGained'
  }
];

const INTROS = [
  ['bank'],
  [],
  ['swing'],
  [],
  ['flip'],
  ['flip_mult'],
  [],
  [],
  [],
  ['zero'],
  ['flip','flip_mult','snap'],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  [],
  []
];

function project(factor){
  return {
    kind:factor.kind,
    label:factor.label,
    copy:factor.copy,
    flyer:factor.flyer,
    icon:factor.icon,
    iconClass:factor.iconClass,
    introId:factor.introId,
    dock:factor.dock,
    info:factor.info,
    pillOrder:factor.pillOrder,
    equationOrder:factor.equationOrder,
    hold:factor.hold,
    flyerAt:factor.flyerAt,
    flyerFrom:factor.flyerFrom,
    outcome:factor.outcome,
    rulesFlag:factor.rulesFlag,
    dealField:factor.dealField,
    dealAdd:factor.dealAdd,
    gainedFlag:factor.gainedFlag
  };
}

test('catalog fields match the main 3eaf859 board', () => {
  assert.deepEqual(FACTORS.map(project), EXPECTED);
});

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

test('multiplier pills render Flip last under Swing and Flip multipliers', async () => {
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
  assert.match(html, /aria-label="Swing and Flip multipliers"/);
  assert.deepEqual(
    [...html.matchAll(/data-factor="([^"]+)"/g)].map(match => match[1]),
    ['swing','flip']
  );
});
