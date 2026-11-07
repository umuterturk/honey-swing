// The development reset is scoped to Swing Casual onboarding.
// Do not clear unrelated game settings, audio preferences, or other games.
export const ONBOARDING_SESSION_KEY='swing-casual-onboarding-session-v3';
export const ONBOARDING_PROGRESS_KEY='swing-casual-onboarding-unlocked-v2';
export const SEEN_FEATURE_INTROS_KEY='swing-casual-seen-feature-intros-v1';
const LEGACY_KEYS=Object.freeze([
  'swing-casual-onboarding-session-v1',
  'swing-casual-onboarding-session-v2',
  'swing-casual-onboarding-unlocked-v1'
]);

export function clearOnboardingProgress(storage){
  if(!storage)return false;
  try{
    storage.removeItem(ONBOARDING_SESSION_KEY);
    storage.removeItem(ONBOARDING_PROGRESS_KEY);
    storage.removeItem(SEEN_FEATURE_INTROS_KEY);
    for(const key of LEGACY_KEYS)storage.removeItem(key);
    return true;
  }catch{
    return false;
  }
}

// Debug/recovery: unlock through `levelId` and mark every intro at or before
// that level as seen so a jump lands in play, not on a NEW! card.
export function prepareOnboardingJump(storage,levelId,{
  levelCount,introUnlocks
}={}){
  if(!storage||!Number.isInteger(levelId)||levelId<1)return null;
  const max=Number.isInteger(levelCount)&&levelCount>=1?levelCount:levelId;
  const id=Math.min(levelId,max);
  try{
    storage.setItem(ONBOARDING_PROGRESS_KEY,String(id));
    storage.removeItem(ONBOARDING_SESSION_KEY);
    if(Array.isArray(introUnlocks)){
      const seen=introUnlocks
        .filter(row=>Number.isInteger(row?.unlockLevel)&&row.unlockLevel<=id)
        .map(row=>row.id)
        .filter(name=>typeof name==='string');
      storage.setItem(SEEN_FEATURE_INTROS_KEY,JSON.stringify([...new Set(seen)]));
    }else{
      storage.removeItem(SEEN_FEATURE_INTROS_KEY);
    }
    return id;
  }catch{
    return null;
  }
}

export function readUnlockedOnboardingLevel(storage,levelCount=1){
  if(!storage)return 1;
  try{
    const value=Number(storage.getItem(ONBOARDING_PROGRESS_KEY));
    if(Number.isInteger(value)&&value>=1&&value<=levelCount)return value;
  }catch{/* broken progress → Level 1 */}
  return 1;
}
