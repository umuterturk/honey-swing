import {ONBOARDING_PROGRESS_KEY, ONBOARDING_SESSION_KEY} from './onboardingProgress.js';

function readItem(storage, key){
  if(!storage)return null;
  try{return storage.getItem(key);}catch{return null;}
}

function writeItem(storage, key, value){
  if(!storage)return false;
  try{storage.setItem(key, value);return true;}catch{return false;}
}

function isInteger(value){return Number.isInteger(value);}

export function loadSavedRound(storage, levelCount){
  const raw=readItem(storage, ONBOARDING_SESSION_KEY);
  if(raw==null)return null;
  let state;
  try{state=JSON.parse(raw);}catch{return null;}
  if(!state||!isInteger(state.levelId)||state.levelId<1||state.levelId>levelCount)return null;
  if(!isInteger(state.turn)||!isInteger(state.snaps)||
    !isInteger(state.flipCount)||!isInteger(state.zeroBreakCount))return null;
  if(state.game?.game!=='overswing'||!state.game.deal)return null;
  return state;
}

export function saveRound(storage, round){
  return writeItem(storage, ONBOARDING_SESSION_KEY, JSON.stringify(round));
}

function playEvents(facts){
  const {action, change, levelId, next, turnBefore, won, levelCount}=facts;
  const events=[{
    name:action.type==='steer'?'card_play':action.type,
    level:levelId,
    turn:next.turn,
    card:change.signedCard,
    snap:change.snap,
    zeroBreak:change.zeroBreak,
    bankGain:change.bankGain
  }];
  if(turnBefore===0)events.push({name:'first_action', level:levelId});
  if(change.snap)events.push({name:'snap', level:levelId});
  if(change.zeroBreak)events.push({name:'zero_break', level:levelId});
  for(const {kind, value} of change.rewards||[]){
    events.push({name:'factor_changed', level:levelId, kind, value});
  }
  if(won){
    events.push({name:'level_complete', level:levelId, actions:next.turn});
    if(levelId===levelCount)events.push({name:'onboarding_complete'});
  }
  return events;
}

export function commitPlay(storage, facts){
  const saved=saveRound(storage, facts.next);
  let unlockedLevel=null;
  if(facts.won){
    const level=Math.min(facts.levelCount, facts.levelId+1);
    if(writeItem(storage, ONBOARDING_PROGRESS_KEY, String(level)))unlockedLevel=level;
  }
  return {saved, unlockedLevel, events:playEvents(facts)};
}
