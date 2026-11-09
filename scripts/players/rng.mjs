import {seeded} from '../../src/external/engines.js';
import {SEED_BASE} from './tuning.mjs';

// The engine's seeded() is mulberry32. One stream per attempt; nothing else draws.
export function seedFor(profileIndex,levelId,runIdx){
  if(!Number.isInteger(profileIndex)||profileIndex<0)throw new Error('Bad profile index')
  if(!Number.isInteger(levelId)||levelId<1)throw new Error('Bad level id')
  if(!Number.isInteger(runIdx)||runIdx<0)throw new Error('Bad run index')
  return (SEED_BASE+1_000_000*profileIndex+1_000*levelId+runIdx)>>>0
}

export function rngFor(profileIndex,levelId,runIdx){
  return seeded(seedFor(profileIndex,levelId,runIdx))
}

export function modeBRunIdx(modeAAttempts,sessionIdx,attemptInSession,stride){
  if(attemptInSession>=stride)throw new Error('Session attempt exceeded seed stride')
  return modeAAttempts+sessionIdx*stride+attemptInSession
}
