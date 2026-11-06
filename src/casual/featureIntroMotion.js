import {gsap} from 'gsap';

export const INTRO_MOTION=Object.freeze({
  scrim:Object.freeze({from:0,to:0.55,start:0,end:0.180,ease:'sine.out'}),
  card:Object.freeze({
    fromScale:0.92,toScale:1,maxScale:1.04,start:0.060,end:0.280,ease:'back.out(1.2)'
  }),
  outro:0.150
});

function paint(node,props){
  if(!node)return;
  if(node.style){
    if(props.opacity!=null)node.style.opacity=String(props.opacity);
    if(props.transform!=null)node.style.transform=props.transform;
    return;
  }
  Object.assign(node,props);
}

// Entry only. Dismiss settles the bus immediately and does not wait out the fade.
export function playFeatureIntroEnter({scrim,card,reduced=false,bus=null}={}){
  if(!scrim||!card)return {motion:false,cancel(){}};
  if(reduced){
    paint(scrim,{opacity:INTRO_MOTION.scrim.to});
    paint(card,{opacity:1,transform:'none',scale:1});
    return {motion:false,cancel(){}};
  }
  const timeline=gsap.timeline({overwrite:'auto'});
  timeline.fromTo(scrim,
    {opacity:INTRO_MOTION.scrim.from},
    {
      opacity:INTRO_MOTION.scrim.to,duration:INTRO_MOTION.scrim.end,
      ease:INTRO_MOTION.scrim.ease,overwrite:'auto'
    },
    INTRO_MOTION.scrim.start);
  timeline.fromTo(card,
    {opacity:0,scale:INTRO_MOTION.card.fromScale},
    {
      opacity:1,scale:INTRO_MOTION.card.toScale,
      duration:INTRO_MOTION.card.end-INTRO_MOTION.card.start,
      ease:INTRO_MOTION.card.ease,overwrite:'auto',
      onUpdate(){
        const scale=Number(gsap.getProperty(card,'scale'));
        if(scale>INTRO_MOTION.card.maxScale)gsap.set(card,{scale:INTRO_MOTION.card.maxScale});
      }
    },
    INTRO_MOTION.card.start);
  // settle() kills the timeline in place. A kill must land on the visible end
  // instead of freezing the opacity-0 entry frame.
  const nativeKill=timeline.kill.bind(timeline);
  let finishing=false;
  timeline.kill=function(...args){
    if(!finishing&&timeline.progress()<1){
      finishing=true;
      try{timeline.progress(1);}catch{/* the explicit paint still shows the end */}
    }
    showFinal(scrim,card);
    try{return nativeKill.apply(timeline,args);}finally{finishing=false;}
  };
  bus?.register(timeline);
  return {
    motion:true,timeline,
    cancel(){try{timeline.kill();}catch{showFinal(scrim,card);}}
  };
}

function showFinal(scrim,card){
  paint(scrim,{opacity:INTRO_MOTION.scrim.to});
  paint(card,{opacity:1,transform:'translate(0, 0)',scale:1});
}
