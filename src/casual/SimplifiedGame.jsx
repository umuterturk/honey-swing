import React,{useEffect,useLayoutEffect,useRef,useState} from 'react';
import {overswingPayout,signed} from '../external/engines.js';
import {GardenScene} from './CasualArt.jsx';
import {HorizontalMeter,GlassChest,PendingPot,SimpleCard} from './MinimalBoard.jsx';
import {animateCardAction,animateFactorReset,animateSnapLoss,animatePotBreak,animateBankPour,animateBankTargetCelebrate} from './minimalMotion.js';
import {rawPotValue,visiblePotPayout,displayOf,settledPresentation,saveResetsVisibleFactors,potAddFlyerPhases} from './presentation.js';
import {claimLevelAdvance,introCopy,levelStartPlan,startTap,successPlan,takeFirstOutcome} from './presentationSequence.js';
import {applyHoneyLayout} from './honeyWin.js';
import {playWinCelebration} from './winMotion.js';
import {playLevelStart} from './levelStartMotion.js';
import {createActionPresentation,motionKind,runPresentedAction} from './actionPresentation.js';
import {createFxBus} from './fx/fxBus.js';
import {FxLayer} from './fx/FxLayer.jsx';
import {clearWinMemo,idleHintAction} from './idleHint.js';
import {LevelEndScreen,LevelStartScreen,dismissLevelScreen} from './levelScreens.js';
import {bankAssistiveMessage,nextBankAnnouncement,shouldAutoBank} from './bankStatus.js';
import {focusTargetAfterSkip,isSkipKey,rememberFocus} from './skipFocus.js';
import {
  clearOnboardingProgress,prepareOnboardingJump
} from './onboardingProgress.js';
import {browserStorage,loadOnboardingRound,saveOnboardingRound,unlockOnboardingLevel} from './onboardingSession.js';
import {FeatureIntroOverlay} from './FeatureIntroOverlay.jsx';
import {FactorInfoOverlay} from './FactorInfoOverlay.jsx';
import {factorInfoFor} from './factorInfoContent.js';
import {
  boardTapDuringIntro,dismissFeatureIntro,featureIntroForEntry,introPointerDecision,
  derivedFeatureUnlocks
} from './featureIntroRegistry.js';
import {
  newOnboardingRound,onboardingLevel,onboardingActions,onboardingFinished,
  onboardingVictory,wouldSnap,ONBOARDING_COUNT,GARDEN_2_START
} from './onboardingLevels.js';

