import {newOnboardingRound,ONBOARDING_COUNT} from './onboardingLevels.js';
import {
  ONBOARDING_SESSION_KEY,ONBOARDING_PROGRESS_KEY,readUnlockedOnboardingLevel
} from './onboardingProgress.js';

// Browser storage is optional: private browsing and restrictive environments
// must not prevent a round from starting or being played.
export function browserStorage(){
  try{return typeof window==='undefined'?null:window.localStorage;}
  catch{return null;}
}

function isSavedRound(round){
  return round&&Number.isInteger(round.levelId)&&
    round.levelId>=1&&round.levelId<=ONBOARDING_COUNT&&
    round.game?.game==='overswing'&&round.game.deal&&
    Number.isInteger(round.turn)&&Number.isInteger(round.snaps)&&
    Number.isInteger(round.flipCount)&&Number.isInteger(round.zeroBreakCount);
}

export function loadOnboardingRound(storage=browserStorage()){
  try{
    const saved=JSON.parse(storage?.getItem(ONBOARDING_SESSION_KEY)||'null');
    if(isSavedRound(saved))return saved;
  }catch{/* Corrupted or unavailable session falls back to unlocked level. */}
  return newOnboardingRound(readUnlockedOnboardingLevel(storage,ONBOARDING_COUNT));
}

export function saveOnboardingRound(round,storage=browserStorage()){
  if(!storage)return false;
  try{
    storage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(round));
    return true;
  }catch{return false;}
}

export function unlockOnboardingLevel(levelId,storage=browserStorage()){
  if(!storage)return false;
  try{
    storage.setItem(ONBOARDING_PROGRESS_KEY,String(levelId));
    return true;
  }catch{return false;}
}
