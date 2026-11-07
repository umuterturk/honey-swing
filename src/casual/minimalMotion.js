import {gsap} from 'gsap';
import {bankPourAmounts,fluidFillPercent} from './presentation.js';
import {CARD_ARROW_PATH,cardDirection,cardAccentMix} from './cardDirection.js';
import {meterPercent} from './meterScale.js';
import {
  FACTOR_FLYER_FLIGHT,NEEDLE_GLIDE_EASE,STATIC_OUTCOME_MS,cardMotionMarks,flyerOrigin,
  reducedBankSummary,reducedCardSummary
} from './motionSchedule.js';
import {publicUrl} from './publicUrl.js';

const POT_EQ_ICONS=Object.freeze({
  swing:'celebration/daisy-2.png',
  flip:'bee-smiling-closed-eyes.png'
});
function mountPotEquationFlyer(doc,data){
  const label=doc.createElement('span');
  label.className='sgv-pot-fly sgv-pot-fly-equation';
  label.setAttribute('aria-hidden','true');
  const rank=doc.createElement('span');
  rank.className='sgv-pot-eq-rank';
  rank.textContent=String(data.rank);
  label.append(rank);
  for(const term of data.terms){
    const wrap=doc.createElement('span');
    wrap.className='sgv-pot-eq-term';
    const mul=doc.createElement('span');
    mul.className='sgv-pot-eq-mul';
    mul.textContent='×';
    const icon=POT_EQ_ICONS[term.kind];
    if(icon){
      const img=doc.createElement('img');
      img.className='sgv-pot-eq-icon sgv-pot-eq-icon-'+term.kind;
      img.src=publicUrl(icon);
      img.alt='';
      img.draggable=false;
      wrap.append(mul,img);
    }else{
      wrap.append(mul);
    }
    const val=doc.createElement('span');
    val.className='sgv-pot-eq-factor';
    val.textContent='×'+term.value;
    wrap.append(val);
    label.append(wrap);
  }
  const arrow=doc.createElement('span');
  arrow.className='sgv-pot-eq-arrow';
  arrow.textContent='→';
  const res=doc.createElement('span');
  res.className='sgv-pot-eq-result';
  res.textContent='+'+data.added;
  label.append(arrow,res);
  return label;
}

