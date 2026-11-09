import {GARDEN} from '../../src/casual/levels/garden.js';
import {
  ONBOARDING_COUNT,ONBOARDING_LEVELS
} from '../../src/casual/onboardingLevels.js';
import {simulateOnboardingLevel} from '../simulate-casual-onboarding.mjs';
import {clearWinMemo,clearPlanMemo} from './policies.mjs';
import {playAttempt} from './playout.mjs';
import {rngFor,modeBRunIdx} from './rng.mjs';
import {searchAllMaxWins,replayActions} from './reference.mjs';
import {freshSession,openAttempt,afterAttempt,stopSession} from './session.mjs';
import {
  PROFILES,ASSUMPTIONS,MODE_A_ATTEMPTS,MODE_B_SESSIONS,CAMPAIGN_SEED_STRIDE,BIG_SNAP_FRACTION
} from './tuning.mjs';

function emptyBucket(){
  return {
    wins:[],T:[],turnSum:0,flipSum:0,snapSum:0,lostSum:0,zeroSum:0,
    overflowSum:0,wasteSum:0,bankSumOnWin:0,preBankWins:0,
    peakWSum:0,peakFlipSum:0,hintSum:0,bigSnapEvents:0,stepCaps:0,
    failCause:{snap:0,exhausted:0,stuck:0,stepCap:0,bigSnap:0}
  }
}

function record(bucket,outcome){
  bucket.wins.push(outcome.win?1:0)
  bucket.T.push(outcome.T)
  bucket.turnSum+=outcome.turns
  bucket.flipSum+=outcome.flips
  bucket.snapSum+=outcome.snaps
  bucket.lostSum+=outcome.lostPayout
  bucket.zeroSum+=outcome.zeroBreaks
  bucket.overflowSum+=outcome.overflows
  bucket.wasteSum+=outcome.waste
  bucket.peakWSum+=outcome.peakW
  bucket.peakFlipSum+=outcome.peakFlip
  bucket.hintSum+=outcome.hints
  bucket.bigSnapEvents+=outcome.bigSnapEvents
  if(outcome.win){
    bucket.bankSumOnWin+=outcome.banks
    if(outcome.banks>=2)bucket.preBankWins++
  }
  if(outcome.stepCapped)bucket.stepCaps++
  if(outcome.failCause)bucket.failCause[outcome.failCause]++
}

export function assertCoverage(levelIds,count){
  const seen=new Set(levelIds)
  for(let levelId=1;levelId<=count;levelId++){
    if(!seen.has(levelId))throw new Error('Mode A missed level '+levelId+' of '+count)
  }
  if(seen.size!==count)throw new Error('Mode A played '+seen.size+' levels, expected '+count)
}

function gardenSnapshot(){
  return JSON.stringify(GARDEN)
}

function casualLines(){
  const lines=[]
  for(let levelId=1;levelId<=ONBOARDING_COUNT;levelId++){
    lines.push(JSON.stringify(simulateOnboardingLevel(levelId)))
  }
  return lines
}

function runModeA(profile,attempts){
  const levels=[]
  let stepCaps=[]
  for(let levelId=1;levelId<=ONBOARDING_COUNT;levelId++){
    clearWinMemo()
    clearPlanMemo()
    const bucket=emptyBucket()
    for(let runIdx=0;runIdx<attempts;runIdx++){
      const outcome=playAttempt(profile,levelId,rngFor(profile.index,levelId,runIdx),{
        stopOnBigSnap:false,bigSnapFraction:profile.bigSnapFraction??BIG_SNAP_FRACTION
      })
      record(bucket,outcome)
    }
    if(bucket.stepCaps)stepCaps.push({levelId,count:bucket.stepCaps})
    levels.push({levelId,bucket})
  }
  assertCoverage(levels.map(level=>level.levelId),ONBOARDING_COUNT)
  return {levels,stepCaps}
}

