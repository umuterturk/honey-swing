// End caps reserved for snap-danger wasps past ±limit. Marker + ticks share this band.
export const METER_DANGER_EDGE_PCT=11;

// The marker and every tick must use exactly the same geometric scale.
export function meterPercent(value,limit){
  if(!Number.isFinite(value)||!Number.isFinite(limit)||limit<=0){
    throw new RangeError('Meter position and limit must be finite; limit must be positive');
  }
  const half=50-METER_DANGER_EDGE_PCT;
  return Math.max(METER_DANGER_EDGE_PCT,Math.min(100-METER_DANGER_EDGE_PCT,50+(value/limit)*half));
}

// Eight intervals for divisible-by-four limits; otherwise five broadly spaced ticks.
// This avoids crowded fractional/near-duplicate labels when future levels change limits.
export function meterMarks(limit){
  if(!Number.isInteger(limit)||limit<=0)throw new RangeError('Meter limit must be a positive integer');
  if(limit%4===0){
    const step=limit/4;
    return Array.from({length:9},(_,i)=>(i-4)*step);
  }
  return [...new Set([-limit,-Math.round(limit/2),0,Math.round(limit/2),limit])].sort((a,b)=>a-b);
}
