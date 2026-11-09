import {HONEY_TOKENS} from './tokens.js';

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
export {clamp01};
