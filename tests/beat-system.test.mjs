import {advanceVirtual, restoreVirtual} from './helpers/virtual-time.mjs';
import test, {after, beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {signed} from '../src/external/engines.js';
import {ONBOARDING_COUNT, newOnboardingRound, stepOnboarding, wouldSnap} from '../src/casual/onboardingLevels.js';
import {FIRST_SESSION_KEY, ONBOARDING_SESSION_KEY} from '../src/casual/onboardingProgress.js';
import {
  accessibleName, boot, buttonNamed, click, closePage, mountGame, page, setReduced
} from './helpers/mount.mjs';

function handButtons(host){
  const hand=host.querySelector('[aria-label="Your cards"]');
  assert.ok(hand, 'the hand is on screen');
  return [...hand.querySelectorAll('button')];
}

function suggestion(host){
  return [...host.querySelectorAll('p')].find(node=>
    (node.textContent||'').replace(/\s+/g, ' ').trim().startsWith('Tap a card.')
  )||null;
}

function handIcon(host){
  return [...host.querySelectorAll('[role="img"]')].find(node=>
    accessibleName(node).toLowerCase()==='hand'
  )||null;
}

function scaled(node){
  if(!node)return false;
  const value=node.ownerDocument.defaultView.getComputedStyle(node).transform||'';
  if(!value||value==='none')return false;
  const scaleFn=value.match(/scale\(([^)]+)\)/);
  if(scaleFn){
    return scaleFn[1].split(',').some(part=>{
      const n=Number(part.trim());
      return Number.isFinite(n)&&Math.abs(n-1)>0.02;
    });
  }
  const matrix=value.match(/matrix\(([^)]+)\)/);
  if(!matrix)return false;
  const parts=matrix[1].split(',').map(part=>Number(part.trim()));
  if(parts.length<4)return false;
  const sx=Math.hypot(parts[0], parts[1]);
  const sy=Math.hypot(parts[2], parts[3]);
  return Math.abs(sx-1)>0.02||Math.abs(sy-1)>0.02;
}

function subtreeScaled(node){
  if(!node)return false;
  if(scaled(node))return true;
  return [...node.querySelectorAll('*')].some(scaled);
}

function landingPopped(meter, rest){
  if(!meter)return false;
  const needle=meter.querySelector('strong')?.parentElement;
  const changed=node=>{
    if(!node||!rest.has(node))return scaled(node);
    const now=node.ownerDocument.defaultView.getComputedStyle(node).transform;
    return now!==rest.get(node)&&scaled(node);
  };
  return changed(meter)||changed(needle);
}

function restTransforms(meter){
  const rest=new Map();
  if(!meter)return rest;
  const read=node=>rest.set(node, node.ownerDocument.defaultView.getComputedStyle(node).transform);
  read(meter);
  const needle=meter.querySelector('strong')?.parentElement;
  if(needle)read(needle);
  return rest;
}

function shades(root){
  return [...root.querySelectorAll('div')].filter(node=>{
    if(node.getAttribute('aria-hidden')!=='true')return false;
    const style=node.ownerDocument.defaultView.getComputedStyle(node);
    return style.position==='absolute'&&style.pointerEvents==='none'&&
      style.top==='0px'&&style.left==='0px'&&style.right==='0px'&&style.bottom==='0px';
  }).length;
}

function phoneOf(host){
  return host.querySelector('[aria-busy]');
}

async function dismissOpening(host){
  const intro=buttonNamed(host, 'PLAY');
  if(intro&&accessibleName(intro).toLowerCase()==='play')await click(intro);
  const start=buttonNamed(host, 'START');
  if(start&&accessibleName(start).toLowerCase()==='start')await click(start);
}

async function mountFresh(){
  await boot();
  page().localStorage.clear();
  const view=await mountGame();
  await dismissOpening(view.host);
  return view;
}

function holdClock(){
  return import('gsap').then(async({gsap})=>{
    const {act}=await import('react');
    gsap.ticker.lagSmoothing(0);
    gsap.ticker.sleep();
    gsap.ticker.tick();
    return {
      gsap,
      async advance(ms){
        advanceVirtual(ms);
        await act(async()=>{gsap.ticker.tick();});
      },
      restore(){
        gsap.globalTimeline.clear();
      }
    };
  });
}

