import {newOverswing,stepOverswing,overswingActions,applySwing,signed} from '../external/engines.js';
import {STAR_THRESHOLDS} from './starThresholds.js';

// Garden 1 is the game. Garden 2 (13–20) is a playable stub: same scoring,
// real refill, no new mechanics, so Level 12 opens a door instead of a replay.
const CASUAL_RULES=Object.freeze({
  snapLimit:8,bankCapacityLoss:0,steerAlwaysToPot:true,
  steerNoncrossPenalty:0,flipNoncrossPenalty:0,
  enableResonance:false,runningPot:true,flipOnly:false
});
const SWING=Object.freeze(['swing']);
const SWING_FLIP=Object.freeze(['swing','flip']);
export const GARDEN_2_START=13;

const make=spec=>{
  const stars=STAR_THRESHOLDS[spec.id];
  if(!stars)throw new RangeError('Missing star thresholds for level '+spec.id);
  return Object.freeze({
  id:spec.id,name:spec.name,target:spec.target,
  deck:Object.freeze(spec.deck.slice()),
  initialHandSize:spec.hand,
  visibleHandSlots:spec.hand,
  maxSnaps:2,
  showMeter:true,
  showFlip:spec.deck.length>spec.hand,
  showChances:spec.id>=11,
  visibleFactors:Object.freeze(spec.factors.slice()),
  rules:Object.freeze({
    ...CASUAL_RULES,
    // Soft Pot ceiling: at least 2× Hiveful (and 2× target) so gift/overscore
    // banks still fit, while runaway multiplier pours stop counting past the rim.
    potCap:Math.max(stars.star3*2,stars.target*2),
    enableSwingFactor:spec.factors.includes('swing'),
    enableFlipFactor:spec.factors.includes('flip'),
    enableJackpotFactor:spec.factors.includes('jackpot'),
    flipOnly:!!spec.flipOnly
  }),
  script:Object.freeze([]),
  requiresFlip:false,
  requiresZeroBreak:!!spec.zeroGate,
  pulse:spec.pulse||'card',
  dock:spec.dock||null,
  telegraph:!!spec.telegraph,
  garden:spec.id>=GARDEN_2_START?2:1,
  lesson:''
});
};

export const ONBOARDING_LEVELS=Object.freeze([
  make({id:1,name:'Honey Drop',target:5,deck:[1,2,12],hand:3,factors:[]}),
  make({id:2,name:'Two Ways',target:6,deck:[3,21],hand:2,factors:[]}),
  make({id:3,name:'The Crossing',target:8,deck:[2,24],hand:2,
    factors:['swing'],dock:'swing'}),
  make({id:4,name:'Either Side',target:11,deck:[1,3,24],hand:3,factors:['swing']}),
  make({id:5,name:'Mystery Card',target:6,deck:[2,1,0],hand:2,
    factors:['swing'],flipOnly:true,pulse:'flip',dock:'flip'}),
  make({id:6,name:'Hot Streak',target:13,deck:[1,0,11,2],hand:2,
    factors:['swing','flip'],flipOnly:true,pulse:'flip',dock:'flip-pill'}),
  make({id:7,name:'Sweet Mix',target:10,deck:[2,24,0],hand:2,
    factors:['swing','flip'],flipOnly:true}),
  make({id:8,name:'Golden Flip',target:17,deck:[1,2,25],hand:2,
    factors:SWING_FLIP,flipOnly:true,pulse:'card-then-flip'}),
  make({id:9,name:'Easy Garden',target:11,deck:[4,25],hand:2,factors:SWING}),
  make({id:10,name:'Perfect Stop',target:10,deck:[2,24,1],hand:3,
    factors:SWING,zeroGate:true}),
  make({id:11,name:'Edge of the Jar',target:9,deck:[1,20,4,6,22,2],hand:3,
    factors:SWING_FLIP,dock:'hearts'}),
  make({id:12,name:'The Big Jar',target:24,deck:[3,0,25],hand:2,
    factors:SWING_FLIP,flipOnly:true}),
  // Lower Orchard stubs. Targets sit in the design bands. Not a tuned garden.
  make({id:13,name:'Lower Orchard',target:16,deck:[2,1,25],hand:2,factors:SWING_FLIP}),
  make({id:14,name:'Second Row',target:20,deck:[4,1,25],hand:2,factors:SWING_FLIP}),
  // Garden 2 stubs: card 8 (+9) sits in the opening hand for an instant Snap test.
  make({id:15,name:'Light Test',target:30,deck:[3,8,0,25],hand:2,factors:SWING_FLIP}),
  // Flip is in the deck (hand < deck) — keep the Flip pill visible with the button.
  make({id:16,name:'Easy Row',target:11,deck:[4,8,25],hand:2,factors:SWING_FLIP}),
  make({id:17,name:'Known Zero',target:10,deck:[2,8,24,1],hand:3,factors:SWING_FLIP}),
  make({id:18,name:'Known Snap',target:9,deck:[1,8,20,4,6,22,2],hand:3,factors:SWING_FLIP}),
  make({id:19,name:'Hard Path',target:24,deck:[3,8,0,25],hand:2,
    factors:SWING_FLIP,telegraph:true}),
  make({id:20,name:'Gift Jar',target:6,deck:[2,8,3],hand:2,factors:SWING_FLIP})
]);
export const ONBOARDING_COUNT=ONBOARDING_LEVELS.length;
export function onboardingLevel(id){
  const result=ONBOARDING_LEVELS[id-1];
  if(!Number.isInteger(id)||!result)throw new RangeError('Unknown onboarding level '+id);
  return result;
}
export function newOnboardingRound(levelId=1){
  const level=onboardingLevel(levelId);
  return {
    levelId,
    game:newOverswing({
      mode:'short',seed:20261104+levelId,
      deckOverride:level.deck,initialHandSize:level.initialHandSize
    }),
    snaps:0,turn:0,flipCount:0,zeroBreakCount:0,
    event:{id:0,type:'start'}
  };
}
const sameAction=(a,b)=>a.type===b.type&&
  (a.type!=='steer'||a.index===b.index)&&
  (a.type!=='bank'||a.dropIndex===b.dropIndex);
