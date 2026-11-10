import {gsap} from 'gsap';
import {bankPourAmounts,fluidFillPercent} from '../presentation.js';
import {showReducedBank} from './reducedOutcomes.js';
import {
  appendPourStreamAtHoneyDepth,clearStatic,honeySurfacePoint,point,pourStreamPath,reducedMotion,removeNodes
} from './stage.js';

// A normal Bank builds the lip-to-lip timeline. Reduced motion keeps the
// committed totals and a static +N at the Bank mouth instead of the stream.
export function chooseBankPour({
  reduced=false,hasRoot=false,hasSource=false,fromScore=0,toScore=0
}={}){
  const canScore=toScore>fromScore;
  return {
    timeline:!!(hasRoot&&hasSource&&!reduced&&canScore),
    static:!!(hasRoot&&reduced&&canScore)
  };
}

// Presentation-only choreography. Geometry is measured from real bottle lips:
// first bring the Pot mouth above the Bank mouth, then pour a short stream.
// Payouts and legal moves continue to come exclusively from the engine.
export function animateBankPour({
  root,source,potValue,fromScore,toScore,fillTarget,
  onPourProgress,onTake,onCount,onComplete
}){
  const settle=()=>{
    onPourProgress?.(0);
    onTake();
    onCount(toScore);
    onComplete();
  };
  const choice=chooseBankPour({
    reduced:reducedMotion(),hasRoot:!!root,hasSource:!!source,fromScore,toScore
  });
  clearStatic();
  if(!choice.timeline){
    settle();
    return choice.static?showReducedBank(root,fromScore,toScore):()=>{};
  }
  const bank=root.querySelector('.sgv-chest-body');
  const mouth=root.querySelector('.sgv-chest-mouth');
  const lip=source.querySelector('.sgv-pot-pour-lip');
  if(!bank||!mouth||!lip){
    settle();return ()=>{};
  }

  // Measure the *rotated* source lip without showing that rotation.
  // Pot sits right of Bank, so tip left into the Bank's right rim.
  const bankPoint=point(mouth,root);
  const bankRect=bank.getBoundingClientRect();
  const angle=-56;
  gsap.set(source,{rotation:angle,transformOrigin:'50% 72%'});
  const rotatedLip=point(lip,root);
  gsap.set(source,{rotation:0});
  const targetLip={
    x:bankPoint.x+Math.min(40,bankRect.width*.20),
    y:bankPoint.y-Math.min(27,bankRect.height*.20)
  };
  const approach={x:targetLip.x-rotatedLip.x,y:targetLip.y-rotatedLip.y};

  let alive=true,glowTween;
  const nodes=[],tweens=[];
  const cleanup=()=>{
    for(const tween of tweens)tween.kill?.();
    removeNodes(nodes);
    gsap.set(source,{clearProps:'x,y,rotation,transformOrigin'});
    gsap.set(bank,{clearProps:'scale'});
    const glow=root.querySelector('.sgv-chest-glow');
    if(glow)gsap.set(glow,{clearProps:'scale,opacity'});
  };
  const tl=gsap.timeline({onComplete:()=>{
    if(!alive)return;
    alive=false;
    onPourProgress?.(0);
    onTake();
    onCount(toScore);
    cleanup();
    onComplete();
  }});

  // 1. Lift toward the receiving mouth, then tip left into pouring position.
  tl.to(source,{x:approach.x*.48,y:approach.y*.82,rotation:-24,
    duration:.26,ease:'power2.out'},0);
  tl.to(source,{x:approach.x,y:approach.y,rotation:angle,
    duration:.27,ease:'power2.inOut'},.23);

  // 2. Draw a SHORT connecting stream from the arrived lip to the honey surface.
  // The end point tracks the rising meniscus while the jar fills.
  let streamPaths=[],streamSplash=null,streamDrawn=false;
  const paintBankFill=secured=>{
    const fillEl=bank.querySelector('.sgv-fluid-fill');
    if(!fillEl||!Number.isFinite(fillTarget)||fillTarget<=0)return;
    const pct=fluidFillPercent(secured,fillTarget,{max:78});
    fillEl.style.height=pct+'%';
    fillEl.style.opacity=pct>0?'1':'0';
  };
  const retargetStream=()=>{
    if(!streamDrawn||!alive)return;
    const start=point(lip,root);
    const end=honeySurfacePoint(root,bank,mouth)||point(mouth,root);
    const d=pourStreamPath(start,end);
    for(const path of streamPaths)path.setAttribute('d',d);
    if(streamSplash)Object.assign(streamSplash.style,{left:end.x+'px',top:end.y+'px'});
  };
  tl.call(()=>{
    if(!alive)return;
    paintBankFill(fromScore);
    const start=point(lip,root);
    const end=honeySurfacePoint(root,bank,mouth)||point(mouth,root);
    const doc=root.ownerDocument;
    // Same honey-depth mount as tap→Pot so the stream sits under Savings text / front glass.
    const svg=appendPourStreamAtHoneyDepth(root,bank,doc);
    nodes.push(svg);
    const d=pourStreamPath(start,end);
    streamPaths=[];
    for(const [kind,width] of [['sgv-pour-stream-glow','18'],['sgv-pour-stream-core','9']]){
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
      tweens.push(gsap.to(path,{strokeDashoffset:0,duration:.15,ease:'power1.in'}));
    }
    tweens.push(gsap.to(svg,{opacity:0,duration:.20,delay:.88}));
    streamSplash=doc.createElement('span');
    streamSplash.className='sgv-pour-splash';
    streamSplash.setAttribute('aria-hidden','true');
    Object.assign(streamSplash.style,{left:end.x+'px',top:end.y+'px'});
    root.appendChild(streamSplash);nodes.push(streamSplash);
    tweens.push(gsap.fromTo(streamSplash,{opacity:0,scale:.55},
      {opacity:.95,scale:1,duration:.22,repeat:2,yoyo:true,delay:.12}));
    tweens.push(gsap.to(streamSplash,{opacity:0,duration:.18,delay:.83}));
    streamDrawn=true;
  },[],.51);

  // 3. A single progress value drives BOTH liquid volumes, starting as the
  // stream reaches the jar. The Pot starts draining immediately, not at the end.
  const transfer={value:0},gain=toScore-fromScore,initialPot=Math.max(0,potValue||0);
  tl.to(transfer,{value:1,duration:.83,ease:'power1.inOut',
    onUpdate:()=>{
      if(!alive)return;
      const {pot,secured}=bankPourAmounts(initialPot,fromScore,toScore,transfer.value);
      onPourProgress?.(pot);
      onCount(secured);
      paintBankFill(secured);
      retargetStream();
    }},.63);

  // 4. Small earned-value acknowledgement near the surface, never a giant popup.
  const earned=root.ownerDocument.createElement('span');
  earned.className='sgv-bank-score-fly';
  earned.textContent='+'+gain;
  earned.setAttribute('aria-hidden','true');
  Object.assign(earned.style,{left:bankPoint.x+'px',top:(bankPoint.y+20)+'px'});
  root.appendChild(earned);nodes.push(earned);
  tl.fromTo(earned,{opacity:0,scale:.8,y:5},
    {opacity:1,scale:1.06,y:-9,duration:.21,ease:'back.out(1.7)'},.96);
  tl.to(earned,{opacity:0,y:-23,duration:.26,ease:'power2.in'},1.25);

  const glow=root.querySelector('.sgv-chest-glow');
  if(glow){
    glowTween=gsap.fromTo(glow,{opacity:.25,scale:.96},
      {opacity:.66,scale:1.05,duration:.25,repeat:1,yoyo:true,paused:true});
    tweens.push(glowTween);
  }
  tl.call(()=>{
    if(!alive)return;
    glowTween?.play();
    tweens.push(gsap.fromTo(bank,{scale:.99},
      {scale:1,duration:.26,ease:'back.out(1.5)'}));
  },[],.85);

  // The bottle settles only after the transferred fluid has drained.
  tl.to(source,{x:0,y:0,rotation:0,duration:.34,ease:'power2.inOut'},1.50);
  tl.call(()=>{},[],1.88);
  return ()=>{
    alive=false;tl.kill();cleanup();
  };
}

