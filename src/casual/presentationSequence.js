// Audit §1. Times are seconds from installing a fresh level. Motion is visual;
// a tap finishes it and still reaches the control under the pointer.
export const LEVEL_START={
  settled:0.300,
  badge:{start:0,end:0.120,fromScale:0.98,toScale:1,ease:'power2.out'},
  targetOutline:{start:0.060,peak:0.180,end:0.300,opacity:0.7,half:0.120},
  handGlint:{start:0.160,peak:0.230,end:0.300,opacity:0.45,half:0.070},
  dock:{start:0,end:0.800,fromY:-12,fromScale:0.82},
  dockLevels:Object.freeze({3:'swing',5:'flip',6:'flip-pill',11:'hearts'}),
  idleAt:3,
  idlePulse:Object.freeze([
    [3.000,3.300],[3.300,3.600],[3.600,3.900],[3.900,4.200]
  ])
};

export function levelStartPlan(levelId,{fresh=true,reduced=false}={}){
  const dock=fresh?LEVEL_START.dockLevels[levelId]||null:null;
  const timing=dock?LEVEL_START.dock:null;
  if(!fresh||reduced){
    return {motion:false,piece:reduced?null:dock,dock:reduced?null:timing,
      idleAt:LEVEL_START.idleAt,settled:reduced?0:LEVEL_START.settled,idleOutline:!!reduced};
  }
  return {
    motion:true,piece:dock,dock:timing,idleAt:LEVEL_START.idleAt,
    settled:LEVEL_START.settled,badge:LEVEL_START.badge,
    targetOutline:LEVEL_START.targetOutline,handGlint:LEVEL_START.handGlint,
    idlePulse:LEVEL_START.idlePulse
  };
}

// An in-flight card/Bank consumes the tap. A level arrival does not.
export function startTap({action=false,arrival=false}={}){
  if(action)return {consume:true,finishArrival:false,pass:false};
  if(arrival)return {consume:false,finishArrival:true,pass:true};
  return {consume:false,finishArrival:false,pass:true};
}

// Audit §2. t=0 is the committed win. The fail screen has none of these effects.
export function successPlan({victory=false,levelId=1,bank=false}={}){
  if(!victory)return {effects:false,scoreAt:0,ctaAt:0,cta:'TRY AGAIN',pour:null,star:null,orchard:null};
  return {
    effects:true,
    scoreAt:0,
    ctaAt:0,
    cta:levelId===12?'LOWER ORCHARD':'NEXT',
    pour:bank?{start:0,approachEnd:0.180,liquidEnd:0.460,end:0.650,tip:42}:null,
    star:{start:0.520,mid:0.680,end:0.820,fromScale:0.75,peakScale:1.10,opacityEnd:0.620},
    ctaEmphasis:{start:0.820,end:1.100},
    orchard:levelId===12?{start:0.820,fadeEnd:1.060,end:1.500,fromScale:0.96}:null
  };
}

export function successTap(target){
  if(target==='cta')return {settle:true,advance:true};
  return {settle:true,advance:false};
}

export function claimLevelAdvance(already){
  return {advance:!already,claimed:true};
}
