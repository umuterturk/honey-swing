import {signed} from '../external/engines.js';
import {multiplierParts,multiplierRewards} from './multiplierView.js';

// Presentation-only selectors: values always come from an already committed engine deal.
// A casual running Pot stores the accrued total on the deal. That number is the Bank
// transfer. Older deals still expose the unmultiplied card sum, not a projected payout.
export function rawPotValue(deal){
  if(Number.isInteger(deal?.potValue))return deal.potValue;
  return (deal.pot||[]).reduce((total,id)=>total+Math.abs(signed(id)),0);
}


// Victory jar honey-fill-mask.png is transparent in the bottom ~9%. Any positive
// amount must clear that dead zone or the puddle is clipped to nothing (e.g. 1/34).
const MIN_VISIBLE_FILL=14;

// Keep the tank a readable, compact visual meter. More points always mean more fluid;
// values beyond the goal are capped visually (the true numbers remain visible).
export function fluidFillPercent(amount,target,{max=78,smooth=false}={}){
  if(!Number.isFinite(amount)||!Number.isFinite(target)||target<=0||max<=0)return 0;
  if(amount<=0)return 0;
  const percent=Math.min(max,(amount/target)*max);
  // Any positive amount keeps a readable meniscus (even 1 drop in a tall jar).
  // Discrete play rounds; smooth pours keep the float but never dip below the floor.
  return smooth?Math.max(MIN_VISIBLE_FILL,percent):Math.max(MIN_VISIBLE_FILL,Math.round(percent));
}

// Both displayed volumes derive from one clamped animation progress value.
// The engine's settled before/after Bank totals remain the authority.
// Player-facing Pot amount is the engine's prospective Bank payout, not the
// unmultiplied raw card sum. During a pour, the same fraction is removed from
// both the displayed number and the bottle's fluid fill.
export function visiblePotPayout(enginePayout,rawTotal,rawRemaining){
  if(!Number.isFinite(enginePayout)||enginePayout<=0||
     !Number.isFinite(rawTotal)||rawTotal<=0)return 0;
  const remaining=Number.isFinite(rawRemaining)?Math.max(0,Math.min(rawTotal,rawRemaining)):rawTotal;
  return Math.ceil(enginePayout*(remaining/rawTotal));
}

// True when Save drops a multiplier the player can currently see on the HUD.
export function saveResetsVisibleFactors(change,visibleFactors){
  if(!change||!Array.isArray(change.factorsBefore)||!Array.isArray(change.factorsAfter))
    return false;
  const visible=Array.isArray(visibleFactors)?visibleFactors:[];
  if(!visible.length)return false;
  return change.factorsBefore.some((factor,index)=>{
    if(!visible.includes(factor.kind))return false;
    const after=change.factorsAfter[index];
    return !!after&&factor.value>after.value;
  });
}

const POT_EQUATION_MAX_LEVEL=15;
const POT_EQUATION_FACTOR_ORDER=Object.freeze(['swing','flip','jackpot']);

// Onboarding Pot flyer: rank × visible factors (>1 only) → +added (levels 1–15).
export function potAddFlyerTerms({
  levelId=99,
  visibleFactors=[],
  addedToPot=0,
  signedCard=null,
  zeroBreak=false,
  factorsBefore=[],
  factorsAfter=[],
  snap=false
}={}){
  if(snap||!Number.isFinite(addedToPot)||addedToPot<=0)return null;
  const added=Math.round(addedToPot);
  if(levelId>POT_EQUATION_MAX_LEVEL)return null;
  const rank=Math.abs(Number(signedCard)||0);
  if(!rank)return null;
  const factors=zeroBreak?factorsBefore:factorsAfter;
  const visible=new Set(Array.isArray(visibleFactors)?visibleFactors:[]);
  const terms=POT_EQUATION_FACTOR_ORDER.flatMap(kind=>{
    if(!visible.has(kind))return [];
    const row=(factors||[]).find(part=>part.kind===kind);
    if(!row||row.value<=1)return [];
    return [{kind,value:row.value}];
  });
  if(!terms.length)return null;
  return {rank,terms,added};
}

export function potAddFlyerPhases(props){
  const added=Math.round(Number(props?.addedToPot)||0);
  const plain='+'+added;
  const terms=potAddFlyerTerms(props);
  if(!terms)return {initial:plain,collapse:null,rich:false};
  return {initial:terms,collapse:plain,rich:true};
}

export function bankPourAmounts(rawPot,securedBefore,securedAfter,progress){
  const p=Number.isFinite(progress)?Math.max(0,Math.min(1,progress)):0;
  return {
    pot:Math.max(0,rawPot*(1-p)),
    secured:Math.round(securedBefore+(securedAfter-securedBefore)*p)
  };
}

export function displayOf(round){
  return {
    position:round.game.deal.S,
    rawPot:rawPotValue(round.game.deal),
    resonance:round.game.deal.resonancePoints||0,
    factors:multiplierParts(round.game.deal),
    snaps:round.snaps
  };
}

// The visual endpoint of a committed action. Numbers come from that action's
// engine result; finishing a motion installs this once and clears the lock.
export function settledPresentation(next){
  return {
    round:next,
    view:displayOf(next),
    shownGold:next.game.deal.T,
    feedback:null,
    animating:false
  };
}

export function actionPresentation(before,after,action){
  const previous=before.game.deal;
  const current=after.game.deal;
  const result=after.game.lastAction||{};
  return {
    type:action.type,
    from:result.from??previous.S,
    to:result.to??current.S,
    signedCard:result.card==null?null:signed(result.card),
    addedToPot:result.addedToPot??0,
    rawPotBefore:rawPotValue(previous),
    rawPotAfter:rawPotValue(current),
    resonanceAfter:current.resonancePoints||0,
    resonanceGained:result.resonanceGained||0,
    bankGain:current.T-previous.T,
    securedBefore:previous.T,
    securedAfter:current.T,
    snap:!!result.snap,
    zeroBreak:!!result.zeroBreak,
    snapsAfter:after.snaps,
    factorsBefore:multiplierParts(previous),
    factorsAfter:multiplierParts(current),
    rewards:multiplierRewards(current,result),
    event:after.event.type
  };
}
