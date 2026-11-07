import {gsap} from 'gsap';
import {
  HONEY_MOTION,fillFrame,fillHeightPercent,honeyEaseBack,honeyEaseOut,honeyParticles
} from './honeyWin.js';
import {
  burstParticles,burstRadius,displayedCount,praiseFor
} from './starThresholds.js';

const PEAK=HONEY_MOTION.praise.peakScale;

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

// Fill-first celebration. A killed tween still paints the settled final card.
export function playWinCelebration({
  victory=true,secured=0,target=0,tier=0,praise=null,tally=null,subline=null,
  liquid=null,overflow=null,scrim=null,cta=null,card=null,
  scoreboard=null,underline=null,drops=null,targetRow=null,
  source=null,pot=null,mouth=null,layer=null,sourcePoint=null,mouthPoint=null,
  reduced=false,bus=null,onSettled,schedule=null,clearSchedule=null,doc=null
}={}){
  const score=Math.trunc(Number(secured));
  const safe=Number.isFinite(score)?score:0;
  const goal=Number(target);
  const intensity=tier|0;
  const board=scoreboard||card?.querySelector?.('.sgv-honey-scoreboard')||null;
  const under=underline||card?.querySelector?.('.sgv-honey-slogan-underline')||null;
  const dropNodes=drops||[...(card?.querySelectorAll?.('.sgv-honey-slogan-drops-art')||[])];
  const targetNode=targetRow||card?.querySelector?.('.sgv-honey-scoreboard-target')||null;
  const met=goal>0&&safe>=goal;

  const paintFinal=()=>{
    card?.classList?.add('sgv-honey-final');
    if(scrim?.style)scrim.style.opacity='1';
    if(praise?.style){
      praise.style.opacity='1';
      praise.style.transform='none';
    }
    try{gsap.set(praise,{opacity:1,scale:1});}catch{/* inline opacity is the end state */}
    if(under?.style){
      under.style.opacity='1';
      under.style.transform='translateX(-50%)';
    }
    // Art only — mirror stays on the CSS wrapper so GSAP never owns the flip.
    for(const drop of dropNodes){
      if(!drop?.style)continue;
      drop.style.opacity='1';
      try{gsap.set(drop,{scale:1,x:0});}catch{drop.style.transform='none';}
    }
    if(tally)tally.textContent=String(safe);
    if(board?.style){
      board.style.opacity='1';
      try{gsap.set(board,{scale:1,y:0});}catch{board.style.transform='none';}
    }
    if(targetNode){
      if(met)targetNode.classList.add('is-met');
      else targetNode.classList.remove('is-met');
    }
    if(subline?.style)subline.style.opacity='0';
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
      overflow.style.opacity='0';
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
    for(const foliage of [rear,front]){
      if(!foliage?.style)continue;
      foliage.style.opacity='1';
      foliage.style.transform='none';
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

  function paintFill(time){
    const frame=fillFrame(time,safe,goal);
    if(liquid?.style){
      liquid.style.transition='none';
      liquid.style.height=frame.percent+'%';
      liquid.style.opacity=frame.percent>0?'1':'0';
      liquid.style.transform='none';
    }
  }
  function paintScore(eased){
    const progress=eased>=1?1:Math.max(0,eased||0);
    const shown=displayedCount(progress,safe);
    if(tally)tally.textContent=String(shown);
    if(targetNode){
      if(goal>0&&shown>=goal)targetNode.classList.add('is-met');
      else targetNode.classList.remove('is-met');
    }
  }
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
  if(board?.style){
    board.style.opacity='0';
    try{gsap.set(board,{scale:HONEY_MOTION.scoreboard.fromScale});}catch{/* optional */}
  }
  if(under?.style)under.style.opacity='0';
  for(const drop of dropNodes){
    if(!drop?.style)continue;
    drop.style.opacity='0';
  }
  if(targetNode)targetNode.classList.remove('is-met');
  if(cta?.style){
    cta.style.opacity='0';
    cta.style.transform='translateY(10px)';
  }
  const rear=card?.querySelector?.('.sgv-honey-foliage-rear')||null;
  const front=card?.querySelector?.('.sgv-honey-foliage-front')||null;
  for(const foliage of [rear,front]){
    if(!foliage?.style)continue;
    foliage.style.opacity='0';
    foliage.style.transform='translateY('+HONEY_MOTION.foliage.fromY+'px)';
  }
  if(overflow?.style){
    overflow.style.opacity='0';
    overflow.style.transform='none';
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
  const fillStart=HONEY_MOTION.fill.start;
  const fillEnd=HONEY_MOTION.fill.end;
  function paintPretty(time){
    const active=time>=fillStart&&time<=fillEnd;
    const along=active?(time-fillStart)/(fillEnd-fillStart):0;
    if(surface?.style)
      surface.style.transform=active?'translateY('+(Math.sin(along*Math.PI*2)*3)+'px)':'none';
  }
  const clock={t:0};
  timeline.to(clock,{
    t:HONEY_MOTION.cap,duration:HONEY_MOTION.cap,ease:'none',overwrite:'auto',
    onUpdate(){sync(clock.t);paintPretty(clock.t);paintFill(clock.t);}
  },0);
  if(scrim){
    timeline.fromTo(scrim,{opacity:0},{
      opacity:HONEY_MOTION.scrim.opacity,
      duration:HONEY_MOTION.scrim.end-HONEY_MOTION.scrim.start,
      ease:honeyEaseOut,overwrite:false
    },HONEY_MOTION.scrim.start);
  }
  for(const foliage of [rear,front]){
    if(!foliage)continue;
    timeline.fromTo(foliage,{opacity:0,y:HONEY_MOTION.foliage.fromY},{
      opacity:1,y:0,
      duration:HONEY_MOTION.foliage.end-HONEY_MOTION.foliage.start,
      ease:honeyEaseOut,overwrite:false
    },HONEY_MOTION.foliage.start);
  }
  if(hero){
    const enter=HONEY_MOTION.jarEntrance;
    gsap.set(hero,{transformOrigin:'center 70%',scale:enter.fromScale});
    timeline.fromTo(hero,{scale:enter.fromScale},{
      scale:enter.peakScale,
      duration:(enter.end-enter.start)*0.55,
      ease:honeyEaseOut,overwrite:false
    },enter.start);
    timeline.to(hero,{
      scale:enter.toScale,
      duration:(enter.end-enter.start)*0.45,
      ease:honeyEaseOut,overwrite:false
    },enter.start+(enter.end-enter.start)*0.55);
  }
  if(praise){
    const beat=HONEY_MOTION.praise;
    gsap.set(praise,{transformOrigin:'50% 50%',opacity:0,scale:beat.fromScale});
    timeline.fromTo(praise,{opacity:0},{
      opacity:1,duration:beat.opacityEnd-beat.start,ease:honeyEaseOut,overwrite:false
    },beat.start);
    timeline.fromTo(praise,{scale:beat.fromScale},{
      scale:beat.peakScale,duration:beat.peakEnd-beat.start,ease:honeyEaseBack,overwrite:false,
      onUpdate(){
        const scale=Number(gsap.getProperty(praise,'scale'));
        if(scale>PEAK)gsap.set(praise,{scale:PEAK});
      }
    },beat.start);
    timeline.to(praise,{
      scale:beat.toScale,duration:beat.end-beat.peakEnd,ease:honeyEaseOut,overwrite:false
    },beat.peakEnd);
    timeline.call(()=>bus?.emit({
      id:'praise',sound:praiseFor(intensity)?.sound||'praise.nectar',
      haptic:intensity>=2?'light':undefined,particles:0
    }),null,beat.start);
  }
  if(under){
    timeline.fromTo(under,{opacity:0,y:6},{
      opacity:1,y:0,duration:0.12,ease:honeyEaseOut,overwrite:false
    },HONEY_MOTION.praise.underlineAt);
  }
  for(const drop of dropNodes){
    const wrap=drop.closest?.('.sgv-honey-slogan-drops');
    const right=!!wrap?.classList?.contains('sgv-honey-slogan-drops-right');
    // Scale the art only. Right-side flip is CSS on the wrapper and never touched here.
    gsap.set(drop,{opacity:0,scale:0.45,x:right?10:-10});
    timeline.to(drop,{
      opacity:1,scale:1.12,x:0,duration:0.28,ease:honeyEaseBack,overwrite:false
    },HONEY_MOTION.praise.start);
  }
  if(gleam){
    gsap.set(gleam,{xPercent:-120,opacity:0});
    timeline.to(gleam,{xPercent:480,duration:0.9,ease:'power2.out',overwrite:false},fillEnd-0.08);
    timeline.to(gleam,{opacity:0.9,duration:0.3,ease:'power2.out',overwrite:false},fillEnd-0.08);
    timeline.to(gleam,{opacity:0.22,duration:0.55,ease:'power2.out',overwrite:false},fillEnd+0.28);
  }
  if(board){
    const beat=HONEY_MOTION.scoreboard;
    gsap.set(board,{transformOrigin:'50% 50%'});
    timeline.fromTo(board,{
      opacity:0,scale:beat.fromScale,y:beat.fromY
    },{
      opacity:1,scale:beat.toScale,y:0,
      duration:beat.end-beat.start,ease:honeyEaseOut,overwrite:false
    },beat.start);
  }
  const scoreProxy={p:0};
  timeline.to(scoreProxy,{
    p:1,duration:HONEY_MOTION.count.duration,ease:HONEY_MOTION.count.ease,overwrite:'auto',
    onUpdate(){paintScore(scoreProxy.p);},
    onComplete(){paintScore(1);}
  },HONEY_MOTION.count.start);
  for(let at=HONEY_MOTION.count.start;at<HONEY_MOTION.count.end-1e-9;at+=0.08){
    const when=at;
    timeline.call(()=>bus?.emit({id:'score-tick',sound:'score.tick',particles:0}),null,when);
  }
  if(cta){
    const beat=HONEY_MOTION.cta;
    timeline.to(cta,{
      opacity:1,y:0,duration:beat.leg,ease:honeyEaseOut,overwrite:false,
      onStart(){cta.disabled=false;}
    },beat.start);
    const pulse={o:0.35};
    const apply=()=>cta.style?.setProperty('--honey-cta-outline',String(pulse.o));
    timeline.to(pulse,{o:1,duration:0.1,ease:'power2.out',onUpdate:apply},beat.start+0.05);
    timeline.to(pulse,{o:0.35,duration:0.1,ease:'power2.out',onUpdate:apply},beat.start+0.15);
  }
  timeline.call(()=>{if(!stopped)onSettled?.();},null,HONEY_MOTION.settled);

  try{listen?.addEventListener?.('visibilitychange',onHide);}catch{/* no document in this runtime */}
  try{
    const capMs=Math.round(HONEY_MOTION.cap*1000);
    if(typeof schedule==='function')capId=schedule(()=>cancel(),capMs);
    else{
      capId=setTimeout(()=>cancel(),capMs);
      capId?.unref?.();
    }
  }catch{capId=0;}
  bus?.register(timeline);
  timeline.play();
  return {
    motion:true,timeline,particles:burstParticles(intensity),showFinal:paintFinal,cancel
  };
}
