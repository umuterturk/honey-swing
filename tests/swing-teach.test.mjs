import test, {after, describe} from 'node:test';
import assert from 'node:assert/strict';
import {signed} from '../src/external/engines.js';
import {GARDEN} from '../src/casual/levels/garden.js';
import {
  onboardingLevel, newOnboardingRound, onboardingActions, stepOnboarding, onboardingVictory
} from '../src/casual/onboardingLevels.js';
import {solveSwingGate} from '../scripts/solve-level.mjs';
import {
  SWING_TEACH_FOLLOW, SWING_TEACH_OPENING, TEACH_ARROW_FILL, TEACH_ARROW_STROKE, TEACH_CAPTION,
  TEACH_DIM, TEACH_ENTER, createTeachClock, filterTeachActions, playReleaseTime,
  swingSpotlightPlan, swingTeachConcealed, teachDismissesCrossAck, visibleHandIds
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

async function seekTeach(seconds){
  const {gsap}=await import('gsap');
  const {act}=await import('react');
  const start=gsap.globalTimeline.time();
  await act(async()=>{gsap.globalTimeline.time(start+seconds);});
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

test('the spotlight schedule is the idle Matrix clock and never arms on L4', ()=>{
  const marks=cardMotionMarks({type:'steer', snap:false, rewards:[{kind:'swing'}], from:3, to:-2});
  const plan=swingSpotlightPlan({
    levelId:3, type:'steer', snap:false, rewards:[{kind:'swing'}], from:3, to:-2, reduced:false
  });
  assert.ok(plan);
  assert.equal(plan.cross, 8);
  assert.ok(plan.dim.at>marks.cardArrive, 'no dim during the card flight');
  assert.equal(plan.dim.at, 8);
  assert.notEqual(plan.dim.at, 0.15);
  assert.equal(plan.dim.duration, 0.15);
  assert.equal(plan.dim.color, TEACH_DIM);
  assert.equal(plan.needle.start, 0.42);
  assert.equal(plan.needle.cross, 8);
  assert.equal(plan.needle.end, 9.5);
  assert.equal(plan.needle.toZero, 'power4.out');
  assert.equal(plan.needle.past, 'power2.out');
  assert.equal(plan.window, 1.5);
  assert.equal(plan.arrow.from, 8);
  assert.equal(plan.arrow.to, 9.5);
  assert.equal(plan.arrow.fill, TEACH_ARROW_FILL);
  assert.equal(plan.arrow.stroke, TEACH_ARROW_STROKE);
  assert.equal(plan.arrow.button, false);
  assert.equal(plan.arrow.coversNumeral, false);
  assert.equal(plan.flyer.at, 8);
  assert.equal(plan.flyer.duration, 0.95);
  assert.equal(plan.pill.at, 8.95);
  assert.equal(plan.pill.blinks, 2);
  assert.equal(plan.pill.blink, 0.4);
  assert.equal(plan.pill.scale, 1.12);
  assert.equal(plan.caption.text, 'Cross 0 for more flowers.');
  assert.equal(plan.caption.text, TEACH_CAPTION);
  assert.equal(plan.caption.at, 8);
  assert.equal(plan.fade.at, 11.8);
  assert.equal(plan.fade.duration, 0.2);
  assert.equal(plan.lock, 12);
  assert.equal(playReleaseTime(marks.end, plan), 12);
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
  assert.equal(reduced.caption.text, 'Cross 0 for more flowers.');
  assert.equal(reduced.caption.immediate, true);
  assert.equal(playReleaseTime(marks.end, reduced), marks.end);
});

function tappedClock(taps){
  const clock=createTeachClock({from:3, to:-2});
  for(let i=0;i<taps;i++)clock.tap();
  return clock;
}

test('taps from the commit halve unlock time down to the shipped floor', ()=>{
  const idle=tappedClock(0);
  assert.equal(idle.cross, 8);
  assert.equal(idle.window, 1.5);
  assert.equal(idle.park, 9.5);
  assert.equal(idle.flyerEnd, 8.95);
  assert.equal(idle.blinksEnd, 9.75);
  assert.equal(idle.fadeAt, 11.8);
  assert.equal(idle.unlock, 12);
  const once=tappedClock(1);
  assert.equal(once.cross, 4.05);
  assert.equal(once.unlock, 6);
  assert.ok(Math.abs(once.window-0.790)<0.001, once.window);
  assert.ok(Math.abs(once.park-4.84)<0.002, once.park);
  assert.equal(once.flyerEnd, 5);
  assert.equal(once.blinksEnd, 5.8);
  assert.equal(once.fadeAt, 5.8);
  const twice=tappedClock(2);
  assert.equal(twice.cross, 1.05);
  assert.equal(twice.unlock, 3);
  assert.ok(Math.abs(twice.window-0.251)<0.001, twice.window);
  assert.ok(Math.abs(twice.park-1.301)<0.002, twice.park);
  assert.equal(twice.flyerEnd, 2);
  assert.equal(twice.blinksEnd, 2.8);
  assert.equal(twice.fadeAt, 2.8);
  const floor=tappedClock(3);
  assert.equal(floor.cross, 0.473);
  assert.equal(floor.window, 0.147);
  assert.equal(floor.park, 0.62);
  assert.equal(floor.flyerEnd, 1.423);
  assert.equal(floor.blinksEnd, 2.223);
  assert.equal(floor.fadeAt, 2.223);
  assert.equal(floor.unlock, 2.423);
  assert.equal(tappedClock(6).unlock, 2.423);
  for(const taps of [0, 1, 2, 3]){
    const clock=tappedClock(taps);
    assert.ok(Math.abs((clock.flyerEnd-clock.cross)-0.95)<1e-9);
    assert.ok(Math.abs((clock.blinksEnd-clock.flyerEnd)-0.8)<1e-9);
    assert.ok(Math.abs((clock.unlock-clock.fadeAt)-0.2)<1e-9);
    assert.ok(clock.fadeAt+1e-9>=clock.blinksEnd);
    assert.ok(clock.unlock+1e-9>=2.423);
  }
});

test('the needle eases +3 to 0 with power4.out, then 0 to −2 with power2.out', async()=>{
  const {gsap}=await import('gsap');
  const power4=gsap.parseEase('power4.out');
  const power2=gsap.parseEase('power2.out');
  const idle=createTeachClock({from:3, to:-2});
  idle.step(0.42);
  assert.equal(idle.needle, 3);
  idle.step(3.79);
  assert.ok(Math.abs(idle.needle-(3+(0-3)*power4(0.5)))<1e-4, idle.needle);
  idle.step(3.79);
  assert.ok(Math.abs(idle.needle)<1e-6, idle.needle);
  assert.ok(Math.abs(idle.t-8)<1e-6);
  idle.step(0.75);
  assert.ok(Math.abs(idle.needle-(0+(-2-0)*power2(0.5)))<1e-4, idle.needle);
  idle.step(0.75);
  assert.ok(Math.abs(idle.needle-(-2))<1e-6);
  assert.ok(Math.abs(idle.park-9.5)<1e-9);
  const sped=tappedClock(1);
  sped.step(0.42);
  assert.equal(sped.needle, 3, 'card flight stays at today\'s speed');
  sped.step(3.63);
  assert.ok(Math.abs(sped.t-4.05)<1e-6);
  assert.ok(Math.abs(sped.needle)<1e-6);
});

test('a mid-lesson tap waits for the flyer and blinks before the fade', ()=>{
  const mid=createTeachClock({from:3, to:-2});
  mid.step(9);
  mid.tap();
  assert.ok(mid.fadeAt+1e-9>=9.75, mid.fadeAt);
  assert.ok(mid.unlock+1e-9>=9.95, mid.unlock);
  assert.ok(mid.unlock<12);
  assert.ok(Math.abs(mid.park-9.25)<0.002, mid.park);
  assert.ok(Math.abs((mid.blinksEnd-mid.cross)-1.75)<1e-9);
  const fading=createTeachClock({from:3, to:-2});
  fading.step(11.9);
  const unlock=fading.unlock;
  const fadeAt=fading.fadeAt;
  fading.tap();
  assert.equal(fading.unlock, unlock);
  assert.equal(fading.fadeAt, fadeAt);
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
      assert.equal(hand.style.getPropertyValue('--hs-hand-slots').trim(), '4');
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
      assert.equal(phone.getAttribute('data-swing-teach-unlock'), '2.423');
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
      const caption=view.host.querySelector('.sgv-swing-teach-caption');
      assert.ok(caption);
      assert.equal(caption.tagName, 'P');
      assert.equal(caption.getAttribute('role'), 'status');
      assert.equal(caption.closest('button'), null);
      assert.equal(caption.textContent, 'Cross 0 for more flowers.');
      assert.equal(caption.closest('.sgv-meter')!=null, true);
      assert.equal(caption.closest('.sgv-meter-section')!=null, true);
      assert.equal(caption.ownerDocument.defaultView.getComputedStyle(caption).top, '112px');
      assert.equal(Number(gsap.getProperty(caption, 'opacity')), 0);
      const phone=view.host.querySelector('.sgv-phone');
      assert.equal(phone.getAttribute('data-swing-teach-cross'), '8.000');
      assert.equal(phone.getAttribute('data-swing-teach-unlock'), '12.000');
      assert.equal(gsap.getTweensOf(dim).some(tween=>tween.vars.opacity===1), false);
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
      const caption=reduced.host.querySelector('.sgv-swing-teach-caption');
      assert.equal(caption.textContent, 'Cross 0 for more flowers.');
      assert.equal(Number(gsap.getProperty(caption, 'opacity')), 1);
      assert.equal(buttonNamed(reduced.host, 'Skip animation'), null);
      assert.equal(reduced.host.querySelector('.sgv-factor-info'), null);
    }finally{
      setReduced(false);
      await reduced.unmount();
    }

    const paced=await mountLevel(3);
    try{
      const phone=paced.host.querySelector('.sgv-phone');
      await click(phone.querySelector('[data-card-id="2"]'));
      await click(buttonNamed(paced.host, 'Skip animation'));
      await click(phone.querySelector('[data-card-id="24"]'));
      assert.equal(phone.getAttribute('data-swing-teach-unlock'), '12.000');
      await seekTeach(8);
      assert.equal(phone.querySelector('.sgv-meter-needle-value')?.getAttribute('data-live'), '0');
      const caption=phone.querySelector('.sgv-swing-teach-caption');
      const fadeIn=gsap.getTweensOf(caption).find(tween=>tween.vars.opacity===1);
      assert.ok(fadeIn, 'caption fades in at the cross');
      assert.equal(fadeIn.duration(), 0.15);
      const dimFade=gsap.getTweensOf(phone.querySelector('[data-swing-teach="dim"]')).find(tween=>tween.vars.opacity===1);
      assert.equal(dimFade.duration(), 0.15);
      assert.equal(phone.getAttribute('aria-busy'), 'true');
      assert.equal(phone.querySelector('.sgv-factor-info'), null);
      await seekTeach(0.95);
      assert.match(phone.querySelector('[data-factor="swing"]').textContent, /×2/);
      await seekTeach(3.05);
      assert.equal(phone.getAttribute('aria-busy'), 'false');
      assert.equal(phone.getAttribute('data-swing-teach'), null);
    }finally{
      await paced.unmount();
    }

    const tapped=await mountLevel(3);
    try{
      const phone=tapped.host.querySelector('.sgv-phone');
      await click(phone.querySelector('[data-card-id="2"]'));
      await click(buttonNamed(tapped.host, 'Skip animation'));
      gsap.ticker.lagSmoothing(0);
      gsap.ticker.tick();
      gsap.ticker.sleep();
      await click(phone.querySelector('[data-card-id="24"]'));
      gsap.ticker.sleep();
      await click(phone);
      const unlock1=Number(phone.getAttribute('data-swing-teach-unlock'));
      const cross1=Number(phone.getAttribute('data-swing-teach-cross'));
      assert.ok(Math.abs(unlock1-6)<0.03, 'one tap unlocks near 6, got '+unlock1);
      assert.ok(Math.abs(cross1-4.05)<0.03, cross1);
      assert.equal(phone.getAttribute('aria-busy'), 'true');
      gsap.ticker.sleep();
      await pressKey(phone, 'Escape');
      const unlock2=Number(phone.getAttribute('data-swing-teach-unlock'));
      assert.ok(unlock2<unlock1 && Math.abs(unlock2-3)<0.05, unlock2);
      assert.equal(phone.getAttribute('aria-busy'), 'true');
      gsap.ticker.sleep();
      await pressKey(phone, 'Enter');
      assert.equal(phone.getAttribute('data-swing-teach-cross'), '0.473');
      assert.equal(phone.getAttribute('data-swing-teach-unlock'), '2.423');
      assert.equal(phone.getAttribute('aria-busy'), 'true');
      assert.equal(buttonNamed(tapped.host, 'Skip animation'), null);
      gsap.ticker.sleep();
      await pressKey(phone, ' ');
      assert.equal(phone.getAttribute('data-swing-teach-unlock'), '2.423');
      await seekTeach(2.423);
      assert.equal(phone.getAttribute('aria-busy'), 'false');
    }finally{
      await tapped.unmount();
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
