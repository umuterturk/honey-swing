import test, {after, describe} from 'node:test';
import assert from 'node:assert/strict';
import {newOverswing, signed, stepOverswing} from '../src/external/engines.js';
import {ONBOARDING_COUNT, newOnboardingRound, onboardingLevel, wouldSnap} from '../src/casual/onboardingLevels.js';
import {idleHintAction} from '../src/casual/idleHint.js';
import {ONBOARDING_SESSION_KEY} from '../src/casual/onboardingProgress.js';
import {boardReadout} from '../src/casual/boardReadout.js';
import {displayOf} from '../src/casual/presentation.js';
import {
  accessibleName, boot, buttonNamed, click, closePage, mountGame, page, setReduced
} from './helpers/mount.mjs';

const SIX_CARD_DECK = [0, 1, 20, 21, 2, 22];

function valueFromLabel(label){
  const match = /^Play (LEFT|RIGHT) (\d+)$/.exec(label);
  assert.ok(match, 'a card offers Play LEFT n or Play RIGHT n, got '+label);
  return (match[1]==='LEFT' ? -1 : 1) * Number(match[2]);
}

function handButtons(host){
  const hand = host.querySelector('[aria-label="Your cards"]');
  assert.ok(hand, 'the hand is on screen');
  return [...hand.querySelectorAll('button')];
}

function handIds(host){
  return handButtons(host).map(button=>Number(button.getAttribute('data-card-id')));
}

function cardWidth(button){
  const width = button.ownerDocument.defaultView.getComputedStyle(button).width;
  assert.ok(width && width!=='auto' && width!=='0px', 'card width is computed, got '+width);
  return width;
}

function visualCard(button){
  const id = Number(button.getAttribute('data-card-id'));
  assert.equal(Number.isInteger(id), true);
  const value = valueFromLabel(accessibleName(button));
  assert.equal(signed(id), value);
  return {id, value};
}

async function mountLevel(levelId){
  await boot();
  const {prepareOnboardingJump} = await import('../src/casual/onboardingProgress.js');
  const {derivedFeatureUnlocks} = await import('../src/casual/featureIntroRegistry.js');
  page().localStorage.clear();
  prepareOnboardingJump(page().localStorage, levelId, {
    levelCount:ONBOARDING_COUNT,
    introUnlocks:derivedFeatureUnlocks()
  });
  const view = await mountGame();
  const intro = buttonNamed(view.host, 'PLAY');
  if(intro && accessibleName(intro).toLowerCase()==='play')await click(intro);
  const start = buttonNamed(view.host, 'START');
  if(start && accessibleName(start).toLowerCase()==='start')await click(start);
  return view;
}

function sixRound(){
  const base = newOnboardingRound(4);
  return {
    ...base,
    game:newOverswing({
      seed:42,
      deckOverride:SIX_CARD_DECK,
      initialHandSize:6
    })
  };
}

async function mountStoredRound(round){
  await boot();
  page().localStorage.clear();
  page().localStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify(round));
  return mountGame();
}

function lastCardL11(){
  const round = newOnboardingRound(11);
  round.turn = 1;
  round.game.deal.hand = [20];
  round.game.deal.pos = 3;
  round.game.deal.plays = 2;
  return round;
}

async function mountSixCardHand(round, onPlay, {pulse=false, showChances=false}={}){
  await boot();
  const {act, createElement, useRef} = await import('react');
  const {createRoot} = await import('react-dom/client');
  const {OnboardingPhone} = await import('../src/casual/OnboardingPhone.jsx');
  function Fixture(){
    const rootRef = useRef(null);
    const view = displayOf(round);
    const readout = boardReadout({round, view, animating:false, pulse});
    const level = {
      ...readout.level,
      visibleHandSlots:6,
      initialHandSize:6,
      showChances:showChances||readout.level.showChances
    };
    const screen = {
      round, view, shownGold:0, animating:false, introGate:false, docking:false,
      help:false, devMenuOpen:false, factorInfo:null, ack:null, beat:'',
      startOpen:false, arriving:false, feedback:null, successSettled:false
    };
    const noop = ()=>{};
    return createElement(OnboardingPhone, {
      screen,
      readout:{...readout, level, shownHand:round.game.deal.hand.slice()},
      ending:null, bankLive:'', reduced:false, fx:null, rootRef,
      introStartRef:{current:null}, levelReadyRef:{current:null},
      phoneClass:'sgv-phone sgv-onboarding',
      onPointerDownCapture:noop, onClickCapture:noop, onKeyDownCapture:noop,
      onPlay, onFactorInfo:noop, onReset:noop, onToggleDev:noop, onGotoLevel:noop,
      onToggleHelp:noop, onSkipGarden:noop, onDismissFactor:noop, onDismissIntro:noop,
      onDismissStart:noop, onEndPrimary:noop, onEndBackdrop:noop, onFinishPresentation:noop
    });
  }
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async()=>{root.render(createElement(Fixture));});
  return {
    host, round,
    async unmount(){
      await act(async()=>{root.unmount();});
      host.remove();
    }
  };
}