function prefersReducedMotion(){
  return typeof window!=='undefined'&&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
const event=(name,details={})=>{
  if(typeof window==='undefined')return;
  window.dispatchEvent(new CustomEvent('swing-casual-event',{detail:{name,...details}}));
};

export default function SimplifiedGame(){
  const [round,setRound]=useState(loadOnboardingRound);
  const openingRef=useRef(null);
  if(openingRef.current===null)openingRef.current=featureIntroForEntry({
    round,storage:browserStorage(),reduced:prefersReducedMotion()
  });
  const [introGate,setIntroGate]=useState(openingRef.current.gate);
  const [introCard,setIntroCard]=useState(openingRef.current.intro);
  const introGateRef=useRef(openingRef.current.gate);
  const introStartRef=useRef(null);
  const levelReadyRef=useRef(null);
  const [view,setView]=useState(()=>displayOf(round));
  const [shownGold,setShownGold]=useState(round.game.deal.T);
  const [animating,setAnimating]=useState(false);
  const [feedback,setFeedback]=useState(null);
  const [pulse,setPulse]=useState(false);
  const [beat,setBeat]=useState('');
  const [help,setHelp]=useState(false);
  const [docking,setDocking]=useState(()=>Boolean(onboardingLevel(round.levelId).dock));
  const freshStart=round.turn===0&&!(round.game.deal.plays);
  const [startOpen,setStartOpen]=useState(freshStart&&!openingRef.current.gate);
  const [ack,setAck]=useState(null);
  const [successSettled,setSuccessSettled]=useState(false);
  const advancedRef=useRef(false);
  const [arriving,setArriving]=useState(()=>openingRef.current.gate?false:levelStartPlan(round.levelId,{
    fresh:freshStart,reduced:prefersReducedMotion()
  }).motion);
  const arrivalRef=useRef(null);
  const winMotionRef=useRef(null);
  const [devMenuOpen,setDevMenuOpen]=useState(false);
  const rootRef=useRef(null),cancelRef=useRef(null),presentationRef=useRef(null);
  const fxRef=useRef(null);
  if(!fxRef.current)fxRef.current=createFxBus();
  if(!presentationRef.current)presentationRef.current=createActionPresentation({fx:fxRef.current});
  const resetMotionRef=useRef(null),lossMotionRef=useRef(null),breakMotionRef=useRef(null);
  const seenFactorsRef=useRef(new Set());
  const priorFocusRef=useRef(null),skipFocusedRef=useRef(false);
  const bankAnnounceRef=useRef(null);
  const [bankLive,setBankLive]=useState('');
  const [factorInfo,setFactorInfo]=useState(null);
  const factorInfoOpenerRef=useRef(null);
  const level=onboardingLevel(round.levelId);
  const {game}=round,deal=game.deal;
  const victory=onboardingVictory(round),finished=onboardingFinished(round);
  const factorInfoEnabled=!animating&&!introGate&&!startOpen&&!finished;
  const available=finished||animating||introGate||factorInfo?[]:onboardingActions(round);
  const canBank=available.some(a=>a.type==='bank'&&a.dropIndex==null);
  const canFlip=available.some(a=>a.type==='flip');
  const autoBank=shouldAutoBank(available);
  const potentialPayout=overswingPayout(game,level.rules);
  // During a Bank pour the committed payout drains. Any other beat shows the
  // accrued Pot directly, including a multiplied add that is larger than the old total.
  const potDisplay=feedback==='bank'
    ?visiblePotPayout(potentialPayout,rawPotValue(deal),view.rawPot)
    :view.rawPot;
  const remaining=deal.deck.length-deal.pos;
  const hearts=Math.max(0,level.maxSnaps-view.snaps);
  const shownHand=deal.hand.slice(0,level.visibleHandSlots);
  const bankMessage=bankAssistiveMessage(round);
  const hint=pulse?idleHintAction(round):null;
  const bankPulse=hint?.type==='bank';
  const flipPulse=hint?.type==='flip';
  const pulseIndex=hint?.type==='steer'?hint.index:null;

  useEffect(()=>()=>{
    fxRef.current.settle();
    presentationRef.current.abandon();
    cancelRef.current?.();resetMotionRef.current?.();
    lossMotionRef.current?.();breakMotionRef.current?.();
  },[]);
  useEffect(()=>{
    if(!import.meta.env.DEV||typeof window==='undefined')return;
    const emit=spec=>fxRef.current.emit(spec);
    window.__swingFxEmit=emit;
    return ()=>{if(window.__swingFxEmit===emit)delete window.__swingFxEmit;};
  },[]);
  const startLevelRef=useRef(null);
  useEffect(()=>{
    if(typeof window==='undefined')return;
    // Recovery/debug: __swingGoToLevel(15) or __swingGoToLevel(15,{reload:true})
    window.__swingGoToLevel=(levelId,options={})=>{
      const id=prepareOnboardingJump(browserStorage(),Number(levelId),{
        levelCount:ONBOARDING_COUNT,
        introUnlocks:derivedFeatureUnlocks()
      });
      if(id==null){
        console.warn('__swingGoToLevel: need an integer 1..'+ONBOARDING_COUNT);
        return false;
      }
      event('debug_goto_level',{level:id});
      if(options.reload){
        window.location.reload();
        return id;
      }
      startLevelRef.current?.(id);
      return id;
    };
    return ()=>{
      if(window.__swingGoToLevel)delete window.__swingGoToLevel;
    };
  },[]);
  useEffect(()=>{
    fxRef.current.settle();
    event('level_start',{level:round.levelId});
    levelReadyRef.current=round.levelId;
    introStartRef.current?.();
    if(introGateRef.current)return;
    return beginArrival();
  },[round.levelId]);
  useEffect(()=>{
    if(!finished||!victory)return;
    const root=rootRef.current;
    if(!root)return;
    const reduced=prefersReducedMotion();
    const plan=successPlan({victory:true,levelId:round.levelId,secured:deal.T,reduced});
    let alive=true;
    const handle=playWinCelebration({
      victory:true,secured:deal.T,target:level.target,tier:plan.tier||0,
      praise:root.querySelector('.sgv-win-praise'),
      tally:root.querySelector('.sgv-win-tally'),
      scoreboard:root.querySelector('.sgv-honey-scoreboard'),
      underline:root.querySelector('.sgv-honey-slogan-underline'),
      drops:[...root.querySelectorAll('.sgv-honey-slogan-drops-art')],
      targetRow:root.querySelector('.sgv-honey-scoreboard-target'),
      liquid:root.querySelector('.sgv-honey-hero-art .sgv-fluid-fill'),
      scrim:root.querySelector('.sgv-honey-scrim'),
      mouth:root.querySelector('.sgv-honey-mouth'),
      source:root.querySelector('.sgv-gold-counter'),
      pot:root.querySelector('.sgv-pending-pot'),
      layer:root.querySelector('.sgv-fx-layer'),
      cta:root.querySelector('.sgv-end-cta'),
      card:root.querySelector('.sgv-honey-win'),
      reduced,bus:fxRef.current,
      onSettled(){if(alive)setSuccessSettled(true);}
    });
    winMotionRef.current=handle;
    return ()=>{
      alive=false;
      if(winMotionRef.current===handle)winMotionRef.current=null;
      handle.cancel();
    };
  },[finished,victory,round.levelId,deal.T]);
  useLayoutEffect(()=>{
    const phone=rootRef.current;
    if(!phone)return;
    const apply=()=>{
      const box=phone.getBoundingClientRect?.();
      const height=box?.height||phone.clientHeight||0;
      const width=box?.width||phone.clientWidth||0;
      if(!(height>0)||!(width>0))return;
      const style=getComputedStyle(phone);
      // padding* already resolves env(safe-area-inset-*); reading --safe-* returns
      // the unevaluated env() string, so parseFloat was always 0 on real phones.
      const top=parseFloat(style.paddingTop)||0;
      const right=parseFloat(style.paddingRight)||0;
      const bottom=parseFloat(style.paddingBottom)||0;
      const left=parseFloat(style.paddingLeft)||0;
      phone.classList.toggle('sgv-honey-short',height-top-bottom<520);
      applyHoneyLayout(phone.querySelector('.sgv-honey-win'),width,height,{top,right,bottom,left});
    };
    const nodes=[...phone.querySelectorAll(
      ':scope > .sgv-hud, :scope > .sgv-middle, :scope > .sgv-controls'
    )];
    for(const node of nodes){
      if(finished&&victory){
        node.setAttribute('aria-hidden','true');
        node.setAttribute('inert','');
      }else{
        node.removeAttribute('aria-hidden');
        node.removeAttribute('inert');
      }
    }
    apply();
    window.addEventListener('resize',apply);
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(apply):null;
    ro?.observe(phone);
    return ()=>{
      window.removeEventListener('resize',apply);
      ro?.disconnect();
    };
  },[finished,victory]);
  useEffect(()=>{
    const reduced=typeof window!=='undefined'&&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const plan=levelStartPlan(round.levelId,{fresh:round.turn===0&&!(round.game.deal.plays),reduced});
    if(!plan.dock)return;
    setDocking(true);
    const timer=setTimeout(()=>setDocking(false),plan.dock.end*1000);
    return ()=>clearTimeout(timer);
  },[round.levelId,level.dock]);
  useEffect(()=>{
    if(introGate||!startOpen)return;
    if(levelReadyRef.current!==round.levelId)return;
    if(arrivalRef.current)return;
    return beginArrival();
  },[introGate,startOpen,round.levelId]);
  useEffect(()=>{
    if(!introGate||!introCard)return;
    event('feature_intro_shown',{feature:introCard.id,level:round.levelId});
  },[introGate,introCard,round.levelId]);
  useEffect(()=>{
    setPulse(false);
    if(animating||finished||introGate||startOpen)return;
    const timer=setTimeout(()=>{
      setPulse(true);
      event('hint_shown',{level:level.id,turn:round.turn});
    },3000);
    return ()=>clearTimeout(timer);
  },[animating,round.turn,round.levelId,finished,level.id,introGate,startOpen]);
  useEffect(()=>{
    const root=rootRef.current;
    if(!root)return;
    if(animating){
      priorFocusRef.current=rememberFocus(document.activeElement,root);
      root.querySelector('.sgv-skip-surface')?.focus();
      skipFocusedRef.current=true;
      return;
    }
    if(!skipFocusedRef.current)return;
    skipFocusedRef.current=false;
    const active=document.activeElement;
    const inside=active&&root.contains(active)?active:null;
    const controls=[...root.querySelectorAll(
      '.sgv-card, .sgv-bank-command, .sgv-flip, .sgv-end-card button')];
    const target=focusTargetAfterSkip({
      active:inside,previous:priorFocusRef.current,controls
    });
    priorFocusRef.current=null;
    if(target&&target!==active)target.focus();
  },[animating]);
  useEffect(()=>{
    const result=nextBankAnnouncement(bankAnnounceRef.current,bankMessage);
    bankAnnounceRef.current=result.previous;
    if(result.text)setBankLive(result.text);
  },[bankMessage]);
  useEffect(()=>{
    if(!factorInfoEnabled&&factorInfo)setFactorInfo(null);
  },[factorInfoEnabled,factorInfo]);
  useEffect(()=>{setFactorInfo(null);},[round.levelId]);
  useEffect(()=>{
    // Mark first Save unlock as seen without overlaying a second "SAVE N" on the button.
    if(!canBank)return;
    takeFirstOutcome(seenFactorsRef.current,'bank');
  },[canBank,round.turn,round.levelId]);
  useEffect(()=>{
    if(!ack)return;
    const timer=setTimeout(()=>setAck(current=>current===ack?null:current),1100);
    return ()=>clearTimeout(timer);
  },[ack]);
  useEffect(()=>{
    if(finished||animating||introGate||startOpen||arriving||!autoBank)return;
    const source=rootRef.current?.querySelector('.sgv-pending-pot');
    const timer=setTimeout(()=>play({type:'bank'},source),280);
    return ()=>clearTimeout(timer);
  },[autoBank,finished,animating,introGate,startOpen,arriving,round.turn,round.levelId]);

  function stopArrival(){
    const handle=arrivalRef.current;
    arrivalRef.current=null;
    try{handle?.cancel();}catch{/* a half-played arrival still has to show its end */}
    try{fxRef.current.settle();}catch{/* settle must not block the tap */}
    try{handle?.showFinal?.();}catch{/* the inline end state is enough */}
    setArriving(false);
  }
  function beginArrival(){
    const root=rootRef.current;
    const fresh=round.turn===0&&!(round.game.deal.plays);
    const reduced=prefersReducedMotion();
    const plan=levelStartPlan(round.levelId,{fresh,reduced});
    if(!root||!fresh||introGateRef.current){
      setArriving(false);
      return ()=>{};
    }
    try{arrivalRef.current?.cancel();}catch{/* the previous banner is already gone */}
    arrivalRef.current=null;
    const banner=document.createElement('div');
    banner.className='sgv-level-banner';
    banner.setAttribute('aria-hidden','true');
    banner.textContent='Level '+round.levelId;
    root.appendChild(banner);
    let alive=true;
    const handle=playLevelStart({
      banner,
      jar:root.querySelector('.sgv-chest-area'),
      goal:root.querySelector('.sgv-goal-progress'),
      board:[...root.querySelectorAll('.sgv-meter-section, .sgv-hand, .sgv-actions, .sgv-pending-pot')],
      reduced,bus:fxRef.current,
      onSettled(){if(alive)setArriving(false);}
    });
    arrivalRef.current=handle;
    setArriving(plan.motion);
    return ()=>{
      alive=false;
      if(arrivalRef.current===handle)arrivalRef.current=null;
      handle.cancel();
    };
  }
  function stopWin(){
    const handle=winMotionRef.current;
    winMotionRef.current=null;
    try{handle?.cancel();}catch{/* a half-played celebration still shows its end */}
    try{fxRef.current.settle();}catch{/* settle must not block the tap */}
    try{handle?.showFinal?.();}catch{/* the inline end state is enough */}
  }
  function startLevel(id){
    clearWinMemo();
    try{arrivalRef.current?.cancel();}catch{/* the level change settles next */}
    arrivalRef.current=null;
    try{winMotionRef.current?.cancel();}catch{/* the level change settles next */}
    winMotionRef.current=null;
    fxRef.current.settle();
    presentationRef.current.abandon();
    cancelRef.current?.();resetMotionRef.current?.();
    lossMotionRef.current?.();breakMotionRef.current?.();
    cancelRef.current=null;resetMotionRef.current=null;
    lossMotionRef.current=null;breakMotionRef.current=null;
    const next=newOnboardingRound(id);
    saveOnboardingRound(next);
    setRound(next);setView(displayOf(next));setShownGold(0);
    setAnimating(false);setFeedback(null);setPulse(false);setBeat('');setHelp(false);
    setDocking(Boolean(onboardingLevel(id).dock));
    setSuccessSettled(false);advancedRef.current=false;
    setAck(null);
    const opening=featureIntroForEntry({
      round:next,storage:browserStorage(),reduced:prefersReducedMotion()
    });
    openingRef.current=opening;
    introGateRef.current=opening.gate;
    setIntroGate(opening.gate);
    setIntroCard(opening.intro);
    setStartOpen(!opening.gate);
    if(opening.gate)setArriving(false);
    setDevMenuOpen(false);
    seenFactorsRef.current=new Set();
  }
  startLevelRef.current=startLevel;
  function dismissIntro(via){
    if(!introGateRef.current)return;
    introGateRef.current=false;
    const outcome=dismissFeatureIntro({
      levelId:round.levelId,storage:browserStorage(),via,fx:fxRef.current
    });
    if(!outcome.dismissed){
      introGateRef.current=true;
      return;
    }
    introGateRef.current=outcome.gate;
    setIntroGate(outcome.gate);
    setIntroCard(outcome.intro);
    event('feature_intro_dismiss',{feature:outcome.id,level:round.levelId,via});
    if(outcome.handoff==='level-start')setStartOpen(true);
  }
  function resetProgress(){
    // One-tap development reset: clear the session, the unlocked level, and the
    // seen feature cards, then restart.
    try{clearOnboardingProgress(window.localStorage);}catch{}
    // The new Level 1 state is saved by startLevel even after clearing storage.
    setDevMenuOpen(false);
    startLevel(1);
    event('onboarding_reset',{level:1});
  }
  function goToLevelPrompt(){
    const raw=typeof window!=='undefined'
      ?window.prompt('Go to level (1–'+ONBOARDING_COUNT+')',String(round.levelId))
      :null;
    if(raw==null)return;
    const wanted=Number.parseInt(String(raw).trim(),10);
    const id=prepareOnboardingJump(browserStorage(),wanted,{
      levelCount:ONBOARDING_COUNT,
      introUnlocks:derivedFeatureUnlocks()
    });
    if(id==null){
      setDevMenuOpen(false);
      return;
    }
    setDevMenuOpen(false);
    event('debug_goto_level',{level:id});
    startLevel(id);
  }
  function nextLevel(){
    if(round.levelId>=ONBOARDING_COUNT)return startLevel(ONBOARDING_COUNT);
    startLevel(round.levelId+1);
  }
  function skip(){
    event('tutorial_skip',{level:level.id});
    unlockOnboardingLevel(GARDEN_2_START);
    startLevel(GARDEN_2_START);
  }

  function finishPresentation(){
    fxRef.current.settle();
    presentationRef.current.finishPresentation();
  }
  function play(action,source){
    if(finished)return;
    if(!boardTapDuringIntro(introGateRef.current).play)return;
    const root=rootRef.current;
    // Commit before motion: an interrupted animation or reload never replays a move.
    runPresentedAction(round,action,presentationRef.current,{
      onCommit({next,change}){
        save(next);
        event(action.type==='steer'?'card_play':action.type,{
          level:level.id,turn:next.turn,card:change.signedCard,
          snap:change.snap,zeroBreak:change.zeroBreak,bankGain:change.bankGain
        });
        if(round.turn===0)event('first_action',{level:level.id});
        if(change.snap)event('snap',{level:level.id});
        if(change.zeroBreak)event('zero_break',{level:level.id});
        change.rewards.forEach(({kind,value})=>event('factor_changed',{level:level.id,kind,value}));
        if(onboardingVictory(next)){
          event('level_complete',{level:level.id,actions:next.turn});
          if(level.id===ONBOARDING_COUNT)event('onboarding_complete');
          unlockOnboardingLevel(Math.min(ONBOARDING_COUNT,level.id+1));
        }
        const outcome=change.snap?'snap':change.zeroBreak?'zero':
          change.rewards.some(reward=>reward.kind==='swing')?'cross':
          change.rewards.some(reward=>reward.kind==='flip')?'flipFactor':
          action.type==='flip'?'flip':null;
        const first=takeFirstOutcome(seenFactorsRef.current,outcome);
        if(first)setAck({kind:first.kind,text:introCopy(first.kind,change.rewards[0]?.value)});
        else if(outcome)setAck(null);
      },
      onSettle({next}){
        const settled=settledPresentation(next);
        cancelRef.current=null;resetMotionRef.current=null;
        lossMotionRef.current=null;breakMotionRef.current=null;
        setRound(settled.round);setView(settled.view);setShownGold(settled.shownGold);
        setFeedback(settled.feedback);setAnimating(settled.animating);
      },
      startMotion({change},complete){
        setAnimating(true);
        setFeedback(change.snap?'snap':change.zeroBreak?'zero_break':action.type);
        setBeat(change.zeroBreak?'Pot safe.':change.snap?'Pot lost. Savings safe.':'');
        setPulse(false);setHelp(false);
        resetMotionRef.current?.();breakMotionRef.current?.();
        resetMotionRef.current=null;breakMotionRef.current=null;
        const cancelAll=()=>{
          cancelRef.current?.();resetMotionRef.current?.();
          lossMotionRef.current?.();breakMotionRef.current?.();
        };
        if(!root||!source){complete();return cancelAll;}
        if(motionKind(action,change)==='bank'){
          const showReset=saveResetsVisibleFactors(change,level.visibleFactors);
          if(showReset)setBeat('Multipliers reset.');
          const afterPour=()=>{
            if(change.securedAfter<level.target){complete();return;}
            cancelRef.current=animateBankTargetCelebrate({root,onComplete:complete});
          };
          cancelRef.current=animateBankPour({
            root,source,potValue:change.rawPotBefore,
            fromScore:change.securedBefore,toScore:change.securedAfter,
            fillTarget:level.target,
            onPourProgress:rawPot=>setView(v=>({...v,rawPot})),
            onTake:()=>{
              setView(v=>({...v,rawPot:0,resonance:0,
                factors:showReset?change.factorsAfter:v.factors}));
              if(showReset){
                resetMotionRef.current?.();
                resetMotionRef.current=animateFactorReset(root);
              }
            },
            onCount:setShownGold,onComplete:afterPour
          });
          return cancelAll;
        }
        change.rewards.forEach(({kind})=>seenFactorsRef.current.add(kind));
        cancelRef.current=animateCardAction({
          root,source,action,view:{...change,firstTap:round.levelId===1&&round.turn===0,
            meterLimit:level.rules.snapLimit,showChances:!!level.showChances,
            potTarget:level.rules.potCap||level.target,
            levelId:level.id,visibleFactors:level.visibleFactors,
            pourFly:potAddFlyerPhases({levelId:level.id,visibleFactors:level.visibleFactors,...change})},
          onMeter:position=>{
            setView(v=>({...v,position}));
            if(change.snap)setFeedback('snap');
          },
          onPot:rawPot=>setView(v=>({...v,rawPot,resonance:change.resonanceAfter})),
          onSnap:()=>{
            breakMotionRef.current?.();breakMotionRef.current=animatePotBreak(root,'snap');
            lossMotionRef.current?.();lossMotionRef.current=animateSnapLoss(root,change.rawPotBefore);
          },
          onChanceLost:()=>setView(v=>({...v,snaps:change.snapsAfter})),
          onFactors:factors=>{
            setView(v=>({...v,factors}));
            if(change.zeroBreak||change.snap||
              change.factorsAfter.some((f,i)=>f.value<change.factorsBefore[i].value)){
              resetMotionRef.current?.();
              resetMotionRef.current=animateFactorReset(root);
            }
          },
          onComplete:complete
        });
        return cancelAll;
      }
    });
  }

  const winLabel=level.id===GARDEN_2_START-1?'LOWER ORCHARD':
    level.id===ONBOARDING_COUNT?'PLAY AGAIN':'NEXT';
  const ending=successPlan({
    victory,levelId:level.id,secured:deal.T,
    bank:round.game.lastAction?.type==='bank',reduced:prefersReducedMotion()
  });
  function settleSuccess(){setSuccessSettled(true);}
  function applyEndDecision(decision){
    if(!decision||decision.lock)return;
    if(decision.settle)settleSuccess();
    if(decision.advance)advanceLevel();
    if(decision.replay)startLevel(level.id);
  }
  function advanceLevel(){
    const claim=claimLevelAdvance(advancedRef.current);
    advancedRef.current=claim.claimed;
    settleSuccess();
    if(claim.advance)nextLevel();
  }
  return <main className="sgv-page">
    <div ref={rootRef}
      data-honey-win={finished&&victory?'true':undefined}
      data-factor-info={factorInfo?true:undefined}
      className={'sgv-phone sgv-onboarding sgv-onboarding-'+level.id+
        (level.garden===2?' sgv-orchard':'')+' sgv-event-'+(feedback||round.event.type)+
        (arriving?' sgv-level-arrival':'')}
      aria-busy={animating}
      data-intro-gate={introGate?true:undefined}
      onPointerDownCapture={event=>{
        const introHit=introPointerDecision({
          gate:introGateRef.current,
          inIntro:!!event.target?.closest?.('.sgv-feature-intro')
        });
        if(introHit.handled){
          if(!introHit.dismiss){
            event.preventDefault();
            event.stopPropagation();
          }
          return;
        }
        const presenting=presentationRef.current.isPresenting();
        if(startOpen&&!presenting){
          const opening=dismissLevelScreen('start','tap');
          if(opening.dismiss&&!opening.lock){
            stopArrival();
            setStartOpen(false);
            if(docking)setDocking(false);
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }
        const tap=startTap({action:presenting,arrival:arriving||!!arrivalRef.current});
        if(tap.finishArrival)stopArrival();
        if(tap.consume){
          presentationRef.current.acceptPointerDown();
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if(docking)setDocking(false);
        if(presentationRef.current.acceptPointerDown()==='skip'){
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onClickCapture={event=>{
        const introHit=introPointerDecision({
          gate:introGateRef.current,
          inIntro:!!event.target?.closest?.('.sgv-feature-intro')
        });
        if(introHit.handled){
          if(!introHit.dismiss){
            event.preventDefault();
            event.stopPropagation();
          }
          return;
        }
        if(presentationRef.current.acceptClick()!=='action'){
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onKeyDownCapture={event=>{
        if(!isSkipKey(event.key))return;
        if(introGateRef.current){
          event.preventDefault();
          event.stopPropagation();
          dismissIntro(event.target?.closest?.('.sgv-feature-intro-play')?'play':'scrim');
          return;
        }
        if(presentationRef.current.isPresenting()){
          event.preventDefault();
          event.stopPropagation();
          presentationRef.current.acceptPointerDown();
          return;
        }
        if(finished){
          if(event.target?.closest?.('button'))return;
          event.preventDefault();
          event.stopPropagation();
          if(victory)stopWin();
          applyEndDecision(dismissLevelScreen(victory?'win':'lose','backdrop'));
          return;
        }
        if(!startOpen)return;
        const opening=dismissLevelScreen('start','skip');
        if(opening.dismiss&&!opening.lock){
          event.preventDefault();
          event.stopPropagation();
          stopArrival();
          setStartOpen(false);
        }
      }}>
      <GardenScene/>
      <FxLayer bus={fxRef.current}/>
      <div className="sgv-atmosphere" aria-hidden="true"/>
      <header className="sgv-hud sgv-tutorial-hud">
        <div className="sgv-level" aria-label={'Level '+level.id+(level.telegraph?' '+level.name:'')}>
          <span>★</span><strong>Level {level.id}</strong>
          {level.telegraph&&<small className="sgv-level-name">{level.name}</small>}
        </div>
        <div className="sgv-hud-right">
          <div className="sgv-gold-counter" aria-label={shownGold+' drops secured'}>
            <span className="sgv-gold-icon">●</span><strong>{shownGold}</strong>
          </div>
          {level.showChances&&<div className={'sgv-lives'+(docking&&level.dock==='hearts'?' sgv-dock':'')}
            aria-label={hearts+' chances remaining'}>
            {Array.from({length:level.maxSnaps},(_,i)=><span key={i}
              className={i<hearts?'sgv-heart':'sgv-heart sgv-heart-empty'}>♥</span>)}
          </div>}
          <div className="sgv-tutorial-tools">
            <button type="button" className="sgv-reset-progress"
              onClick={resetProgress} aria-label="Reset onboarding progress and restart Level 1"
              title="Reset onboarding progress">
              <span aria-hidden="true" className="sgv-reset-icon">↺</span>
              <span className="sgv-reset-label">Reset</span>
            </button>
            <button type="button" className="sgv-dev-menu-toggle"
              onClick={()=>setDevMenuOpen(open=>!open)}
              aria-label="More onboarding tools" aria-expanded={devMenuOpen}>⋯</button>
            {devMenuOpen&&<div className="sgv-dev-menu" role="group" aria-label="Onboarding tools">
              <button type="button" onClick={goToLevelPrompt}>
                Go to level…
              </button>
              <button type="button" onClick={()=>{setHelp(value=>!value);setDevMenuOpen(false);}}>
                {help?'Hide help':'Show help'}
              </button>
              {level.id<GARDEN_2_START&&<button type="button"
                onClick={()=>{setDevMenuOpen(false);skip();}}>
                Skip to Level 13
              </button>}
            </div>}
          </div>
        </div>
      </header>
      <div className="sgv-spring-top" aria-hidden="true"/>
      <div className="sgv-middle">
        <HorizontalMeter position={view.position} limit={level.rules.snapLimit}
          multipliers={view.factors} visibleFactors={level.visibleFactors}
          showDanger={level.showChances} beat={ack?ack.text:beat} dock={docking?level.dock:null}
          factorInfoEnabled={factorInfoEnabled}
          onFactorInfo={kind=>{
            factorInfoOpenerRef.current=rootRef.current?.querySelector(
              '.sgv-multiplier-pill[data-factor="'+kind+'"]'
            )||null;
            setFactorInfo(kind);
          }}/>
        <span className="sgv-flight-center" aria-hidden="true"/>
        <div className="sgv-bottle-pair" aria-label="Pending Pot and secured glass">
          <PendingPot value={potDisplay} cap={level.rules.potCap} target={level.target}
            bankable={canBank} interactive={false}/>
          <GlassChest banked={shownGold} target={level.target}/>
        </div>
      </div>
      <section className="sgv-controls sgv-tutorial-controls" aria-label="Card actions">
        <div className="sgv-card-shelf" aria-hidden="true"/>
        <div className="sgv-hand" aria-label="Your cards">
          {shownHand.map((id,i)=><SimpleCard key={id} id={id} index={i}
            value={signed(id)} showDirection={true}
            risky={level.showChances&&wouldSnap(round,{type:'steer',index:i})}
            highlighted={pulseIndex===i}
            disabled={finished||animating||!available.some(a=>a.type==='steer'&&a.index===i)}
            onPlay={(index,element)=>play({type:'steer',index},element)}/>)}
        </div>
        <div className="sgv-actions sgv-tutorial-actions">
          <button type="button"
            className={'sgv-action sgv-bank sgv-bank-command'+(bankPulse?' sgv-attention':'')}
            disabled={!canBank}
            onClick={()=>play({type:'bank'},rootRef.current?.querySelector('.sgv-pending-pot'))}
            aria-label={canBank?'Save '+potDisplay+' pending drops':bankMessage}>
            <span className="sgv-action-text">SAVE{canBank?' '+potDisplay:''}</span>
          </button>
          <p className="sgv-bank-live" aria-live="polite" aria-atomic="true">{bankLive}</p>
          {level.showFlip&&remaining>0&&<button type="button"
            className="sgv-action sgv-flip"
            data-dock={docking&&level.dock==='flip'?true:undefined}
            data-hint={flipPulse?true:undefined}
            disabled={!canFlip}
            onClick={e=>play({type:'flip'},e.currentTarget.querySelector('.sgv-next-card'))}
            aria-label={'Flip a hidden card. '+remaining+' remain'}>
            <span className="sgv-action-icon">⟳</span>
            <span className="sgv-action-text">FLIP</span>
            <span className="sgv-flip-next"><span className="sgv-next-card">?</span>
              <small>{remaining} left</small></span>
          </button>}
        </div>
      </section>
      <div className="sgv-spring-bottom" aria-hidden="true"/>
      {help&&!finished&&<ul className="sgv-glossary" role="note">
        <li>Card → meter → Pot</li>
        <li>SAVE → Savings</li>
        <li>Pill × this card</li>
        <li>0 keeps the Pot. Snap empties it.</li>
      </ul>}
      {factorInfo&&factorInfoFor(factorInfo)&&<FactorInfoOverlay
        info={factorInfoFor(factorInfo)}
        onDismiss={()=>{
          setFactorInfo(null);
          factorInfoOpenerRef.current?.focus?.();
          factorInfoOpenerRef.current=null;
        }}/>}
      {introGate&&introCard&&<FeatureIntroOverlay intro={introCard}
        reduced={prefersReducedMotion()} bus={fxRef.current} onDismiss={dismissIntro}
        levelId={round.levelId} introStartRef={introStartRef} levelReadyRef={levelReadyRef}/>}
      {startOpen&&!introGate&&!finished&&!animating&&<LevelStartScreen levelId={level.id} target={level.target}
        onDismiss={()=>{
          const opening=dismissLevelScreen('start','cta');
          if(opening.dismiss&&!opening.lock){
            stopArrival();
            setStartOpen(false);
          }
        }}/>}
      {finished&&<LevelEndScreen victory={victory} score={deal.T} target={level.target}
        label={victory?winLabel:'TRY AGAIN'} orchard={!!ending.orchard} settled={successSettled}
        praise={ending.praise} reduced={victory&&!ending.motion}
        onPrimary={()=>{
          if(victory)stopWin();
          applyEndDecision(dismissLevelScreen(victory?'win':'lose','cta'));
        }}
        onBackdrop={()=>{
          if(victory)stopWin();
          applyEndDecision(dismissLevelScreen(victory?'win':'lose','backdrop'));
        }}
        onReset={resetProgress}/>}
      {animating&&<button type="button" className="sgv-skip-surface" aria-label="Skip animation"
        onPointerDown={event=>{event.preventDefault();event.stopPropagation();finishPresentation();}}
        onClick={event=>{event.preventDefault();event.stopPropagation();finishPresentation();}}/>}
    </div>
  </main>;
}