import test, {after, describe} from 'node:test';
import assert from 'node:assert/strict';
import {ONBOARDING_SESSION_KEY} from '../src/casual/onboardingProgress.js';
import {
  newOnboardingRound, onboardingLevel, onboardingVictory, stepOnboarding
} from '../src/casual/onboardingLevels.js';
import {honeyLayout} from '../src/casual/honeyWin.js';
import {focusTargetAfterSkip, skipFocusSelector} from '../src/casual/skipFocus.js';
import {
  accessibleName, boot, buttonNamed, click, closePage, dialogs, mountGame,
  page, setReduced
} from './helpers/mount.mjs';

const INSETS = {top:47, right:0, bottom:34, left:0};
const REGIONS = ['.sgv-hud', '.sgv-middle', '.sgv-controls'];

function boxes(layout){
  return {
    praise:layout.praise,
    jar:layout.jar,
    scoreboard:layout.scoreboard,
    cta:layout.cta
  };
}

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

async function mountLevel(levelId){
  await boot();
  setReduced(false);
  page().localStorage.clear();
  const {prepareOnboardingJump} = await import('../src/casual/onboardingProgress.js');
  const {derivedFeatureUnlocks} = await import('../src/casual/featureIntroRegistry.js');
  const {ONBOARDING_COUNT} = await import('../src/casual/onboardingLevels.js');
  prepareOnboardingJump(page().localStorage, levelId, {
    levelCount:ONBOARDING_COUNT,
    introUnlocks:derivedFeatureUnlocks()
  });
  return mountGame();
}

function focusFor(host){
  const root = host.querySelector('.sgv-phone');
  const active = root.ownerDocument.activeElement;
  const inside = active && root.contains(active) ? active : null;
  const controls = [...root.querySelectorAll(skipFocusSelector)];
  return focusTargetAfterSkip({active:inside, previous:null, controls});
}

function assertCovered(host){
  for(const region of REGIONS){
    const node = host.querySelector(region);
    assert.ok(node, region);
    assert.equal(node.getAttribute('aria-hidden'), 'true', region);
    assert.equal(node.hasAttribute('inert'), true, region);
  }
}

function assertUncovered(host){
  for(const region of REGIONS){
    const node = host.querySelector(region);
    assert.equal(node.hasAttribute('inert'), false, region);
  }
}

function playOrSave(host){
  return [...host.querySelectorAll('button')].find(node => {
    if(node.disabled)return false;
    const name = accessibleName(node);
    return name.startsWith('Play ') || /^Save \d+ pending drops$/.test(name);
  });
}

function openDialog(host, name){
  const dialog = dialogs(host).find(node => buttonNamed(node, name));
  assert.ok(dialog, name+' dialog');
  assert.equal(dialog.getAttribute('role'), 'dialog');
  const cta = buttonNamed(dialog, name);
  assert.ok(cta, name);
  assert.equal(cta.disabled, false);
  assert.equal(focusFor(host), cta);
  assertCovered(host);
  return cta;
}

after(async() => {
  await closePage();
});

test('honeyLayout safe-area boxes match the a545f80 phone sizes', () => {
  assert.deepEqual(boxes(honeyLayout(320, 568, INSETS)), {
    praise:{x:16, y:59, w:236, h:64, font:40},
    jar:{x:70.39999999999999, y:135, w:179.20000000000002, h:130.6909871244635},
    scoreboard:{x:16, y:279.6909871244635, w:288, h:120.30901287553648, font:32},
    cta:{x:88, y:412, w:144, h:70}
  });
  assert.deepEqual(boxes(honeyLayout(430, 932, INSETS)), {
    praise:{x:16, y:202.73962804005726, w:346, h:64, font:48},
    jar:{x:105, y:276.73962804005726, w:220, h:275},
    scoreboard:{
      x:16.000000000000057, y:563.7396280400573,
      w:397.9999999999999, h:166.26037195994274, font:43.77999999999999
    },
    cta:{x:115.5, y:742, w:199, h:70}
  });
});

describe('open screens', {concurrency:false}, () => {
  test('feature intro PLAY is the dialog control', async() => {
    const view = await mountFresh();
    const cta = openDialog(view.host, 'PLAY');
    await click(cta);
    const start = dialogs(view.host).find(node => buttonNamed(node, 'START'));
    assert.ok(start, 'dismissing PLAY shows START');
    await click(buttonNamed(start, 'START'));
    assertUncovered(view.host);
    assert.ok(playOrSave(view.host));
    await view.unmount();
  });

  test('level start START is the dialog control', async() => {
    const view = await mountFresh();
    await click(buttonNamed(view.host, 'PLAY'));
    const cta = openDialog(view.host, 'START');
    await click(cta);
    assert.equal(dialogs(view.host).some(node => buttonNamed(node, 'START')), false);
    assertUncovered(view.host);
    assert.ok(playOrSave(view.host));
    await view.unmount();
  });

  test('win NEXT is the dialog control and the reduced-motion score is immediate', async() => {
    const round = winLevel1();
    const view = await mountStored(round, {reduced:true});
    const dialog = dialogs(view.host).find(node => buttonNamed(node, 'NEXT'));
    assert.ok(dialog);
    assert.equal(dialog.getAttribute('role'), 'dialog');
    const cta = buttonNamed(dialog, 'NEXT');
    assert.equal(cta.disabled, false);
    assert.equal(dialog.querySelector('.sgv-win-tally').textContent, String(round.game.deal.T));
    assert.equal(focusFor(view.host), cta);
    assertCovered(view.host);
    await click(cta);
    assert.match(view.host.textContent, /Level 2/);
    assert.doesNotMatch(view.host.textContent, /Level 3/);
    const start = dialogs(view.host).find(node => buttonNamed(node, 'START'));
    assert.ok(start);
    await click(buttonNamed(start, 'START'));
    assertUncovered(view.host);
    assert.ok(playOrSave(view.host));
    await view.unmount();
    setReduced(false);
  });

  test('lose TRY AGAIN is the dialog control', async() => {
    const view = await mountStored(loseRound(), {reduced:true});
    const cta = openDialog(view.host, 'TRY AGAIN');
    await click(cta);
    assert.match(view.host.textContent, /Level 4/);
    assert.doesNotMatch(view.host.textContent, /Level 5/);
    const start = dialogs(view.host).find(node => buttonNamed(node, 'START'));
    assert.ok(start);
    await click(buttonNamed(start, 'START'));
    assertUncovered(view.host);
    assert.ok(playOrSave(view.host));
    await view.unmount();
    setReduced(false);
  });

  test('factor info Got it is the dialog control', async() => {
    const view = await mountLevel(3);
    await click(buttonNamed(view.host, 'START'));
    const pill = buttonNamed(view.host, 'Swing multiplier info');
    assert.ok(pill, 'swing info pill');
    await click(pill);
    const cta = openDialog(view.host, 'Got it');
    await click(cta);
    assert.equal(dialogs(view.host).some(node => buttonNamed(node, 'Got it')), false);
    assertUncovered(view.host);
    assert.ok(playOrSave(view.host));
    await view.unmount();
  });
});