// happy-dom reports every box as 0×0. Give hand cards a stable x from their DOM order
// so the FLIP delta is the order change, which is what a real layout would measure.
function installHandLayout(win){
  const proto = win.HTMLElement.prototype;
  const orig = proto.getBoundingClientRect;
  proto.getBoundingClientRect = function(){
    const id = this.getAttribute?.('data-card-id');
    const hand = this.parentElement;
    if(id!=null && hand?.getAttribute?.('aria-label')==='Your cards'){
      const cards = [...hand.querySelectorAll('[data-card-id]')];
      const index = Math.max(0, cards.indexOf(this));
      const left = 12 + index * 70;
      return {
        x:left, y:400, left, top:400, right:left+60, bottom:480, width:60, height:80,
        toJSON(){return {left, top:400, width:60, height:80};}
      };
    }
    return orig.call(this);
  };
  return ()=>{proto.getBoundingClientRect = orig;};
}

async function holdClock(){
  const {gsap} = await import('gsap');
  gsap.ticker.lagSmoothing(0);
  gsap.ticker.sleep();
  const realNow = Date.now;
  let now = realNow();
  Date.now = ()=>now;
  gsap.ticker.tick();
  const queued = [];
  let nextId = 1;
  const prevRAF = globalThis.requestAnimationFrame;
  const prevCancel = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = fn=>{
    const id = nextId++;
    queued.push({id, fn});
    return id;
  };
  globalThis.cancelAnimationFrame = id=>{
    const index = queued.findIndex(item=>item.id===id);
    if(index>=0)queued.splice(index, 1);
  };
  return {
    gsap,
    advance(ms){
      const batch = queued.splice(0, queued.length);
      for(const item of batch)item.fn(now);
      now += ms;
      gsap.ticker.tick();
    },
    restore(){
      Date.now = realNow;
      globalThis.requestAnimationFrame = prevRAF;
      globalThis.cancelAnimationFrame = prevCancel;
      gsap.ticker.lagSmoothing(500, 33);
      gsap.globalTimeline.clear();
      gsap.ticker.wake();
    }
  };
}

