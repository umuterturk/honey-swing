// L3 swing teach. The engine still deals both cards (hand stays 2).
// The session hides −5 until +3 is committed. The view waits for that
// play's presentation to settle, then brings −5 in. The spotlight is the
// −5 crossing only, including a retry, and never a later level.
import {gsap} from 'gsap';
import {cardMotionMarks, FACTOR_FLYER_FLIGHT} from './motionSchedule.js';
import {meterPercent} from './meterScale.js';
import {reducedMotion} from './motion/stage.js';
import {isSkipKey} from './skipFocus.js';

export const SWING_TEACH_LEVEL=3;
export const SWING_TEACH_OPENING=2;
export const SWING_TEACH_FOLLOW=24;
export const TEACH_ENTER=Object.freeze({duration:0.25, ease:'power2.out', fromX:36});
export const TEACH_DIM='rgba(20,12,8,0.40)';
export const TEACH_ARROW_FILL='#FFF0CF';
export const TEACH_ARROW_STROKE='#3A1A00';
// The arrow sits above the rail so its tip meets the top edge and the 0
// numeral, centered in the track, stays uncovered.
export const TEACH_ARROW_TOP='-22px';
export const TEACH_ARROW_HEIGHT='22px';
export const TEACH_CAPTION='Cross Center for more flowers.';
const ARROW_D='M18 20 L4 8 H12 L18 2 L24 8 H32 Z';
const BLINK_EASE='power1.inOut';
const FADE_EASE='power1.out';

function swingReward(rewards){
  return (rewards||[]).some(reward=>reward?.kind==='swing');
}

export function swingTeachConcealed(round){
  if(!round||round.levelId!==SWING_TEACH_LEVEL)return false;
  const hand=round.game?.deal?.hand;
  if(!Array.isArray(hand))return false;
  return hand.includes(SWING_TEACH_OPENING)&&hand.includes(SWING_TEACH_FOLLOW);
}

export function visibleHandIds(round, hand){
  const ids=Array.isArray(hand)?hand:[];
  if(!swingTeachConcealed(round))return ids.slice();
  return ids.filter(id=>id!==SWING_TEACH_FOLLOW);
}

export function filterTeachActions(round, actions){
  if(!swingTeachConcealed(round))return actions;
  const hand=round.game.deal.hand;
  return actions.filter(action=>action.type!=='steer'||hand[action.index]!==SWING_TEACH_FOLLOW);
}

export function teachFollowRevealed(before, after){
  return swingTeachConcealed(before)&&!swingTeachConcealed(after)&&
    !!after?.game?.deal?.hand?.includes(SWING_TEACH_FOLLOW);
}

export function teachDismissesCrossAck(levelId, outcome){
  return levelId===SWING_TEACH_LEVEL&&outcome==='cross';
}

// Matrix clock. The needle keeps the fast floor glide. The stretch sits on
// the More Flower pill pulse, starting when that pill appears. A tap halves
// the remaining time to unlock, dropping the post-blink hold before it
// shortens that pulse.
// GSAP power4.out / power2.out are the needle eases (quint / cubic).
const CARD_MS=420;
const CROSS_MS=8000;
const FLYER_MS=950;
const BLINKS_MS=800;
const FADE_MS=200;
const TAIL_MS=FLYER_MS+BLINKS_MS+FADE_MS;
const HOLD_MS=12000-CROSS_MS-TAIL_MS;
const FLOOR_CROSS_MS=473;
const FLOOR_WINDOW_MS=147;
const FLOOR_UNLOCK_MS=2423;
const MIN_BLINK_MS=FLYER_MS+BLINKS_MS;
const SLOW_BLINK_MS=MIN_BLINK_MS+(CROSS_MS-FLOOR_CROSS_MS)-2000;
const PILL_BLINKS=2;
const PILL_SCALE=1.12;
const EASE_TO_ZERO=gsap.parseEase('power4.out');
const EASE_PAST_ZERO=gsap.parseEase('power2.out');
const EASE_BLINK=gsap.parseEase(BLINK_EASE);

function syncTeach(state){
  state.park=state.cross+state.window;
  state.fadeAt=state.cross+state.blink+state.hold;
  state.unlock=state.fadeAt+FADE_MS;
}

function freshTeachState(from, to){
  const state={
    t:0, from, to, phase:'flight', u:0, v:0, needle:from,
    cross:FLOOR_CROSS_MS, window:FLOOR_WINDOW_MS,
    blink:SLOW_BLINK_MS, hold:HOLD_MS, park:0, fadeAt:0, unlock:0
  };
  syncTeach(state);
  return state;
}

