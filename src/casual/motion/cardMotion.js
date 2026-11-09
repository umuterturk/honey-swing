import {gsap} from 'gsap';
import {CARD_ARROW_PATH,cardAccentMix,cardDirection} from '../cardDirection.js';
import {meterPercent} from '../meterScale.js';
import {NEEDLE_GLIDE_EASE,cardMotionMarks,flyerOrigin,reducedCardSummary} from '../motionSchedule.js';
import {FACTORS} from '../factors.js';
import {flyFactorLabels} from './factorFlyer.js';
import {animateTapPour} from './potMotion.js';
import {showReducedCard} from './reducedOutcomes.js';
import {clearStatic,point,reducedMotion,removeNodes} from './stage.js';

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
    for(const flyer of marks.flyers||[]){
      const factor=FACTORS.find(row=>row.kind===flyer.kind);
      tl.call(()=>{
        if(!alive||!factor)return;
        let origin=null;
        if(factor.flyerFrom==='marker'){
          if(!marker)return;
          origin=point(marker,root);
        }else if(factor.flyerFrom==='flip-button'){
          const flipBtn=root.querySelector('.sgv-flip');
          origin=flipBtn?point(flipBtn,root):
            {x:root.clientWidth*.5,y:root.clientHeight*.82};
        }
        if(!origin)return;
        animations.push(flyFactorLabels({
          root,
          plan:[{kind:flyer.kind,start:0,origin}]
        }));
      },[],flyer.at);
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