// After a winning Bank pour: heartbeat + shine on the Bank, then hand off to victory.
export function animateBankTargetCelebrate({root,onComplete}){
  const bank=root?.querySelector?.('.sgv-bank-bottle');
  const art=bank?.querySelector?.('.sgv-victory-jar-art')||bank;
  const label=bank?.querySelector?.('.sgv-bank-label');
  const front=bank?.querySelector?.('.sgv-jar-front');
  const gleam=bank?.querySelector?.('.sgv-honey-gleam-sweep');
  let alive=true;
  const clear=()=>{
    if(art)gsap.set(art,{clearProps:'scale,filter'});
    if(label)gsap.set(label,{clearProps:'scale'});
    if(front)gsap.set(front,{clearProps:'filter,opacity'});
    if(gleam)gsap.set(gleam,{clearProps:'opacity,transform,x'});
    bank?.classList.remove('sgv-bank-target-hit');
  };
  const finish=()=>{
    if(!alive)return;
    alive=false;
    clear();
    onComplete?.();
  };
  if(!root||!bank){
    finish();
    return ()=>{};
  }
  bank.classList.add('sgv-bank-target-hit');
  if(reducedMotion()){
    const tl=gsap.timeline({onComplete:finish});
    if(front)tl.to(front,{opacity:1,filter:'brightness(1.18)',duration:.12},0)
      .to(front,{opacity:.78,filter:'brightness(1)',duration:.14},.12);
    else tl.to({},{},.25);
    return ()=>{alive=false;tl.kill();clear();};
  }
  const tl=gsap.timeline({onComplete:finish});
  const pulse=[art,label].filter(Boolean);
  tl.fromTo(pulse,{scale:1},{
    scale:1.07,duration:.18,ease:'power1.out',yoyo:true,repeat:5,
    transformOrigin:'50% 70%'
  },0);
  if(front){
    tl.to(front,{opacity:1,filter:'brightness(1.22) saturate(1.08)',duration:.2},0);
    tl.to(front,{opacity:.78,filter:'brightness(1)',duration:.35},.65);
  }
  if(gleam){
    tl.fromTo(gleam,
      {opacity:0,x:'-120%'},
      {opacity:.9,x:'160%',duration:.55,ease:'power1.inOut'},.08);
    tl.to(gleam,{opacity:0,duration:.15},.58);
  }
  tl.to({},{},1.0);
  return ()=>{alive=false;tl.kill();clear();};
}

