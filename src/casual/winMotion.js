import {gsap} from 'gsap';
import {HONEY_MOTION,honeyEaseBack,honeyEaseOut,honeyParticles,overflowReveal,fillHeightPercent} from './honeyWin.js';
import {
  burstParticles,burstRadius,displayedCount,praiseFor
} from './starThresholds.js';

const PEAK=1.14;

function centerOf(node, layer){
  const rect=node?.getBoundingClientRect?.();
  if(!rect)return null;
  const width=rect.width||0;
  const height=rect.height||0;
  const left=Number.isFinite(rect.left)?rect.left:(rect.x||0);
  const top=Number.isFinite(rect.top)?rect.top:(rect.y||0);
  if(!(width||height||left||top))return null;
  const origin=layer?.getBoundingClientRect?.();
  const originX=origin&&Number.isFinite(origin.left)?origin.left:(origin?.x||0);
  const originY=origin&&Number.isFinite(origin.top)?origin.top:(origin?.y||0);
  return {x:left+width/2-originX,y:top+height/2-originY};
}

// Praise, the hero jar, and the secured total. A killed tween still paints the
// final card: the jar is full, the praise is visible, and the number is deal.T.
export function playWinCelebration({
  victory=true,secured=0,target=0,tier=0,praise=null,tally=null,subline=null,
  liquid=null,overflow=null,scrim=null,cta=null,card=null,
  source=null,pot=null,mouth=null,layer=null,sourcePoint=null,mouthPoint=null,
  reduced=false,bus=null,onSettled,schedule=null,clearSchedule=null,doc=null
}={}){
  const score=Math.trunc(Number(secured));
  const safe=Number.isFinite(score)?score:0;
  const goal=Number(target);
  const intensity=tier|0;
  const paintFinal=()=>{
    card?.classList?.add('sgv-honey-final');
    if(scrim?.style)scrim.style.opacity='1';
    if(praise?.style){
      praise.style.opacity='1';
      praise.style.transform='none';
    }
    try{gsap.set(praise,{opacity:1,scale:1});}catch{/* the inline opacity is the end state */}
    if(tally)tally.textContent=String(safe);
    if(subline?.style)subline.style.opacity='0.9';
    if(liquid?.style){
      const full=fillHeightPercent(safe,goal);
      liquid.style.transition='none';
      liquid.style.height=(full>0?full:78)+'%';
      liquid.style.opacity='1';
      liquid.style.transform='none';
    }
    const surface=liquid?.querySelector?.('.sgv-fluid-surface');
    if(surface?.style)surface.style.transform='none';
    const hero=card?.querySelector?.('.sgv-honey-hero-art');
    const gleam=hero?.querySelector?.('.sgv-honey-gleam-sweep');
    if(hero?.style){
      try{gsap.set(hero,{scale:1});}catch{/* inline transform is the end state */}
      hero.style.transformOrigin='center 70%';
      hero.style.transform='none';
    }
    if(gleam?.style){
      gleam.style.opacity='0';
      gleam.style.transform='none';
    }
    if(overflow?.style){
      overflow.style.opacity='1';
      overflow.style.transform='none';
    }
    if(cta){
      cta.disabled=false;
      if(cta.style){
        cta.style.opacity='1';
        cta.style.removeProperty('transform');
        cta.style.removeProperty('--honey-cta-outline');
      }
    }
    const rear=card?.querySelector?.('.sgv-honey-foliage-rear');
    const front=card?.querySelector?.('.sgv-honey-foliage-front');
    for(const layer of [rear,front]){
      if(!layer?.style)continue;
      layer.style.opacity='1';
      layer.style.transform='none';
    }
    releaseOwned();
  };
  function releaseOwned(){
    const pool=bus?.pool;
    if(!pool?.live||!pool.release)return;
    for(const particle of pool.live()){
      if(particle.owner==='honey-win')pool.release(particle);
    }
  }
  if(!victory)return {motion:false,timeline:null,particles:0,showFinal(){},cancel(){}};
  if(reduced){
    paintFinal();
    return {motion:false,timeline:null,particles:0,showFinal:paintFinal,cancel(){paintFinal();}};
  }

  const fx=layer||card?.closest?.('.sgv-phone')?.querySelector?.('.sgv-fx-layer')||null;
  const from=sourcePoint||centerOf(source,fx)||centerOf(pot,fx)||{x:160,y:84};
  const to=mouthPoint||centerOf(mouth,fx)||{x:from.x,y:from.y+140};
  const paintCount=eased=>{
    const progress=eased>=1?1:Math.max(0,eased||0);
    const shown=displayedCount(progress,safe);
    if(tally)tally.textContent=String(shown);
    const raw=progress>=1?safe:safe*progress;
    if(liquid?.style){
      const percent=fillHeightPercent(raw,goal);
      liquid.style.transition='none';
      liquid.style.height=percent+'%';
      liquid.style.opacity=percent>0?'1':'0';
      liquid.style.transform='none';
    }
    if(overflow?.style){
      const reveal=overflowReveal(progress,safe,goal);
      overflow.style.opacity=String(reveal);
      overflow.style.transform='translateY('+((1-reveal)*-8)+'px)';
    }
  };
  function sync(time){
    const pool=bus?.pool;
    if(!pool?.spawn)return;
    const factor=bus.budget?.scale?.()??1;
    const desired=honeyParticles({
      t:time,tier:intensity,scale:factor,source:from,mouth:to,
      flightCount:0,
      flightSize:0,
      burstCount:0,
      burstRadius:burstRadius(intensity)
    });
    const owned=pool.live().filter(particle=>particle.owner==='honey-win');
    const byKey=new Map(owned.map(particle=>[particle.key,particle]));
    const keep=new Set();
    for(const spec of desired){
      keep.add(spec.key);
      const existing=byKey.get(spec.key);
      if(existing)Object.assign(existing,spec,{alive:true});
      else pool.spawn(spec);
    }
    for(const particle of owned){
      if(!keep.has(particle.key)&&pool.release)pool.release(particle);
    }
    try{bus.touch?.();}catch{/* a view must not block the celebration */}
  }

  if(tally)tally.textContent='0';
  if(liquid?.style){
    liquid.style.transition='none';
    liquid.style.height='0%';
    liquid.style.opacity='0';
    liquid.style.transform='none';
  }
  if(subline?.style)subline.style.opacity='0';
  if(scrim?.style)scrim.style.opacity='0';
  const rear=card?.querySelector?.('.sgv-honey-foliage-rear')||null;
  const front=card?.querySelector?.('.sgv-honey-foliage-front')||null;
  for(const layer of [rear,front]){
    if(!layer?.style)continue;
    layer.style.opacity='0';
    layer.style.transform='translateY('+HONEY_MOTION.foliage.fromY+'px)';
  }
  if(overflow?.style){
    overflow.style.opacity='0';
    overflow.style.transform='translateY(-8px)';
  }

  const timeline=gsap.timeline({paused:true});
  let stopped=false;
  let inKill=false;
  const listen=doc||globalThis.document;
  let capId=0;
  const clear=clearSchedule||clearTimeout;
  function onHide(){
    if(listen?.visibilityState==='hidden')cancel();
  }
  const nativeKill=timeline.kill.bind(timeline);
  function finish(fromKill){
    if(!stopped){
      stopped=true;
      try{clear(capId);}catch{/* already cleared */}
      try{listen?.removeEventListener?.('visibilitychange',onHide);}catch{/* already removed */}
    }
    paintFinal();
    if(!fromKill){
      inKill=true;
      try{nativeKill();}catch{/* already dead */}
      inKill=false;
    }
    try{bus?.settle();}catch{/* settle must not block the tap */}
  }
  timeline.kill=function(...args){
    if(inKill){
      try{return nativeKill(...args);}catch{return undefined;}
    }
    inKill=true;
    let result;
    try{result=nativeKill(...args);}catch{result=undefined;}
    finish(true);
    inKill=false;
    return result;
  };
  function cancel(){finish(false);}

  const hero=card?.querySelector?.('.sgv-honey-hero-art')||null;
  const surface=liquid?.querySelector?.('.sgv-fluid-surface')||null;
  const gleam=hero?.querySelector?.('.sgv-honey-gleam-sweep')||null;
  function paintPretty(time){
    const active=time>=0.2&&time<=0.8;
    const along=active?(time-0.2)/0.6:0;
    if(surface?.style)
      surface.style.transform=active?'translateY('+(Math.sin(along*Math.PI*2)*3)+'px)':'none';
  }
  const clock={t:0};
  timeline.to(clock,{
    t:2.5,duration:2.5,ease:'none',overwrite:'auto',
    onUpdate(){sync(clock.t);paintPretty(clock.t);}
  },0);
  if(scrim){
    timeline.fromTo(scrim,{opacity:0},{
      opacity:HONEY_MOTION.scrim.opacity,
      duration:HONEY_MOTION.scrim.end-HONEY_MOTION.scrim.start,
      ease:honeyEaseOut,overwrite:false
    },HONEY_MOTION.scrim.start);
  }
  for(const layer of [rear,front]){
    if(!layer)continue;
    timeline.fromTo(layer,{opacity:0,y:HONEY_MOTION.foliage.fromY},{
      opacity:1,y:0,
      duration:HONEY_MOTION.foliage.end-HONEY_MOTION.foliage.start,
      ease:honeyEaseOut,overwrite:false
    },HONEY_MOTION.foliage.start);
  }
  if(praise){
    gsap.set(praise,{transformOrigin:'50% 50%'});
    timeline.fromTo(praise,{opacity:0},{
      opacity:1,duration:0.1,ease:honeyEaseOut,overwrite:false
    },0);
    timeline.fromTo(praise,{scale:0.55},{
      scale:PEAK,duration:0.14,ease:honeyEaseBack,overwrite:false,
      onUpdate(){
        const scale=Number(gsap.getProperty(praise,'scale'));
        if(scale>PEAK)gsap.set(praise,{scale:PEAK});
      }
    },0);
    timeline.to(praise,{scale:1,duration:0.08,ease:honeyEaseOut,overwrite:false},0.14);
    timeline.call(()=>bus?.emit({
      id:'praise',sound:praiseFor(intensity)?.sound||'praise.nectar',
      haptic:intensity>=2?'light':undefined,particles:0
    }),null,0);
  }
    const proxy={p:0};
  timeline.to(proxy,{
    p:1,duration:0.6,ease:'power2.out',overwrite:'auto',
    onUpdate(){paintCount(proxy.p);},
    onComplete(){
      paintCount(1);
      if(tally)tally.textContent=String(safe);
    }
  },0.2);
  for(let at=0.2;at<0.8-1e-9;at+=0.08){
    const when=at;
    timeline.call(()=>bus?.emit({id:'score-tick',sound:'score.tick',particles:0}),null,when);
  }
  if(hero){
    gsap.set(hero,{transformOrigin:'center 70%',scale:1});
    timeline.fromTo(hero,{scale:1},{
      scale:1.06,duration:0.09,ease:honeyEaseBack,overwrite:false,
      onUpdate(){
        const scale=Number(gsap.getProperty(hero,'scale'));
        if(scale>1.06)gsap.set(hero,{scale:1.06});
      }
    },0.8);
    timeline.to(hero,{scale:1,duration:0.09,ease:honeyEaseOut,overwrite:false},0.89);
  }
  if(gleam){
    gsap.set(gleam,{xPercent:-120,opacity:0});
    timeline.to(gleam,{xPercent:480,duration:0.76,ease:'power2.out',overwrite:false},0.8);
    timeline.to(gleam,{opacity:0.65,duration:0.28,ease:'power2.out',overwrite:false},0.8);
    timeline.to(gleam,{opacity:0,duration:0.48,ease:'power2.out',overwrite:false},1.08);
  }
  timeline.call(()=>bus?.emit({
    id:'fx-confetti',sound:'fx.confetti',
    haptic:intensity>=3?'medium':intensity===2?'light':undefined,
    particles:0
  }),null,0.8);
  if(subline){
    timeline.to(subline,{
      opacity:0.9,duration:0.18,ease:honeyEaseOut,overwrite:'auto',
      onComplete(){subline.style.opacity='0.9';}
    },1);
  }
  if(cta){
    const pulse={o:0.35};
    const apply=()=>cta.style?.setProperty('--honey-cta-outline',String(pulse.o));
    timeline.to(pulse,{o:1,duration:0.2,ease:'power2.out',onUpdate:apply},1.3);
    timeline.to(pulse,{o:0.35,duration:0.2,ease:'power2.out',onUpdate:apply},1.5);
  }
  timeline.call(()=>{if(!stopped)onSettled?.();},null,1.3);

  try{listen?.addEventListener?.('visibilitychange',onHide);}catch{/* no document in this runtime */}
  try{
    if(typeof schedule==='function')capId=schedule(()=>cancel(),2500);
    else{
      capId=setTimeout(()=>cancel(),2500);
      capId?.unref?.();
    }
  }catch{capId=0;}
  bus?.register(timeline);
  timeline.play();
  return {
    motion:true,timeline,particles:burstParticles(intensity),showFinal:paintFinal,cancel
  };
}
