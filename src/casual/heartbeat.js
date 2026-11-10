import {gsap} from 'gsap';
import {BEAT} from './beatTune.js';

function faceOf(card){return card?.querySelector?.('.sgv-card-face')||null;}
function glowOf(card){return card?.querySelector?.('.sgv-card-glow')||null;}

export function restCell(card){
  if(!card)return;
  const face=faceOf(card);
  const glow=glowOf(card);
  if(face){gsap.killTweensOf(face);gsap.set(face,{scale:BEAT.restScale});}
  if(glow){gsap.killTweensOf(glow);gsap.set(glow,{opacity:BEAT.glowRest});}
  if(card.style)card.style.outline='';
}

export function stopCellBeat(root){
  if(!root)return;
  const cards=[...root.querySelectorAll('.sgv-hand [data-card-id]')];
  for(const card of cards)restCell(card);
}

// Scale lives on the face, inside the button, so the tap target stays put.
// The amber wash is an opacity layer under the numeral.
export function startCellBeat({root,reduced=false,hintId=null}={}){
  if(!root)return ()=>{};
  stopCellBeat(root);
  root.style.setProperty('--sgv-beat-glow',BEAT.glow);
  const cards=[...root.querySelectorAll('.sgv-hand [data-card-id]')];
  const timelines=[];
  cards.forEach((card,index)=>{
    const face=faceOf(card);
    const glow=glowOf(card);
    if(!face||!glow)return;
    const hint=hintId!=null&&String(card.getAttribute('data-card-id'))===String(hintId);
    if(reduced){
      gsap.set(face,{scale:BEAT.restScale});
      gsap.set(glow,{opacity:BEAT.reducedGlow});
      if(hint)card.style.outline=BEAT.reducedOutline;
      return;
    }
    const lub=hint?BEAT.hintGlowLub:BEAT.glowLub;
    const dub=hint?BEAT.hintGlowDub:BEAT.glowDub;
    const tl=gsap.timeline({repeat:-1,delay:index*BEAT.stagger});
    tl.to(face,{scale:BEAT.lubScale,duration:BEAT.pulse,ease:'sine.out'},0);
    tl.to(glow,{opacity:lub,duration:BEAT.pulse,ease:'sine.out'},0);
    tl.to(face,{scale:BEAT.restScale,duration:BEAT.pulse,ease:'sine.in'},BEAT.pulse);
    tl.to(glow,{opacity:BEAT.glowRest,duration:BEAT.pulse,ease:'sine.in'},BEAT.pulse);
    tl.to(face,{scale:BEAT.dubScale,duration:BEAT.pulse,ease:'sine.out'},BEAT.dubAt);
    tl.to(glow,{opacity:dub,duration:BEAT.pulse,ease:'sine.out'},BEAT.dubAt);
    const dubEnd=BEAT.dubAt+BEAT.pulse;
    tl.to(face,{scale:BEAT.restScale,duration:BEAT.pulse,ease:'sine.in'},dubEnd);
    tl.to(glow,{opacity:BEAT.glowRest,duration:BEAT.pulse,ease:'sine.in'},dubEnd);
    const restAt=dubEnd+BEAT.pulse;
    if(BEAT.period>restAt)tl.to({},{duration:BEAT.period-restAt},restAt);
    timelines.push(tl);
  });
  return ()=>{
    for(const tl of timelines)tl.kill();
    stopCellBeat(root);
  };
}
