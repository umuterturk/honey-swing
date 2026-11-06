import {gsap} from 'gsap';
import {createParticlePool} from './particlePool.js';
import {play as playSound} from '../services/audio.js';
import {pulse as pulseHaptic} from '../services/haptics.js';

export const FX_TWEEN_CAP=24;
const FLASH_CLASS='sgv-fx-flash';
const SHAKE_CLASS='sgv-fx-shake';

// Cosmetic queue only. Emit returns immediately and never starts a presentation.
function prefersReducedMotion(){
  return typeof window!=='undefined'&&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function particleCount(value){
  if(!Number.isFinite(value))return 0;
  const count=Math.floor(value);
  return count>0?count:0;
}

function devBuild(){
  try{return Boolean(import.meta.env?.DEV);}catch{return false;}
}

function safeCall(fn,value){
  if(typeof fn!=='function')return;
  try{fn(value);}catch{/* an adapter must not block settle or input */}
}

const quiet={emitted:false,particles:0,tween:null,target:null};

export function createFxBus({
  pool=createParticlePool(),
  reducedMotion=prefersReducedMotion,
  audio={play:playSound},
  haptics={pulse:pulseHaptic},
  maxTweens=FX_TWEEN_CAP
}={}){
  const queue=[];
  const tweens=[];
  const classes=new Set();
  let root=null;
  let context=null;

  function isReduced(){
    return typeof reducedMotion==='function'?!!reducedMotion():!!reducedMotion;
  }
  function ensureContext(){
    if(context)return context;
    const scope=root?.nodeType===1?root:undefined;
    context=gsap.context(()=>{},scope);
    return context;
  }
  function addClass(name){
    if(!name)return;
    classes.add(name);
    root?.classList?.add(name);
  }
  function clearClasses(){
    if(root?.classList){
      for(const name of classes)root.classList.remove(name);
    }
    classes.clear();
  }
  function attach(element){
    root=element||null;
  }
  function register(timeline){
    if(!timeline)return null;
    if(isReduced()){
      try{timeline.kill();}catch{/* already dead */}
      return null;
    }
    while(tweens.length>=maxTweens){
      const oldest=tweens.shift();
      try{oldest?.tween?.kill();}catch{/* already dead */}
    }
    tweens.push({tween:timeline});
    return timeline;
  }
  function createTween(){
    const target={opacity:1};
    let tween=null;
    ensureContext().add(()=>{
      tween=gsap.to(target,{opacity:0,duration:0.38,overwrite:'auto'});
    });
    register(tween);
    return {tween,target};
  }
  function emit(event={}){
    if(isReduced())return quiet;
    const count=particleCount(event.particles);
    let alive=0;
    for(let index=0;index<count;index++){
      const particle=pool.spawn({event:event.id||'fx'});
      if(particle.alive)alive++;
    }
    let tween=null;
    let target=null;
    if(event.timeline)register(event.timeline);
    if(event.tween){
      const created=createTween();
      tween=created.tween;
      target=created.target;
    }
    if(event.flash){
      addClass(FLASH_CLASS);
      if(typeof event.flash==='string'&&/^[a-z0-9-]+$/.test(event.flash))
        addClass(FLASH_CLASS+'-'+event.flash);
    }
    if(event.shake)addClass(SHAKE_CLASS);
    queue.push({
      id:event.id||event.sound||'fx',
      particles:alive,
      flash:event.flash||null,
      shake:!!event.shake
    });
    if(event.sound)safeCall(audio?.play,event.sound);
    if(event.haptic)safeCall(haptics?.pulse,event.haptic);
    return {emitted:true,particles:alive,tween,target};
  }
  function emitDev(event){
    if(!devBuild())return quiet;
    return emit(event);
  }
  function settle(){
    for(const owned of tweens){
      try{owned?.tween?.kill();}catch{/* already dead */}
    }
    tweens.length=0;
    try{context?.revert();}catch{/* context already reverted */}
    context=null;
    try{pool.drain();}catch{/* pool already empty */}
    queue.length=0;
    try{clearClasses();}catch{/* root already gone */}
  }
  return {
    attach,emit,emitDev,register,settle,pool,
    liveParticles:()=>pool.liveCount(),
    tweenCount:()=>tweens.length,
    queued:()=>queue.length
  };
}