function cellsBeat(host){
  return handButtons(host).some(subtreeScaled);
}

async function untilSettled(host, clock){
  let guard=0;
  while(phoneOf(host)?.getAttribute('aria-busy')==='true'&&guard<80){
    await clock.advance(50);
    guard+=1;
  }
}

beforeEach(()=>{
  setReduced(false);
});

after(async()=>{
  setReduced(false);
  restoreVirtual();
  await closePage();
});

test('a new player on Level 1 sees the heartbeat and Tap a card, and any card still plays', async()=>{
  const clock=await holdClock();
  const view=await mountFresh();
  try{
    assert.ok(suggestion(view.host), 'move 1 offers Tap a card.');
    assert.equal(handIcon(view.host), null, 'the hand waits until the player has paused');
    const cards=handButtons(view.host);
    assert.ok(cards.length>1);
    assert.ok(cards.every(card=>card.disabled===false), 'every card stays tappable');
    let sawBeat=false;
    let sawHand=false;
    for(let step=0;step<80;step++){
      await clock.advance(100);
      if(cellsBeat(view.host))sawBeat=true;
      if(handIcon(view.host))sawHand=true;
    }
    assert.equal(sawBeat, true, 'the hand cells heartbeat while the player waits');
    assert.equal(sawHand, true, 'a hand icon appears after the player waits without tapping');
    assert.ok(suggestion(view.host), 'the suggestion stays until a tap');
    const choice=cards[cards.length-1];
    const chosen=Number(choice.getAttribute('data-card-id'));
    const before=cards.map(card=>Number(card.getAttribute('data-card-id')));
    await click(choice);
    assert.equal(suggestion(view.host), null, 'the suggestion leaves when any card is tapped');
    assert.equal(handIcon(view.host), null, 'the hand leaves when any card is tapped');
    const saved=JSON.parse(page().localStorage.getItem(ONBOARDING_SESSION_KEY));
    assert.equal(saved.turn, 1);
    assert.equal(saved.game.deal.hand.includes(chosen), false);
    assert.deepEqual(
      saved.game.deal.hand,
      before.filter(id=>id!==chosen)
    );
    assert.equal(saved.game.deal.S, signed(chosen));
  }finally{
    await view.unmount();
    clock.restore();
  }
});

test('move 2 keeps the beat without copy, and move 3 shows no help', async()=>{
  const clock=await holdClock();
  const view=await mountFresh();
  try{
    await click(handButtons(view.host)[0]);
    await untilSettled(view.host, clock);
    assert.equal(suggestion(view.host), null, 'move 2 has no Tap a card copy');
    assert.equal(handIcon(view.host), null, 'move 2 has no hand icon');
    let sawBeat=false;
    for(let step=0;step<20;step++){
      await clock.advance(100);
      if(cellsBeat(view.host))sawBeat=true;
    }
    assert.equal(sawBeat, true, 'move 2 still heartbeats the remaining cards');
    await click(handButtons(view.host)[0]);
    await untilSettled(view.host, clock);
    assert.equal(suggestion(view.host), null, 'move 3 has no copy');
    assert.equal(handIcon(view.host), null, 'move 3 has no hand');
    let movedOnMove3=false;
    for(let step=0;step<20;step++){
      await clock.advance(100);
      if(cellsBeat(view.host))movedOnMove3=true;
    }
    assert.equal(movedOnMove3, false, 'move 3 does not heartbeat');
  }finally{
    await view.unmount();
    clock.restore();
  }
});

test('closing before move 2 commits shows the first-session help again', async()=>{
  const clock=await holdClock();
  const first=await mountFresh();
  await first.unmount();
  const again=await mountGame();
  try{
    await dismissOpening(again.host);
    assert.ok(suggestion(again.host), 'leaving before any commit shows Tap a card again');
  }finally{
    await again.unmount();
  }
  const played=await mountFresh();
  try{
    await click(handButtons(played.host)[0]);
  }finally{
    await played.unmount();
    clock.restore();
  }
  const resumed=await mountGame();
  try{
    assert.equal(suggestion(resumed.host), null, 'move 2 does not repeat the copy');
    const clock2=await holdClock();
    try{
      let sawBeat=false;
      for(let step=0;step<20;step++){
        await clock2.advance(100);
        if(cellsBeat(resumed.host))sawBeat=true;
      }
      assert.equal(sawBeat, true, 'the heartbeat returns when move 2 was never committed');
    }finally{
      clock2.restore();
    }
  }finally{
    await resumed.unmount();
  }
});