export const onboardingVictory=round=>
  round.game.deal.T>=onboardingLevel(round.levelId).target;
export const onboardingFinished=round=>{
  const level=onboardingLevel(round.levelId);
  return onboardingVictory(round)||round.snaps>=level.maxSnaps||
    round.game.status!=='playing';
};
export function onboardingActions(round){
  if(onboardingFinished(round))return [];
  const level=onboardingLevel(round.levelId);
  const scriptAction=level.script[round.turn];
  const available=overswingActions(round.game,level.rules);
  return available.filter(a=>
    (!scriptAction||sameAction(a,scriptAction))&&
    (level.showFlip||a.type!=='flip')&&
    (!(a.type==='bank')||
      (!level.requiresFlip||round.flipCount>0)&&
      (!level.requiresZeroBreak||round.zeroBreakCount>0))
  );
}
export function stepOnboarding(round,action){
  const level=onboardingLevel(round.levelId);
  if(!onboardingActions(round).some(a=>sameAction(a,action)))return round;
  const game=stepOverswing(round.game,action,level.rules);
  if(game===round.game)return round;
  const snapped=!!game.lastAction?.snap;
  const next={
    ...round,game,turn:round.turn+1,
    snaps:round.snaps+(snapped?1:0),
    flipCount:round.flipCount+(action.type==='flip'?1:0),
    zeroBreakCount:round.zeroBreakCount+(game.lastAction?.zeroBreak?1:0)
  };
  const type=onboardingVictory(next)?'win':snapped?'snap':
    game.lastAction?.zeroBreak?'zero_break':action.type;
  return {...next,event:{id:next.turn,type}};
}
// A real engine preview, not custom movement or Snap calculations in JSX.
export function wouldSnap(round,action){
  if(action.type!=='steer')return false;
  const level=onboardingLevel(round.levelId),id=round.game.deal.hand[action.index];
  if(id==null)return false;
  return applySwing(round.game.deal.S,round.game.deal.W,signed(id),level.rules.snapLimit).snap;
}
export function levelValidation(){
  for(const level of ONBOARDING_LEVELS){
    if(level.initialHandSize<2||level.initialHandSize>8)throw Error('Invalid hand size: '+level.id);
    if(level.deck.length<level.initialHandSize||new Set(level.deck).size!==level.deck.length)
      throw Error('Invalid deck: '+level.id);
    if(level.deck.some(id=>!Number.isInteger(id)||id<0||id>39))
      throw Error('Invalid ordinary card: '+level.id);
    if(level.target<=0)throw Error('Invalid target: '+level.id);
    if(level.requiresFlip)throw Error('Garden levels must not requireFlip: '+level.id);
    if(level.script.length)throw Error('Garden guidance is the idle pulse, not a script: '+level.id);
  }
  return true;
}
