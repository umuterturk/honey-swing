import {
  wouldSnap,stepOnboarding,onboardingLevel,onboardingActions,onboardingFinished
} from '../../src/casual/onboardingLevels.js';
import {rank} from '../../src/external/engines.js';
import {honeyTier} from '../../src/casual/starThresholds.js';
import {shouldAutoBank} from '../../src/casual/bankStatus.js';
import {idleHintAction,clearWinMemo} from '../../src/casual/idleHint.js';
import {
  gardenRecord,sameAction,isLegal,bankAction,flipAction,steerActions,
  payoutOf,steerSwing,isKnownSnap,isExactZero,adjacentSteers,dedupe,fingerprint
} from './state.mjs';

const planMemo=new Map()
export function clearPlanMemo(){planMemo.clear()}
export {clearWinMemo}

function withNoise(profile,round,available,rng,intended,slips){
  if(!intended||!isLegal(available,intended)){
    throw new Error(profile.id+' chose an illegal action on L'+round.levelId)
  }
  const options=dedupe(slips).filter(action=>isLegal(available,action)&&!sameAction(action,intended))
  if(!(rng()<profile.epsilon))return intended
  if(!options.length)return intended
  return options[Math.floor(rng()*options.length)]
}

function forcedSnap(available){
  return steerActions(available).slice().sort((a,b)=>a.index-b.index)[0]||null
}

function jarWantsBank(round){
  const level=onboardingLevel(round.levelId)
  const record=gardenRecord(round.levelId)
  const deal=round.game.deal
  const pay=payoutOf(round)
  if(deal.T+pay>=record.star3)return true
  const potCap=level.rules.potCap
  if(deal.T+potCap<record.star3&&deal.T+pay<level.target){
    const needed=record.star3-potCap-deal.T
    if(needed>0&&pay>=needed)return true
  }
  if(pay===potCap&&pay>0)return true
  return false
}

function rankJarPlays(round,available){
  const level=onboardingLevel(round.levelId)
  const needZero=level.requiresZeroBreak&&round.zeroBreakCount===0
  const ranked=[]
  const flip=flipAction(available)
  if(level.rules.enableFlipFactor&&flip)ranked.push(flip)
  const steers=steerActions(available)
    .filter(action=>!wouldSnap(round,action))
    .map(action=>{
      const outcome=steerSwing(round,action)
      return {action,outcome,magnitude:Math.abs(outcome.S??0)}
    })
  steers.sort((a,b)=>{
    if(needZero){
      const az=a.outcome.S===0?0:1
      const bz=b.outcome.S===0?0:1
      if(az!==bz)return az-bz
    }
    const crossA=a.outcome.swung?1:0
    const crossB=b.outcome.swung?1:0
    if(crossA!==crossB)return crossB-crossA
    if((a.outcome.gain||0)!==(b.outcome.gain||0))return (b.outcome.gain||0)-(a.outcome.gain||0)
    if(!needZero){
      const az=a.outcome.S===0?1:0
      const bz=b.outcome.S===0?1:0
      if(az!==bz)return az-bz
    }
    const magA=Math.abs(steerSigned(round,a.action))
    const magB=Math.abs(steerSigned(round,b.action))
    if(magA!==magB)return magB-magA
    return a.action.index-b.action.index
  })
  for(const entry of steers)ranked.push(entry.action)
  if(flip&&!ranked.some(action=>sameAction(action,flip)))ranked.push(flip)
  const snap=forcedSnap(available)
  if(snap)ranked.push(snap)
  return dedupe(ranked)
}

function steerSigned(round,action){
  const outcome=steerSwing(round,action)
  if(outcome.snap)return 99
  return outcome.S
}