// Playback through the More Flower flight. Speed starts high, is slowest
// at the middle, then recovers. The integral is normalized so 0 and 1 map.
const PILL_DRAG=0.82;
function slowedProgress(u){
  const k=PILL_DRAG;
  const norm=1-(2*k)/Math.PI;
  return (u+(k/Math.PI)*Math.cos(Math.PI*u)-k/Math.PI)/norm;
}

function pillMotion(state){
  const start=state.cross;
  if(state.t<start||state.blink<=0)return null;
  const u=Math.max(0, Math.min(1, (state.t-start)/state.blink));
  return slowedProgress(u);
}

// Two pulses across the stretched blink, in the same slowed time. Ends at rest.
function pillScaleFor(progress){
  if(progress==null)return null;
  const halves=PILL_BLINKS*2;
  const x=progress*halves;
  const i=Math.min(halves-1, Math.floor(x>=halves?halves-1:x));
  const local=Math.min(1, x-i);
  const eased=EASE_BLINK(local);
  const up=i%2===0;
  return 1+(PILL_SCALE-1)*(up?eased:1-eased);
}

function placeNeedle(state){
  if(state.phase==='flight'||(state.phase==='crawl'&&state.u<=0))state.needle=state.from;
  else if(state.phase==='crawl')state.needle=state.from+(0-state.from)*EASE_TO_ZERO(state.u);
  else state.needle=(state.to-0)*EASE_PAST_ZERO(state.v);
}

function stepTeach(state, seconds){
  let left=Math.max(0, Number(seconds)*1000);
  while(left>1e-4){
    if(state.phase==='flight'){
      const remain=CARD_MS-state.t;
      if(left<remain){state.t+=left;break;}
      left-=remain;
      state.t=CARD_MS;
      state.phase='crawl';
      state.u=0;
    }else if(state.phase==='crawl'){
      const span=state.cross-state.t;
      if(span<=0){
        state.t=state.cross;state.u=1;state.phase='window';state.v=0;continue;
      }
      const take=Math.min(left, span);
      state.u+=(1-state.u)*(take/span);
      left-=take;
      if(take>=span){state.t=state.cross;state.u=1;state.phase='window';state.v=0;}
      else state.t+=take;
    }else if(state.phase==='window'){
      const span=state.park-state.t;
      if(span<=1e-6){state.v=1;state.phase='hold';state.t=state.park;continue;}
      const take=Math.min(left, span);
      state.v+=(1-state.v)*(take/span);
      left-=take;
      if(take>=span-1e-6){state.t=state.park;state.v=1;state.phase='hold';}
      else state.t+=take;
    }else{
      state.t+=left;
      left=0;
    }
  }
  placeNeedle(state);
}

function tapTeach(state){
  if(state.t>=state.fadeAt)return;
  let target=state.t+(state.unlock-state.t)/2;
  if(target<FLOOR_UNLOCK_MS)target=FLOOR_UNLOCK_MS;
  const blinkStart=state.cross;
  const minBlinkEnd=blinkStart+MIN_BLINK_MS;
  let fadeAt=target-FADE_MS;
  if(fadeAt<minBlinkEnd)fadeAt=minBlinkEnd;
  const blinkEnd=blinkStart+state.blink;
  if(fadeAt>=blinkEnd){
    state.hold=fadeAt-blinkEnd;
  }else{
    state.hold=0;
    const end=Math.max(minBlinkEnd, fadeAt, state.t);
    state.blink=Math.max(MIN_BLINK_MS, end-blinkStart);
  }
  syncTeach(state);
}

function teachSeconds(ms){
  return ms/1000;
}

export function createTeachClock({from=3, to=-2}={}){
  const state=freshTeachState(from, to);
  return {
    get t(){return teachSeconds(state.t);},
    get needle(){return state.needle;},
    get cross(){return teachSeconds(state.cross);},
    get window(){return teachSeconds(state.window);},
    get park(){return teachSeconds(state.park);},
    get unlock(){return teachSeconds(state.unlock);},
    get fadeAt(){return teachSeconds(state.fadeAt);},
    get flyerEnd(){return teachSeconds(state.cross+FLYER_MS);},
    get blinksEnd(){return teachSeconds(state.cross+state.blink);},
    step(seconds){stepTeach(state, seconds);return this;},
    tap(){tapTeach(state);return this;}
  };
}

