import {gsap} from 'gsap';
import {LEVEL_START} from './presentationSequence.js';

function nodesOf(board){
  if(!board)return [];
  return (Array.isArray(board)?board:[board]).filter(Boolean);
}

// Settled elements drop their inline transform so a stylesheet baseline can
// return. The goal's translate(-50%, -50%) is that baseline; writing "none"
// or translate(0, 0) leaves it off-center. The jar, meter, hand, actions,
// and Pot have no resting transform, so clearing is their baseline too.
const TRANSFORM_PROPS='transform,x,y,scale,xPercent,yPercent,rotation';
function restoreBaseline(node){
  if(!node)return;
  try{gsap.killTweensOf(node);}catch{/* a dead tween still needs the visible end */}
  try{gsap.set(node,{clearProps:TRANSFORM_PROPS});}catch{/* remove the inline transform below */}
  if(node.style){
    node.style.removeProperty('transform');
    node.style.opacity='1';
  }
}

// Settle kills the timeline wherever it is. The playfield must land on the
// visible end, not the dimmed entry frame, and not on a transform that
// replaces a stylesheet baseline.
function showPlayfield(jar,goal,boards){
  for(const node of [jar,goal,...boards])restoreBaseline(node);
}

function removeBanner(banner){
  if(banner?.parentNode)banner.remove();
}

export function playLevelStart({
  banner,jar,goal,board,reduced=false,bus=null,onSettled
}={}){
  const boards=nodesOf(board);
  const showFinal=()=>{
    showPlayfield(jar,goal,boards);
    removeBanner(banner);
  };
  if(reduced){
    showPlayfield(jar,goal,boards);
    restoreBaseline(banner);
    let held=banner;
    const timer=setTimeout(()=>{
      removeBanner(held);
      held=null;
    },LEVEL_START.reducedBanner*1000);
    timer.unref?.();
    let stopped=false;
    const cancel=()=>{
      if(stopped)return;
      stopped=true;
      clearTimeout(timer);
      showFinal();
    };
    return {motion:false,timeline:null,bannerHold:LEVEL_START.reducedBanner,showFinal,cancel};
  }

  const timeline=gsap.timeline({paused:true});
  let capTimer=null;
  let stopped=false;
  let finishing=false;
  function clearCap(){
    if(!capTimer)return;
    clearTimeout(capTimer);
    capTimer=null;
  }
  function finishVisible(){
    clearCap();
    showFinal();
  }
  if(banner){
    timeline.set(banner,{opacity:1,scale:LEVEL_START.banner.fromScale,y:LEVEL_START.banner.fromY,
      transformOrigin:'50% 50%'},0);
    // back.out overshoots its target. Aim just under the 1.06 peak so the
    // rise still uses back.out and never passes the spec peak.
    timeline.to(banner,{
      keyframes:[
        {scale:1.05,y:-4,duration:LEVEL_START.banner.riseEnd,ease:'back.out(1.2)'},
        {scale:LEVEL_START.banner.toScale,y:LEVEL_START.banner.toY,
          duration:LEVEL_START.banner.end-LEVEL_START.banner.riseEnd,ease:LEVEL_START.banner.settleEase}
      ]
    },LEVEL_START.banner.start);
    timeline.to(banner,{
      opacity:0,duration:LEVEL_START.banner.outEnd-LEVEL_START.banner.outStart,
      ease:LEVEL_START.banner.outEase
    },LEVEL_START.banner.outStart);
    timeline.call(()=>removeBanner(banner),null,LEVEL_START.banner.outEnd);
  }
  if(jar){
    const hero=LEVEL_START.jar.end-LEVEL_START.jar.start;
    timeline.fromTo(jar,
      {scale:1,y:0,transformOrigin:'50% 50%'},
      {scale:LEVEL_START.jar.scale,y:-28,duration:hero/2,ease:LEVEL_START.jar.ease},
      LEVEL_START.jar.start);
    timeline.to(jar,
      {scale:1,y:0,duration:hero/2,ease:LEVEL_START.jar.ease},
      LEVEL_START.jar.start+hero/2);
  }
  if(goal){
    timeline.fromTo(goal,
      {scale:LEVEL_START.goal.fromScale,transformOrigin:'50% 50%'},
      {scale:LEVEL_START.goal.toScale,duration:LEVEL_START.goal.end-LEVEL_START.goal.start,
        ease:LEVEL_START.goal.ease},
      LEVEL_START.goal.start);
  }
  if(boards.length){
    timeline.set(boards,{opacity:LEVEL_START.board.fromOpacity,y:LEVEL_START.board.fromY},0);
    timeline.to(boards,{
      opacity:LEVEL_START.board.toOpacity,y:LEVEL_START.board.toY,
      duration:LEVEL_START.board.end-LEVEL_START.board.start,ease:LEVEL_START.board.ease
    },LEVEL_START.board.start);
  }
  timeline.call(()=>bus?.emit({id:'level-start',sound:'level.whoosh'}),null,0);
  timeline.call(()=>bus?.emit({id:'level-chime',sound:'level.chime'}),null,0.200);
  timeline.add(()=>{},LEVEL_START.settled);
  timeline.eventCallback('onComplete',()=>{
    if(stopped)return;
    finishVisible();
    onSettled?.();
  });

  const nativeKill=timeline.kill.bind(timeline);
  timeline.kill=function(...args){
    if(finishing)return nativeKill.apply(timeline,args);
    finishing=true;
    stopped=true;
    clearCap();
    let result;
    try{result=nativeKill.apply(timeline,args);}catch{result=undefined;}
    finishVisible();
    finishing=false;
    return result;
  };
  bus?.register(timeline);
  capTimer=setTimeout(()=>{
    capTimer=null;
    try{timeline.kill();}catch{finishVisible();}
    onSettled?.();
  },LEVEL_START.cap*1000);
  capTimer.unref?.();
  timeline.play();
  return {
    motion:true,timeline,bannerHold:0,showFinal:finishVisible,
    cancel(){
      if(stopped){
        finishVisible();
        return;
      }
      try{timeline.kill();}catch{finishVisible();}
    }
  };
}