test('after move 2 commits, a reload or a fresh Level 1 shows no heartbeat or onboarding', async()=>{
  const clock=await holdClock();
  const view=await mountFresh();
  try{
    await click(handButtons(view.host)[0]);
    await untilSettled(view.host, clock);
    await click(handButtons(view.host)[0]);
    await untilSettled(view.host, clock);
  }finally{
    await view.unmount();
    clock.restore();
  }
  const reloaded=await mountGame();
  const clock2=await holdClock();
  try{
    assert.equal(suggestion(reloaded.host), null);
    let sawBeat=false;
    for(let step=0;step<20;step++){
      await clock2.advance(100);
      if(cellsBeat(reloaded.host))sawBeat=true;
    }
    assert.equal(sawBeat, false, 'a reload after move 2 does not heartbeat');
  }finally{
    await reloaded.unmount();
    clock2.restore();
  }
  page().localStorage.removeItem(ONBOARDING_SESSION_KEY);
  const retry=await mountGame();
  const clock3=await holdClock();
  try{
    await dismissOpening(retry.host);
    assert.equal(suggestion(retry.host), null, 'a fresh Level 1 deal does not onboard again');
    let sawBeat=false;
    for(let step=0;step<20;step++){
      await clock3.advance(100);
      if(cellsBeat(retry.host))sawBeat=true;
    }
    assert.equal(sawBeat, false, 'a Level 1 retry does not heartbeat');
  }finally{
    await retry.unmount();
    clock3.restore();
  }
});

test('a damaged first-session note does not hide the Level 1 hint', async()=>{
  await boot();
  page().localStorage.clear();
  page().localStorage.setItem(FIRST_SESSION_KEY, '{');
  const view=await mountGame();
  try{
    await dismissOpening(view.host);
    assert.ok(suggestion(view.host), 'an unreadable note still shows Tap a card.');
  }finally{
    await view.unmount();
  }
});

test('a tap during flight finishes the earlier move and plays the new one', async()=>{
  const clock=await holdClock();
  const view=await mountFresh();
  try{
    const before=handButtons(view.host).map(card=>Number(card.getAttribute('data-card-id')));
    await click(handButtons(view.host)[0]);
    assert.equal(phoneOf(view.host).getAttribute('aria-busy'), 'true');
    const second=handButtons(view.host)[0];
    const secondId=Number(second.getAttribute('data-card-id'));
    await click(second);
    const saved=JSON.parse(page().localStorage.getItem(ONBOARDING_SESSION_KEY));
    assert.equal(saved.turn, 2, 'both taps committed');
    assert.equal(saved.game.deal.plays, 2, 'neither move was duplicated');
    assert.equal(saved.game.deal.hand.length, before.length-2);
    const played=before.filter(id=>!saved.game.deal.hand.includes(id));
    assert.equal(played.length, 2);
    assert.ok(played.includes(secondId));
    assert.equal(saved.game.deal.S, played.reduce((sum, id)=>sum+signed(id), 0));
  }finally{
    await view.unmount();
    clock.restore();
  }
});

test('a snap never gets the landing pop, and the first landing does', async()=>{
  const clock=await holdClock();
  const view=await mountFresh();
  let ordinaryPopped=false;
  try{
    const phone=phoneOf(view.host);
    await click(handButtons(view.host)[0]);
    const meter=phone.querySelector('[aria-label^="Swing at"]');
    const rest=restTransforms(meter);
    let guard=0;
    while(phone.getAttribute('aria-busy')==='true'&&guard<80){
      if(landingPopped(meter, rest))ordinaryPopped=true;
      await clock.advance(40);
      guard+=1;
    }
  }finally{
    await view.unmount();
    clock.restore();
  }
  assert.equal(ordinaryPopped, true, 'an ordinary landing pops the meter');

  const round=stepTowardSnap(newOnboardingRound(18));
  await boot();
  page().localStorage.clear();
  page().localStorage.setItem(ONBOARDING_SESSION_KEY, JSON.stringify(round));
  const snapView=await mountGame();
  const snapClock=await holdClock();
  try{
    const phone=phoneOf(snapView.host);
    const card=handButtons(snapView.host).find(button=>{
      const id=Number(button.getAttribute('data-card-id'));
      const index=round.game.deal.hand.indexOf(id);
      return index>=0&&wouldSnap(round, {type:'steer', index});
    });
    assert.ok(card, 'a card that would snap is on the table');
    await click(card);
    const meter=phone.querySelector('[aria-label^="Swing at"]');
    const rest=restTransforms(meter);
    let popped=false;
    let steps=0;
    while(phone.getAttribute('aria-busy')==='true'&&steps<80){
      if(landingPopped(meter, rest))popped=true;
      await snapClock.advance(40);
      steps+=1;
    }
    assert.equal(popped, false, 'a snap does not play the landing pop');
  }finally{
    await snapView.unmount();
    snapClock.restore();
  }
});

