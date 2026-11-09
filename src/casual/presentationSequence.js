import {HONEY_MOTION} from './honeyWin.js';
import {onboardingLevel,winCta} from './onboardingRound.js';
import {burstParticles,countUpDuration,flightDropletSize,flightDroplets,honeyTier,praiseFor} from './starThresholds.js';

// Level arrival. Times are seconds from a fresh level becoming the current
// screen (after NEW!, when that card showed). The tap-to-start screen stays
// up until CTA or skip; this plan only describes the juice underneath it.
// A tap finishes the juice and still reaches a legal control.
export const LEVEL_START={
  cap:2.5,
  settled:0.880,
  dim:0.35,
  banner:Object.freeze({
    start:0,end:0.220,riseEnd:0.140,
    fromScale:0.85,peakScale:1.06,toScale:1,
    fromY:-24,toY:0,
    riseEase:'back.out',settleEase:'sine.out',
    outStart:0.700,outEnd:0.880,outEase:'sine.in'
  }),
  jar:Object.freeze({start:0.120,end:0.480,scale:1.35,ease:'power2.inOut'}),
  goal:Object.freeze({start:0.120,end:0.480,fromScale:1.65,toScale:1,ease:'power2.inOut'}),
  board:Object.freeze({
    start:0.400,end:0.700,fromOpacity:0.35,toOpacity:1,fromY:16,toY:0,ease:'power2.out'
  }),
  reducedBanner:0.400,
  dock:Object.freeze({start:0,end:0.800,fromY:-12,fromScale:0.82}),
  idleAt:3,
  idleHint:'after-dismiss',
  idlePulse:Object.freeze([
    [3.000,3.300],[3.300,3.600],[3.600,3.900],[3.900,4.200]
  ])
};

export function levelStartPlan(levelId,{fresh=true,reduced=false}={}){
  const dock=fresh?onboardingLevel(levelId).dock||null:null;
  const timing=dock?LEVEL_START.dock:null;
  const spec={
    cap:LEVEL_START.cap,dim:LEVEL_START.dim,banner:LEVEL_START.banner,
    jar:LEVEL_START.jar,goal:LEVEL_START.goal,board:LEVEL_START.board,
    reducedBanner:LEVEL_START.reducedBanner,idleAt:LEVEL_START.idleAt,
    idleHint:LEVEL_START.idleHint,idlePulse:LEVEL_START.idlePulse
  };
  if(!fresh||reduced){
    return {...spec,motion:false,replay:false,static:!!reduced,
      piece:reduced?null:dock,dock:reduced?null:timing,settled:0,idleOutline:!!reduced};
  }
  return {...spec,motion:true,replay:true,static:false,piece:dock,dock:timing,
    settled:LEVEL_START.settled,idleOutline:false};
}

// An in-flight card/Bank consumes the tap. A level arrival does not.
export function startTap({action=false,arrival=false}={}){
  if(action)return {consume:true,finishArrival:false,pass:false};
  if(arrival)return {consume:false,finishArrival:true,pass:true};
  return {consume:false,finishArrival:false,pass:true};
}

// J3b. t=0 is the committed win. Praise, the honey jar, and the tally are presentation.
// The fail screen has none of these effects. The secured total stays deal.T.
export function successPlan({victory=false,levelId=1,bank=false,secured=null,reduced=false}={}){
  if(!victory)return {
    effects:false,motion:false,scoreAt:0,ctaAt:0,cta:'TRY AGAIN',pour:null,star:null,
    tier:0,praise:null,praiseMotion:null,count:null,burst:null,flight:null,particles:0,
    subline:null,orchard:null,settled:0,cap:HONEY_MOTION.cap
  };
  const tier=secured==null?null:honeyTier(levelId,secured);
  const praise=tier?praiseFor(tier):null;
  const particles=!reduced&&tier?burstParticles(tier):0;
  return {
    effects:true,
    motion:!reduced,
    scoreAt:0,
    ctaAt:0,
    cta:winCta(onboardingLevel(levelId)),
    pour:bank?{start:0,approachEnd:0.180,liquidEnd:0.460,end:0.650,tip:42}:null,
    star:null,
    tier,
    praise,
    praiseMotion:HONEY_MOTION.praise,
    count:{
      start:HONEY_MOTION.count.start,end:HONEY_MOTION.count.end,
      duration:secured==null?null:countUpDuration(secured),
      ease:HONEY_MOTION.count.ease,
      from:0,to:secured==null?null:Math.trunc(Number(secured))
    },
    flight:{
      ...HONEY_MOTION.flight,
      count:!reduced&&tier?flightDroplets(tier):0,
      size:tier?flightDropletSize(tier):0
    },
    burst:{
      start:HONEY_MOTION.burst.start,life:HONEY_MOTION.burst.life,
      end:HONEY_MOTION.burst.start+HONEY_MOTION.burst.life,particles
    },
    particles,
    subline:HONEY_MOTION.subline,
    ctaEmphasis:HONEY_MOTION.cta,
    cap:HONEY_MOTION.cap,
    orchard:null,
    settled:reduced?0:HONEY_MOTION.settled
  };
}

export function successTap(target){
  if(target==='cta')return {settle:true,advance:true};
  return {settle:true,advance:false};
}

export function claimLevelAdvance(already){
  return {advance:!already,claimed:true};
}

// Audit §3. Pickup docks have no copy. The acknowledgement is the first real outcome.
export const INTRO={
  max:1.100,
  fadeIn:[0,0.080],
  holdUntil:0.900,
  fadeOut:[0.900,1.100]
};
const INTRO_COPY={
  bank:value=>'SAVE '+value,
  cross:()=>'CROSS',
  flip:()=>'FLIP',
  flipFactor:value=>'×'+value,
  zero:()=>'Pot safe.',
  snap:()=>'Pot lost. Savings safe.'
};
export function introCopy(kind,value){
  const write=INTRO_COPY[kind];
  return write?write(value):null;
}
export function takeFirstOutcome(seen,kind){
  if(!kind||!INTRO_COPY[kind]||seen.has(kind))return null;
  seen.add(kind);
  return {kind,max:INTRO.max};
}