function jarSlips(round,available,intended,ranked){
  const slips=[]
  if(intended.type==='steer')slips.push(...adjacentSteers(available,intended.index))
  const bank=bankAction(available)
  if(bank&&!sameAction(bank,intended))slips.push(bank)
  if(intended.type==='bank'){
    const late=ranked.find(action=>action.type!=='bank')
    if(late)slips.push(late)
  }
  const second=ranked.find(action=>!sameAction(action,intended))
  if(second)slips.push(second)
  return slips
}

function chooseJar(profile,round,available,rng){
  if(round.snaps===0){
    const snaps=steerActions(available).filter(action=>isKnownSnap(round,action))
      .sort((a,b)=>a.index-b.index)
    if(snaps.length&&rng()<profile.pKnownSnap){
      const ranked=rankJarPlays(round,available)
      return withNoise(profile,round,available,rng,snaps[0],jarSlips(round,available,snaps[0],ranked))
    }
  }
  const ranked=rankJarPlays(round,available)
  const bank=bankAction(available)
  const intended=bank&&jarWantsBank(round)?bank:(ranked[0]||available[0])
  return withNoise(profile,round,available,rng,intended,jarSlips(round,available,intended,ranked))
}

function lookaheadSteer(round,action){
  const next=stepOnboarding(round,action)
  const added=next.game.lastAction?.addedToPot||0
  return {added,payout:payoutOf(next),pot:next.game.deal.potValue||0,T:next.game.deal.T}
}

function chooseSaver(profile,round,available,rng){
  const banks=available.filter(action=>action.type==='bank')
  if(banks.length){
    const intended=banks.find(action=>action.dropIndex==null)
      ||banks.slice().sort((a,b)=>a.dropIndex-b.dropIndex)[0]
    return withNoise(profile,round,available,rng,intended,[])
  }
  const flip=flipAction(available)
  const scored=steerActions(available)
    .filter(action=>!wouldSnap(round,action))
    .map(action=>({action,...lookaheadSteer(round,action)}))
  scored.sort((a,b)=>{
    if(a.added!==b.added)return b.added-a.added
    if(a.payout!==b.payout)return b.payout-a.payout
    if(a.pot!==b.pot)return b.pot-a.pot
    return a.action.index-b.action.index
  })
  let intended
  if(!scored.length)intended=flip||forcedSnap(available)||available[0]
  else if(scored[0].added<=0&&flip)intended=flip
  else intended=scored[0].action
  const slips=intended.type==='steer'?adjacentSteers(available,intended.index):[]
  return withNoise(profile,round,available,rng,intended,slips)
}

function pulseAction(round,available){
  const level=onboardingLevel(round.levelId)
  const flip=flipAction(available)
  const steers=steerActions(available).slice().sort((a,b)=>a.index-b.index)
  const card=steers.find(action=>action.index===0)||steers[0]||null
  const bank=bankAction(available)
  if(level.pulse==='flip')return flip||card||bank||available[0]
  if(level.pulse==='card-then-flip'&&round.game.deal.S!==0)return flip||card||bank||available[0]
  return card||flip||bank||available[0]
}

function chooseFirst(profile,round,available,rng,memory){
  const level=onboardingLevel(round.levelId)
  const bank=bankAction(available)
  const pay=bank?payoutOf(round):0
  let intended
  if(bank&&round.game.deal.T+pay>=level.target){
    intended=bank
  }else if(rng()<profile.pIdle){
    const hint=idleHintAction(round)
    if(hint&&isLegal(available,hint)){
      intended=hint
      memory.hints=(memory.hints||0)+1
    }else intended=pulseAction(round,available)
  }else if(rng()<profile.pMisread){
    const snaps=steerActions(available).filter(action=>isKnownSnap(round,action))
      .sort((a,b)=>a.index-b.index)
    intended=snaps[0]||pulseAction(round,available)
  }else{
    intended=pulseAction(round,available)
  }
  const slips=[]
  if(intended.type==='steer')slips.push(...adjacentSteers(available,intended.index))
  if(bank&&!sameAction(bank,intended))slips.push(bank)
  if(intended.type==='bank'){
    const late=pulseAction(round,available)
    if(late&&!sameAction(late,intended))slips.push(late)
  }
  if(intended.type==='flip'){
    const card=steerActions(available).find(action=>action.index===0)
    if(card)slips.push(card)
  }
  return withNoise(profile,round,available,rng,intended,slips)
}