function stepTowardSnap(round){
  let current=round;
  for(let n=0;n<8;n++){
    const ready=(current.game?.deal?.hand||[]).some((id, index)=>
      wouldSnap(current, {type:'steer', index})
    );
    if(ready)return current;
    const index=current.game.deal.hand.findIndex((id, i)=>!wouldSnap(current, {type:'steer', index:i}));
    if(index<0)break;
    const next=stepOnboarding(current, {type:'steer', index});
    if(next===current)break;
    current=next;
  }
  return current;
}

test('the landing shade shows for a new player and not after the first session or on the L3 −5 teach', async()=>{
  const clock=await holdClock();
  const view=await mountFresh();
  let firstShade=false;
  try{
    const phone=phoneOf(view.host);
    const before=shades(phone);
    await click(handButtons(view.host)[0]);
    let steps=0;
    while(phone.getAttribute('aria-busy')==='true'&&steps<80){
      if(shades(phone)>before)firstShade=true;
      await clock.advance(40);
      steps+=1;
    }
  }finally{
    await view.unmount();
    clock.restore();
  }
  assert.equal(firstShade, true, 'the first landing shades the board');

  const clock2=await holdClock();
  const again=await mountFresh();
  try{
    await click(handButtons(again.host)[0]);
    await untilSettled(again.host, clock2);
    await click(handButtons(again.host)[0]);
    await untilSettled(again.host, clock2);
  }finally{
    await again.unmount();
    clock2.restore();
  }
  page().localStorage.removeItem(ONBOARDING_SESSION_KEY);
  const later=await mountGame();
  const clock3=await holdClock();
  try{
    await dismissOpening(later.host);
    const phone=phoneOf(later.host);
    const before=shades(phone);
    await click(handButtons(later.host)[0]);
    let grew=false;
    let steps=0;
    while(phone.getAttribute('aria-busy')==='true'&&steps<80){
      if(shades(phone)>before)grew=true;
      await clock3.advance(40);
      steps+=1;
    }
    assert.equal(grew, false, 'a later Level 1 does not shade the landing');
  }finally{
    await later.unmount();
    clock3.restore();
  }

  await boot();
  const {prepareOnboardingJump}=await import('../src/casual/onboardingProgress.js');
  const {derivedFeatureUnlocks}=await import('../src/casual/featureIntroRegistry.js');
  page().localStorage.clear();
  prepareOnboardingJump(page().localStorage, 3, {
    levelCount:ONBOARDING_COUNT, introUnlocks:derivedFeatureUnlocks()
  });
  const teach=await mountGame();
  const clock4=await holdClock();
  try{
    await dismissOpening(teach.host);
    const phone=phoneOf(teach.host);
    await click(handButtons(teach.host)[0]);
    const skip=buttonNamed(teach.host, 'Skip animation');
    assert.ok(skip);
    await click(skip);
    const follow=handButtons(teach.host)[0];
    await click(follow);
    const during=shades(phone);
    let extra=false;
    let steps=0;
    while(phone.getAttribute('aria-busy')==='true'&&steps<40){
      if(shades(phone)>during)extra=true;
      await clock4.advance(40);
      steps+=1;
    }
    assert.equal(extra, false, 'the L3 −5 teach does not add a landing shade');
    const teachCaption=[...phone.querySelectorAll('[role="status"]')].some(node=>
      (node.textContent||'').includes('Cross Center')
    );
    assert.equal(
      phone.getAttribute('aria-busy')==='true'||teachCaption,
      true,
      'the −5 teach stays on screen'
    );
  }finally{
    await teach.unmount();
    clock4.restore();
  }
});

