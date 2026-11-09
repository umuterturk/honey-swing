import test, {after, describe} from 'node:test';
import assert from 'node:assert/strict';
import {signed} from '../src/external/engines.js';
import {GARDEN} from '../src/casual/levels/garden.js';
import {
  onboardingLevel, newOnboardingRound, onboardingActions, stepOnboarding, onboardingVictory
} from '../src/casual/onboardingLevels.js';
import {solveSwingGate} from '../scripts/solve-level.mjs';
import {
  SWING_TEACH_FOLLOW, SWING_TEACH_OPENING, TEACH_ARROW_FILL, TEACH_ARROW_STROKE, TEACH_DIM,
  TEACH_ENTER, filterTeachActions, playReleaseTime, swingSpotlightPlan, swingTeachConcealed,
  teachDismissesCrossAck, visibleHandIds
} from '../src/casual/swingTeach.js';
import {cardMotionMarks} from '../src/casual/motionSchedule.js';
import {
  accessibleName, boot, buttonNamed, click, closePage, mountGame, page, pressKey, setReduced
} from './helpers/mount.mjs';

const bank={type:'bank'};

function steer(round, value){
  const index=round.game.deal.hand.findIndex(id=>signed(id)===value);
  assert.ok(index>=0, 'missing '+value);
  const next=stepOnboarding(round, {type:'steer', index});
  assert.notStrictEqual(next, round, 'rejected '+value);
  return next;
}

function handIds(host){
  const hand=host.querySelector('[aria-label="Your cards"]');
  assert.ok(hand, 'hand is on screen');
  return [...hand.querySelectorAll('button')].map(button=>Number(button.getAttribute('data-card-id')));
}

async function mountLevel(levelId){
  await boot();
  const {prepareOnboardingJump}=await import('../src/casual/onboardingProgress.js');
  const {derivedFeatureUnlocks}=await import('../src/casual/featureIntroRegistry.js');
  page().localStorage.clear();
  prepareOnboardingJump(page().localStorage, levelId, {
    levelCount:GARDEN.length,
    introUnlocks:derivedFeatureUnlocks()
  });
  const view=await mountGame();
  const intro=buttonNamed(view.host, 'PLAY');
  if(intro&&accessibleName(intro).toLowerCase()==='play')await click(intro);
  const start=buttonNamed(view.host, 'START');
  if(start&&accessibleName(start).toLowerCase()==='start')await click(start);
  return view;
}

test('L3 and L4 keep their decks and legal hand sizes', ()=>{
  const l3=GARDEN.find(level=>level.id===3);
  const l4=GARDEN.find(level=>level.id===4);
  assert.deepEqual([...l3.deck], [2, 24]);
  assert.deepEqual([...l4.deck], [1, 3, 24]);
  assert.equal(l3.hand, 2);
  assert.equal(l4.hand, 3);
  assert.equal(signed(2), 3);
  assert.equal(signed(24), -5);
  assert.equal(signed(1), 2);
  assert.equal(signed(3), 4);
  const level=onboardingLevel(3);
  assert.equal(level.initialHandSize, 2);
  assert.equal(level.showFlip, false);
  assert.equal(level.rules.potCap, 13);
  assert.equal(level.target, 10);
});

test('L3 has one winning line and that line totals 13', ()=>{
  const row=solveSwingGate(3);
  assert.equal(row.truncated, false);
  assert.equal(row.lines, 1);
  assert.equal(row.wins, 1);
  assert.equal(row.maxT, 13);
});

test('L4 has a win and no win that skips the swing', ()=>{
  const row=solveSwingGate(4);
  assert.equal(row.truncated, false);
  assert.equal(row.noSwingWins, 0);
  assert.equal(row.noSwingLines, 0);
  assert.ok(row.wins>=1);
  assert.ok(row.lines>=1);
});

test('the L3 swing line banks 13 and Save stays closed after only +3', ()=>{
  let round=newOnboardingRound(3);
  round=steer(round, 3);
  assert.equal(round.game.deal.pot.length, 1);
  assert.equal(onboardingActions(round).some(action=>action.type==='bank'), false);
  assert.equal(round.game.deal.potValue, 3);
  round=steer(round, -5);
  assert.equal(round.game.lastAction.swingTierGained, true);
  assert.equal(round.game.deal.potValue, 13);
  round=stepOnboarding(round, bank);
  assert.equal(round.game.deal.T, 13);
  assert.equal(onboardingVictory(round), true);
});

