import {newOverswing,stepOverswing,overswingActions,applySwing,signed} from '../external/engines.js';
import {FACTORS} from './factors.js';
import {GARDEN} from './levels/garden.js';
import {filterTeachActions} from './swingTeach.js';

// One shared casual rules object. potCap, flipOnly, and the factor flags
// are copied from the record onto each level's rules.
const CASUAL_RULES=Object.freeze({
  snapLimit:8,bankCapacityLoss:0,steerAlwaysToPot:true,
  steerNoncrossPenalty:0,flipNoncrossPenalty:0,
  enableResonance:false,runningPot:true,flipOnly:false
});

function rulesFor(record){
  const flags={};
  for(const factor of FACTORS)flags[factor.rulesFlag]=record.factors.includes(factor.kind);
  return Object.freeze({
    ...CASUAL_RULES,
    potCap:record.potCap,
    ...flags,
    flipOnly:record.flipOnly
  });
}

function levelFrom(record){
  return Object.freeze({
    id:record.id,name:record.name,target:record.target,
    deck:Object.freeze(record.deck.slice()),
    initialHandSize:record.hand,
    visibleHandSlots:record.hand,
    maxSnaps:2,
    showMeter:true,
    showFlip:record.deck.length>record.hand,
    showChances:record.showChances,
    visibleFactors:Object.freeze(record.factors.slice()),
    rules:rulesFor(record),
    requiresZeroBreak:record.zeroGate,
    pulse:record.pulse,
    dock:record.dock,
    telegraph:record.telegraph,
    garden:record.garden
  });
}

export const ONBOARDING_LEVELS=Object.freeze(GARDEN.map(levelFrom));
export const ONBOARDING_COUNT=ONBOARDING_LEVELS.length;
export const GARDEN_2_START=GARDEN.find(record=>record.garden===2).id;

export function onboardingLevel(id){
  const result=ONBOARDING_LEVELS[id-1];
  if(!Number.isInteger(id)||!result)throw new RangeError('Unknown onboarding level '+id);
  return result;
}

export function winCta(level){
  if(level.id===GARDEN_2_START-1)return 'LOWER ORCHARD';
  if(level.id===ONBOARDING_COUNT)return 'PLAY AGAIN';
  return 'NEXT';
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
  const available=overswingActions(round.game,level.rules);
  return filterTeachActions(round, available.filter(a=>
    (level.showFlip||a.type!=='flip')&&
    (!(a.type==='bank')||(!level.requiresZeroBreak||round.zeroBreakCount>0))
  ));
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
