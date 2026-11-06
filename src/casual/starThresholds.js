// Presentation-only star table. Secured is deal.T. Nothing here writes a score.
// Appendix A, with Appendix B locked: L11/L18 star3 = 32/30, L1/L2/L5 auto 3★.
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
  Object.freeze({tier:1,text:'Sweet!',sound:'praise.sweet'}),
  Object.freeze({tier:2,text:'Tasty!',sound:'praise.tasty'}),
  Object.freeze({tier:3,text:'Divine!',sound:'praise.divine'})
]);
const BURST=Object.freeze([0,12,18,24]);

function integer(value){
  const number=Math.trunc(Number(value));
  return Number.isFinite(number)?number:0;
}

// Highest qualifying tier, 3 then 2 then 1. Equal thresholds grant the higher tier.
export function winStars(levelId,secured){
  const row=STAR_THRESHOLDS[levelId];
  if(!row)throw new RangeError('Unknown level '+levelId);
  const score=integer(secured);
  if(score<row.target)return 0;
  if(row.auto3)return 3;
  if(score>=row.star3)return 3;
  if(score>=row.star2)return 2;
  return 1;
}

export function praiseFor(stars){
  return PRAISE[stars]||null;
}

export function burstParticles(stars){
  const count=BURST[stars];
  return count>0?count:0;
}

// duration = min(0.700, 0.040 × digits). The count then holds until 0.900.
export function countUpDuration(secured){
  const value=Math.abs(integer(secured));
  const text=String(value);
  const digits=text.includes('e')||text.includes('E')?21:Math.max(1,text.length);
  const duration=0.040*digits;
  return duration>0.700?0.700:duration;
}

// Every frame is an integer. Progress at or past the end is the engine value.
export function displayedCount(progress,secured){
  const target=integer(secured);
  if(!(progress<1))return target;
  if(progress<=0||target<=0)return target<0?0:0;
  const shown=Math.round(target*progress);
  if(!Number.isFinite(shown))return 0;
  return Math.min(target,Math.max(0,shown));
}
