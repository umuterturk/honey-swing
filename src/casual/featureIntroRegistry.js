import {ONBOARDING_COUNT,ONBOARDING_LEVELS} from './onboardingLevels.js';
import {
  ONBOARDING_PROGRESS_KEY,SEEN_FEATURE_INTROS_KEY
} from './onboardingProgress.js';

// J1 ships the Save card only. Later unlocks stay in the derived map so the
// registry can be checked against the levels; their cards arrive in J5.
const BANK_DEMO=Object.freeze({
  duration:1.4,
  cycles:2,
  frames:Object.freeze([
    Object.freeze({id:'pot'}),
    Object.freeze({id:'arc'}),
    Object.freeze({id:'jar'})
  ])
});
export const FEATURE_INTROS=Object.freeze({
  bank:Object.freeze({
    id:'bank',
    unlockLevel:1,
    icon:'bank-jar',
    name:'Save',
    copyKey:'intro.bank',
    copy:'Save honey into your Savings.',
    highlightTarget:'bank',
    demoScript:BANK_DEMO
  })
});

export function introFeatureIdsForLevel(level,previous=null){
  if(!level)return [];
  const ids=[];
  const prevFactors=previous?.visibleFactors||[];
  const factors=level.visibleFactors||[];
  if(level.id===1)ids.push('bank');
  if(factors.includes('swing')&&!prevFactors.includes('swing'))ids.push('swing');
  if(level.showFlip&&!previous?.showFlip)ids.push('flip');
  if(factors.includes('flip')&&!prevFactors.includes('flip'))ids.push('flip_mult');
  if(level.requiresZeroBreak&&!previous?.requiresZeroBreak)ids.push('zero');
  if(level.showChances&&!previous?.showChances)ids.push('snap');
  return ids;
}

// The first time a feature appears is its intro level. A later level that
// shows Flip again does not unlock a second card.
export function derivedFeatureUnlocks(levels=ONBOARDING_LEVELS){
  const found=[];
  const seen=new Set();
  let previous=null;
  for(const level of levels){
    for(const id of introFeatureIdsForLevel(level,previous)){
      if(seen.has(id))continue;
      seen.add(id);
      found.push({id,unlockLevel:level.id});
    }
    previous=level;
  }
  return found;
}

export function validateFeatureIntroRegistry(levels,registry){
  const source=levels||ONBOARDING_LEVELS;
  const rows=registry||FEATURE_INTROS;
  const derived=derivedFeatureUnlocks(source);
  const byId=new Map(derived.map(row=>[row.id,row.unlockLevel]));
  if(byId.size!==derived.length)throw new Error('A feature unlocked more than once');
  for(const id of Object.keys(rows)){
    if(!byId.has(id))throw new Error('Unknown feature intro: '+id);
    const row=rows[id];
    if(!row||row.id!==id)throw new Error('Feature intro id does not match its key: '+id);
    if(row.unlockLevel!==byId.get(id))
      throw new Error('Feature intro unlock does not match the level: '+id);
    if(typeof row.name!=='string'||!row.name)
      throw new Error('Feature intro needs a name: '+id);
    if(typeof row.copy!=='string'||row.copy.length<1||row.copy.length>42)
      throw new Error('Feature intro copy must be 1–42 characters: '+id);
    if(!row.demoScript||row.demoScript.duration>1.4||row.demoScript.cycles>2)
      throw new Error('Feature intro demo is too long: '+id);
  }
  if(!rows.bank)throw new Error('Missing feature intro: bank');
  return derived.map(row=>Object.freeze({
    id:row.id,
    unlockLevel:row.unlockLevel,
    registered:Object.prototype.hasOwnProperty.call(rows,row.id)
  }));
}

validateFeatureIntroRegistry();

function introIdsAtLevel(levelId,levels=ONBOARDING_LEVELS){
  return derivedFeatureUnlocks(levels)
    .filter(row=>row.unlockLevel===levelId)
    .map(row=>row.id);
}

