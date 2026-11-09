import {burstParticles,burstRadius as burstTravel,flightDropletSize,flightDroplets} from '../starThresholds.js';
import {clamp01,honeyEaseOut} from './ease.js';
import {HONEY_MOTION,HONEY_TOKENS} from './tokens.js';

const BURST_DIAMETER=Object.freeze([22,28,34]);
const CONFETTI_SHAPE=Object.freeze(['rect','circle','rect']);
const OVERFLOW=Object.freeze({
  1:Object.freeze([
    Object.freeze({kind:'bead',x:'65%',w:8,h:10}),
    Object.freeze({kind:'drip',x:'65%',w:4,h:16})
  ]),
  2:Object.freeze([
    Object.freeze({kind:'bead',x:'35%',w:10,h:10}),
    Object.freeze({kind:'bead',x:'65%',w:10,h:10}),
    Object.freeze({kind:'drip',x:'35%',w:4,h:20}),
    Object.freeze({kind:'drip',x:'65%',w:4,h:20})
  ]),
  3:Object.freeze([
    Object.freeze({kind:'bead',x:'30%',w:12,h:10}),
    Object.freeze({kind:'bead',x:'50%',w:12,h:10}),
    Object.freeze({kind:'bead',x:'70%',w:12,h:10}),
    Object.freeze({kind:'drip',x:'30%',w:5,h:24}),
    Object.freeze({kind:'drip',x:'50%',w:5,h:24}),
    Object.freeze({kind:'drip',x:'70%',w:5,h:24})
  ])
});
export function flightEmitTime(index,count){
  const {emitStart,emitEnd}=HONEY_MOTION.flight;
  const total=count|0;
  if(total<=1)return emitStart;
  const slot=Math.min(Math.max(0,index|0),total-1);
  return emitStart+(emitEnd-emitStart)*slot/(total-1);
}

export function flightOpacity(age){
  const {fadeIn,hold,fadeOut,life}=HONEY_MOTION.flight;
  if(!(age>0)||age>=life)return 0;
  if(age<fadeIn)return age/fadeIn;
  if(age<fadeIn+hold)return 1;
  return Math.max(0,1-(age-fadeIn-hold)/fadeOut);
}

export function flightPosition(progress,source,mouth){
  const p=honeyEaseOut(progress);
  const control={
    x:(source.x+mouth.x)/2,
    y:Math.min(source.y,mouth.y)-HONEY_MOTION.flight.lift
  };
  const u=1-p;
  return {
    x:u*u*source.x+2*u*p*control.x+p*p*mouth.x,
    y:u*u*source.y+2*u*p*control.y+p*p*mouth.y,
    control
  };
}

export function burstDiameter(index){
  return BURST_DIAMETER[Math.abs(index|0)%BURST_DIAMETER.length];
}

export function burstOffset(index,count,progress,radius){
  const total=Math.max(count|0,1);
  const p=clamp01(progress);
  const theta=Math.PI*((index|0)+0.5)/total;
  const travel=Number(radius)||0;
  return {
    x:Math.cos(theta)*travel*p,
    y:-Math.sin(theta)*travel*4*p*(1-p)+24*p,
    opacity:p<=0.5?1:(1-p)/0.5
  };
}

// CSS px per second. At mid-life every droplet still has its own non-zero velocity.
export function burstVelocity(index,count,progress,radius,life=HONEY_MOTION.burst.life){
  const total=Math.max(count|0,1);
  const p=clamp01(progress);
  const theta=Math.PI*((index|0)+0.5)/total;
  const span=Number(radius)||0;
  const rate=life>0?1/life:0;
  return {
    vx:Math.cos(theta)*span*rate,
    vy:(-Math.sin(theta)*span*4*(1-2*p)+24)*rate
  };
}

function scaleFactor(scale){
  const value=Number(scale);
  if(!(value>0))return 0;
  if(value<1)return 0.5;
  return 1;
}

export function honeyParticles({t,tier=1,scale=1,source,mouth,flightCount,flightSize=0,burstCount,burstRadius=0}={}){
  const factor=scaleFactor(scale);
  const life=HONEY_MOTION.flight.life;
  const flightTotal=Number.isFinite(flightCount)?Math.max(0,flightCount):flightDroplets(tier);
  const droplet=flightSize>0?flightSize:flightDropletSize(tier);
  const burstTotal=Number.isFinite(burstCount)?Math.max(0,burstCount):burstParticles(tier);
  const travel=burstRadius>0?burstRadius:burstTravel(tier);
  const list=[];
  const flights=Math.floor(flightTotal*factor);
  for(let index=0;index<flights;index++){
    const emit=flightEmitTime(index,flightTotal);
    const age=t-emit;
    if(age<0||age>=life)continue;
    const pose=flightPosition(age/life,source,mouth);
    list.push({
      key:'flight-'+index,owner:'honey-win',absolute:true,event:'honey-flight',
      x:pose.x,y:pose.y,opacity:flightOpacity(age),
      diameter:droplet,radius:droplet/2,
      color:HONEY_TOKENS.flight,edge:HONEY_TOKENS.flightEdge
    });
  }
  // Flight is finished by 0.480 (last emit 0.160 + life 0.320). Confetti starts
  // at 0.800, so the two never share the pool. H3 peaks at 24, under the cap
  // of 40, and confetti is not dropped to make room. Pieces stop at settle
  // (1.300) so a 0.550s life cannot leave pieces past the settled card.
  const age=t-HONEY_MOTION.burst.start;
  const bursts=Math.floor(burstTotal*factor);
  if(t<HONEY_MOTION.settled&&age>=0&&age<HONEY_MOTION.burst.life){
    const progress=age/HONEY_MOTION.burst.life;
    for(let index=0;index<bursts;index++){
      const pose=burstOffset(index,burstTotal,progress,travel);
      const velocity=burstVelocity(index,burstTotal,progress,travel);
      const diameter=burstDiameter(index);
      list.push({
        key:'burst-'+index,owner:'honey-win',absolute:true,event:'win-burst',
        x:mouth.x+pose.x,y:mouth.y+pose.y,opacity:pose.opacity,
        vx:velocity.vx,vy:velocity.vy,
        diameter,radius:diameter/2,
        shape:CONFETTI_SHAPE[index%CONFETTI_SHAPE.length],
        color:HONEY_TOKENS.burst[index%HONEY_TOKENS.burst.length]
      });
    }
  }
  return list;
}
