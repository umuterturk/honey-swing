import {overswingPayout,applySwing,signed} from '../../src/external/engines.js';
import {onboardingLevel,wouldSnap} from '../../src/casual/onboardingLevels.js';
import {GARDEN} from '../../src/casual/levels/garden.js';

const RECORDS=new Map(GARDEN.map(record=>[record.id,record]))

export function gardenRecord(levelId){
  const record=RECORDS.get(levelId)
  if(!record)throw new Error('Unknown garden level '+levelId)
  return record
}

export function fingerprint(round){
  const d=round.game.deal
  return JSON.stringify({
    levelId:round.levelId,turn:round.turn,snaps:round.snaps,
    flipCount:round.flipCount,zeroBreakCount:round.zeroBreakCount,
    status:round.game.status,
    T:d.T,S:d.S,W:d.W,flips:d.flips,plays:d.plays,
    flipFactor:d.flipFactor,
    flipStreak:d.flipStreak,bankCount:d.bankCount,handCap:d.handCap,
    potValue:d.potValue??null,
    pot:d.pot,hand:d.hand,discard:d.discard,pos:d.pos
  })
}

export function sameAction(a,b){
  return !!a&&!!b&&a.type===b.type&&
    (a.type!=='steer'||a.index===b.index)&&
    (a.type!=='bank'||a.dropIndex===b.dropIndex)
}

export function isLegal(available,action){
  return available.some(candidate=>sameAction(candidate,action))
}

export function bankAction(available){
  return available.find(action=>action.type==='bank'&&action.dropIndex==null)
    ||available.find(action=>action.type==='bank')
    ||null
}

export function flipAction(available){
  return available.find(action=>action.type==='flip')||null
}

export function steerActions(available){
  return available.filter(action=>action.type==='steer')
}

export function payoutOf(round){
  const level=onboardingLevel(round.levelId)
  return overswingPayout(round.game,level.rules)
}

export function steerSwing(round,action){
  const level=onboardingLevel(round.levelId)
  const id=round.game.deal.hand[action.index]
  return applySwing(round.game.deal.S,round.game.deal.W,signed(id),level.rules.snapLimit)
}

export function isKnownSnap(round,action){
  return action.type==='steer'&&wouldSnap(round,action)
}

export function isExactZero(round,action){
  if(action.type!=='steer')return false
  const outcome=steerSwing(round,action)
  if(outcome.snap)return false
  return round.game.deal.S!==0&&outcome.S===0
}

export function adjacentSteers(available,index){
  return steerActions(available)
    .filter(action=>action.index===index-1||action.index===index+1)
    .sort((a,b)=>a.index-b.index)
}

export function dedupe(actions){
  const out=[]
  for(const action of actions){
    if(!action)continue
    if(out.some(other=>sameAction(other,action)))continue
    out.push(action)
  }
  return out
}
