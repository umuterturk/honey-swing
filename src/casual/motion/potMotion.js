import {gsap} from 'gsap';
import {mountPotEquationFlyer} from './potEquation.js';
import {
  appendPourStreamAtHoneyDepth,honeySurfacePoint,paintJarFill,point,pourStreamPath,
  reducedMotion,removeNodes,tapSpoutPoint
} from './stage.js';

/**
 * Fracture the at-risk Pot on either hazard. SNAP adds sharp red fractures and
 * drains pending fluid in the separate loss effect; ZERO BREAK produces a quick
 * cool-colored crack that heals, leaving the fluid and secured Bank untouched.
 */
export function animatePotBreak(root,kind='snap'){
  if(!root||reducedMotion())return ()=>{};
  const glass=root.querySelector('.sgv-pot-bottle-glass');
  if(!glass)return ()=>{};
  const svgNS='http://www.w3.org/2000/svg',doc=glass.ownerDocument;
  const crack=doc.createElementNS(svgNS,'svg');
  crack.setAttribute('viewBox','0 0 100 100');
  crack.setAttribute('aria-hidden','true');
  crack.classList.add('sgv-pot-fracture',kind==='snap'?'sgv-pot-fracture-snap':'sgv-pot-fracture-zero');
  const fractures=[
    'M 50 0 L 44 19 L 58 37 L 43 56 L 52 74 L 42 100',
    'M 58 37 L 76 29 L 88 38',
    'M 43 56 L 27 49 L 16 63',
    'M 52 74 L 70 81 L 78 98'
  ];
  for(const d of fractures){
    const line=doc.createElementNS(svgNS,'path');
    line.setAttribute('d',d);
    line.setAttribute('fill','none');
    line.setAttribute('stroke-linecap','round');
    line.setAttribute('stroke-linejoin','round');
    crack.appendChild(line);
  }
  glass.appendChild(crack);
  let alive=true;
  const tl=gsap.timeline({onComplete:()=>{
    alive=false;crack.remove();gsap.set(glass,{clearProps:'x,rotation'});
  }});
  tl.fromTo(crack,{opacity:0,scale:.88},{opacity:1,scale:1,duration:.12,ease:'power2.out'},0);
  tl.fromTo(glass,{x:-3,rotation:-2},{
    x:3,rotation:2,duration:.065,repeat:3,yoyo:true,ease:'sine.inOut'
  },0);
  tl.to(crack,{opacity:0,duration:kind==='snap'?.24:.28},kind==='snap'?.42:.25);
  tl.call(()=>{},[],kind==='snap'?.70:.58);
  return ()=>{
    if(!alive)return;
    alive=false;tl.kill();crack.remove();
    gsap.set(glass,{clearProps:'x,rotation'});
  };
}

/**
 * A Snap destroys only the unbanked Pot. Short falling coins make the
 * loss visible without changing any engine value or touching the chest.
 */
export function animateSnapLoss(root,lostPot){
  if(!root||!lostPot||reducedMotion())return ()=>{};
  const tray=root.querySelector('.sgv-pending-pot');
  if(!tray)return ()=>{};
  const origin=point(tray,root),coins=[],tweens=[];
  const count=Math.min(7,Math.max(3,Math.ceil(lostPot/2)));
  for(let i=0;i<count;i++){
    const coin=document.createElement('span');
    coin.className='sgv-fluid-drop sgv-lost-drop';
    coin.setAttribute('aria-hidden','true');
    Object.assign(coin.style,{left:origin.x+'px',top:origin.y+'px'});
    root.appendChild(coin);coins.push(coin);
    const dx=(i-(count-1)/2)*18;
    const tw=gsap.fromTo(coin,{scale:1,opacity:.95,x:0,y:0},
      {scale:.57,opacity:0,x:dx,y:54+(i%3)*12,rotation:dx*2,
       duration:.42,delay:i*.035,ease:'power2.in',
       onComplete:()=>coin.remove()});
    tweens.push(tw);
  }
  return ()=>{
    for(const tw of tweens)tw.kill();
    removeNodes(coins);
  };
}

export function animateFactorReset(root){
  if(!root||reducedMotion())return ()=>{};
  const targets=Array.from(root.querySelectorAll('.sgv-multiplier-pill'));
  const tw=gsap.fromTo(targets,{y:0,filter:'saturate(1)'},
    {y:4,filter:'saturate(.55)',duration:.14,yoyo:true,repeat:1,
      onComplete:()=>gsap.set(targets,{clearProps:'y,filter'})});
  return ()=>{tw.kill();gsap.set(targets,{clearProps:'y,filter'});};
}