function utility(round){
  const level=onboardingLevel(round.levelId)
  const record=gardenRecord(round.levelId)
  const deal=round.game.deal
  const tier=honeyTier(round.levelId,deal.T)
  const projected=Math.min(record.star3,deal.T+payoutOf(round))
  return tier*1e12+deal.T*1e6+projected*1e3+(20-round.snaps)*10+(9-round.zeroBreakCount)
}

function plannerCandidates(round,available,allowZero,allowSnap){
  const level=onboardingLevel(round.levelId)
  const needZero=level.requiresZeroBreak&&round.zeroBreakCount===0
  return available.filter(action=>{
    if(action.type!=='steer'&&action.type!=='flip'&&action.type!=='bank')return false
    if(action.type==='steer'&&!allowSnap&&isKnownSnap(round,action))return false
    if(action.type==='steer'&&!allowZero&&isExactZero(round,action)&&!needZero)return false
    return true
  })
}

function candidates(round,available){
  const strict=plannerCandidates(round,available,false,false)
  if(strict.length)return strict
  const withZero=plannerCandidates(round,available,true,false)
  if(withZero.length)return withZero
  const withSnap=plannerCandidates(round,available,true,true)
  return withSnap.length?withSnap:available.slice()
}

function twoSavePreBank(round,available){
  const level=onboardingLevel(round.levelId)
  const record=gardenRecord(round.levelId)
  if(record.auto3)return null
  const deal=round.game.deal
  const potCap=level.rules.potCap
  const remaining=record.star3-deal.T
  if(!(potCap<remaining))return null
  const bank=bankAction(available)
  if(!bank)return null
  const pay=payoutOf(round)
  if(!(deal.T+pay<level.target))return null
  const needed=remaining-potCap
  if(needed>0&&pay>=needed)return bank
  return null
}

function roundWithFlipCard(round,card){
  const deal=round.game.deal
  const rest=[]
  let removed=false
  for(let i=deal.pos;i<deal.deck.length;i++){
    const id=deal.deck[i]
    if(!removed&&id===card){removed=true;continue}
    rest.push(id)
  }
  if(!removed)throw new Error('Flip candidate missing from the remaining deck')
  rest.sort((a,b)=>a-b)
  const deck=deal.deck.slice(0,deal.pos).concat(card,rest)
  return {
    ...round,
    game:{
      ...round.game,
      deal:{
        ...deal,
        deck,
        hand:deal.hand.slice(),
        pot:deal.pot.slice(),
        discard:deal.discard.slice()
      }
    }
  }
}

function planKey(round,depth){
  const deal=round.game.deal
  return depth+'|'+fingerprint(round)+'|'+deal.deck.slice(deal.pos).join(',')
}

function evaluate(round,depth){
  const key=planKey(round,depth)
  if(planMemo.has(key))return planMemo.get(key)
  const value=depth<=0||onboardingFinished(round)
    ?utility(round)
    :bestValue(round,depth)
  planMemo.set(key,value)
  return value
}

function flipExpectation(round,depth){
  const deal=round.game.deal
  const remaining=[]
  for(let i=deal.pos;i<deal.deck.length;i++)remaining.push(deal.deck[i])
  if(!remaining.length)return utility(round)
  let total=0
  for(const card of remaining){
    const next=stepOnboarding(roundWithFlipCard(round,card),{type:'flip'})
    if(next===round)throw new Error('Engine rejected a hypothetical Flip')
    total+=evaluate(next,depth-1)
  }
  return total/remaining.length
}