test('at the L3 opening only +3 is playable, and −5 becomes playable after that play', ()=>{
  const start=newOnboardingRound(3);
  assert.equal(start.game.deal.hand.length, 2);
  assert.equal(swingTeachConcealed(start), true);
  assert.deepEqual(visibleHandIds(start, start.game.deal.hand), [SWING_TEACH_OPENING]);
  const actions=onboardingActions(start);
  assert.deepEqual(actions.map(action=>action.type), ['steer']);
  assert.equal(start.game.deal.hand[actions[0].index], SWING_TEACH_OPENING);
  const hidden=start.game.deal.hand.findIndex(id=>id===SWING_TEACH_FOLLOW);
  assert.equal(stepOnboarding(start, {type:'steer', index:hidden}), start);
  assert.deepEqual(filterTeachActions(start, [{type:'steer', index:hidden}]), []);
  const played=steer(start, 3);
  assert.equal(swingTeachConcealed(played), false);
  const follow=onboardingActions(played).filter(action=>action.type==='steer');
  assert.equal(follow.length, 1);
  assert.equal(played.game.deal.hand[follow[0].index], SWING_TEACH_FOLLOW);
  assert.equal(onboardingLevel(4).initialHandSize, 3);
  const l4=newOnboardingRound(4);
  assert.equal(swingTeachConcealed(l4), false);
  assert.equal(onboardingActions(l4).filter(action=>action.type==='steer').length, 3);
});

test('the spotlight schedule matches the −5 crossing and never arms on L4', ()=>{
  const marks=cardMotionMarks({type:'steer', snap:false, rewards:[{kind:'swing'}], from:3, to:-2});
  const plan=swingSpotlightPlan({
    levelId:3, type:'steer', snap:false, rewards:[{kind:'swing'}], from:3, to:-2, reduced:false
  });
  assert.ok(plan);
  assert.equal(plan.cross, 0.473);
  assert.equal(plan.cross, marks.swingFlyer);
  assert.ok(plan.dim.at>marks.cardArrive, 'no dim during the card flight');
  assert.equal(plan.dim.at, 0.473);
  assert.notEqual(plan.dim.at, 0.15);
  assert.equal(plan.dim.duration, 0.15);
  assert.equal(Math.round((plan.dim.at+plan.dim.duration)*1000)/1000, 0.623);
  assert.equal(plan.dim.color, TEACH_DIM);
  assert.equal(plan.needle.start, 0.42);
  assert.equal(plan.needle.end, 0.62);
  assert.equal(plan.arrow.from, 0.473);
  assert.equal(plan.arrow.to, 0.62);
  assert.equal(plan.arrow.fill, TEACH_ARROW_FILL);
  assert.equal(plan.arrow.stroke, TEACH_ARROW_STROKE);
  assert.equal(plan.arrow.button, false);
  assert.equal(plan.arrow.coversNumeral, false);
  assert.equal(plan.flyer.at, 0.473);
  assert.equal(plan.flyer.duration, 0.95);
  assert.equal(plan.pill.at, 1.423);
  assert.equal(plan.pill.at, marks.factors);
  assert.equal(plan.pill.blinks, 2);
  assert.equal(plan.pill.blink, 0.4);
  assert.equal(plan.pill.scale, 1.12);
  assert.equal(plan.fade.at, 2.223);
  assert.equal(plan.fade.duration, 0.2);
  assert.equal(plan.lock, 2.423);
  assert.equal(playReleaseTime(marks.end, plan), 2.423);
  const again=swingSpotlightPlan({
    levelId:3, type:'steer', snap:false, rewards:[{kind:'swing'}], from:3, to:-2, reduced:false
  });
  assert.deepEqual(again, plan);
  assert.equal(swingSpotlightPlan({
    levelId:3, type:'steer', snap:false, rewards:[], from:0, to:3, reduced:false
  }), null);
  assert.equal(swingSpotlightPlan({
    levelId:4, type:'steer', snap:false, rewards:[{kind:'swing'}], from:4, to:-1, reduced:false
  }), null);
  assert.equal(swingSpotlightPlan({
    levelId:5, type:'steer', snap:false, rewards:[{kind:'swing'}], from:3, to:-2, reduced:false
  }), null);
  const reduced=swingSpotlightPlan({
    levelId:3, type:'steer', snap:false, rewards:[{kind:'swing'}], from:3, to:-2, reduced:true
  });
  assert.equal(reduced.reduced, true);
  assert.equal(reduced.dim.duration, 0.12);
  assert.equal(reduced.dim.color, TEACH_DIM);
  assert.equal(reduced.arrow.parked, true);
  assert.equal(reduced.arrow.travel, false);
  assert.equal(reduced.pill.blinks, 0);
  assert.equal(reduced.flyer, true);
  assert.equal(reduced.lock, 0);
  assert.equal(playReleaseTime(marks.end, reduced), marks.end);
});

