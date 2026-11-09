import {HONEY_MOTION} from './tokens.js';
import {power2Out} from './ease.js';

const FILL_MAX=78;
export function fillHeightPercent(tally,target){
  return FILL_MAX*fillFraction(tally,target);
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