function runModeB(profile,sessions,modeAAttempts){
  const roster=[]
  for(let sessionIdx=0;sessionIdx<sessions;sessionIdx++)roster.push(freshSession(sessionIdx))
  const levels=new Map()
  for(let levelId=1;levelId<=ONBOARDING_COUNT;levelId++)levels.set(levelId,emptyBucket())
  const reached=new Array(ONBOARDING_COUNT+1).fill(0)
  let stepCaps=[]
  for(let levelId=1;levelId<=ONBOARDING_COUNT;levelId++){
    clearWinMemo()
    clearPlanMemo()
    let pending=true
    let spins=0
    while(pending){
      pending=false
      if(++spins>100000)throw new Error(profile.id+' campaign spun on L'+levelId)
      for(const session of roster){
        if(!session.alive||session.levelId!==levelId)continue
        const blocked=openAttempt(profile,session)
        if(blocked?.type==='quit'){
          stopSession(session,blocked.reason,levelId)
          continue
        }
        if(!session.played.has(levelId)){
          session.played.add(levelId)
          reached[levelId]++
        }
        const runIdx=modeBRunIdx(modeAAttempts,session.sessionIdx,session.attemptInSession,CAMPAIGN_SEED_STRIDE)
        session.attemptInSession++
        session.attempts++
        session.furthest=Math.max(session.furthest,levelId)
        session.lastPlayed=levelId
        const outcome=playAttempt(profile,levelId,rngFor(profile.index,levelId,runIdx),{
          stopOnBigSnap:profile.id==='nervous',
          bigSnapFraction:profile.bigSnapFraction??BIG_SNAP_FRACTION
        })
        session.hints+=outcome.hints
        record(levels.get(levelId),outcome)
        if(outcome.stepCapped)stepCaps.push({levelId,sessionIdx:session.sessionIdx})
        const decision=afterAttempt(profile,session,outcome,ONBOARDING_COUNT)
        if(decision.type==='quit')stopSession(session,decision.reason,levelId)
        if(session.alive&&session.levelId===levelId)pending=true
      }
    }
  }
  for(const session of roster){
    if(session.alive)throw new Error(profile.id+' session '+session.sessionIdx+' still active after the garden')
    if(!session.completed&&!session.quitReason){
      throw new Error(profile.id+' session '+session.sessionIdx+' ended without a reason')
    }
  }
  return {sessions:roster,levels,reached,stepCaps}
}

export function runPlayerSim(options={}){
  const attempts=options.attempts??MODE_A_ATTEMPTS
  const sessions=options.sessions??MODE_B_SESSIONS
  const guards=options.guards!==false
  if(!Number.isInteger(attempts)||attempts<1)throw new Error('attempts must be a positive integer')
  if(!Number.isInteger(sessions)||sessions<1)throw new Error('sessions must be a positive integer')
  if(!Object.isFrozen(GARDEN))throw new Error('GARDEN is not frozen')
  if(!Object.isFrozen(ONBOARDING_LEVELS))throw new Error('ONBOARDING_LEVELS is not frozen')

  const gardenBefore=gardenSnapshot()
  const casualBefore=guards?casualLines():null
  const maxWins=searchAllMaxWins()
  const reference=casualBefore?casualBefore.map(line=>{
    const parsed=JSON.parse(line)
    const shortest=parsed.shortestWin
    return {
      levelId:parsed.levelId,
      states:parsed.states,
      shortestWinPlies:shortest?shortest.length:null,
      shortestWinT:shortest?replayActions(parsed.levelId,shortest):null,
      zeroSnapForced:parsed.zeroSnapForced,
      deadEnds:parsed.deadEnds
    }
  }):[]

  const profiles=[]
  const stepCapHits=[]
  for(const profile of PROFILES){
    const modeA=runModeA(profile,attempts)
    const modeB=runModeB(profile,sessions,attempts)
    for(const hit of modeA.stepCaps)stepCapHits.push({profile:profile.id,mode:'A',...hit})
    for(const hit of modeB.stepCaps)stepCapHits.push({profile:profile.id,mode:'B',...hit})
    profiles.push({profile,modeA,modeB})
  }

  const gardenAfter=gardenSnapshot()
  const gardenUnchanged=gardenBefore===gardenAfter
  if(!gardenUnchanged)throw new Error('GARDEN contents changed during the player sim')
  let casualMatched=null
  if(guards){
    const casualAfter=casualLines()
    casualMatched=casualBefore.length===casualAfter.length&&casualBefore.every((line,i)=>line===casualAfter[i])
    if(!casualMatched)throw new Error('simulateOnboardingLevel output changed after the player sim')
  }
  if(stepCapHits.length){
    throw new Error('Step cap hit without a terminal state: '+JSON.stringify(stepCapHits))
  }
  assertCoverage(profiles.flatMap(row=>row.modeA.levels.map(level=>level.levelId)),ONBOARDING_COUNT)

  return {
    attempts,sessions,assumptions:ASSUMPTIONS,
    guards:{
      gardenFrozen:true,
      onboardingLevelsFrozen:true,
      gardenUnchanged,
      simulateCasualMatched:casualMatched,
      stepCapNonTerminal:0,
      onboardingCount:ONBOARDING_COUNT
    },
    maxWins,reference,profiles
  }
}