function childValue(round,action,depth){
  const next=stepOnboarding(round,action)
  if(next===round)throw new Error('Engine rejected '+action.type+' during planner search')
  return evaluate(next,depth-1)
}

function bestValue(round,depth){
  const available=candidates(round,onboardingActions(round))
  if(!available.length)return utility(round)
  const pre=twoSavePreBank(round,available)
  if(pre)return childValue(round,pre,depth)
  let best=-Infinity
  for(const action of available){
    const value=action.type==='flip'?flipExpectation(round,depth):childValue(round,action,depth)
    if(value>best)best=value
  }
  return best
}

function actionOrder(a,b){
  const priority=action=>action.type==='bank'?0:action.type==='steer'?1:2
  const diff=priority(a)-priority(b)
  if(diff)return diff
  return (a.index??a.dropIndex??-1)-(b.index??b.dropIndex??-1)
}

function rankPlanner(profile,round,available){
  const pool=candidates(round,available)
  const depth=profile.depth
  const scored=pool.map(action=>{
    const value=action.type==='flip'
      ?flipExpectation(round,depth)
      :evaluate(stepOnboarding(round,action),depth-1)
    return {action,value}
  })
  scored.sort((a,b)=>b.value-a.value||actionOrder(a.action,b.action))
  const ranked=scored.map(entry=>entry.action)
  const pre=twoSavePreBank(round,available)
  if(!pre)return ranked.length?ranked:available.slice()
  return dedupe([pre,...ranked])
}

function choosePlanner(profile,round,available,rng){
  const ranked=rankPlanner(profile,round,available)
  const intended=ranked[0]||available[0]
  const second=ranked.find(action=>!sameAction(action,intended))
  return withNoise(profile,round,available,rng,intended,second?[second]:[])
}

function chooseNervous(profile,round,available,rng){
  const level=onboardingLevel(round.levelId)
  const bank=bankAction(available)
  const pay=bank?payoutOf(round):0
  const absS=Math.abs(round.game.deal.S)
  const safe=steerActions(available)
    .filter(action=>!wouldSnap(round,action))
    .map(action=>({action,abs:Math.abs(steerSwing(round,action).snap?99:steerSwing(round,action).S)}))
    .sort((a,b)=>a.abs-b.abs||a.action.index-b.action.index)
    .map(entry=>entry.action)
  const flip=flipAction(available)
  let intended
  if(bank&&round.game.deal.T+pay>=level.target)intended=bank
  else if(bank&&absS>=profile.flipAvoidAt&&safe.length===0)intended=bank
  else if(safe.length)intended=safe[0]
  else if(flip&&absS<profile.flipAvoidAt)intended=flip
  else if(bank)intended=bank
  else if(flip)intended=flip
  else intended=forcedSnap(available)||available[0]
  const slips=[]
  if(intended.type==='steer'){
    slips.push(...adjacentSteers(available,intended.index))
    if(safe.length>1)slips.push(safe[1])
  }
  return withNoise(profile,round,available,rng,intended,slips)
}

const CHOOSERS={
  jar:chooseJar,
  saver:chooseSaver,
  first:chooseFirst,
  planner:choosePlanner,
  nervous:chooseNervous
}

export function chooseAction(profile,round,available,rng,memory){
  if(!available.length)throw new Error(profile.id+' has no legal action on L'+round.levelId)
  if(shouldAutoBank(available)){
    return withNoise(profile,round,available,rng,bankAction(available),[])
  }
  const choose=CHOOSERS[profile.id]
  if(!choose)throw new Error('No chooser for '+profile.id)
  return choose(profile,round,available,rng,memory)
}

export function wastedPot(lastAction){
  if(!lastAction?.potOverflow||lastAction.zeroBreak)return 0
  const want=(lastAction.multiplier||0)*rank(lastAction.card)
  const kept=lastAction.addedToPot||0
  return Math.max(0,want-kept)
}