export function nextUnseenIntro(seenSet,levelId,levels=ONBOARDING_LEVELS,registry=FEATURE_INTROS){
  const unlocked=new Set(introIdsAtLevel(levelId,levels));
  for(const id of Object.keys(registry)){
    if(unlocked.has(id)&&!seenSet?.has(id)&&registry[id])return registry[id];
  }
  return null;
}

function parseSeen(raw){
  try{
    const parsed=JSON.parse(raw);
    if(!Array.isArray(parsed))return new Set();
    return new Set(parsed.filter(id=>typeof id==='string'));
  }catch{
    return new Set();
  }
}

function readUnlockedLevel(storage){
  if(!storage)return 1;
  try{
    const value=Number(storage.getItem(ONBOARDING_PROGRESS_KEY));
    if(Number.isInteger(value)&&value>=1&&value<=ONBOARDING_COUNT+1)return value;
  }catch{/* a broken progress key is a new player */}
  return 1;
}

export function writeSeenFeatureIntros(storage,seen){
  if(!storage)return false;
  try{
    const ids=[];
    for(const id of seen){
      if(typeof id==='string'&&!ids.includes(id))ids.push(id);
    }
    storage.setItem(SEEN_FEATURE_INTROS_KEY,JSON.stringify(ids));
    return true;
  }catch{
    return false;
  }
}

export function readSeenFeatureIntros(storage){
  if(!storage)return new Set();
  let raw=null;
  try{raw=storage.getItem(SEEN_FEATURE_INTROS_KEY);}catch{return new Set();}
  if(raw!=null)return parseSeen(raw);
  // No seen-set yet. A player who already passed a level skips that card
  // because the passed feature ids are written into the seen-set.
  const seeded=new Set(derivedFeatureUnlocks()
    .filter(row=>row.unlockLevel<readUnlockedLevel(storage))
    .map(row=>row.id));
  if(seeded.size)writeSeenFeatureIntros(storage,seeded);
  return seeded;
}

export function isFreshRound(round){
  return !!round&&round.turn===0&&!round.game?.deal?.plays;
}

export function featureIntroForEntry({round,storage=null,reduced=false}={}){
  if(!isFreshRound(round)){
    return {show:false,gate:false,intro:null,phase:'play',reason:'restore',motion:false};
  }
  const intro=nextUnseenIntro(readSeenFeatureIntros(storage),round.levelId);
  if(!intro)return {show:false,gate:false,intro:null,phase:'level-start',reason:'seen',motion:false};
  return {show:true,gate:true,intro,phase:'intro',reason:'unseen',motion:!reduced};
}

export function dismissFeatureIntro({levelId,storage=null,via,fx=null}={}){
  const seen=readSeenFeatureIntros(storage);
  const intro=nextUnseenIntro(seen,levelId);
  if(!intro)return {dismissed:false,gate:false,phase:'level-start',intro:null};
  if(via!=='play'&&via!=='scrim')
    return {dismissed:false,gate:true,phase:'intro',intro};
  try{fx?.settle();}catch{/* settling cosmetics must not block the handoff */}
  const nextSeen=new Set(seen);
  nextSeen.add(intro.id);
  writeSeenFeatureIntros(storage,nextSeen);
  const queued=nextUnseenIntro(nextSeen,levelId);
  if(queued){
    return {dismissed:true,id:intro.id,gate:true,phase:'intro',intro:queued,handoff:null};
  }
  return {
    dismissed:true,id:intro.id,gate:false,phase:'level-start',intro:null,handoff:'level-start'
  };
}

// The gate is its own session lock. It never starts a card presentation.
export function introPointerDecision({gate=false,inIntro=false}={}){
  if(!gate)return {handled:false,play:true,dismiss:false};
  if(inIntro)return {handled:true,play:false,dismiss:true};
  return {handled:true,play:false,dismiss:false};
}

export function boardTapDuringIntro(gate){
  return introPointerDecision({gate:!!gate,inIntro:false});
}
