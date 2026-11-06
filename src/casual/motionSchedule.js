// Visual schedule only. finishPresentation does not wait on these times.
// Flip reward particles start at the audit's 0.300s trace, after the 0.220s
// face/meter callback. Steer keeps the existing 0.080s meter and 0.160s reward.
const thirds=n=>Math.round(n*1000)/1000;
export const STATIC_OUTCOME_MS=1100;

export function cardMotionMarks({type='steer',snap=false,rewards=[]}={}){
  const reveal=type==='flip'?0.22:0.08;
  const swingHold=rewards.some(reward=>reward?.kind==='swing')?0.05:0;
  if(snap)return {reveal,rewards:null,snapAt:0.53,end:0.91};
  if(!rewards.length)return {reveal,rewards:null,add:0.24,pot:0.54,factors:0.55,end:0.62};
  const rewardStart=type==='flip'?0.30:0.16;
  const shift=rewardStart-0.16;
  return {
    reveal,
    rewards:rewardStart,
    factors:thirds(0.58+shift),
    add:thirds(0.63+swingHold+shift),
    travel:thirds(0.64+swingHold+shift),
    pot:thirds(0.96+swingHold+shift),
    end:thirds(1.08+swingHold+shift)
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
