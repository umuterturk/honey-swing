import {FACTORS,dealValue} from './factors.js';

// Presentation values are derived from the canonical Overswing deal.
// No independent casual multiplier calculations or persisted UI multipliers.
export function multiplierParts(deal){
  return FACTORS.map(factor=>({
    kind:factor.kind,
    value:dealValue(factor,deal),
    label:factor.label
  }));
}

// Source flags are emitted by stepOverswing, after all strict-crossing,
// zero-break and Snap rules have run. Never invent rewards from UI movement.
export function multiplierRewards(deal,lastAction){
  if(!lastAction||lastAction.snap||lastAction.zeroBreak)return [];
  return multiplierParts(deal).filter(part=>{
    const factor=FACTORS.find(row=>row.kind===part.kind);
    return !!factor&&!!lastAction[factor.gainedFlag];
  });
}
