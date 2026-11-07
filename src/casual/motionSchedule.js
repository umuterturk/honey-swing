// Visual schedule only. finishPresentation does not wait on these times.
// Flip reward particles start at the audit's 0.300s trace, after the 0.220s
// face/meter callback. Steer keeps the existing 0.080s meter and 0.160s reward.
const thirds=n=>Math.round(n*1000)/1000;
export const STATIC_OUTCOME_MS=1100;

export function zeroCrossMark({from,to,meterStart,meterEnd}){
  if(!Number.isFinite(from)||!Number.isFinite(to)||
     !Number.isFinite(meterStart)||!Number.isFinite(meterEnd))return null;
  if(from===0)return thirds(meterStart);
  const crosses=(from<0&&to>=0)||(from>0&&to<=0);
  if(!crosses)return null;
  const span=from-to;
  if(span===0)return thirds(meterStart);
  const t=Math.max(0,Math.min(1,from/span));
  return thirds(meterStart+(meterEnd-meterStart)*t);
}

export function cardMotionMarks({type='steer',snap=false,rewards=[],from,to}={}){
  const swingHold=rewards.some(reward=>reward?.kind==='swing')?0.05:0;
  const flip=type==='flip';
  // Part 1: fly to center and grow. Part 2: dive to the current needle and fade.
  // Needle glides only after that landing. Flip still reveals its face in part 1.
  const faceEnd=flip?0.140:null;
  const centerAt=flip?0.280:0.220;
  const cardArrive=flip?0.480:0.420;
  const meterStart=cardArrive;
  const meterEnd=thirds(cardArrive+(snap?0.180:0.200));
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
  const hasSwing=rewards.some(r=>r?.kind==='swing');
  const hasFlip=rewards.some(r=>r?.kind==='flip');
  const swingFlyer=hasSwing
    ?(zeroCrossMark({from,to,meterStart,meterEnd})??meterStart)
    :null;
  const flipFlyer=hasFlip&&faceEnd!=null?faceEnd:null;
  const rewardStarts=[swingFlyer,flipFlyer].filter(t=>t!=null);
  const rewardStart=rewardStarts.length?Math.min(...rewardStarts):meterEnd;
  const shift=rewardStart-0.16;
  return {
    ...base,
    rewards:rewardStart,
    swingFlyer,
    flipFlyer,
    pourStart,pourEnd,
    factors:thirds(Math.max(
      ...(hasSwing?[swingFlyer+0.45]:[]),
      ...(hasFlip?[flipFlyer+0.45]:[]),
      0.58+shift
    )),
    add:pourStart,
    travel:thirds(0.64+swingHold+shift),
    pot:pourEnd,
    end:thirds(Math.max(1.08+swingHold+shift,pourEnd+0.08))
  };
}

// Must match .sgv-meter-scale horizontal inset in minimal.css (marker/tick % scale).
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
  return {
    position:snap?0:view.to,
    rawPot:view.rawPotAfter,
    factors:view.factorsAfter,
    add:!snap&&view.addedToPot>0?'+'+view.addedToPot:null,
    flower:!snap&&kinds.has('swing')?'More Flower':null,
    bee:!snap&&kinds.has('flip')?'More Bee':null,
    cross:null,
    shake:false
  };
}

export function reducedBankSummary(fromScore,toScore){
  const gain=toScore-fromScore;
  return {pot:0,secured:toScore,gain:gain>0?'+'+gain:null};
}
