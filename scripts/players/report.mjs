import {honeyTier} from '../../src/casual/starThresholds.js';
import {gardenRecord} from './state.mjs';
import {PROFILES,HARNESS_VERSION,ENGINE_BASELINE,SEED_BASE,CAMPAIGN_SEED_STRIDE,MAX_STEPS} from './tuning.mjs';
import {ONBOARDING_COUNT} from '../../src/casual/onboardingLevels.js';

function round6(value){
  if(!Number.isFinite(value))return null
  return Number(value.toFixed(6))
}

function mean(sum,count){
  if(!count)return null
  return round6(sum/count)
}

// Nearest-rank quantile. Scores are integers, so the median stays on a real result.
function quantile(sorted,p){
  if(!sorted.length)return null
  const index=Math.min(sorted.length-1,Math.max(0,Math.ceil(p*sorted.length)-1))
  return sorted[index]
}

function honeyCounts(levelId,bucket){
  const counts=[0,0,0,0]
  for(let i=0;i<bucket.wins.length;i++){
    const tier=bucket.wins[i]?honeyTier(levelId,bucket.T[i]):0
    counts[tier]++
  }
  return counts
}

function attemptsToFirstWin(wins,cap){
  const lengths=[]
  let exhausted=0
  let i=0
  while(i<wins.length){
    let taken=0
    let fails=0
    let won=false
    while(i<wins.length){
      taken++
      const win=wins[i++]
      if(win){won=true;break}
      fails++
      if(cap!=null&&fails>=cap)break
    }
    if(won)lengths.push(taken)
    else exhausted++
  }
  const sorted=lengths.slice().sort((a,b)=>a-b)
  const total=lengths.reduce((sum,value)=>sum+value,0)
  return {
    episodes:lengths.length+exhausted,
    wonEpisodes:lengths.length,
    exhausted,
    median:quantile(sorted,0.5),
    mean:lengths.length?round6(total/lengths.length):null
  }
}

function checkBucket(bucket){
  const fails=bucket.failCause.snap+bucket.failCause.exhausted+bucket.failCause.stuck
    +bucket.failCause.stepCap+bucket.failCause.bigSnap
  const wins=bucket.wins.reduce((sum,value)=>sum+value,0)
  if(wins+fails!==bucket.wins.length){
    throw new Error('Outcome totals do not add up: '+wins+'+'+fails+'!='+bucket.wins.length)
  }
}

function summarizeLevel(levelId,bucket,{episodes=false,episodeFailCap=null,maxWinT=null}={}){
  checkBucket(bucket)
  const attempts=bucket.wins.length
  const wins=bucket.wins.reduce((sum,value)=>sum+value,0)
  const record=gardenRecord(levelId)
  const scores=bucket.T.slice().sort((a,b)=>a-b)
  const median=quantile(scores,0.5)
  const row={
    levelId,
    name:record.name,
    target:record.target,
    star2:record.star2,
    star3:record.star3,
    potCap:record.potCap,
    auto3:!!record.auto3,
    attempts,
    wins,
    winRate:attempts?round6(wins/attempts):null,
    honey:honeyCounts(levelId,bucket),
    score:{
      median,
      p75:quantile(scores,0.75),
      p90:quantile(scores,0.90),
      shortfallToStar2:median==null?null:record.star2-median,
      shortfallToStar3:median==null?null:record.star3-median,
      shortfallToMaxWin:median==null||maxWinT==null?null:maxWinT-median
    },
    actionsPerAttempt:mean(bucket.turnSum,attempts),
    failCause:{...bucket.failCause},
    snapsPerAttempt:mean(bucket.snapSum,attempts),
    snapTotal:bucket.snapSum,
    lostPayoutMean:mean(bucket.lostSum,attempts),
    lostPayoutTotal:bucket.lostSum,
    zeroBreaksPerAttempt:mean(bucket.zeroSum,attempts),
    potOverflows:bucket.overflowSum,
    potOverflowWaste:bucket.wasteSum,
    bigSnapEvents:bucket.bigSnapEvents,
    savesPerWin:wins?round6(bucket.bankSumOnWin/wins):null,
    preBankWins:bucket.preBankWins,
    flipShare:bucket.turnSum?round6(bucket.flipSum/bucket.turnSum):null,
    peakWMean:mean(bucket.peakWSum,attempts),
    peakFlipFactorMean:mean(bucket.peakFlipSum,attempts),
    hintUses:bucket.hintSum
  }
  if(episodes)row.attemptsToFirstWin=attemptsToFirstWin(bucket.wins,episodeFailCap)
  return row
}

