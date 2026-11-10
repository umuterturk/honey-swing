// The development reset is scoped to Swing Casual onboarding.
// Do not clear unrelated game settings, audio preferences, or other games.
export const ONBOARDING_SESSION_KEY='swing-casual-onboarding-session-v3';
export const ONBOARDING_PROGRESS_KEY='swing-casual-onboarding-unlocked-v2';
export const SEEN_FEATURE_INTROS_KEY='swing-casual-seen-feature-intros-v1';
// Set when Level 1 move 2 commits. Heartbeat and the first-move hint stay gone.
export const FIRST_SESSION_KEY='swing-casual-first-session-v1';
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
    storage.removeItem(FIRST_SESSION_KEY);
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

const FRESH_SESSION=Object.freeze({plays:0,coachingDone:false});

function readStorage(storage,key){
  if(!storage)return null;
  try{return storage.getItem(key);}catch{return null;}
}

// Missing or unreadable notes mean the first session has not finished.
// A note that says coaching is done is trusted even if the play count is odd.
export function readFirstSession(storage){
  const raw=readStorage(storage,FIRST_SESSION_KEY);
  if(raw==null)return FRESH_SESSION;
  let data;
  try{data=JSON.parse(raw);}catch{return FRESH_SESSION;}
  if(!data||typeof data!=='object')return FRESH_SESSION;
  if(data.coachingDone===true){
    const plays=Number.isInteger(data.plays)&&data.plays>=2?data.plays:3;
    return {plays,coachingDone:true};
  }
  if(!Number.isInteger(data.plays)||data.plays<0)return FRESH_SESSION;
  return {plays:data.plays,coachingDone:false};
}

function writeFirstSession(storage,session){
  if(!storage)return false;
  try{
    storage.setItem(FIRST_SESSION_KEY,JSON.stringify({
      v:1,plays:session.plays,coachingDone:!!session.coachingDone
    }));
    return true;
  }catch{
    return false;
  }
}

// Count a committed play toward the opening only when it continues that opening.
// A retry or a later launch does not add another play, and does not clear a done note.
export function noteCommittedPlay(storage,turnBefore){
  const session=readFirstSession(storage);
  if(session.coachingDone&&session.plays>=3)return {session,advanced:false,playNumber:session.plays};
  if(!Number.isInteger(turnBefore)||turnBefore!==session.plays){
    return {session,advanced:false,playNumber:session.plays};
  }
  const plays=session.plays+1;
  const next={plays,coachingDone:session.coachingDone||plays>=2};
  writeFirstSession(storage,next);
  return {session:next,advanced:true,playNumber:plays};
}

export function readUnlockedOnboardingLevel(storage,levelCount=1){
  if(!storage)return 1;
  try{
    const value=Number(storage.getItem(ONBOARDING_PROGRESS_KEY));
    if(Number.isInteger(value)&&value>=1&&value<=levelCount)return value;
  }catch{/* broken progress → Level 1 */}
  return 1;
}