function handTop(host){
  const hand=host.querySelector('[aria-label="Your cards"]');
  assert.ok(hand, 'the hand is on screen');
  return hand.getBoundingClientRect().top;
}

function tapStatus(host){
  return [...host.querySelectorAll('[role="status"]')].find(node=>
    (node.textContent||'').replace(/\s+/g, ' ').includes('Tap a card.')
  )||null;
}

async function shadeOnNextCard(host, clock){
  const phone=phoneOf(host);
  const before=shades(phone);
  await click(handButtons(host)[0]);
  let grew=false;
  let steps=0;
  while(phone.getAttribute('aria-busy')==='true'&&steps<80){
    if(shades(phone)>before)grew=true;
    await clock.advance(40);
    steps+=1;
  }
  return grew;
}

test('a Level 1 restart after move 1 still shades the first card, and one after move 2 does not', async()=>{
  const clock=await holdClock();
  const view=await mountFresh();
  try{
    await click(handButtons(view.host)[0]);
    await untilSettled(view.host, clock);
  }finally{
    await view.unmount();
    clock.restore();
  }
  page().localStorage.removeItem(ONBOARDING_SESSION_KEY);
  const retry=await mountGame();
  const retryClock=await holdClock();
  try{
    await dismissOpening(retry.host);
    assert.ok(suggestion(retry.host), 'coaching is still open after a move-1 restart');
    assert.equal(
      await shadeOnNextCard(retry.host, retryClock),
      true,
      'the retry\'s first card still shades the landing'
    );
    await click(handButtons(retry.host)[0]);
    await untilSettled(retry.host, retryClock);
  }finally{
    await retry.unmount();
    retryClock.restore();
  }
  page().localStorage.removeItem(ONBOARDING_SESSION_KEY);
  const later=await mountGame();
  const laterClock=await holdClock();
  try{
    await dismissOpening(later.host);
    assert.equal(suggestion(later.host), null, 'move 2 already finished coaching');
    assert.equal(
      await shadeOnNextCard(later.host, laterClock),
      false,
      'a Level 1 retry after move 2 does not shade the landing'
    );
  }finally{
    await later.unmount();
    laterClock.restore();
  }
});

test('the tap hint is a status and does not move the cards', async()=>{
  const clock=await holdClock();
  const view=await mountFresh();
  try{
    const cue=tapStatus(view.host);
    assert.ok(cue, 'Tap a card. is a status');
    assert.equal(
      cue.ownerDocument.defaultView.getComputedStyle(cue).position,
      'absolute',
      'the hint sits out of the hand\'s flow'
    );
    const before=handTop(view.host);
    let sawHand=false;
    for(let step=0;step<80&&!sawHand;step++){
      await clock.advance(100);
      if(handIcon(view.host))sawHand=true;
    }
    assert.equal(sawHand, true, 'the hand icon still arrives');
    assert.equal(handTop(view.host), before, 'the icon does not move the cards');
    assert.ok(tapStatus(view.host), 'the status stays while the icon is up');
    await click(handButtons(view.host)[0]);
    assert.equal(tapStatus(view.host), null, 'the status leaves on the tap');
    assert.equal(handTop(view.host), before, 'removing the hint does not move the cards');
  }finally{
    await view.unmount();
    clock.restore();
  }
});

test('reduced motion keeps the hint without moving the cards', async()=>{
  setReduced(true);
  const clock=await holdClock();
  const view=await mountFresh();
  try{
    assert.ok(suggestion(view.host), 'reduced motion still says Tap a card.');
    assert.ok(handButtons(view.host).every(card=>card.disabled===false));
    let sawMove=false;
    for(let step=0;step<30;step++){
      await clock.advance(100);
      if(cellsBeat(view.host))sawMove=true;
    }
    assert.equal(sawMove, false, 'reduced motion does not scale the cards');
    assert.ok(suggestion(view.host), 'the hint is still there');
  }finally{
    await view.unmount();
    clock.restore();
    setReduced(false);
  }
});
