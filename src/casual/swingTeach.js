// L3 swing teach. The engine still deals both cards (hand stays 2).
// The session hides −5 until +3 is committed. The view waits for that
// play's presentation to settle, then brings −5 in. The spotlight is the
// −5 crossing only, including a retry, and never a later level.
import {gsap} from 'gsap';
import {FACTORS} from './factors.js';
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
export const TEACH_CAPTION=FACTORS.find(factor=>factor.kind==='swing').copy;
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

function power2Out(t){
  return 1-(1-t)*(1-t);
}

export function needleAt(from, to, start, end, time){
  if(!(end>start))return to;
  const p=Math.max(0, Math.min(1, (time-start)/(end-start)));
  return from+(to-from)*power2Out(p);
}

// Matrix clock. Overlays stay wall-clock. A tap halves the remaining time to
// unlock, dropping the post-blink hold before it slides the 0-cross earlier.
// GSAP power4.out / power2.out are the needle eases (quint / cubic).
const CARD_MS=420;
const CROSS_MS=8000;
const WINDOW_MS=1500;
const FLYER_MS=950;
const BLINKS_MS=800;
const FADE_MS=200;
const TAIL_MS=FLYER_MS+BLINKS_MS+FADE_MS;
const AFTER_CROSS_MS=FLYER_MS+BLINKS_MS;
const HOLD_MS=12000-CROSS_MS-TAIL_MS;
const FLOOR_CROSS_MS=473;
const FLOOR_WINDOW_MS=147;
const FLOOR_UNLOCK_MS=2423;
const EASE_TO_ZERO=gsap.parseEase('power4.out');
const EASE_PAST_ZERO=gsap.parseEase('power2.out');

function windowMs(crossMs){
  const p=Math.max(0, Math.min(1, (CROSS_MS-crossMs)/(CROSS_MS-FLOOR_CROSS_MS)));
  return WINDOW_MS+(FLOOR_WINDOW_MS-WINDOW_MS)*p;
}

function syncTeach(state){
  state.park=state.cross+state.window;
  state.fadeAt=state.cross+AFTER_CROSS_MS+state.hold;
  state.unlock=state.fadeAt+FADE_MS;
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
  if(state.phase==='flight'||state.phase==='crawl'){
    const minCross=Math.max(FLOOR_CROSS_MS, state.phase==='crawl'?state.t:FLOOR_CROSS_MS);
    if(target>=state.cross+TAIL_MS){
      state.hold=target-(state.cross+TAIL_MS);
      syncTeach(state);
    }else{
      state.hold=0;
      let cross=target-TAIL_MS;
      if(cross<minCross)cross=minCross;
      if(cross>state.cross)cross=state.cross;
      state.cross=cross;
      state.window=windowMs(cross);
      syncTeach(state);
      if(state.phase==='crawl'&&state.cross<=state.t){
        state.cross=state.t;
        state.u=1;
        state.phase='window';
        state.v=0;
        state.needle=0;
        state.window=windowMs(state.cross);
        syncTeach(state);
      }
    }
    return;
  }
  const blinksEnd=state.cross+AFTER_CROSS_MS;
  const earliest=Math.max(blinksEnd, state.t)+FADE_MS;
  if(target<earliest)target=earliest;
  state.hold=Math.max(0, (target-FADE_MS)-blinksEnd);
  syncTeach(state);
  if(state.phase==='window'&&state.t<state.park){
    const remain=state.park-state.t;
    state.park=state.t+remain/2;
    state.window=state.park-state.cross;
  }
}

function teachSeconds(ms){
  return ms/1000;
}

export function createTeachClock({from=3, to=-2}={}){
  const state={
    t:0, from, to, phase:'flight', u:0, v:0, needle:from,
    cross:CROSS_MS, window:WINDOW_MS, hold:HOLD_MS, park:0, fadeAt:0, unlock:0
  };
  syncTeach(state);
  return {
    get t(){return teachSeconds(state.t);},
    get needle(){return state.needle;},
    get cross(){return teachSeconds(state.cross);},
    get window(){return teachSeconds(state.window);},
    get park(){return teachSeconds(state.park);},
    get unlock(){return teachSeconds(state.unlock);},
    get fadeAt(){return teachSeconds(state.fadeAt);},
    get flyerEnd(){return teachSeconds(state.cross+FLYER_MS);},
    get blinksEnd(){return teachSeconds(state.cross+AFTER_CROSS_MS);},
    step(seconds){stepTeach(state, seconds);return this;},
    tap(){tapTeach(state);return this;}
  };
}

export function swingSpotlightPlan({
  levelId, type='steer', snap=false, rewards=[], from, to, reduced=false
}={}){
  if(levelId!==SWING_TEACH_LEVEL||snap||!swingReward(rewards))return null;
  const marks=cardMotionMarks({type, snap:false, rewards, from, to});
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
    pill:{at:idle.flyerEnd, blinks:2, blink:0.4, scale:1.12},
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
  const state={
    t:0, from, to, phase:'flight', u:0, v:0, needle:from,
    cross:CROSS_MS, window:WINDOW_MS, hold:HOLD_MS, park:0, fadeAt:0, unlock:0
  };
  syncTeach(state);
  let crossed=false, pilled=false, parked=false, fading=false, unlocked=false;
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
  };
  const thresholds=()=>{
    if(gone)return;
    if(!crossed&&state.t>=state.cross){
      crossed=true;
      caption.removeAttribute('aria-hidden');
      tweens.push(gsap.to([dim, caption], {opacity:1, duration:0.15, ease:FADE_EASE}));
      tweens.push(gsap.to(arrow, {opacity:1, duration:0.01, ease:'none'}));
      onCross?.();
    }
    if(!pilled&&state.t>=state.cross+FLYER_MS){
      pilled=true;
      onPill?.();
      const pill=root.querySelector('[data-factor="swing"]');
      if(pill){
        tweens.push(gsap.fromTo(pill, {scale:1}, {
          scale:1.12, duration:0.2, yoyo:true, repeat:3, ease:BLINK_EASE
        }));
      }
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
    p:1, duration:12, ease:'none',
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
