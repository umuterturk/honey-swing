import {
  newOnboardingRound,onboardingActions,onboardingFinished,onboardingVictory,onboardingLevel,
  stepOnboarding
} from '../../src/casual/onboardingLevels.js';
import {honeyTier} from '../../src/casual/starThresholds.js';
import {chooseAction,wastedPot} from './policies.mjs';
import {MAX_STEPS} from './tuning.mjs';

export function playAttempt(profile,levelId,rng,{stopOnBigSnap=false,bigSnapFraction=0.5}={}){
  let round=newOnboardingRound(levelId)
  const level=onboardingLevel(levelId)
  const memory={hints:0}
  let lostPayout=0
  let overflows=0
  let waste=0
  let bigSnapEvents=0
  let peakW=round.game.deal.W
  let peakFlip=round.game.deal.flipFactor
  let stopReason=null
  let steps=0
  for(;steps<MAX_STEPS;steps++){
    if(onboardingFinished(round))break
    const available=onboardingActions(round)
    if(!available.length)break
    const action=chooseAction(profile,round,available,rng,memory)
    const next=stepOnboarding(round,action)
    if(next===round){
      throw new Error(profile.id+' action rejected on L'+levelId+' turn '+round.turn)
    }
    const last=next.game.lastAction
    if(last?.snap){
      const lost=last.lostPayout||0
      lostPayout+=lost
      if(lost>=bigSnapFraction*level.target){
        bigSnapEvents++
        if(stopOnBigSnap){
          round=next
          stopReason='big-snap'
          break
        }
      }
    }
    if(last?.potOverflow){
      overflows++
      waste+=wastedPot(last)
    }
    if(next.game.deal.W>peakW)peakW=next.game.deal.W
    if(next.game.deal.flipFactor>peakFlip)peakFlip=next.game.deal.flipFactor
    round=next
  }
  const finished=onboardingFinished(round)
  const stepCapped=!finished&&stopReason==null&&steps>=MAX_STEPS
  const win=onboardingVictory(round)
  const T=round.game.deal.T
  let failCause=null
  if(!win){
    if(stopReason==='big-snap')failCause='bigSnap'
    else if(stepCapped)failCause='stepCap'
    else if(round.snaps>=level.maxSnaps)failCause='snap'
    else if(round.game.status!=='playing')failCause='exhausted'
    else failCause='stuck'
  }
  return {
    levelId,win,T,honey:honeyTier(levelId,T),
    turns:round.turn,flips:round.flipCount,snaps:round.snaps,
    lostPayout,zeroBreaks:round.zeroBreakCount,
    overflows,waste,bigSnapEvents,
    banks:round.game.deal.bankCount,
    peakW,peakFlip,failCause,stepCapped,
    hints:memory.hints||0,
    bigSnapQuit:stopReason==='big-snap'
  }
}
