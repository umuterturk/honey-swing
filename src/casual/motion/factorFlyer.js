import {gsap} from 'gsap';
import {factorByKind} from '../factors.js';
import {FACTOR_FLYER_FLIGHT} from '../motionSchedule.js';
import {publicUrl} from '../publicUrl.js';
import {point,reducedMotion,removeNodes} from './stage.js';

function makeFactorFlyer(kind){
  const factor=factorByKind(kind);
  if(!factor?.flyer||!factor.icon)return null;
  const spec={copy:factor.flyer,src:publicUrl(factor.icon),alt:'',flight:FACTOR_FLYER_FLIGHT};
  const node=document.createElement('span');
  node.className='sgv-factor-flyer sgv-factor-flyer-'+kind;
  node.setAttribute('aria-hidden','true');
  const img=document.createElement('img');
  img.src=spec.src;img.alt=spec.alt;img.draggable=false;
  const label=document.createElement('span');
  label.textContent=spec.copy;
  node.append(img,label);
  return node;
}
function placeStaticFactor(root,kind,origin){
  const node=makeFactorFlyer(kind);
  if(!node)return null;
  node.classList.add('sgv-static-outcome');
  Object.assign(node.style,{
    left:origin.x+'px',top:origin.y+'px',
    transform:'translate(-50%,-50%)'
  });
  root.appendChild(node);
  return node;
}

export function flyFactorLabels({root,plan,bounce=true,hold=false}){
  if(!root||!plan?.length||reducedMotion())return ()=>{};
  const nodes=[],tweens=[],driven=[];
  const centeredPoint=(flyer,origin)=>{
    const halfW=(flyer.offsetWidth||0)/2;
    const halfH=(flyer.offsetHeight||0)/2;
    const pad=4;
    return {
      x:Math.max(halfW+pad,Math.min(root.clientWidth-halfW-pad,origin.x)),
      y:Math.max(halfH+pad,Math.min(root.clientHeight-halfH-pad,origin.y))
    };
  };
  for(const {kind,start,origin} of plan){
    const target=root.querySelector('[data-factor="'+kind+'"]');
    const flyer=makeFactorFlyer(kind);
    if(!target||!flyer||!origin)continue;
    Object.assign(flyer.style,{
      left:origin.x+'px',top:origin.y+'px',opacity:'0'
    });
    root.appendChild(flyer);nodes.push(flyer);
    const startPoint=centeredPoint(flyer,origin);
    const end=centeredPoint(flyer,point(target,root));
    Object.assign(flyer.style,{
      left:startPoint.x+'px',top:startPoint.y+'px'
    });
    const flight=FACTOR_FLYER_FLIGHT;
    const appear=0.18;
    const fade=0.16;
    const travel=Math.max(0.40,flight-appear-fade);
    const landAt=start+appear+travel;
    const tl=gsap.timeline({
      paused:hold,
      onComplete:hold?undefined:()=>flyer.remove()
    });
    tl.fromTo(flyer,{opacity:0,scale:.7,xPercent:-50,yPercent:-50},
      {opacity:1,scale:1.18,duration:appear,ease:'back.out(1.8)'},start);
    tl.to(flyer,{
      x:end.x-startPoint.x,y:end.y-startPoint.y,scale:1,
      duration:travel,ease:hold?'none':'power2.inOut'
    },start+appear);
    tl.to(flyer,{opacity:0,scale:.55,duration:fade,ease:'power1.in'},start+appear+travel);
    if(hold)driven.push({tl,flyer,landAt});
    tl.call(()=>{
      if(!bounce)return;
      const pulse=gsap.fromTo(target,{scale:.82},
        {scale:1,duration:.34,ease:'back.out(2.4)'});
      tweens.push(pulse);
    },[],start+appear+travel);
    tweens.push(tl);
  }
  let dead=false;
  const cancel=()=>{
    if(dead)return;
    dead=true;
    for(const t of tweens)t.kill?.();
    removeNodes(nodes);
    for(const {kind} of plan){
      const pill=root.querySelector('[data-factor="'+kind+'"]');
      if(pill)gsap.set(pill,{clearProps:'scale'});
    }
  };
  // Held flights stay paused so the teach can scrub them. progress 0–1
  // is their own timeline; landed is the moment the label reaches the pill.
  cancel.seek=hold?(progress)=>{
    if(dead)return true;
    const p=Math.max(0, Math.min(1, progress));
    let arrived=driven.length>0;
    for(const row of driven){
      row.tl.time(row.tl.duration()*p);
      if(row.tl.time()<row.landAt-1e-3)arrived=false;
      if(p>=1)row.flyer.remove();
    }
    return arrived;
  }:null;
  return cancel;
}

export {makeFactorFlyer,placeStaticFactor};
