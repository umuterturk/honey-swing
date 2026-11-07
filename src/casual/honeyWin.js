import {burstParticles,burstRadius as burstTravel,flightDropletSize,flightDroplets} from './starThresholds.js';

// Presentation geometry for the honey-jar win. Nothing here writes a score.
// Fill-first 2.0s celebration: jar fill is the hero; score counts after Hiveful.
export const HONEY_MOTION=Object.freeze({
  cap:2,
  settled:1.75,
  scrim:Object.freeze({start:0,end:0.15,opacity:1}),
  foliage:Object.freeze({start:0,end:0.25,fromY:12}),
  jarEntrance:Object.freeze({
    start:0.15,end:0.35,fromScale:0.92,peakScale:1.03,toScale:1
  }),
  fill:Object.freeze({start:0.35,end:1.05,ease:'power2.out'}),
  praise:Object.freeze({
    start:1,peakEnd:1.14,end:1.22,underlineAt:1.08,opacityEnd:1.1,
    fromScale:0.55,peakScale:1.14,toScale:1
  }),
  scoreboard:Object.freeze({
    start:1.1,end:1.75,fromScale:0.86,toScale:1,fromY:48
  }),
  flight:Object.freeze({
    emitStart:0.1,emitEnd:0.16,life:0.32,
    fadeIn:0.04,hold:0.2,fadeOut:0.08,lift:48
  }),
  count:Object.freeze({start:1.3,duration:0.45,end:1.75,ease:'power2.out'}),
  burst:Object.freeze({start:1.05,life:0.4}),
  subline:Object.freeze({start:1.25,end:1.25,opacity:0}),
  cta:Object.freeze({start:1.75,end:2,from:0,to:1,leg:0.2})
});

// Overlay aliases. Component CSS mirrors these custom properties.
export const HONEY_TOKENS=Object.freeze({
  scrim:'#1a0f12',
  scrimOpacity:1,
  backing:'transparent',
  backingOpacity:0,
  praise:Object.freeze({
    1:Object.freeze({fill:'#fff0cf',outline:'#704b69'}),
    2:Object.freeze({fill:'#f0c14a',outline:'#5a3a12'}),
    3:Object.freeze({fill:'#ffe08a',outline:'#5a3a12',glow:'0 0 18px #f0c14a88'})
  }),
  honeyBody:'#e8a317',
  honeyDepth:'#c47a0a',
  honeySurface:'#ffe08a',
  count:'#f0c14a',
  countOutline:'#3b2410',
  subline:'#fff0cf',
  flight:'#f0c14a',
  flightEdge:'#c47a0a',
  burst:Object.freeze(['#ff4d7d','#ffd24a','#6ec8ff','#c9a0ff','#ffa24a','#5ee0a8']),
  glassRim:'#acd7f7',
  easeOut:'cubic-bezier(.2,.8,.2,1)',
  easeBack:'cubic-bezier(.34,1.56,.64,1)'
});

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

function clamp01(value){
  const number=Number(value);
  if(!Number.isFinite(number)||number<=0)return 0;
  if(number>=1)return 1;
  return number;
}

function cubicBezier(x1,y1,x2,y2){
  const cx=3*x1;
  const bx=3*(x2-x1)-cx;
  const ax=1-cx-bx;
  const cy=3*y1;
  const by=3*(y2-y1)-cy;
  const ay=1-cy-by;
  function sampleX(t){return ((ax*t+bx)*t+cx)*t;}
  function sampleY(t){return ((ay*t+by)*t+cy)*t;}
  function sampleDX(t){return (3*ax*t+2*bx)*t+cx;}
  return function ease(x){
    if(x<=0)return 0;
    if(x>=1)return 1;
    let t=x;
    for(let i=0;i<8;i++){
      const slope=sampleDX(t);
      if(Math.abs(slope)<1e-6)break;
      t-=(sampleX(t)-x)/slope;
      if(t<0)t=0;
      else if(t>1)t=1;
    }
    return sampleY(t);
  };
}

