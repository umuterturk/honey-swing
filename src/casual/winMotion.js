import {gsap} from 'gsap';
import {WIN} from './presentationSequence.js';
import {burstParticles,countUpDuration,displayedCount,praiseFor} from './starThresholds.js';

const TRANSFORM_PROPS='transform,x,y,scale,xPercent,yPercent,rotation';

function showNode(node){
  if(!node)return;
  try{gsap.killTweensOf(node);}catch{/* a dead tween still needs the visible end */}
  try{gsap.set(node,{clearProps:TRANSFORM_PROPS});}catch{/* drop the inline transform below */}
  if(node.style){
    node.style.removeProperty('transform');
    node.style.opacity='1';
  }
}

function clampScale(node,max){
  const scale=Number(gsap.getProperty(node,'scale'));
  if(scale>max)gsap.set(node,{scale:max});
}

// Praise, stars, and the tally. Settle kills the timeline wherever it is, so the
// card must land on the visible end instead of a scale-0 or opacity-0 frame.
export function playWinCelebration({
  victory=true,secured=0,tier=0,praise=null,stars=[],tally=null,cta=null,
  reduced=false,bus=null,onSettled
}={}){
  const earned=(Array.isArray(stars)?stars:[stars]).filter(Boolean);
  const starsEarned=Math.max(0,Math.min(3,tier||earned.length));
  const score=Math.trunc(Number(secured));
  const safe=Number.isFinite(score)?score:0;
  const showFinal=()=>{
    showNode(praise);
    for(const star of earned)showNode(star);
    if(tally)tally.textContent=String(safe);
    if(cta){
      cta.disabled=false;
      if(cta.style){
        cta.style.opacity='1';
        cta.style.removeProperty('transform');
      }
    }
  };
  if(!victory)return {motion:false,timeline:null,particles:0,showFinal(){},cancel(){}};
  if(reduced){
    showFinal();
    return {motion:false,timeline:null,particles:0,showFinal,cancel(){showFinal();}};
  }

  const timeline=gsap.timeline({paused:true});
  let stopped=false;
  let finishing=false;
  let bursted=false;
  const proxy={p:0};
  const duration=countUpDuration(safe);
  if(tally)tally.textContent='0';
  if(praise){
    timeline.fromTo(praise,
      {opacity:0,scale:WIN.praise.fromScale,transformOrigin:'50% 50%'},
      {
        opacity:1,scale:WIN.praise.peakScale,duration:WIN.praise.end/2,
        ease:'back.out(1.2)',overwrite:'auto',
        onUpdate(){clampScale(praise,WIN.praise.peakScale);}
      },
      WIN.praise.start);
    timeline.to(praise,{
      scale:WIN.praise.toScale,duration:WIN.praise.end/2,ease:'sine.out',overwrite:'auto'
    },WIN.praise.start+WIN.praise.end/2);
    timeline.call(()=>bus?.emit({
      id:'praise',sound:praiseFor(starsEarned)?.sound||'praise.sweet'
    }),null,WIN.praise.start);
  }
  earned.forEach((star,index)=>{
    const window=WIN.stars[index];
    if(!window)return;
    const half=(window.end-window.start)/2;
    timeline.set(star,{opacity:0,scale:WIN.star.fromScale,transformOrigin:'50% 50%'},0);
    timeline.to(star,{
      opacity:1,scale:WIN.star.peakScale,duration:half,ease:'back.out(1.2)',overwrite:'auto',
      onUpdate(){clampScale(star,WIN.star.peakScale);}
    },window.start);
    timeline.to(star,{
      scale:WIN.star.toScale,duration:half,ease:'sine.out',overwrite:'auto'
    },window.start+half);
    timeline.call(()=>bus?.emit({id:'star',sound:'star.tick',haptic:'light'}),null,window.start);
  });
  timeline.to(proxy,{
    p:1,duration,ease:'none',overwrite:'auto',
    onUpdate(){if(tally)tally.textContent=String(displayedCount(proxy.p,safe));},
    onComplete(){if(tally)tally.textContent=String(safe);}
  },WIN.count.start);
  const countEnd=WIN.count.start+duration;
  for(let at=WIN.count.start;at<countEnd-1e-6;at+=0.080){
    const when=at;
    timeline.call(()=>bus?.emit({id:'score-tick',sound:'score.tick'}),null,when);
  }
  const particles=burstParticles(starsEarned);
  if(particles>0){
    const burstMark={fired:0};
    timeline.to(burstMark,{
      fired:1,duration:WIN.burst.life,ease:'none',overwrite:'auto',
      onStart(){
        if(bursted||stopped)return;
        bursted=true;
        bus?.emit({
          id:'win-burst',particles,sound:'win.burst',
          haptic:starsEarned>=2?'medium':'light'
        });
      }
    },WIN.burst.start);
  }
  timeline.add(()=>{},WIN.settled);
  timeline.eventCallback('onComplete',()=>{
    if(stopped)return;
    showFinal();
    try{bus?.pool?.drain();}catch{/* the burst has already lived its 0.380s */}
    cta?.classList?.add('sgv-win-cta-pulse');
    onSettled?.();
  });

  const nativeKill=timeline.kill.bind(timeline);
  timeline.kill=function(...args){
    if(finishing)return nativeKill.apply(timeline,args);
    finishing=true;
    stopped=true;
    let result;
    try{result=nativeKill.apply(timeline,args);}catch{result=undefined;}
    showFinal();
    finishing=false;
    return result;
  };
  bus?.register(timeline);
  timeline.play();
  return {
    motion:true,timeline,particles,showFinal,
    cancel(){
      if(stopped){
        showFinal();
        return;
      }
      try{timeline.kill();}catch{showFinal();}
    }
  };
}