export function swingSpotlightPlan({
  levelId, type='steer', snap=false, rewards=[], from, to, reduced=false
}={}){
  if(levelId!==SWING_TEACH_LEVEL||snap||!swingReward(rewards))return null;
  const marks=cardMotionMarks({type, snap:false, rewards, from, to, levelId, teach:true});
  if(marks.swingFlyer==null)return null;
  const dim={color:TEACH_DIM};
  const arrow={
    fill:TEACH_ARROW_FILL, stroke:TEACH_ARROW_STROKE,
    button:false, coversNumeral:false
  };
  if(reduced){
    return {
      reduced:true,
      dim:{...dim, at:0, duration:0.12},
      arrow:{...arrow, parked:true, travel:false},
      pill:{shown:true, blinks:0},
      flyer:true,
      caption:{text:TEACH_CAPTION, immediate:true},
      lock:0,
      fade:null,
      needle:{start:marks.meterStart, end:marks.meterEnd}
    };
  }
  const idle=createTeachClock({from, to});
  return {
    reduced:false,
    cross:idle.cross,
    window:idle.window,
    // Dim and caption fade in when the needle hits 0. Card flight stays undimmed.
    dim:{...dim, at:idle.cross, duration:0.15},
    needle:{
      start:CARD_MS/1000, cross:idle.cross, end:idle.park,
      toZero:'power4.out', past:'power2.out'
    },
    arrow:{...arrow, from:idle.cross, to:idle.park, parked:true, travel:true},
    flyer:{at:idle.cross, duration:FACTOR_FLYER_FLIGHT},
    pill:{at:idle.cross, blinks:2, blink:0.4, scale:1.12},
    caption:{text:TEACH_CAPTION, at:idle.cross, duration:0.15},
    fade:{at:idle.fadeAt, duration:FADE_MS/1000},
    lock:idle.unlock
  };
}

export function playReleaseTime(end, plan){
  if(!plan||plan.reduced||!Number.isFinite(plan.lock))return end;
  return Math.max(end, plan.lock);
}

function arrowNode(doc){
  const svg=doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 36 22');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('sgv-swing-teach-arrow');
  svg.style.top=TEACH_ARROW_TOP;
  svg.style.height=TEACH_ARROW_HEIGHT;
  const path=doc.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ARROW_D);
  path.setAttribute('fill', TEACH_ARROW_FILL);
  path.setAttribute('stroke', TEACH_ARROW_STROKE);
  path.setAttribute('stroke-width', '1.75');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  return svg;
}

function captionNode(doc, immediate){
  const caption=doc.createElement('p');
  caption.className='sgv-swing-teach-caption';
  caption.setAttribute('role', 'status');
  caption.textContent=TEACH_CAPTION;
  if(!immediate)caption.setAttribute('aria-hidden', 'true');
  caption.style.opacity=immediate?'1':'0';
  return caption;
}