function motionX(gsap, card){
  const raw = gsap.getProperty(card, 'x');
  const value = typeof raw==='number' ? raw : parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

after(async()=>{
  await closePage();
});

describe('hand presentation', {concurrency:false}, ()=>{
  test('tapping the visually first card plays that card on L1, L4, L11, and a six-card hand', async()=>{
    for(const levelId of [1, 4, 11]){
      const view = await mountLevel(levelId);
      try{
        if(levelId===4){
          const hand = view.host.querySelector('[aria-label="Your cards"]');
          const style = hand.ownerDocument.defaultView.getComputedStyle(hand);
          const groupMargin = style.getPropertyValue('--hs-group-margin').trim();
          const reserved = style.getPropertyValue('--hs-hand-group-extra').trim();
          assert.equal(groupMargin, '10px',
            'a 3-card hand uses the full centre gap, not the compact subtraction');
          assert.equal(reserved, '10px', 'the reserved width matches the full centre gap');
          const firstRed = handButtons(view.host).find(button=>accessibleName(button).startsWith('Play RIGHT'));
          assert.equal(hand.ownerDocument.defaultView.getComputedStyle(firstRed).marginLeft, '10px');
        }
        const first = handButtons(view.host)[0];
        const {id, value} = visualCard(first);
        const original = newOnboardingRound(levelId).game.deal.hand.slice();
        await click(first);
        const saved = JSON.parse(page().localStorage.getItem(ONBOARDING_SESSION_KEY));
        const expected = original.slice();
        expected.splice(original.indexOf(id), 1);
        assert.deepEqual(saved.game.deal.hand, expected, 'L'+levelId+' played the visible card');
        assert.equal(saved.game.deal.S, value, 'L'+levelId+' meter follows the label');
      }finally{
        await view.unmount();
      }
    }

    const round = sixRound();
    const played = {current:null};
    const view = await mountSixCardHand(round, action=>{
      const id = round.game.deal.hand[action.index];
      const next = stepOverswing(round.game, action, onboardingLevel(round.levelId).rules);
      played.current = {id, next, rejected:next===round.game};
    });
    try{
      const cards = handButtons(view.host);
      assert.equal(cards.length, 6);
      const {id, value} = visualCard(cards[0]);
      const original = round.game.deal.hand.slice();
      await click(cards[0]);
      assert.equal(played.current.rejected, false);
      assert.equal(played.current.id, id);
      assert.equal(signed(played.current.id), value);
      const expected = original.slice();
      expected.splice(original.indexOf(id), 1);
      assert.deepEqual(played.current.next.deal.hand, expected);
      assert.equal(played.current.next.deal.S, value);
    }finally{
      await view.unmount();
    }

    const inspect = sixRound();
    inspect.game.deal.S = -6;
    const hinted = await mountSixCardHand(inspect, ()=>{}, {pulse:true, showChances:true});
    try{
      const hint = idleHintAction(inspect);
      assert.equal(hint?.type, 'steer');
      const pulsed = handButtons(hinted.host).filter(button=>button.classList.contains('sgv-attention'));
      assert.equal(pulsed.length, 1);
      assert.equal(Number(pulsed[0].getAttribute('data-card-id')), inspect.game.deal.hand[hint.index]);
      const risky = handButtons(hinted.host)
        .filter(button=>button.classList.contains('sgv-card-risky'))
        .map(button=>Number(button.getAttribute('data-card-id')))
        .sort((a,b)=>a-b);
      const expectedRisky = inspect.game.deal.hand
        .filter((id, index)=>wouldSnap(inspect, {type:'steer', index}))
        .sort((a,b)=>a-b);
      assert.deepEqual(risky, expectedRisky);
    }finally{
      await hinted.unmount();
    }
  });

  test('remaining cards are sliding at 100ms while the played card is in the air, and reduced motion does not slide', async()=>{
    await boot();
    const clock = await holdClock();
    const restoreLayout = installHandLayout(page());
    try{
      setReduced(false);
      const view = await mountLevel(4);
      try{
        const first = handButtons(view.host)[0];
        await click(first);
        clock.advance(100);
        assert.ok(view.host.querySelector('.sgv-flying-card'), 'the played card is still in the air');
        const xs = handButtons(view.host).map(card=>motionX(clock.gsap, card));
        assert.ok(xs.length>=1);
        assert.ok(xs.some(x=>x!==0), 'a remaining card has moved, x='+xs.join(','));
      }finally{
        await view.unmount();
      }

      const round = lastCardL11();
      const refill = await mountStoredRound(round);
      try{
        const before = handButtons(refill.host);
        assert.equal(before.length, 1);
        const beforeWidth = cardWidth(before[0]);
        const oldIds = handIds(refill.host);
        await click(before[0]);
        clock.advance(100);
        assert.deepEqual(
          handIds(refill.host),
          oldIds.filter(id=>id!==oldIds[0]),
          'while the card is in the air the hand is the old hand minus the played card'
        );
        const skip = buttonNamed(refill.host, 'Skip animation');
        assert.ok(skip, 'the landing can be skipped');
        await click(skip);
        const afterIds = handIds(refill.host);
        assert.ok(afterIds.some(id=>signed(id)<0)&&afterIds.some(id=>signed(id)>0),
          'the refill brings both colours');
        assert.equal(cardWidth(handButtons(refill.host)[0]), beforeWidth,
          'card width stays constant across a refill');
      }finally{
        await refill.unmount();
      }

      setReduced(true);
      const reduced = await mountLevel(4);
      try{
        const first = handButtons(reduced.host)[0];
        await click(first);
        clock.advance(100);
        const xs = handButtons(reduced.host).map(card=>motionX(clock.gsap, card));
        assert.ok(xs.length>=1);
        assert.ok(xs.every(x=>x===0), 'reduced motion leaves the cards where they land, x='+xs.join(','));
      }finally{
        await reduced.unmount();
        setReduced(false);
      }
    }finally{
      restoreLayout();
      clock.restore();
    }
  });
});