export const honeyEaseOut=cubicBezier(.2,.8,.2,1);
export const honeyEaseBack=cubicBezier(.34,1.56,.64,1);

// GSAP power2.out is 1-(1-p)^3 (Power2 follows Cubic in the GSAP ease table).
export function power2Out(t){
  const p=clamp01(t);
  return 1-Math.pow(1-p,3);
}

export function invertPower2Out(y){
  const eased=clamp01(y);
  return 1-Math.cbrt(Math.max(0,1-eased));
}

function hexChannels(hex){
  const value=parseInt(String(hex).replace('#',''),16);
  return [(value>>16)&255,(value>>8)&255,value&255];
}

function composite(top,alpha,bottom){
  return top.map((channel,index)=>channel*alpha+bottom[index]*(1-alpha));
}

export function compositeBacking(board=[255,255,255]){
  const ink=hexChannels(HONEY_TOKENS.scrim);
  const scrim=composite(ink,HONEY_TOKENS.scrimOpacity,board);
  const text=HONEY_TOKENS.backingOpacity>0
    ?composite(ink,HONEY_TOKENS.backingOpacity,scrim)
    :scrim;
  return {text,scrim};
}

function linearize(channel){
  const value=channel/255;
  return value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4;
}

function luminance(rgb){
  return 0.2126*linearize(rgb[0])+0.7152*linearize(rgb[1])+0.0722*linearize(rgb[2]);
}

export function contrastRatio(hex,background){
  const fg=hexChannels(hex);
  const bg=Array.isArray(background)?background:background.text;
  const lighter=Math.max(luminance(fg),luminance(bg));
  const darker=Math.min(luminance(fg),luminance(bg));
  return (lighter+0.05)/(darker+0.05);
}

const FILL_MAX=78;
const HUD_PAD=10;
const HUD_H=54;

export function honeyLayout(width,height,insets={}){
  const top=Number(insets.top)||0;
  const right=Number(insets.right)||0;
  const bottom=Number(insets.bottom)||0;
  const left=Number(insets.left)||0;
  const safeW=width-left-right;
  const safeH=height-top-bottom;
  const short=safeH<520;
  const hud={x:left,y:top+HUD_PAD,w:safeW,h:HUD_H,bottom:top+HUD_PAD+HUD_H};
  const praiseH=64;
  const praiseY=top+2;
  const praiseX=left+16;
  const reset={x:width-right-16-44,y:top+16,w:44,h:44};
  let praiseW=safeW-32;
  if(praiseY<reset.y+reset.h&&praiseX+praiseW>reset.x)
    praiseW=Math.max(120,reset.x-8-praiseX);
  const jarW=Math.min(220,0.62*safeW);
  const naturalH=jarW*1.25;
  const scoreboardH=188;
  const praiseGap=8;
  const jarGap=8;
  const ctaH=70;
  // Raise NEXT by one button height; chrome packs into the band above it.
  // Foliage/scrim/warm-light stay pinned to the viewport.
  const ctaY=height-bottom-16-ctaH-ctaH;
  const limit=ctaY-12;
  let jarH=naturalH;
  if(short)jarH=Math.min(jarH,Math.max(96,safeH-348));
  const minJarY=top+2+praiseH+praiseGap;
  const maxBody=limit-minJarY-jarGap-scoreboardH;
  if(maxBody>0)jarH=Math.min(jarH,maxBody);
  const maxJarY=Math.max(minJarY,limit-scoreboardH-jarGap-jarH);
  // Prefer the jar's vertical center near mid-screen, then clamp into the free band.
  const idealJarY=top+safeH*0.46-jarH/2;
  const jarY=Math.min(maxJarY,Math.max(minJarY,idealJarY));
  // Lift the slogan ~1/5 of its slot height above the previous baseline.
  const praiseTop=Math.max(top,Math.max(top+2,jarY-praiseGap-praiseH)-Math.round(praiseH*0.2));
  const scoreboardY=jarY+jarH+jarGap;
  const contentX=left+16;
  const contentW=safeW-32;
  const jarX=left+(safeW-jarW)/2;
  return {
    safeW,safeH,short,hud,
    praise:{
      x:praiseX,y:praiseTop,w:praiseW,h:praiseH,
      font:Math.min(48,Math.max(40,40+(safeW-320)*8/70))
    },
    jar:{x:jarX,y:jarY,w:jarW,h:jarH},
    scoreboard:{
      x:contentX,y:scoreboardY,w:contentW,h:scoreboardH,
      font:Math.min(44,Math.max(32,0.11*safeW))
    },
    cta:{
      x:left+(safeW-contentW*0.5)/2,y:ctaY,w:contentW*0.5,h:ctaH
    },
    reset
  };
}

