import test, {after, describe} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ONBOARDING_SESSION_KEY} from '../src/casual/onboardingProgress.js';
import {
  newOnboardingRound, onboardingLevel, onboardingVictory, stepOnboarding
} from '../src/casual/onboardingLevels.js';
import {LevelEndScreen} from '../src/casual/levelScreens.js';
import {honeyTier, praiseFor} from '../src/casual/starThresholds.js';
import {createFxBus} from '../src/casual/fx/fxBus.js';
import {
  accessibleName, boot, buttonNamed, click, closePage, dialogs, mountGame,
  page, pressKey, setReduced
} from './helpers/mount.mjs';

function winLevel1(){
  let round = newOnboardingRound(1);
  round = stepOnboarding(round, {type:'steer', index:0});
  round = stepOnboarding(round, {type:'steer', index:0});
  round = stepOnboarding(round, {type:'bank'});
  assert.equal(onboardingVictory(round), true);
  return round;
}

function loseRound(){
  const round = newOnboardingRound(4);
  return {...round, snaps:onboardingLevel(4).maxSnaps, turn:2};
}

async function mountStored(round, {reduced = false} = {}){
  await boot();
  setReduced(reduced);
  page().localStorage.clear();
  page().localStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify(round));
  return mountGame();
}

async function mountFresh({reduced = false} = {}){
  await boot();
  setReduced(reduced);
  page().localStorage.clear();
  return mountGame();
}

function enabledPlay(host){
  return [...host.querySelectorAll('button')].find(node =>
    accessibleName(node).startsWith('Play ') && !node.disabled);
}

async function skipIfPresent(host){
  const skip = buttonNamed(host, 'Skip animation');
  if(skip)await click(skip);
}

function jarFill(dialog){
  const fill = dialog.querySelector('.sgv-fluid-fill');
  assert.ok(fill, 'the win jar has a honey fill');
  return page().getComputedStyle(fill);
}

function assertFilled(dialog, score){
  const tally = dialog.querySelector('.sgv-win-tally');
  assert.equal(tally.textContent, String(score));
  const fill = jarFill(dialog);
  assert.notEqual(fill.height, '0%');
  assert.notEqual(fill.height, '0px');
  assert.notEqual(fill.height, '0');
  assert.notEqual(fill.opacity, '0');
}

after(async() => {
  await closePage();
});

