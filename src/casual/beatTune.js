// Presentation timing only. Polish these numbers here; the motion code reads them.
// Times are seconds. Scales are unitless multipliers.

export const BEAT=Object.freeze({
  period:1.1,
  lubScale:1.1,
  dubScale:1.05,
  restScale:1,
  pulse:0.09,
  dubAt:0.18,
  stagger:0.12,
  glow:'#f0c14a',
  glowLub:0.35,
  glowDub:0.18,
  glowRest:0,
  hintGlowLub:0.55,
  hintGlowDub:0.28,
  reducedGlow:0.35,
  hintCopy:'Tap a card.',
  handDelay:4,
  reducedOutline:'3px solid #e9b34f',
  dim:'rgba(20,12,8,0.18)',
  dimIn:0.1,
  dimHold:0.08,
  dimOut:0.18,
  popOut:0.08,
  popHold:0.04,
  popBack:0.12,
  meterPop:1.04,
  needlePop:1.1,
  // First-session landing shade covers this many committed plays.
  dimPlays:3,
  // Heartbeat and the move-1 hint stop once this many plays have committed.
  coachingPlays:2
});

// Snap, and the L3 −5 teach, stay on the flight that shipped before the slower bands.
const LEGACY=Object.freeze({
  steer:Object.freeze({faceEnd:null,centerAt:0.220,cardArrive:0.420,glide:0.200}),
  flip:Object.freeze({faceEnd:0.140,centerAt:0.280,cardArrive:0.480,glide:0.200}),
  snapGlide:0.180
});

const EARLY=Object.freeze({
  steer:Object.freeze({faceEnd:null,centerAt:0.293,cardArrive:0.560,glide:0.360}),
  flip:Object.freeze({faceEnd:0.140,centerAt:0.353,cardArrive:0.620,glide:0.360})
});

const LATER=Object.freeze({
  steer:Object.freeze({faceEnd:null,centerAt:0.262,cardArrive:0.500,glide:0.280}),
  flip:Object.freeze({faceEnd:0.140,centerAt:0.322,cardArrive:0.560,glide:0.280})
});

export function flightBand({type='steer',snap=false,teach=false,levelId=1}={}){
  const flip=type==='flip';
  if(snap){
    const base=flip?LEGACY.flip:LEGACY.steer;
    return {faceEnd:base.faceEnd,centerAt:base.centerAt,cardArrive:base.cardArrive,glide:LEGACY.snapGlide};
  }
  if(teach)return flip?LEGACY.flip:LEGACY.steer;
  const band=Number(levelId)<=2?EARLY:LATER;
  return flip?band.flip:band.steer;
}