export function fillHeightPercent(tally,target){
  return FILL_MAX*fillFraction(tally,target);
}

export function applyHoneyLayout(node,width,height,insets){
  if(!node||!(width>0)||!(height>0))return null;
  const layout=honeyLayout(width,height,insets);
  const set=(name,value)=>node.style.setProperty(name,value);
  set('--honey-praise-top',layout.praise.y+'px');
  set('--honey-praise-left',layout.praise.x+'px');
  set('--honey-praise-width',layout.praise.w+'px');
  set('--honey-praise-height',layout.praise.h+'px');
  set('--honey-praise-font',layout.praise.font+'px');
  set('--honey-jar-top',layout.jar.y+'px');
  set('--honey-jar-left',layout.jar.x+'px');
  set('--honey-jar-width',layout.jar.w+'px');
  set('--honey-jar-height',layout.jar.h+'px');
  set('--honey-scoreboard-top',layout.scoreboard.y+'px');
  set('--honey-scoreboard-left',layout.scoreboard.x+'px');
  set('--honey-scoreboard-width',layout.scoreboard.w+'px');
  set('--honey-scoreboard-height',layout.scoreboard.h+'px');
  set('--honey-count-font',layout.scoreboard.font+'px');
  set('--honey-reset-top',layout.reset.y+'px');
  set('--honey-reset-right',(width-layout.reset.x-layout.reset.w)+'px');
  return layout;
}

export function fillFraction(tally,target){
  const goal=Number(target);
  if(!(goal>0))return 1;
  const value=Number(tally);
  if(!Number.isFinite(value)||value<=0)return 0;
  return Math.min(1,value/goal);
}

export function overflowReveal(){
  return 0;
}

export function fillFrame(time,secured,target){
  const start=HONEY_MOTION.fill.start;
  const duration=HONEY_MOTION.fill.end-start;
  let linear=0;
  if(time>=start+duration)linear=1;
  else if(time>start)linear=(time-start)/duration;
  const eased=power2Out(linear);
  const finalFraction=fillFraction(secured,target);
  const fraction=finalFraction*eased;
  return {linear,eased,fraction,percent:FILL_MAX*fraction};
}

export function countFrame(time,secured,target){
  const score=Math.trunc(Number(secured));
  const safe=Number.isFinite(score)?Math.max(0,score):0;
  const goal=Number(target);
  const start=HONEY_MOTION.count.start;
  const duration=HONEY_MOTION.count.duration;
  let linear=0;
  if(time>=start+duration)linear=1;
  else if(time>start)linear=(time-start)/duration;
  const eased=power2Out(linear);
  const tally=safe*eased;
  const shown=linear>=1?safe:Math.floor(tally);
  const clipped=Number.isFinite(shown)?Math.min(safe,Math.max(0,shown)):0;
  return {
    linear,eased,tally,
    shown:clipped,
    fraction:fillFraction(tally,target),
    overflow:0,
    targetMet:goal>0&&clipped>=goal
  };
}

export function overflowMarks(){
  return [];
}

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
