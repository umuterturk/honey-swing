import {
  animateBankPour,animateBankTargetCelebrate,animateCardAction,animateFactorReset,
  animatePotBreak,animateSnapLoss
} from './minimalMotion.js';
import {animateHandReflow} from './motion/handReflow.js';
import {motionKind} from './actionPresentation.js';
import {FACTORS} from './factors.js';
import {potAddFlyerPhases,saveResetsVisibleFactors} from './presentation.js';
import {reducedMotion} from './motion/stage.js';
import {swingSpotlightPlan} from './swingTeach.js';

export function playOutcome(change, action){
  if(change.snap)return 'snap';
  if(change.zeroBreak)return 'zero';
  const rewarded=new Set((change.rewards||[]).map(reward=>reward.kind));
  const hit=FACTORS.filter(factor=>factor.outcome&&rewarded.has(factor.kind))
    .sort((a,b)=>a.outcomeOrder-b.outcomeOrder)[0];
  if(hit)return hit.outcome;
  if(action.type==='flip')return 'flip';
  return null;
}

export function playFeedback(change, action){
  if(change.snap)return 'snap';
  if(change.zeroBreak)return 'zero_break';
  return action.type;
}

export function playBeat(change, {reset=false}={}){
  if(reset)return 'Multipliers reset.';
  if(change.zeroBreak)return 'Pot safe.';
  if(change.snap)return 'Pot lost. Savings safe.';
  return '';
}

export function cardMotionView(change, {firstTap, level}){
  return {
    ...change,firstTap,
    meterLimit:level.rules.snapLimit,
    showChances:!!level.showChances,
    potTarget:level.rules.potCap||level.target,
    levelId:level.id,
    visibleFactors:level.visibleFactors,
    pourFly:potAddFlyerPhases({levelId:level.id,visibleFactors:level.visibleFactors,...change}),
    spotlight:swingSpotlightPlan({
      levelId:level.id, type:change.type, snap:!!change.snap, rewards:change.rewards,
      from:change.from, to:change.to, reduced:reducedMotion()
    })
  };
}

export function factorsFell(change){
  return change.factorsAfter.some((factor,index)=>factor.value<change.factorsBefore[index].value);
}

// Starts the presentation for a commit that already happened. Returned function
// cancels every timeline this play owns. It does not change the engine round.
export function startPlayMotion({
  root,source,action,change,level,firstTap,seenFactors,handBefore,
  cancelRef,resetMotionRef,lossMotionRef,breakMotionRef,
  setView,setFeedback,setBeat,setShownGold,setAnimating,setPulse,setHelp
}, complete){
  setAnimating(true);
  setFeedback(playFeedback(change, action));
  setBeat(playBeat(change));
  setPulse(false);setHelp(false);
  resetMotionRef.current?.();breakMotionRef.current?.();
  resetMotionRef.current=null;breakMotionRef.current=null;
  let cancelReflow=()=>{};
  const cancelAll=()=>{
    cancelReflow();
    cancelRef.current?.();resetMotionRef.current?.();
    lossMotionRef.current?.();breakMotionRef.current?.();
  };
  if(!root||!source){complete();return cancelAll;}
  if(motionKind(action,change)==='bank'){
    const showReset=saveResetsVisibleFactors(change,level.visibleFactors);
    if(showReset)setBeat(playBeat(change,{reset:true}));
    const afterPour=()=>{
      if(change.securedAfter<level.target){complete();return;}
      cancelRef.current=animateBankTargetCelebrate({root,onComplete:complete});
    };
    cancelRef.current=animateBankPour({
      root,source,potValue:change.rawPotBefore,
      fromScore:change.securedBefore,toScore:change.securedAfter,
      fillTarget:level.target,
      onPourProgress:rawPot=>setView(view=>({...view,rawPot})),
      onTake:()=>{
        setView(view=>({...view,rawPot:0,resonance:0,
          factors:showReset?change.factorsAfter:view.factors}));
        if(showReset){
          resetMotionRef.current?.();
          resetMotionRef.current=animateFactorReset(root);
        }
      },
      onCount:setShownGold,onComplete:afterPour
    });
    return cancelAll;
  }
  change.rewards.forEach(({kind})=>seenFactors.add(kind));
  if(action.type==='steer')cancelReflow=animateHandReflow(root, handBefore);
  cancelRef.current=animateCardAction({
    root,source,action,view:cardMotionView(change,{firstTap,level}),
    onMeter:position=>{
      setView(view=>({...view,position}));
      if(change.snap)setFeedback('snap');
    },
    onPot:rawPot=>setView(view=>({...view,rawPot,resonance:change.resonanceAfter})),
    onSnap:()=>{
      breakMotionRef.current?.();breakMotionRef.current=animatePotBreak(root,'snap');
      lossMotionRef.current?.();lossMotionRef.current=animateSnapLoss(root,change.rawPotBefore);
    },
    onChanceLost:()=>setView(view=>({...view,snaps:change.snapsAfter})),
    onFactors:factors=>{
      setView(view=>({...view,factors}));
      if(change.zeroBreak||change.snap||factorsFell(change)){
        resetMotionRef.current?.();
        resetMotionRef.current=animateFactorReset(root);
      }
    },
    onComplete:complete
  });
  return cancelAll;
}
