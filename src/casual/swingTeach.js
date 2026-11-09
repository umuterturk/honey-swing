// L3 swing teach. The engine still deals both cards (hand stays 2).
// The session hides −5 until +3 is committed. The view waits for that
// play's presentation to settle, then brings −5 in. The spotlight is the
// −5 crossing only, including a retry, and never a later level.
import {gsap} from 'gsap';
import {cardMotionMarks, FACTOR_FLYER_FLIGHT} from './motionSchedule.js';
import {meterPercent} from './meterScale.js';
import {reducedMotion} from './motion/stage.js';

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

export function swingSpotlightPlan({
  levelId, type='steer', snap=false, rewards=[], from, to, reduced=false
}={}){
  if(levelId!==SWING_TEACH_LEVEL||snap||!swingReward(rewards))return null;
  const marks=cardMotionMarks({type, snap:false, rewards, from, to});
  const cross=marks.swingFlyer;
  if(cross==null)return null;
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
      lock:0,
      fade:null,
      needle:{start:marks.meterStart, end:marks.meterEnd}
    };
  }
  const blink=0.4;
  const blinks=2;
  const fadeAt=Math.round((marks.factors+blink*blinks)*1000)/1000;
  const fadeDur=0.2;
  return {
    reduced:false,
    cross,
    // Fade length is 0.15s. It starts at the 0.473s zero-cross, not at 0.15s,
    // and the card flight before that cross stays undimmed.
    dim:{...dim, at:cross, duration:0.15},
    needle:{start:marks.meterStart, end:marks.meterEnd},
    arrow:{...arrow, from:cross, to:marks.meterEnd, parked:true, travel:true},
    flyer:{at:cross, duration:FACTOR_FLYER_FLIGHT},
    pill:{at:marks.factors, blinks, blink, scale:1.12},
    fade:{at:fadeAt, duration:fadeDur},
    lock:Math.round((fadeAt+fadeDur)*1000)/1000
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

export function mountSwingSpotlight({root, plan, from, to, limit=8}={}){
  if(!root||!plan)return ()=>{};
  const doc=root.ownerDocument;
  const dim=doc.createElement('div');
  dim.className='sgv-swing-teach-dim';
  dim.setAttribute('data-swing-teach', 'dim');
  dim.style.background=plan.dim.color;
  dim.style.opacity='0';
  root.appendChild(dim);
  root.setAttribute('data-swing-teach', '1');
  const rail=root.querySelector('.sgv-meter-marker-rail');
  const arrow=arrowNode(doc);
  arrow.style.left=meterPercent(0, limit)+'%';
  (rail||root).appendChild(arrow);
  const tweens=[];
  let gone=false;
  const cancel=()=>{
    if(gone)return;
    gone=true;
    for(const tween of tweens)tween.kill();
    dim.remove();
    arrow.remove();
    if(root.getAttribute('data-swing-teach')==='1')root.removeAttribute('data-swing-teach');
    const pill=root.querySelector('[data-factor="swing"]');
    if(pill)gsap.set(pill, {clearProps:'scale'});
  };
  if(plan.reduced){
    gsap.set(arrow, {xPercent:-50, x:0, opacity:1});
    tweens.push(gsap.to(dim, {opacity:1, duration:plan.dim.duration, ease:FADE_EASE}));
    return cancel;
  }
  const at=needleAt(from, to, plan.needle.start, plan.needle.end, plan.cross);
  const width=rail?.getBoundingClientRect?.().width||0;
  const dx=width*((meterPercent(at, limit)-meterPercent(0, limit))/100);
  gsap.set(arrow, {xPercent:-50, x:dx, opacity:0});
  tweens.push(gsap.to(dim, {
    opacity:1, duration:plan.dim.duration, delay:plan.dim.at, ease:FADE_EASE
  }));
  tweens.push(gsap.to(arrow, {opacity:1, duration:0.01, delay:plan.arrow.from, ease:'none'}));
  tweens.push(gsap.to(arrow, {
    x:0, xPercent:-50,
    duration:Math.max(0.001, plan.arrow.to-plan.arrow.from),
    delay:plan.arrow.from, ease:'power2.out'
  }));
  const pill=root.querySelector('[data-factor="swing"]');
  if(pill&&plan.pill.blinks){
    tweens.push(gsap.fromTo(pill, {scale:1}, {
      scale:plan.pill.scale, duration:plan.pill.blink/2, yoyo:true,
      repeat:plan.pill.blinks*2-1, delay:plan.pill.at, ease:BLINK_EASE
    }));
  }
  tweens.push(gsap.to([dim, arrow], {
    opacity:0, duration:plan.fade.duration, delay:plan.fade.at, ease:FADE_EASE
  }));
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