export function mountSwingSpotlight({
  root, plan, from, to, limit=8, onCross, onPill, onPark, onUnlock
}={}){
  if(!root||!plan)return ()=>{};
  const doc=root.ownerDocument;
  const dim=doc.createElement('div');
  dim.className='sgv-swing-teach-dim';
  dim.setAttribute('data-swing-teach', 'dim');
  dim.style.background=plan.dim.color;
  dim.style.opacity='0';
  root.appendChild(dim);
  root.setAttribute('data-swing-teach', '1');
  const section=root.querySelector('.sgv-meter-section')||root;
  const meter=section.querySelector?.('.sgv-meter')||section;
  const caption=captionNode(doc, !!plan.reduced);
  meter.appendChild(caption);
  const rail=root.querySelector('.sgv-meter-marker-rail');
  const arrow=arrowNode(doc);
  arrow.style.left=meterPercent(0, limit)+'%';
  (rail||root).appendChild(arrow);
  const tweens=[];
  let gone=false;
  const cancel=()=>{
    if(gone)return;
    gone=true;
    doc.removeEventListener('pointerdown', onPointer, true);
    doc.removeEventListener('keydown', onKey, true);
    for(const tween of tweens)tween.kill();
    dim.remove();
    arrow.remove();
    caption.remove();
    root.removeAttribute('data-swing-teach-cross');
    root.removeAttribute('data-swing-teach-unlock');
    if(root.getAttribute('data-swing-teach')==='1')root.removeAttribute('data-swing-teach');
    const pill=root.querySelector('[data-factor="swing"]');
    if(pill)gsap.set(pill, {clearProps:'scale'});
    const marker=root.querySelector('.sgv-meter-marker');
    if(marker){
      marker.style.left=meterPercent(to, limit)+'%';
      gsap.set(marker, {clearProps:'transform'});
    }
  };
  if(plan.reduced){
    gsap.set(arrow, {xPercent:-50, x:0, opacity:1});
    gsap.set(caption, {opacity:1});
    tweens.push(gsap.to(dim, {opacity:1, duration:plan.dim.duration, ease:FADE_EASE}));
    return cancel;
  }
  const state=freshTeachState(from, to);
  let crossed=false, pilled=false, parked=false, fading=false, unlocked=false;
  let flower=null;
  let landed=false;
  const publish=()=>{
    root.setAttribute('data-swing-teach-cross', (state.cross/1000).toFixed(3));
    root.setAttribute('data-swing-teach-unlock', (state.unlock/1000).toFixed(3));
  };
  const paint=()=>{
    const marker=root.querySelector('.sgv-meter-marker');
    const scale=root.querySelector('.sgv-meter-marker-rail');
    if(marker){
      const width=scale?.getBoundingClientRect?.().width||0;
      const x=width*(meterPercent(state.needle, limit)-meterPercent(from, limit))/100;
      gsap.set(marker, {x, xPercent:-50, yPercent:-50});
      const value=marker.querySelector('.sgv-meter-needle-value');
      if(value)value.setAttribute('data-live', String(Math.abs(Math.round(state.needle))));
    }
    gsap.set(arrow, {xPercent:-50, x:0});
    const progress=pillMotion(state);
    if(flower?.seek&&progress!=null)landed=!!flower.seek(progress);
    const pulse=pillScaleFor(progress);
    const pill=root.querySelector('[data-factor="swing"]');
    if(pill&&pulse!=null)gsap.set(pill, {scale:pulse});
  };
  const thresholds=()=>{
    if(gone)return;
    if(!crossed&&state.t>=state.cross){
      crossed=true;
      caption.removeAttribute('aria-hidden');
      tweens.push(gsap.to([dim, caption], {opacity:1, duration:0.15, ease:FADE_EASE}));
      tweens.push(gsap.to(arrow, {opacity:1, duration:0.01, ease:'none'}));
      flower=onCross?.()||null;
    }
    if(!pilled&&(landed||(!flower?.seek&&state.t>=state.cross+FLYER_MS))){
      pilled=true;
      onPill?.();
    }
    if(!parked&&state.t>=state.park-1e-6){
      parked=true;
      onPark?.();
    }
    if(!fading&&state.t>=state.fadeAt-1e-6){
      fading=true;
      tweens.push(gsap.to([dim, arrow, caption], {opacity:0, duration:0.2, ease:FADE_EASE}));
    }
    if(!unlocked&&state.t>=state.unlock-1e-6){
      unlocked=true;
      onUnlock?.();
    }
  };
  const accelerate=()=>{
    if(gone)return;
    tapTeach(state);
    publish();
    paint();
    thresholds();
  };
  function onPointer(event){
    if(gone||(event.button!=null&&event.button!==0))return;
    if(!root.contains(event.target))return;
    accelerate();
  }
  function onKey(event){
    if(gone||!isSkipKey(event.key)||!root.contains(event.target))return;
    accelerate();
  }
  gsap.set(arrow, {xPercent:-50, x:0, opacity:0});
  publish();
  paint();
  doc.addEventListener('pointerdown', onPointer, true);
  doc.addEventListener('keydown', onKey, true);
  let last=0;
  const driver=gsap.to({p:0}, {
    p:1, duration:state.unlock/1000, ease:'none',
    onUpdate(){
      if(gone)return;
      const now=driver.time();
      const dt=now-last;
      last=now;
      if(dt>0)stepTeach(state, dt);
      paint();
      thresholds();
    }
  });
  tweens.push(driver);
  return cancel;
}

export function animateTeachEnter(root, cardId=SWING_TEACH_FOLLOW){
  const card=root?.querySelector?.('[data-card-id="'+cardId+'"]');
  if(!card)return ()=>{};
  if(reducedMotion()){
    gsap.set(card, {clearProps:'opacity,x,transform'});
    return ()=>{};
  }
  const tween=gsap.fromTo(card, {opacity:0, x:TEACH_ENTER.fromX}, {
    opacity:1, x:0, duration:TEACH_ENTER.duration, ease:TEACH_ENTER.ease,
    onComplete(){gsap.set(card, {clearProps:'opacity,x,transform'});}
  });
  return ()=>{
    tween.kill();
    gsap.set(card, {clearProps:'opacity,x,transform'});
  };
}