function tally(items,keyOf){
  const counts=new Map()
  for(const item of items){
    const key=keyOf(item)
    counts.set(key,(counts.get(key)||0)+1)
  }
  return [...counts.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0])))
    .map(([key,count])=>({key,count}))
}

function summarizeModeB(modeB,maxById){
  const sessions=modeB.sessions
  const levels=[]
  for(let levelId=1;levelId<=ONBOARDING_COUNT;levelId++){
    levels.push(summarizeLevel(levelId,modeB.levels.get(levelId),{
      episodes:false,maxWinT:maxById.get(levelId)?.maxT??null
    }))
  }
  const reached=[]
  for(let levelId=1;levelId<=ONBOARDING_COUNT;levelId++){
    reached.push({levelId,sessions:modeB.reached[levelId]})
  }
  return {
    sessions:sessions.length,
    completed:sessions.filter(session=>session.completed).length,
    hintUses:sessions.reduce((sum,session)=>sum+session.hints,0),
    attemptTotal:sessions.reduce((sum,session)=>sum+session.attempts,0),
    reached,
    lastPlayed:tally(sessions,session=>session.lastPlayed),
    quitLevel:tally(sessions.filter(session=>!session.completed),session=>session.quitLevel),
    quitReason:tally(sessions.filter(session=>!session.completed),session=>session.quitReason),
    furthest:tally(sessions,session=>session.furthest),
    levels
  }
}

export function buildReport(result){
  const maxById=new Map(result.maxWins.map(row=>[row.levelId,row]))
  const referenceById=new Map(result.reference.map(row=>[row.levelId,row]))
  return {
    harness:'simulate-players',
    version:HARNESS_VERSION,
    engineBaseline:ENGINE_BASELINE,
    seedBase:SEED_BASE,
    seedFormula:'mulberry32(seedBase + 1000000*profileIndex + 1000*levelId + runIdx)',
    modeBRunIdx:'modeAAttempts + sessionIdx*campaignSeedStride + attemptInSession',
    campaignSeedStride:CAMPAIGN_SEED_STRIDE,
    maxSteps:MAX_STEPS,
    attempts:result.attempts,
    sessions:result.sessions,
    assumptions:[...result.assumptions],
    tuning:{
      profiles:PROFILES.map(profile=>({...profile}))
    },
    guards:result.guards,
    coverage:Array.from({length:result.guards.onboardingCount},(_,index)=>index+1),
    reference:{
      levels:result.maxWins.map(row=>{
        const casual=referenceById.get(row.levelId)||{}
        const record=gardenRecord(row.levelId)
        return {
          levelId:row.levelId,
          name:record.name,
          maxWinT:row.maxT,
          maxWinStates:row.states,
          maxWinTruncated:row.truncated,
          shortestWinPlies:casual.shortestWinPlies??null,
          shortestWinT:casual.shortestWinT??null,
          zeroSnapForced:casual.zeroSnapForced??null,
          deadEnds:casual.deadEnds??null
        }
      })
    },
    profiles:result.profiles.map(row=>({
      id:row.profile.id,
      name:row.profile.name,
      role:row.profile.role,
      modeA:{
        levels:row.modeA.levels.map(level=>summarizeLevel(level.levelId,level.bucket,{
          episodes:true,
          episodeFailCap:row.profile.episodeFailCap,
          maxWinT:maxById.get(level.levelId)?.maxT??null
        }))
      },
      modeB:summarizeModeB(row.modeB,maxById)
    }))
  }
}

export function renderReport(result){
  return JSON.stringify(buildReport(result),null,2)+'\n'
}