// After the needle settles: stream honey from the meter tap into the Pot meniscus.
export function animateTapPour({
  root,fromPot=0,toPot=0,fillTarget,added=0,pourFly=null,onPourProgress,onComplete
}){
  const settle=()=>{
    onPourProgress?.(toPot);
    onComplete?.();
  };
  if(!root||reducedMotion()||!(toPot>fromPot)){
    settle();
    return ()=>{};
  }
  const tap=root.querySelector('.sgv-honey-tap');
  const pot=root.querySelector('.sgv-pending-pot');
  const lip=pot?.querySelector?.('.sgv-pot-pour-lip')||pot?.querySelector?.('.sgv-pot-art-mouth');
  if(!tap||!pot){
    settle();
    return ()=>{};
  }
  let alive=true;
  const nodes=[],tweens=[];
  const cleanup=()=>{
    for(const tween of tweens)tween.kill?.();
    removeNodes(nodes);
  };
  const tl=gsap.timeline({onComplete:()=>{
    if(!alive)return;
    alive=false;
    onPourProgress?.(toPot);
    cleanup();
    onComplete?.();
  }});
  let streamPaths=[],streamSplash=null,streamDrawn=false;
  const retargetStream=()=>{
    if(!streamDrawn||!alive)return;
    const start=tapSpoutPoint(root,tap);
    const end=honeySurfacePoint(root,pot,lip)||point(lip||pot,root);
    const d=pourStreamPath(start,end);
    for(const path of streamPaths)path.setAttribute('d',d);
    if(streamSplash)Object.assign(streamSplash.style,{left:end.x+'px',top:end.y+'px'});
  };
  tl.call(()=>{
    if(!alive)return;
    paintJarFill(pot,fromPot,fillTarget,{max:76,smooth:true});
    const start=tapSpoutPoint(root,tap);
    const end=honeySurfacePoint(root,pot,lip)||point(lip||pot,root);
    const doc=root.ownerDocument;
    const svg=appendPourStreamAtHoneyDepth(root,pot,doc);
    nodes.push(svg);
    const d=pourStreamPath(start,end);
    streamPaths=[];
    for(const [kind,width] of [['sgv-pour-stream-glow','9'],['sgv-pour-stream-core','4.5']]){
      const path=doc.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',d);
      path.setAttribute('class',kind);
      path.setAttribute('stroke-width',width);
      path.setAttribute('fill','none');
      path.setAttribute('stroke-linecap','round');
      svg.appendChild(path);
      streamPaths.push(path);
      const length=path.getTotalLength();
      gsap.set(path,{strokeDasharray:length,strokeDashoffset:length});
      tweens.push(gsap.to(path,{strokeDashoffset:0,duration:.14,ease:'power1.in'}));
    }
    tweens.push(gsap.to(svg,{opacity:0,duration:.18,delay:.58}));
    streamSplash=doc.createElement('span');
    streamSplash.className='sgv-pour-splash';
    streamSplash.setAttribute('aria-hidden','true');
    Object.assign(streamSplash.style,{left:end.x+'px',top:end.y+'px'});
    root.appendChild(streamSplash);nodes.push(streamSplash);
    tweens.push(gsap.fromTo(streamSplash,{opacity:0,scale:.55},
      {opacity:.95,scale:1,duration:.18,repeat:2,yoyo:true,delay:.10}));
    tweens.push(gsap.to(streamSplash,{opacity:0,duration:.16,delay:.55}));
    streamDrawn=true;
  },[],0);
  const transfer={value:0};
  tl.to(transfer,{value:1,duration:.58,ease:'power1.inOut',
    onUpdate:()=>{
      if(!alive)return;
      const potValue=fromPot+(toPot-fromPot)*transfer.value;
      // Label stays whole drops; fluid can ease through fractional height.
      onPourProgress?.(Math.round(potValue));
      paintJarFill(pot,potValue,fillTarget,{max:76,smooth:true});
      retargetStream();
    }},0.10);
  let pourEnd=.72;
  if(added>0){
    const phases=pourFly||{initial:'+'+added,collapse:null,rich:false};
    const plain='+'+added;
    const equation=!!phases.rich;
    if(equation)pourEnd=3.45;
    const doc=root.ownerDocument;
    const label=equation
      ?mountPotEquationFlyer(doc,phases.initial)
      :doc.createElement('span');
    if(!equation){
      label.className='sgv-pot-fly';
      label.textContent=phases.initial||plain;
      label.setAttribute('aria-hidden','true');
    }
    const end=honeySurfacePoint(root,pot,lip)||point(lip||pot,root);
    const flyX=equation?{xPercent:-50}:{};
    Object.assign(label.style,{left:end.x+'px',top:(end.y-8)+'px'});
    root.appendChild(label);nodes.push(label);
    const eqIn=.28;
    const eqCollapse=2.4;
    const eqFadeOut=1;
    const eqVisibleEnd=3.45;
    const eqFadeStart=eqVisibleEnd-eqFadeOut;
    tl.fromTo(label,{opacity:0,scale:equation?.82:.75,y:equation?4:6,...flyX},
      {opacity:1,scale:equation?1:1.08,y:equation?-6:-10,
        duration:equation?.16:.18,ease:equation?'power2.out':'back.out(1.6)',...flyX},eqIn);
    if(equation){
      const eqDriftStart=eqIn+.16;
      tl.to(label,{y:-36,duration:eqFadeStart-eqDriftStart,ease:'none',...flyX},eqDriftStart);
      tl.call(()=>{
        if(!alive)return;
        label.textContent=plain;
        label.classList.remove('sgv-pot-fly-equation');
      },[],eqCollapse);
      tl.to(label,{scale:1.06,duration:.1,ease:'back.out(1.5)'},eqCollapse);
      tl.to(label,{y:-52,duration:eqFadeOut,ease:'none',...flyX},eqFadeStart);
      tl.to(label,{opacity:0,duration:eqFadeOut,ease:'power1.in',...flyX},eqFadeStart);
    }else{
      tl.to(label,{opacity:0,y:-22,duration:.22,ease:'power2.in'},0.52);
    }
  }
  tl.call(()=>{},[],pourEnd);
  return ()=>{
    alive=false;tl.kill();cleanup();
  };
}