test('the L3 crossing dismisses CROSS and does not open factor info', ()=>{
  const teach=teachDismissesCrossAck(3, 'cross');
  assert.equal(teach, true);
  assert.equal(teachDismissesCrossAck(3, 'flip'), false);
  assert.equal(teachDismissesCrossAck(4, 'cross'), false);
  assert.equal(TEACH_ENTER.duration, 0.25);
  assert.equal(TEACH_ENTER.ease, 'power2.out');
});

describe('L3 teach hand on the board', {concurrency:false}, ()=>{
  after(async()=>{
    const {gsap}=await import('gsap');
    gsap.globalTimeline.clear();
    gsap.ticker.wake();
    await closePage();
  });

  test('only +3 is visible until its play settles, then −5 enters', async()=>{
    const {gsap}=await import('gsap');
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.sleep();
    const view=await mountLevel(3);
    try{
      const hand=view.host.querySelector('[aria-label="Your cards"]');
      assert.deepEqual(handIds(view.host), [2]);
      assert.equal(hand.style.getPropertyValue('--hs-hand-slots').trim(), '1');
      assert.equal(hand.querySelectorAll('[data-card-id="24"]').length, 0);
      assert.equal(view.host.querySelector('[data-swing-teach]'), null);
      const card=hand.querySelector('[data-card-id="2"]');
      await click(card);
      assert.deepEqual(handIds(view.host), []);
      assert.equal(view.host.querySelector('[data-card-id="24"]'), null);
      const skip=buttonNamed(view.host, 'Skip animation');
      assert.ok(skip, 'the +3 play can be skipped');
      await click(skip);
      const follow=view.host.querySelector('[data-card-id="24"]');
      assert.ok(follow, '−5 is on the rail after +3 settles');
      assert.equal(follow.disabled, false);
      const tween=gsap.getTweensOf(follow)[0];
      assert.ok(tween, '−5 has an entrance tween');
      assert.equal(tween.duration(), TEACH_ENTER.duration);
      assert.equal(tween.vars.ease, TEACH_ENTER.ease);
      const save=view.host.querySelector('.sgv-bank');
      assert.equal(save.disabled, true);
    }finally{
      await view.unmount();
    }
  });

  test('Skip still ends the +3 play, and the −5 spotlight ignores skip', async()=>{
    const {gsap}=await import('gsap');
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.sleep();
    const view=await mountLevel(3);
    try{
      const phone=view.host.querySelector('.sgv-phone');
      await click(phone.querySelector('[data-card-id="2"]'));
      const skip=buttonNamed(view.host, 'Skip animation');
      assert.ok(skip, 'Skip is available on the +3 play');
      assert.equal(phone.getAttribute('data-swing-teach'), null);
      await click(skip);
      const follow=phone.querySelector('[data-card-id="24"]');
      assert.ok(follow, '+3 skip reveals −5');
      await click(follow);
      const dim=phone.querySelector('[data-swing-teach="dim"]');
      assert.equal(phone.getAttribute('data-swing-teach'), '1');
      assert.equal(buttonNamed(view.host, 'Skip animation'), null);
      assert.equal(phone.getAttribute('aria-busy'), 'true');
      await click(phone);
      await pressKey(phone, 'Escape');
      await pressKey(phone, 'Enter');
      await pressKey(phone, ' ');
      assert.equal(phone.getAttribute('data-swing-teach'), '1');
      assert.equal(dim.isConnected, true);
      assert.equal(phone.getAttribute('aria-busy'), 'true');
      assert.equal(buttonNamed(view.host, 'Skip animation'), null);
      const probe=phone.ownerDocument.createElement('button');
      probe.className='sgv-skip-surface';
      phone.appendChild(probe);
      assert.equal(phone.ownerDocument.defaultView.getComputedStyle(probe).pointerEvents, 'none');
      probe.remove();
    }finally{
      await view.unmount();
    }
  });

  test('the spotlight runs on the L3 −5 play, including a retry, and never on L4', async()=>{
    const {gsap}=await import('gsap');
    gsap.ticker.sleep();
    const view=await mountLevel(3);
    try{
      await click(view.host.querySelector('[data-card-id="2"]'));
      await click(buttonNamed(view.host, 'Skip animation'));
      await click(view.host.querySelector('[data-card-id="24"]'));
      const dim=view.host.querySelector('[data-swing-teach="dim"]');
      const arrow=view.host.querySelector('.sgv-swing-teach-arrow');
      assert.ok(dim, 'the dim exists from the −5 play');
      assert.equal(dim.style.background.replace(/\s+/g, ''), TEACH_DIM);
      assert.equal(Number(gsap.getProperty(dim, 'opacity')), 0);
      assert.equal(view.host.querySelector('.sgv-phone').getAttribute('data-swing-teach'), '1');
      assert.equal(arrow.style.top, '-22px');
      assert.equal(arrow.style.height, '22px');
      assert.equal(arrow.tagName.toLowerCase(), 'svg');
      assert.equal(arrow.closest('button'), null);
      assert.equal(arrow.getAttribute('role'), null);
      assert.equal(arrow.querySelector('path').getAttribute('fill'), TEACH_ARROW_FILL);
      assert.equal(arrow.querySelector('path').getAttribute('stroke'), TEACH_ARROW_STROKE);
      assert.equal(arrow.closest('.sgv-meter-tick-zero'), null);
      assert.equal(view.host.querySelector('.sgv-meter-beat'), null);
      assert.equal(view.host.querySelector('.sgv-factor-info'), null);
      const dimTween=gsap.getTweensOf(dim).find(tween=>tween.vars.opacity===1);
      assert.ok(dimTween);
      assert.equal(dimTween.duration(), 0.15);
      assert.equal(dimTween.delay(), 0.473);
      assert.deepEqual(Object.keys(dimTween.vars).filter(key=>!['ease','delay','duration','overwrite','callbackScope'].includes(key)&&typeof dimTween.vars[key]!=='function'), ['opacity']);
    }finally{
      await view.unmount();
    }

    const retry=await mountLevel(3);
    try{
      assert.deepEqual(handIds(retry.host), [2]);
      assert.equal(retry.host.querySelector('[data-swing-teach]'), null);
    }finally{
      await retry.unmount();
    }

    setReduced(true);
    const reduced=await mountLevel(3);
    try{
      await click(reduced.host.querySelector('[data-card-id="2"]'));
      const follow=reduced.host.querySelector('[data-card-id="24"]');
      assert.ok(follow, 'reduced motion still reveals −5 when +3 settles');
      assert.equal(buttonNamed(reduced.host, 'Skip animation'), null);
      await click(follow);
      const quiet=reduced.host.querySelector('[data-swing-teach="dim"]');
      const parked=reduced.host.querySelector('.sgv-swing-teach-arrow');
      assert.ok(quiet, 'reduced motion still dims');
      assert.equal(gsap.getTweensOf(quiet)[0].duration(), 0.12);
      assert.equal(Number(gsap.getProperty(parked, 'opacity')), 1);
      assert.equal(gsap.getTweensOf(parked).some(tween=>tween.duration()>0&&tween.vars.x!=null), false);
      assert.match(reduced.host.textContent, /More Flower/);
      assert.match(reduced.host.querySelector('[data-factor="swing"]').textContent, /×2/);
      assert.equal(buttonNamed(reduced.host, 'Skip animation'), null);
      assert.equal(reduced.host.querySelector('.sgv-factor-info'), null);
    }finally{
      setReduced(false);
      await reduced.unmount();
    }

    const later=await mountLevel(4);
    try{
      assert.equal(handIds(later.host).length, 3);
      const plus=later.host.querySelector('[data-card-id="3"]');
      await click(plus);
      await click(buttonNamed(later.host, 'Skip animation'));
      const minus=later.host.querySelector('[data-card-id="24"]');
      await click(minus);
      assert.equal(later.host.querySelector('[data-swing-teach]'), null);
      assert.equal(later.host.querySelector('.sgv-swing-teach-arrow'), null);
    }finally{
      await later.unmount();
    }
  });
});
