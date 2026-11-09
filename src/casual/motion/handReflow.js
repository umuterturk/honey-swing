import {gsap} from 'gsap';
import {reducedMotion} from './stage.js';

// FLIP the cards that are still in the hand. x only, starting the frame after
// the steer commits, in parallel with the flying card. A refill id was not on
// screen before, so it is not part of the slide.
function handCards(hand){
  return [...hand.querySelectorAll('[data-card-id]')];
}

function release(cards){
  for(const card of cards){
    gsap.set(card, {clearProps:'x,transform,transition'});
  }
}

// Read before React commits the hand. A sync render would already be the final
// layout if this ran from the motion that starts after the commit.
export function captureHandPositions(root){
  const before=new Map();
  const hand=root?.querySelector?.('.sgv-hand');
  if(!hand)return before;
  for(const card of handCards(hand)){
    before.set(card.getAttribute('data-card-id'), card.getBoundingClientRect().left);
  }
  return before;
}

export function animateHandReflow(root, before){
  const hand=root?.querySelector?.('.sgv-hand');
  if(!hand||!(before instanceof Map))return ()=>{};
  let frame=0;
  let tween=null;
  let movers=[];
  let done=false;
  const stop=()=>{
    if(done)return;
    done=true;
    if(frame){
      cancelAnimationFrame(frame);
      frame=0;
    }
    tween?.kill();
    tween=null;
    release(movers.length?movers:handCards(hand));
    movers=[];
  };
  if(reducedMotion())return stop;
  frame=requestAnimationFrame(()=>{
    frame=0;
    if(done)return;
    for(const card of handCards(hand)){
      const id=card.getAttribute('data-card-id');
      if(!before.has(id))continue;
      const dx=before.get(id)-card.getBoundingClientRect().left;
      if(!dx)continue;
      gsap.set(card, {transition:'none', x:dx});
      movers.push(card);
    }
    if(!movers.length)return;
    tween=gsap.to(movers, {
      x:0, duration:0.5, ease:'power2.out', delay:0,
      onComplete(){
        release(movers);
        movers=[];
        tween=null;
      }
    });
  });
  return stop;
}
