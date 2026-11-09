import {
  ONBOARDING_COUNT,newOnboardingRound,onboardingActions,onboardingVictory,onboardingFinished,
  stepOnboarding
} from '../../src/casual/onboardingLevels.js';
import {fingerprint} from './state.mjs';

// Highest secured total on any winning line. Separate from the casual BFS script.
export function searchMaxWin(levelId,{maxStates=100000,maxDepth=32}={}){
  const queue=[newOnboardingRound(levelId)]
  const seen=new Set()
  let maxT=null
  let truncated=false
  for(let cursor=0;cursor<queue.length;cursor++){
    if(seen.size>=maxStates){truncated=true;break}
    const round=queue[cursor]
    const key=fingerprint(round)
    if(seen.has(key))continue
    seen.add(key)
    if(onboardingVictory(round)){
      const secured=round.game.deal.T
      if(maxT==null||secured>maxT)maxT=secured
      continue
    }
    if(onboardingFinished(round))continue
    if(round.turn>=maxDepth){truncated=true;continue}
    const available=onboardingActions(round)
    for(const action of available){
      const next=stepOnboarding(round,action)
      if(next===round)throw new Error('Engine rejected an available action during max-win search')
      queue.push(next)
    }
  }
  return {levelId,maxT,states:seen.size,truncated}
}

export function searchAllMaxWins(){
  const levels=[]
  for(let levelId=1;levelId<=ONBOARDING_COUNT;levelId++)levels.push(searchMaxWin(levelId))
  return levels
}

export function replayActions(levelId,actions){
  let round=newOnboardingRound(levelId)
  for(const action of actions){
    const next=stepOnboarding(round,action)
    if(next===round)throw new Error('Could not replay shortest win on L'+levelId)
    round=next
  }
  return round.game.deal.T
}
