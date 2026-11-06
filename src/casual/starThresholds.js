// Honey intensity thresholds. Secured is deal.T. Nothing here writes a score.
// honey2 = star2 and honey3 = star3. The field names stay so this numeric
// source does not need a rename. Nothing in the win or fail UI reads them as stars.
// Appendix A, with Appendix B locked: L11/L18 honey3 = 32/30, L1/L2/L5 auto Hiveful.
export const STAR_THRESHOLDS=Object.freeze({
  1:Object.freeze({target:5,star2:5,star3:5,auto3:true}),
  2:Object.freeze({target:6,star2:6,star3:6,auto3:true}),
  3:Object.freeze({target:8,star2:11,star3:13,auto3:false}),
  4:Object.freeze({target:11,star2:18,star3:24,auto3:false}),
  5:Object.freeze({target:6,star2:6,star3:6,auto3:true}),
  6:Object.freeze({target:13,star2:18,star3:22,auto3:false}),
  7:Object.freeze({target:10,star2:22,star3:34,auto3:false}),
  8:Object.freeze({target:17,star2:28,star3:38,auto3:false}),
  9:Object.freeze({target:11,star2:17,star3:17,auto3:false}),
  10:Object.freeze({target:10,star2:14,star3:18,auto3:false}),
  11:Object.freeze({target:9,star2:21,star3:32,auto3:false}),
  12:Object.freeze({target:24,star2:33,star3:41,auto3:false}),
  13:Object.freeze({target:16,star2:27,star3:38,auto3:false}),
  14:Object.freeze({target:20,star2:38,star3:56,auto3:false}),
  15:Object.freeze({target:30,star2:36,star3:41,auto3:false}),
  16:Object.freeze({target:11,star2:17,star3:17,auto3:false}),
  17:Object.freeze({target:10,star2:14,star3:18,auto3:false}),
  18:Object.freeze({target:9,star2:20,star3:30,auto3:false}),
  19:Object.freeze({target:24,star2:33,star3:41,auto3:false}),
  20:Object.freeze({target:6,star2:7,star3:7,auto3:false})
});

const PRAISE=Object.freeze([
  null,
  Object.freeze({tier:1,text:'Nectar!',sound:'praise.nectar'}),
  Object.freeze({tier:2,text:'Amber!',sound:'praise.amber'}),
  Object.freeze({tier:3,text:'Hiveful!',sound:'praise.hiveful'})
]);
const BURST=Object.freeze([0,16,20,24]);
const BURST_RADIUS=Object.freeze([0,56,72,88]);
const FLIGHT=Object.freeze([0,8,12,16]);
const FLIGHT_SIZE=Object.freeze([0,16,18,20]);
// PM override: the count-up is a fixed 0.600s, not the digit-based 40/80/120ms.
export const COUNT_UP_SECONDS=0.6;

function integer(value){
  const number=Math.trunc(Number(value));
  return Number.isFinite(number)?number:0;
}

function tierCount(table,tier){
  const count=table[tier];
  return count>0?count:0;
}

// Highest qualifying honey intensity, H3 then H2 then H1. Equal thresholds grant H3.
// L1, L2, and L5 are Hiveful on any win.
export function honeyTier(levelId,secured){
  const row=STAR_THRESHOLDS[levelId];
  if(!row)throw new RangeError('Unknown level '+levelId);
  const score=integer(secured);
  if(score<row.target)return 0;
  if(row.auto3)return 3;
  if(score>=row.star3)return 3;
  if(score>=row.star2)return 2;
  return 1;
}

export function praiseFor(tier){
  return PRAISE[tier]||null;
}

export function burstParticles(tier){
  return tierCount(BURST,tier);
}

export function burstRadius(tier){
  return tierCount(BURST_RADIUS,tier);
}

export function flightDroplets(tier){
  return tierCount(FLIGHT,tier);
}

export function flightDropletSize(tier){
  return tierCount(FLIGHT_SIZE,tier);
}

export function countUpDuration(){
  return COUNT_UP_SECONDS;
}

// Floor until the eased progress completes, then the exact engine integer.
export function displayedCount(progress,secured){
  const target=integer(secured);
  if(!(progress<1))return target;
  if(progress<=0||target<=0)return 0;
  const shown=Math.floor(target*progress);
  if(!Number.isFinite(shown))return 0;
  return Math.min(target,Math.max(0,shown));
}
