import {displayOf} from './presentation.js';
import {levelStartPlan} from './presentationSequence.js';
import {featureIntroForEntry, isFreshRound} from './featureIntroRegistry.js';
import {loadSavedRound} from './sessionRecords.js';
import {newOnboardingRound, onboardingLevel} from './onboardingLevels.js';
import {readUnlockedOnboardingLevel} from './onboardingProgress.js';

export {dismissedIntro} from './screens/featureIntro.jsx';
export {closedStart} from './screens/levelStart.jsx';
export {openedFactor, closedFactor} from './screens/factorInfo.jsx';

function cleared(){
  return {
    animating:false, feedback:null, pulse:false, beat:'', help:false,
    ack:null, successSettled:false, devMenuOpen:false, factorInfo:null, advanced:false
  };
}

function flagsFor(round, {storage, reduced}){
  const opening=featureIntroForEntry({round, storage, reduced});
  const fresh=isFreshRound(round);
  const plan=levelStartPlan(round.levelId, {fresh, reduced});
  return {
    ...cleared(),
    docking:Boolean(onboardingLevel(round.levelId).dock),
    startOpen:fresh&&!opening.gate,
    arriving:opening.gate?false:plan.motion,
    introGate:opening.gate,
    introCard:opening.intro
  };
}

export function levelScreen(id, env){
  const round=newOnboardingRound(id);
  return {round, view:displayOf(round), shownGold:0, ...flagsFor(round, env)};
}

export function initialScreen({storage, levelCount, reduced}){
  const saved=loadSavedRound(storage, levelCount);
  const round=saved||newOnboardingRound(readUnlockedOnboardingLevel(storage, levelCount));
  return {
    round, view:displayOf(round), shownGold:round.game.deal.T,
    ...flagsFor(round, {storage, reduced})
  };
}

export function nextLevelId(levelId, levelCount){
  return levelId>=levelCount?levelCount:levelId+1;
}

export function ackAfterCommit(screen, {outcome, first, text}){
  if(first)return {...screen, ack:{kind:first.kind, text}};
  if(outcome)return {...screen, ack:null};
  return screen;
}

export function settledScreen(screen, settled){
  return {
    ...screen,
    round:settled.round,
    view:settled.view,
    shownGold:settled.shownGold,
    feedback:settled.feedback,
    animating:settled.animating
  };
}

export const clearedDock=screen=>({...screen, docking:false});
export const toggledHelp=screen=>({...screen, help:!screen.help});
export const toggledDevMenu=screen=>({...screen, devMenuOpen:!screen.devMenuOpen});
export const closedDevMenu=screen=>({...screen, devMenuOpen:false});
export const shownPulse=screen=>({...screen, pulse:true});
export const dockExpired=screen=>({...screen, docking:false});
export const arrivalBegan=(screen, motion)=>({...screen, arriving:!!motion});
export const arrivalSettled=screen=>({...screen, arriving:false});
export const successMarked=screen=>({...screen, successSettled:true});

export function clearedAck(screen, token){
  return screen.ack===token?{...screen, ack:null}:screen;
}

export function endTransition(screen, decision, levelCount){
  if(!decision||decision.lock)return {screen, enterLevel:null};
  let next=screen;
  let enterLevel=null;
  if(decision.settle)next={...next, successSettled:true};
  if(decision.advance){
    const already=next.advanced;
    next={...next, successSettled:true, advanced:true};
    if(!already)enterLevel=nextLevelId(next.round.levelId, levelCount);
  }
  if(decision.replay)enterLevel=next.round.levelId;
  return {screen:next, enterLevel};
}

export function phoneClassName(screen, {levelId, garden, feedback, eventType}){
  return 'sgv-phone sgv-onboarding sgv-onboarding-'+levelId+
    (garden===2?' sgv-orchard':'')+
    ' sgv-event-'+(feedback||eventType)+
    (screen.arriving?' sgv-level-arrival':'');
}
