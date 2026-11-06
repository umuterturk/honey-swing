import {burstParticles,countUpDuration,praiseFor,winStars} from './starThresholds.js';

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
  dockLevels:Object.freeze({3:'swing',5:'flip',6:'flip-pill',11:'hearts'}),
  idleAt:3,
  idleHint:'after-dismiss',
  idlePulse:Object.freeze([
    [3.000,3.300],[3.300,3.600],[3.600,3.900],[3.900,4.200]
  ])
};

export function levelStartPlan(levelId,{fresh=true,reduced=false}={}){
  const dock=fresh?LEVEL_START.dockLevels[levelId]||null:null;
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

// B3. t=0 is the committed win. Praise, stars, and the tally are presentation.
// The fail screen has none of these effects. The secured line stays deal.T.
export const WIN=Object.freeze({
  settled:1.200,
  praise:Object.freeze({start:0,end:0.200,fromScale:0.7,peakScale:1.08,toScale:1}),
  stars:Object.freeze([
    Object.freeze({start:0.220,end:0.420}),
    Object.freeze({start:0.420,end:0.620}),
    Object.freeze({start:0.620,end:0.820})
  ]),
  star:Object.freeze({fromScale:0,peakScale:1.15,toScale:1}),
  count:Object.freeze({start:0.200,hold:0.900}),
  burst:Object.freeze({start:0.820,end:1.200,life:0.380})
});

export function successPlan({victory=false,levelId=1,bank=false,secured=null,reduced=false}={}){
  if(!victory)return {
    effects:false,motion:false,scoreAt:0,ctaAt:0,cta:'TRY AGAIN',pour:null,star:null,
    stars:0,praise:null,praiseMotion:null,count:null,burst:null,particles:0,
    orchard:null,settled:0
  };
  const earned=secured==null?null:winStars(levelId,secured);
  const praise=earned?praiseFor(earned):null;
  const particles=!reduced&&earned?burstParticles(earned):0;
  return {
    effects:true,
    motion:!reduced,
    scoreAt:0,
    ctaAt:0,
    cta:levelId===12?'LOWER ORCHARD':'NEXT',
    pour:bank?{start:0,approachEnd:0.180,liquidEnd:0.460,end:0.650,tip:42}:null,
    star:reduced?null:{
      start:WIN.stars[0].start,end:WIN.stars[2].end,
      fromScale:WIN.star.fromScale,peakScale:WIN.star.peakScale,toScale:WIN.star.toScale
    },
    stars:earned,
    praise,
    praiseMotion:WIN.praise,
    count:{
      start:WIN.count.start,hold:WIN.count.hold,
      duration:secured==null?null:countUpDuration(secured),
      from:0,to:secured==null?null:Math.trunc(Number(secured))
    },
    burst:{...WIN.burst,particles},
    particles,
    ctaEmphasis:{start:WIN.settled,end:1.480},
    orchard:levelId===12?{start:0.820,fadeEnd:1.060,end:1.500,fromScale:0.96}:null,
    settled:reduced?0:WIN.settled
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
  bank:value=>'BANK '+value,
  cross:()=>'CROSS',
  flip:()=>'FLIP',
  flipFactor:value=>'×'+value,
  zero:()=>'Pot safe.',
  snap:()=>'Pot lost. Bank safe.'
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
