// The development reset is scoped to Swing Casual onboarding.
// Do not clear unrelated game settings, audio preferences, or other games.
export const ONBOARDING_SESSION_KEY='swing-casual-onboarding-session-v3';
export const ONBOARDING_PROGRESS_KEY='swing-casual-onboarding-unlocked-v2';
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
    for(const key of LEGACY_KEYS)storage.removeItem(key);
    return true;
  }catch{
    return false;
  }
}