// All motions are presentation only. The game transaction is calculated once
// before this module is called; interrupting an animation never changes rules.
const reducedMotion=()=>typeof window!=='undefined'&&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const point=(node,root)=>{
  const a=node.getBoundingClientRect(),b=root.getBoundingClientRect();
  return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height/2};
};
// Top of the honey meniscus — geometric center sinks into the fluid.
const honeySurfacePoint=(root,jar,fallback)=>{
  const surface=jar?.querySelector?.('.sgv-fluid-surface');
  const fill=jar?.querySelector?.('.sgv-fluid-fill');
  const node=surface||fill||fallback;
  if(!node)return null;
  const a=node.getBoundingClientRect(),b=root.getBoundingClientRect();
  return {x:a.left-b.left+a.width/2,y:a.top-b.top+(surface?1:0)};
};
const tapSpoutPoint=(root,tap)=>{
  const a=tap.getBoundingClientRect(),b=root.getBoundingClientRect();
  return {x:a.left-b.left+a.width/2,y:a.top-b.top+a.height*.88};
};
const pourStreamPath=(start,end)=>{
  const dx=end.x-start.x,dy=end.y-start.y;
  return 'M '+start.x+' '+start.y+' C '+(start.x+dx*.36)+' '+(start.y-8)+
    ', '+(end.x-dx*.25)+' '+(end.y-Math.max(6,dy*.20))+', '+end.x+' '+end.y;
};
// Mount the pour SVG in the jar honey slot (under front glass) while keeping
// path coordinates in phone-root space via a compensating offset.
const appendPourStreamAtHoneyDepth=(root,jar,doc)=>{
  const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('sgv-pour-stream');
  svg.setAttribute('viewBox','0 0 '+root.clientWidth+' '+root.clientHeight);
  svg.setAttribute('width',root.clientWidth);
  svg.setAttribute('height',root.clientHeight);
  svg.setAttribute('aria-hidden','true');
  const art=jar?.querySelector?.('.sgv-victory-jar-art');
  if(art){
    const rootRect=root.getBoundingClientRect();
    const artRect=art.getBoundingClientRect();
    Object.assign(svg.style,{
      left:(rootRect.left-artRect.left)+'px',
      top:(rootRect.top-artRect.top)+'px',
      width:root.clientWidth+'px',
      height:root.clientHeight+'px'
    });
    const lights=art.querySelector('.sgv-jar-lights');
    if(lights)art.insertBefore(svg,lights);
    else{
      const honey=art.querySelector('.sgv-jar-honey-layer');
      if(honey)honey.after(svg);
      else art.appendChild(svg);
    }
  }else{
    root.appendChild(svg);
  }
  return svg;
};
const paintJarFill=(jar,secured,fillTarget,{max=76,smooth=true}={})=>{
  const fillEl=jar?.querySelector?.('.sgv-fluid-fill');
  if(!fillEl||!Number.isFinite(fillTarget)||fillTarget<=0)return;
  const pct=fluidFillPercent(secured,fillTarget,{max,smooth});
  fillEl.style.height=pct+'%';
  fillEl.style.opacity=pct>0?'1':'0';
};
const removeNodes=nodes=>nodes.forEach(node=>node?.remove());
let clearStatic=()=>{};
function replaceStatic(clear){
  clearStatic();
  const cancel=()=>{
    clear();
    if(clearStatic===cancel)clearStatic=()=>{};
  };
  clearStatic=cancel;
  return cancel;
}
function placeStatic(root,className,text,origin){
  const node=document.createElement('span');
  node.className=className+' sgv-static-outcome';
  node.textContent=text;
  node.setAttribute('aria-hidden','true');
  Object.assign(node.style,{left:origin.x+'px',top:origin.y+'px'});
  root.appendChild(node);
  return node;
}
const FACTOR_FLYER=Object.freeze({
  swing:Object.freeze({
    copy:'More Flower',
    src:publicUrl('celebration/daisy-2.png'),
    alt:'',
    flight:FACTOR_FLYER_FLIGHT
  }),
  flip:Object.freeze({
    copy:'More Bee',
    src:publicUrl('bee-smiling-closed-eyes.png'),
    alt:'',
    flight:FACTOR_FLYER_FLIGHT
  })
});
function makeFactorFlyer(kind){
  const spec=FACTOR_FLYER[kind];
  if(!spec)return null;
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
function showReducedCard(root,view){
  const summary=reducedCardSummary(view);
  if(!root)return ()=>{};
  const nodes=[];
  if(summary.pourFly){
    const pot=root.querySelector('.sgv-pending-pot');
    const origin=pot?point(pot,root):{x:root.clientWidth*.25,y:root.clientHeight*.63};
    const doc=root.ownerDocument;
    let node;
    if(summary.pourFly.rich){
      node=mountPotEquationFlyer(doc,summary.pourFly.initial);
      node.classList.add('sgv-static-outcome');
    }else{
      node=doc.createElement('span');
      node.className='sgv-pot-fly sgv-static-outcome';
      node.textContent=summary.pourFly.initial;
      node.setAttribute('aria-hidden','true');
    }
    Object.assign(node.style,{
      left:origin.x+'px',top:(origin.y-8)+'px',
      transform:summary.pourFly.rich?'translateX(-50%)':undefined
    });
    root.appendChild(node);
    nodes.push(node);
  }
  if(summary.flower){
    const pill=root.querySelector('[data-factor="swing"]');
    const origin=pill?point(pill,root):{x:root.clientWidth/2,y:root.clientHeight*.4};
    const node=placeStaticFactor(root,'swing',{x:origin.x,y:origin.y+28});
    if(node)nodes.push(node);
  }
  if(summary.bee){
    const pill=root.querySelector('[data-factor="flip"]');
    const origin=pill?point(pill,root):{x:root.clientWidth/2,y:root.clientHeight*.4};
    const node=placeStaticFactor(root,'flip',{x:origin.x,y:origin.y+28});
    if(node)nodes.push(node);
  }
  const clear=()=>removeNodes(nodes);
  const cancel=replaceStatic(clear);
  const hold=summary.pourFly?.rich?6600:STATIC_OUTCOME_MS;
  const timer=setTimeout(cancel,hold);
  return ()=>{clearTimeout(timer);cancel();};
}
function showReducedBank(root,fromScore,toScore){
  const summary=reducedBankSummary(fromScore,toScore);
  if(!root||!summary.gain)return ()=>{};
  const mouth=root.querySelector('.sgv-chest-mouth')||root.querySelector('.sgv-chest-body');
  const origin=mouth?point(mouth,root):{x:root.clientWidth*.7,y:root.clientHeight*.55};
  const node=placeStatic(root,'sgv-bank-score-fly',summary.gain,origin);
  const clear=()=>node.remove();
  const cancel=replaceStatic(clear);
  const timer=setTimeout(cancel,STATIC_OUTCOME_MS);
  return ()=>{clearTimeout(timer);cancel();};
}

function flyingCard(source,root,isFlip){
  const r=source.getBoundingClientRect(),b=root.getBoundingClientRect();
  const clone=isFlip?document.createElement('div'):source.cloneNode(true);
  if(isFlip){
    clone.className='sgv-card sgv-card-flip sgv-flying-card';
    clone.innerHTML='<span class="sgv-card-glyph">✦</span><strong>?</strong>';
  }else clone.classList.add('sgv-flying-card');
  clone.removeAttribute('disabled'); // Flying ghost stays vivid while original buttons are locked.
  const width=isFlip?Math.max(64,Math.min(92,root.clientWidth*.25)):r.width;
  const height=isFlip?Math.max(83,Math.min(113,root.clientHeight*.16)):r.height;
  const x=r.left-b.left+(r.width-width)/2;
  const y=r.top-b.top+(r.height-height)/2;
  Object.assign(clone.style,{left:x+'px',top:y+'px',width:width+'px',height:height+'px'});
  clone.setAttribute('aria-hidden','true');
  root.appendChild(clone);
  return {clone,start:{x:x+width/2,y:y+height/2}};
}
function snapSide(view){
  return (view?.to??0)>=0?'right':'left';
}

function waspSelector(side){
  return side==='right'?'.sgv-meter-wasp-right':'.sgv-meter-wasp-left';
}

// Marker left % of the rail so the needle sits on the hit-side wasp (past ±limit ticks).
function waspMarkerPercent(root,side){
  const rail=root.querySelector('.sgv-meter-marker-rail');
  const wasp=root.querySelector(waspSelector(side));
  if(!rail||!wasp)return side==='right'?100:0;
  const railBox=rail.getBoundingClientRect();
  const waspBox=wasp.getBoundingClientRect();
  if(railBox.width<=0)return side==='right'?100:0;
  const center=waspBox.left+waspBox.width/2;
  return Math.max(-6,Math.min(106,((center-railBox.left)/railBox.width)*100));
}

function pulseWasp(root,side,{scale=1.22,repeat=3,duration=0.14}={}){
  const wasp=root.querySelector(waspSelector(side));
  if(!wasp)return ()=>{};
  // Left wasp mirrors via scaleX(-1); pulse both axes without dropping the flip.
  const sx=side==='left'?-1:1;
  const tw=gsap.fromTo(wasp,
    {scaleX:sx,scaleY:1},
    {scaleX:sx*scale,scaleY:scale,duration,yoyo:true,repeat,ease:'power1.inOut',
      onComplete:()=>gsap.set(wasp,{clearProps:'scale,scaleX,scaleY'})});
  return ()=>{tw.kill();gsap.set(wasp,{clearProps:'scale,scaleX,scaleY'});};
}

// C-arc (flipped C from the right): wasp tumbles to the heart; heart swells and falls.
export function animateSnapHeartLoss(root,side,onPop){
  if(!root||reducedMotion()){onPop?.();return ()=>{};}
  const lives=root.querySelector('.sgv-lives');
  const filled=lives&&[...lives.querySelectorAll('.sgv-heart:not(.sgv-heart-empty)')].at(-1);
  const wasp=root.querySelector(waspSelector(side));
  if(!filled||!wasp){onPop?.();return ()=>{};}
  const start=point(wasp,root);
  const end=point(filled,root);
  const flyer=wasp.cloneNode(true);
  flyer.className='sgv-wasp-flyer';
  flyer.removeAttribute('style');
  Object.assign(flyer.style,{left:start.x+'px',top:start.y+'px'});
  root.appendChild(flyer);
  const prevOpacity=wasp.style.opacity;
  wasp.style.opacity='0';
  const dx=end.x-start.x,dy=end.y-start.y;
  // Left = open-right C (bulge left). Right = flipped C (bulge right).
  const bulge=side==='left'?-1:1;
  const reach=Math.max(72,Math.min(130,Math.abs(dx)*0.55+Math.abs(dy)*0.25));
  const mid1={x:dx*0.22+bulge*reach,y:dy*0.28-18};
  const mid2={x:dx*0.62+bulge*reach*0.45,y:dy*0.72-8};
  const nodes=[flyer];
  const tweens=[];
  const restore=()=>{
    wasp.style.opacity=prevOpacity;
    for(const tw of tweens)tw.kill?.();
    for(const node of nodes)node.remove();
  };
  const sx=side==='left'?-1:1;
  const spin=side==='left'?-200:200;
  const flight=0.66;
  const tl=gsap.timeline({onComplete:restore});
  tl.fromTo(flyer,
    {opacity:1,x:0,y:0,scaleX:sx,scaleY:1,rotation:side==='left'?-18:18},
    {keyframes:[
      {x:mid1.x,y:mid1.y,scaleX:-sx,scaleY:1.06,rotation:spin*0.45,duration:flight*0.38,ease:'power1.out'},
      {x:mid2.x,y:mid2.y,scaleX:sx,scaleY:1.1,rotation:spin*0.78,duration:flight*0.32,ease:'none'},
      {x:dx,y:dy,scaleX:-sx,scaleY:1.05,rotation:spin,duration:flight*0.30,ease:'power2.in'}
    ]},0);
  tl.call(()=>{
    const heart=document.createElement('span');
    heart.className='sgv-heart-pop';
    heart.textContent='♥';
    heart.setAttribute('aria-hidden','true');
    Object.assign(heart.style,{left:end.x+'px',top:end.y+'px'});
    root.appendChild(heart);
    nodes.push(heart);
    onPop?.();
    const fall=gsap.timeline({onComplete:()=>heart.remove()});
    fall.fromTo(heart,{opacity:1,scale:1,x:0,y:0,rotation:0},
      {scale:1.85,y:-10,duration:0.18,ease:'power2.out'},0);
    fall.to(heart,{y:96,x:bulge*-18,rotation:bulge*-28,scale:1.55,duration:0.42,ease:'power2.in'},0.16);
    fall.to(heart,{opacity:0,scale:1.15,duration:0.18,ease:'power1.in'},0.42);
    tweens.push(fall);
  },[],flight);
  tl.to(flyer,{opacity:0,scaleX:sx*0.7,scaleY:0.7,duration:0.22,ease:'power1.in'},flight);
  return ()=>{tl.kill();restore();};
}

export function animateCardAction({
  root,source,action,view,onMeter,onPot,onFactors,onSnap,onChanceLost,onComplete
}){
  if(!root||!source||reducedMotion()){
    const summary=reducedCardSummary(view);
    if(view.snap){
      onSnap();
      onChanceLost?.();
      onMeter(summary.position);
      onPot(summary.rawPot);
    }
    else {onMeter(summary.position);onPot(summary.rawPot);}
    onFactors(summary.factors);
    const clear=root&&reducedMotion()?showReducedCard(root,view):()=>{};
    onComplete();
    return clear;
  }
  const {clone,start}=flyingCard(source,root,action.type==='flip');
  const centerNode=root.querySelector('.sgv-flight-center');
  const center=centerNode?point(centerNode,root):{x:root.clientWidth/2,y:root.clientHeight*.43};
  const nodes=[clone],animations=[];
  const originalOpacity=source.style.opacity;
  const centerX=center.x-start.x,centerY=center.y-start.y;
  let alive=true;
  const clean=()=>{
    source.style.opacity=originalOpacity;
    gsap.set(source,{clearProps:'scale'});
    removeNodes(nodes);
  };
  const tl=gsap.timeline({onComplete:()=>{
    if(!alive)return;
    alive=false;
    clean();
    onComplete();
  }});
  clearStatic();
  const marks=cardMotionMarks({
    type:action.type,snap:!!view.snap,rewards:view.rewards||[],
    from:view.from,to:view.to
  });
  const limit=view.meterLimit||8;
  const side=snapSide(view);
  const finalPercent=meterPercent(view.snap?0:view.to,limit);
  const waspPercent=view.snap?waspMarkerPercent(root,side):finalPercent;
  const track=root.querySelector('.sgv-meter-track');
  const marker=root.querySelector('.sgv-meter-marker');
  const needleValue=marker?.querySelector('.sgv-meter-needle-value');
  const rootBox=root.getBoundingClientRect();
  const trackBox=track?.getBoundingClientRect();
  // Part 2 aims at the needle's current seat; the needle only moves after landing.
  const needleHere=marker?point(marker,root):
    (trackBox?flyerOrigin({track:trackBox,root:rootBox,finalPercent:50}):
      {x:root.clientWidth/2,y:root.clientHeight*.28});
  const aimX=needleHere.x-start.x,aimY=needleHere.y-start.y;
  if(marker){
    marker.classList.add('sgv-marker-gsap');
    const release=()=>{
      marker.classList.remove('sgv-marker-gsap');
      if(needleValue)needleValue.textContent=String(Math.abs(view.snap?0:view.to));
    };
    if(view.snap){
      const fromLeft=marker.style.left||'50%';
      const hitDur=Math.max(0.001,marks.meterEnd-(marks.meterStart||0));
      const homeDur=Math.max(0.001,marks.end-marks.needleHome);
      const hit=gsap.fromTo(marker,{left:fromLeft},{
        left:waspPercent+'%',duration:hitDur,delay:marks.meterStart||0,
        ease:'power2.out',overwrite:'auto'
      });
      const home=gsap.to(marker,{
        left:finalPercent+'%',duration:homeDur,delay:marks.needleHome,
        ease:'power2.inOut',overwrite:'auto'
      });
      animations.push(()=>{hit.kill();home.kill();release();});
    }else{
      const glide=gsap.fromTo(marker,{left:marker.style.left||'50%'},{
        left:finalPercent+'%',duration:Math.max(0.001,marks.meterEnd-(marks.meterStart||0)),
        delay:marks.meterStart||0,ease:NEEDLE_GLIDE_EASE,overwrite:'auto'
      });
      animations.push(()=>{glide.kill();release();});
    }
  }
  source.style.opacity='.36';
  animations.push(gsap.fromTo(source,{scale:1},{
    scale:view.firstTap?1.12:.96,duration:view.firstTap?0.12:0.08,yoyo:true,repeat:1
  }));
  const centerDur=marks.centerAt||0.22;
  const diveDur=Math.max(0.12,(marks.cardArrive||0.42)-centerDur);
  const fadeDur=Math.min(0.12,diveDur*0.35);
  // Part 1: rise to center and grow. Part 2: dive to the current needle and shrink.
  // Flip uses the same path as a hand card — no spin.
  tl.fromTo(clone,{scale:.94,opacity:1,rotation:0},
    {x:centerX,y:centerY,scale:1.38,rotation:-6,
      duration:centerDur,ease:'power2.out'},0);
  tl.to(clone,{x:aimX,y:aimY,scale:.16,rotation:-2,
    duration:diveDur,ease:'power2.out'},centerDur);
  tl.to(clone,{opacity:0,duration:fadeDur,ease:'power2.out'},centerDur+diveDur-fadeDur);
  const needleArt=marker?.querySelector('.sgv-meter-needle');
  tl.call(()=>{
    if(!alive||!needleArt)return;
    animations.push(gsap.fromTo(needleArt,{scale:1},
      {scale:1.22,duration:.10,yoyo:true,repeat:1,ease:'power1.out'}));
  },[],marks.meterStart);
  if(action.type==='flip'&&marks.faceEnd!=null)tl.call(()=>{
    if(!alive)return;
    clone.className='sgv-card sgv-flying-card sgv-card-'+cardDirection(view.signedCard);
    clone.style.setProperty('--sgv-card-mix',cardAccentMix(view.signedCard));
    clone.innerHTML='<svg class="sgv-card-arrow" viewBox="0 0 80 58" aria-hidden="true">'+
      '<path d="'+CARD_ARROW_PATH+'"/></svg>'+
      '<strong>'+Math.abs(view.signedCard)+'</strong>';
  },[],marks.faceEnd);
  tl.call(()=>{
    if(!alive)return;
    if(view.snap){
      // Keep React meter at the pre-snap seat; GSAP owns left through the wasp hit.
      if(needleValue)needleValue.textContent=String(Math.abs(view.to));
    }else onMeter(view.to);
  },[],view.snap?marks.copyStart:marks.meterEnd);
  if(view.snap){
    tl.call(()=>{
      if(!alive)return;
      animations.push(pulseWasp(root,side));
      onSnap();
      onPot(view.rawPotAfter);
      onFactors(view.factorsAfter);
      if(!view.showChances)onChanceLost?.();
    },[],marks.snapAt);
    tl.call(()=>{
      if(!alive)return;
      if(view.showChances){
        animations.push(animateSnapHeartLoss(root,side,()=>{if(alive)onChanceLost?.();}));
      }
    },[],marks.heartFly);
    tl.call(()=>{if(alive&&needleValue)needleValue.textContent='0';},[],marks.needleHome);
    // React left catches up only after GSAP has parked the needle at 0.
    tl.call(()=>{if(alive)onMeter(0);},[],marks.end);
  }else{
    const startTapPour=()=>{
      if(!alive)return;
      const fromPot=Number.isFinite(view.rawPotBefore)
        ?view.rawPotBefore:Math.max(0,(view.rawPotAfter||0)-(view.addedToPot||0));
      if((view.addedToPot||0)<=0){
        onPot(view.rawPotAfter);
        return;
      }
      animations.push(animateTapPour({
        root,
        fromPot,
        toPot:view.rawPotAfter,
        fillTarget:view.potTarget,
        added:view.addedToPot,
        pourFly:view.pourFly,
        onPourProgress:value=>{if(alive)onPot(value);}
      }));
    };
    const hasSwing=(view.rewards||[]).some(reward=>reward.kind==='swing');
    const hasFlip=(view.rewards||[]).some(reward=>reward.kind==='flip');
    if(marks.swingFlyer!=null&&hasSwing){
      tl.call(()=>{
        if(!alive||!marker)return;
        animations.push(flyFactorLabels({
          root,
          plan:[{kind:'swing',start:0,origin:point(marker,root)}]
        }));
      },[],marks.swingFlyer);
    }
    if(marks.flipFlyer!=null&&hasFlip){
      tl.call(()=>{
        if(!alive)return;
        const flipBtn=root.querySelector('.sgv-flip');
        const origin=flipBtn?point(flipBtn,root):
          {x:root.clientWidth*.5,y:root.clientHeight*.82};
        animations.push(flyFactorLabels({
          root,
          plan:[{kind:'flip',start:0,origin}]
        }));
      },[],marks.flipFlyer);
    }
    if(marks.rewards!=null){
      tl.call(()=>{if(alive)onFactors(view.factorsAfter);},[],marks.factors);
      tl.call(startTapPour,[],marks.pourStart||marks.meterEnd);
      tl.call(()=>{if(alive)onPot(view.rawPotAfter);},[],marks.pourEnd||marks.pot);
      tl.call(()=>{},[],marks.end);
    }else{
      tl.call(startTapPour,[],marks.pourStart||marks.meterEnd);
      tl.call(()=>{if(alive)onPot(view.rawPotAfter);},[],marks.pourEnd||marks.pot);
      tl.call(()=>{if(alive)onFactors(view.factorsAfter);},[],marks.factors);
      tl.call(()=>{},[],marks.end);
    }
  }
  return ()=>{
    alive=false;tl.kill();
    for(const animation of animations){
      if(typeof animation==='function')animation();
      else animation?.kill?.();
    }
    clean();
  };
}

export function flyFactorLabels({root,plan}){
  if(!root||!plan?.length||reducedMotion())return ()=>{};
  const nodes=[],tweens=[];
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
    const flight=FACTOR_FLYER[kind].flight;
    const appear=0.18;
    const fade=0.16;
    const travel=Math.max(0.40,flight-appear-fade);
    const tl=gsap.timeline({onComplete:()=>flyer.remove()});
    tl.fromTo(flyer,{opacity:0,scale:.7,xPercent:-50,yPercent:-50},
      {opacity:1,scale:1.18,duration:appear,ease:'back.out(1.8)'},start);
    tl.to(flyer,{
      x:end.x-startPoint.x,y:end.y-startPoint.y,scale:1,
      duration:travel,ease:'power2.inOut'
    },start+appear);
    tl.to(flyer,{opacity:0,scale:.55,duration:fade,ease:'power1.in'},start+appear+travel);
    tl.call(()=>{
      const bounce=gsap.fromTo(target,{scale:.82},
        {scale:1,duration:.34,ease:'back.out(2.4)'});
      tweens.push(bounce);
    },[],start+appear+travel);
    tweens.push(tl);
  }
  return ()=>{
    for(const t of tweens)t.kill?.();
    removeNodes(nodes);
    for(const {kind} of plan){
      const pill=root.querySelector('[data-factor="'+kind+'"]');
      if(pill)gsap.set(pill,{clearProps:'scale'});
    }
  };
}

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
  const front=bank?.querySelector?.('.sgv-jar-front');
  const gleam=bank?.querySelector?.('.sgv-honey-gleam-sweep');
  let alive=true;
  const clear=()=>{
    if(art)gsap.set(art,{clearProps:'scale,filter'});
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
  tl.fromTo(art,{scale:1},{
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
