// Honey intensity. Secured is deal.T. Nothing here writes a score.
// honeyTier reads the garden record. honey2 = star2 and honey3 = star3.
// Nothing in the win or fail UI reads them as stars.
// Appendix A, with Appendix B locked: L11/L18 honey3 = 32/30, L1/L2/L5 auto Hiveful.
import {GARDEN} from './levels/garden.js';

const RECORD=new Map(GARDEN.map(level=>[level.id,level]));

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
// Score reveal count-up during the post-Hiveful scoreboard beat (1.3→1.75).
export const COUNT_UP_SECONDS=0.45;

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
  const row=RECORD.get(levelId);
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