describe('mounted guards', {concurrency:false}, () => {
test('start, win, and lose screens show a call to action, and skip dismisses the start', async() => {
  const fresh = await mountFresh();
  await click(buttonNamed(fresh.host, 'PLAY'));
  const start = dialogs(fresh.host).find(node => accessibleName(node).includes('Level 1'));
  assert.ok(start, 'level start is on screen');
  assert.match(start.textContent, /COLLECT/);
  assert.ok(buttonNamed(start, 'START'));
  await pressKey(start, 'Escape');
  assert.equal(dialogs(fresh.host).some(node => accessibleName(node).includes('Level 1')), false);
  assert.ok(enabledPlay(fresh.host), 'skip leaves a card the player can play');
  await fresh.unmount();

  const won = winLevel1();
  const victory = await mountStored(won, {reduced:true});
  const winDialog = dialogs(victory.host)[0];
  assert.ok(winDialog);
  assert.match(winDialog.textContent, /Level complete/);
  assert.ok(buttonNamed(winDialog, 'NEXT'));
  await victory.unmount();

  const defeat = await mountStored(loseRound(), {reduced:true});
  const loseDialog = dialogs(defeat.host)[0];
  assert.ok(loseDialog);
  assert.match(loseDialog.textContent, /Try again/);
  assert.ok(buttonNamed(loseDialog, 'TRY AGAIN'));
  await defeat.unmount();
});

test('dismissing the bank intro shows the level arrival until START', async() => {
  const arrival = await mountFresh();
  const phone = () => arrival.host.querySelector('.sgv-phone');
  assert.equal(phone().classList.contains('sgv-level-arrival'), false);
  await click(buttonNamed(arrival.host, 'PLAY'));
  assert.equal(phone().classList.contains('sgv-level-arrival'), true);
  await click(buttonNamed(arrival.host, 'START'));
  assert.equal(phone().classList.contains('sgv-level-arrival'), false);
  await arrival.unmount();
});

test('a winning Save pours the pot before the win screen', async() => {
  const view = await mountFresh();
  await click(buttonNamed(view.host, 'PLAY'));
  await click(buttonNamed(view.host, 'START'));
  await click(enabledPlay(view.host));
  await skipIfPresent(view.host);
  await click(enabledPlay(view.host));
  await skipIfPresent(view.host);
  const save = [...view.host.querySelectorAll('button')].find(node =>
    accessibleName(node).startsWith('Save ') && !node.disabled);
  assert.ok(save, 'Save is available after two cards');
  await click(save);
  assert.equal(dialogs(view.host).some(node => /Level complete|Try again/.test(node.textContent)), false,
    'the win screen waits until the pour has started');
  assert.match(view.host.textContent, /\+\d+/, 'the pour shows the amount being saved');
  const {act} = await import('react');
  await act(async() => {
    await new Promise(resolve => setTimeout(resolve, 800));
  });
  assert.ok(view.host.querySelector('.sgv-pour-stream'), 'the pot pour stream is on screen');
  await skipIfPresent(view.host);
  const done = dialogs(view.host).find(node => /Level complete/.test(node.textContent));
  assert.ok(done, 'skip after the pour lands on the win screen');
  await view.unmount();

  setReduced(true);
  const reduced = await mountFresh({reduced:true});
  await click(buttonNamed(reduced.host, 'PLAY'));
  await click(buttonNamed(reduced.host, 'START'));
  await click(enabledPlay(reduced.host));
  await skipIfPresent(reduced.host);
  await click(enabledPlay(reduced.host));
  await skipIfPresent(reduced.host);
  const reducedSave = [...reduced.host.querySelectorAll('button')].find(node =>
    accessibleName(node).startsWith('Save ') && !node.disabled);
  await click(reducedSave);
  assert.match(reduced.host.textContent, /\+\d+/);
  assert.equal(reduced.host.querySelector('.sgv-pour-stream'), null);
  await reduced.unmount();
  setReduced(false);
});

test('Reset progress returns to Level 1', async() => {
  await boot();
  setReduced(true);
  page().localStorage.clear();
  const {prepareOnboardingJump} = await import('../src/casual/onboardingProgress.js');
  const {derivedFeatureUnlocks} = await import('../src/casual/featureIntroRegistry.js');
  const {ONBOARDING_COUNT} = await import('../src/casual/onboardingLevels.js');
  prepareOnboardingJump(page().localStorage, 8, {
    levelCount:ONBOARDING_COUNT,
    introUnlocks:derivedFeatureUnlocks()
  });
  const view = await mountGame();
  assert.match(view.host.textContent, /Level 8/);
  await click(buttonNamed(view.host, 'Reset onboarding progress and restart Level 1'));
  assert.match(view.host.textContent, /Level 1/);
  assert.doesNotMatch(view.host.textContent, /Level 8/);
  await view.unmount();
  setReduced(false);
});

test('a settled win shows a filled jar and the secured score', async() => {
  const round = winLevel1();
  const view = await mountStored(round, {reduced:true});
  const dialog = dialogs(view.host)[0];
  assert.ok(dialog);
  assertFilled(dialog, round.game.deal.T);
  assert.match(accessibleName(dialog), new RegExp(String(round.game.deal.T)));
  // SimplifiedGame sets these on the HUD, the meter/jars, and the card row
  // while a win is showing. The stylesheet also sets visibility:hidden, which
  // this document does not load.
  for(const region of ['.sgv-hud', '.sgv-middle', '.sgv-controls']){
    const node = view.host.querySelector(region);
    assert.ok(node, region);
    assert.equal(node.getAttribute('aria-hidden'), 'true', region);
    assert.equal(node.hasAttribute('inert'), true, region);
  }
  await view.unmount();
});

test('win praise reads Nectar, Amber, or Hiveful', () => {
  const cases = [
    [4, 11, 'Nectar!'],
    [4, 18, 'Amber!'],
    [1, 5, 'Hiveful!']
  ];
  for(const [level, score, word] of cases){
    const praise = praiseFor(honeyTier(level, score));
    assert.equal(praise.text, word);
    const html = renderToStaticMarkup(createElement(LevelEndScreen, {
      victory:true, score, target:5, label:'NEXT', praise
    }));
    assert.equal(html.includes(word), true);
    assert.equal(html.includes(String(score)), true);
    assert.equal(html.includes('Sweet!'), false);
  }
  assert.equal(praiseFor(0), null);
});

test('skip and reduced motion end on the same final win screen', async() => {
  await boot();
  const {playWinCelebration} = await import('../src/casual/winMotion.js');
  const doc = page().document;
  function stage(){
    const card = doc.createElement('div');
    const praise = doc.createElement('p');
    praise.textContent = 'Hiveful!';
    const liquid = doc.createElement('div');
    liquid.className = 'sgv-fluid-fill';
    const tally = doc.createElement('p');
    tally.className = 'sgv-win-tally';
    const cta = doc.createElement('button');
    cta.type = 'button';
    cta.textContent = 'NEXT';
    card.append(praise, liquid, tally, cta);
    doc.body.append(card);
    return {card, praise, liquid, tally, cta, remove(){card.remove();}};
  }
  function read(nodes){
    const fill = page().getComputedStyle(nodes.liquid);
    return {
      score:nodes.tally.textContent,
      praise:nodes.praise.textContent,
      height:fill.height,
      opacity:fill.opacity,
      enabled:!nodes.cta.disabled
    };
  }
  const reducedNodes = stage();
  const reducedBus = createFxBus({reducedMotion:() => false});
  playWinCelebration({
    victory:true, secured:8, target:5, tier:3,
    praise:reducedNodes.praise, tally:reducedNodes.tally, liquid:reducedNodes.liquid,
    cta:reducedNodes.cta, card:reducedNodes.card, reduced:true, bus:reducedBus
  });
  const reduced = read(reducedNodes);
  assert.equal(reducedBus.liveParticles(), 0);

  const skippedNodes = stage();
  const skippedBus = createFxBus({reducedMotion:() => false});
  const handle = playWinCelebration({
    victory:true, secured:8, target:5, tier:3,
    praise:skippedNodes.praise, tally:skippedNodes.tally, liquid:skippedNodes.liquid,
    cta:skippedNodes.cta, card:skippedNodes.card, reduced:false, bus:skippedBus
  });
  handle.cancel();
  const skipped = read(skippedNodes);
  assert.equal(skippedBus.liveParticles(), 0);
  assert.deepEqual(skipped, reduced);
  assert.equal(skipped.score, '8');
  assert.equal(skipped.praise, 'Hiveful!');
  assert.equal(skipped.enabled, true);
  assert.notEqual(skipped.height, '0%');
  assert.notEqual(skipped.height, '0px');
  assert.notEqual(skipped.opacity, '0');
  reducedNodes.remove();
  skippedNodes.remove();
});

test('NEXT advances exactly one level', async() => {
  const view = await mountStored(winLevel1(), {reduced:true});
  await click(buttonNamed(view.host, 'NEXT'));
  assert.match(view.host.textContent, /Level 2/);
  assert.doesNotMatch(view.host.textContent, /Level 3/);
  assert.equal(dialogs(view.host).some(node => /Level complete/.test(node.textContent)), false);
  await view.unmount();
});
});
