import {flightBand} from './beatTune.js';
import {FACTORS} from './factors.js';

// Visual schedule only. finishPresentation does not wait on these times.
// Flip reward particles start at the audit's 0.300s trace, after the 0.220s
// face/meter callback. Steer keeps the existing 0.080s meter and 0.160s reward.
const thirds=n=>Math.round(n*1000)/1000;
const rewarded=rewards=>new Set((rewards||[]).map(reward=>reward?.kind));
function holdFor(kinds){
  let hold=0;
  for(const factor of FACTORS){
    if(kinds.has(factor.kind))hold=Math.max(hold,factor.hold||0);
  }
  return hold;
}
export const STATIC_OUTCOME_MS=1100;
export const NEEDLE_GLIDE_EASE='power2.out';
// Shared with motion/factorFlyer.js — keep factors/end marks in sync.
export const FACTOR_FLYER_FLIGHT=0.95;

function inverseNeedleGlideEase(progress){
  const p=Math.max(0,Math.min(1,progress));
  return 1-Math.cbrt(1-p);
}

export function zeroCrossMark({from,to,meterStart,meterEnd}){
  if(!Number.isFinite(from)||!Number.isFinite(to)||
     !Number.isFinite(meterStart)||!Number.isFinite(meterEnd))return null;
  if(from===0)return thirds(meterStart);
  const crosses=(from<0&&to>=0)||(from>0&&to<=0);
  if(!crosses)return null;
  const span=from-to;
  if(span===0)return thirds(meterStart);
  const t=inverseNeedleGlideEase(from/span);
  return thirds(meterStart+(meterEnd-meterStart)*t);
}

export function cardMotionMarks({
  type='steer',snap=false,rewards=[],from,to,levelId=1,teach=false
}={}){
  const kinds=rewarded(rewards);
  const swingHold=holdFor(kinds);
  const crossFactor=FACTORS.find(factor=>factor.flyerAt==='cross'&&factor.flyer);
  const faceFactor=FACTORS.find(factor=>factor.flyerAt==='face'&&factor.flyer);
  // Part 1: fly to center and grow. Part 2: dive to the current needle and fade.
  // Needle glides only after that landing. Flip still reveals its face in part 1.
  // Snap and the L3 −5 teach keep today's flight. Pour and rewards use meterEnd.
  const band=flightBand({type,snap,teach,levelId});
  const faceEnd=band.faceEnd;
  const centerAt=band.centerAt;
  const cardArrive=band.cardArrive;
  const meterStart=cardArrive;
  const meterEnd=thirds(cardArrive+band.glide);
  const base={faceEnd,centerAt,meterStart,meterEnd,reveal:meterEnd,cardArrive};
  // Card arrives → needle settles → tap pours into Pot (or Snap C-arc path).
  if(snap){
    const snapAt=meterEnd;
    return {
      ...base,rewards:null,swingFlyer:null,flipFlyer:null,
      copyStart:cardArrive,snapAt,waspHit:snapAt,
      heartFly:thirds(snapAt+0.060),heartHit:thirds(snapAt+0.720),
      needleHome:thirds(snapAt+0.900),end:thirds(snapAt+1.370)
    };
  }
  const pourStart=meterEnd;
  const pourEnd=thirds(pourStart+0.72);
  if(!rewards.length){
    return {...base,rewards:null,swingFlyer:null,flipFlyer:null,
      pourStart,pourEnd,add:pourStart,pot:pourEnd,
      factors:thirds(meterEnd+0.02),end:thirds(pourEnd+0.08)};
  }
  const hasSwing=!!(crossFactor&&kinds.has(crossFactor.kind));
  const hasFlip=!!(faceFactor&&kinds.has(faceFactor.kind));
  const swingFlyer=hasSwing
    ?(zeroCrossMark({from,to,meterStart,meterEnd})??meterStart)
    :null;
  const flipFlyer=hasFlip&&faceEnd!=null?faceEnd:null;
  const rewardStarts=[swingFlyer,flipFlyer].filter(t=>t!=null);
  const rewardStart=rewardStarts.length?Math.min(...rewardStarts):meterEnd;
  const shift=rewardStart-0.16;
  const flyerDone=Math.max(
    0,
    ...(hasSwing?[swingFlyer+FACTOR_FLYER_FLIGHT]:[]),
    ...(hasFlip?[flipFlyer+FACTOR_FLYER_FLIGHT]:[])
  );
  return {
    ...base,
    rewards:rewardStart,
    swingFlyer,
    flipFlyer,
    flyers:[
      swingFlyer!=null&&crossFactor?{kind:crossFactor.kind,at:swingFlyer,from:crossFactor.flyerFrom}:null,
      flipFlyer!=null&&faceFactor?{kind:faceFactor.kind,at:flipFlyer,from:faceFactor.flyerFrom}:null
    ].filter(Boolean),
    pourStart,pourEnd,
    factors:thirds(Math.max(flyerDone,0.58+shift)),
    add:pourStart,
    travel:thirds(0.64+swingHold+shift),
    pot:pourEnd,
    end:thirds(Math.max(1.08+swingHold+shift,pourEnd+0.08,flyerDone+0.06))
  };
}

// Must match .sgv-meter-scale horizontal inset in styles/meter.css (marker/tick % scale).
export const METER_SCALE_INSET_X=12;

// Reward flyers use the committed meter percent, never the marker's live left.
export function flyerOrigin({track,root,finalPercent}){
  const percent=Math.max(0,Math.min(100,finalPercent));
  const inset=METER_SCALE_INSET_X;
  const usable=Math.max(0,track.width-inset*2);
  return {
    x:(track.left-root.left)+inset+usable*(percent/100),
    y:(track.top-root.top)+track.height/2
  };
}

// Reduced motion keeps the committed numbers and static +N / factor labels.
// It does not travel, shake, or hold input.
export function reducedCardSummary(view){
  const rewards=view?.rewards||[];
  const snap=!!view?.snap;
  const kinds=new Set(rewards.map(r=>r.kind));
  const pourFly=!snap&&view.addedToPot>0?view?.pourFly:null;
  const crossFactor=FACTORS.find(factor=>factor.flyerAt==='cross'&&factor.flyer);
  const faceFactor=FACTORS.find(factor=>factor.flyerAt==='face'&&factor.flyer);
  const flyers=!snap?FACTORS.filter(factor=>factor.flyer&&kinds.has(factor.kind)).map(factor=>({
    kind:factor.kind,copy:factor.flyer
  })):[];
  return {
    position:snap?0:view.to,
    rawPot:view.rawPotAfter,
    factors:view.factorsAfter,
    pourFly,
    flower:!snap&&crossFactor&&kinds.has(crossFactor.kind)?crossFactor.flyer:null,
    bee:!snap&&faceFactor&&kinds.has(faceFactor.kind)?faceFactor.flyer:null,
    flyers,
    cross:null,
    shake:false
  };
}

export function reducedBankSummary(fromScore,toScore){
  const gain=toScore-fromScore;
  return {pot:0,secured:toScore,gain:gain>0?'+'+gain:null};
}
