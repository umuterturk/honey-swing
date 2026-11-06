// Visual schedule only. finishPresentation does not wait on these times.
// Flip reward particles start at the audit's 0.300s trace, after the 0.220s
// face/meter callback. Steer keeps the existing 0.080s meter and 0.160s reward.
const thirds=n=>Math.round(n*1000)/1000;
export const STATIC_OUTCOME_MS=1100;

export function cardMotionMarks({type='steer',snap=false,rewards=[]}={}){
  const swingHold=rewards.some(reward=>reward?.kind==='swing')?0.05:0;
  const flip=type==='flip';
  // §3: Flip face 0.000–0.140, meter glide 0.140–0.300, traces at the arrival.
  // Steer traces start when its 0.180 glide ends. Snap's marker is home by 0.340.
  const faceEnd=flip?0.140:null;
  const meterStart=flip?0.140:0;
  const meterEnd=snap?0.340:flip?0.300:(rewards.length?0.180:0.080);
  const base={faceEnd,meterStart,meterEnd,reveal:meterEnd};
  if(snap)return {...base,rewards:null,snapAt:0.280,copyStart:0.140,end:0.340};
  if(!rewards.length){
    return {...base,rewards:null,add:flip?0.300:0.24,pot:flip?0.500:0.54,
      factors:flip?0.300:0.55,end:flip?0.500:0.62};
  }
  const rewardStart=meterEnd;
  const shift=rewardStart-0.16;
  return {
    ...base,
    rewards:rewardStart,
    factors:thirds(0.58+shift),
    add:thirds(0.63+swingHold+shift),
    travel:thirds(0.64+swingHold+shift),
    pot:thirds(0.96+swingHold+shift),
    end:thirds(1.08+swingHold+shift)
  };
}

// Reward flyers use the committed meter percent, never the marker's live left.
export function flyerOrigin({track,root,finalPercent}){
  const percent=Math.max(0,Math.min(100,finalPercent));
  return {
    x:(track.left-root.left)+track.width*(percent/100),
    y:(track.top-root.top)+track.height/2
  };
}

// Reduced motion keeps the committed numbers and a static +N / CROSS label.
// It does not travel, shake, or hold input.
export function reducedCardSummary(view){
  const rewards=view?.rewards||[];
  const snap=!!view?.snap;
  return {
    position:snap?0:view.to,
    rawPot:view.rawPotAfter,
    factors:view.factorsAfter,
    add:!snap&&view.addedToPot>0?'+'+view.addedToPot:null,
    cross:!snap&&rewards.some(reward=>reward.kind==='swing')?'CROSS':null,
    shake:false
  };
}

export function reducedBankSummary(fromScore,toScore){
  const gain=toScore-fromScore;
  return {pot:0,secured:toScore,gain:gain>0?'+'+gain:null};
}
