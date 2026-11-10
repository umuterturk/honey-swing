import React, {useEffect, useRef, useState} from 'react';
import {createActionPresentation, runPresentedAction} from './actionPresentation.js';
import {boardClickDecision, boardKeyDecision, boardPointerDecision} from './boardInput.js';
import {boardReadout} from './boardReadout.js';
import {createFxBus} from './fx/fxBus.js';
import {boardTapDuringIntro, dismissFeatureIntro, derivedFeatureUnlocks} from './featureIntroRegistry.js';
import {clearWinMemo} from './idleHint.js';
import {dismissLevelScreen} from './levelScreens.js';
import {useHoneyLayout, useWinCelebration} from './screens/levelEnd.jsx';
import {useLevelArrival} from './screens/levelStart.jsx';
import {GARDEN_2_START, ONBOARDING_COUNT, onboardingFinished, onboardingLevel, onboardingVictory} from './onboardingLevels.js';
import {ONBOARDING_PROGRESS_KEY, clearOnboardingProgress, prepareOnboardingJump} from './onboardingProgress.js';
import {OnboardingPhone} from './OnboardingPhone.jsx';
import {browserStorage, dispatchCasualEvent, prefersReducedMotion} from './platform.js';
import {introCopy, successPlan, takeFirstOutcome} from './presentationSequence.js';
import {settledPresentation} from './presentation.js';
import {playOutcome, startPlayMotion} from './playMotion.js';
import {
  ackAfterCommit, arrivalBegan, arrivalSettled, clearedDock, closedDevMenu, closedFactor, closedStart,
  dismissedIntro, endTransition, initialScreen, levelScreen, openedFactor, phoneClassName,
  settledScreen, successMarked, toggledDevMenu, toggledHelp
} from './screenState.js';
import {commitPlay, saveRound} from './sessionRecords.js';
import {
  useBoardChrome, useDebugBridge, useSkipFocus
} from './screenEffects.js';

export default function SimplifiedGame(){
  const reduced=prefersReducedMotion();
  const [screen, setScreen]=useState(()=>initialScreen({
    storage:browserStorage(), levelCount:ONBOARDING_COUNT, reduced:prefersReducedMotion()
  }));
  const screenRef=useRef(screen);
  const rootRef=useRef(null);
  const fxRef=useRef(null);
  if(!fxRef.current)fxRef.current=createFxBus();
  const presentationRef=useRef(null);
  if(!presentationRef.current)presentationRef.current=createActionPresentation({fx:fxRef.current});
  const cancelRef=useRef(null);
  const resetMotionRef=useRef(null);
  const lossMotionRef=useRef(null);
  const breakMotionRef=useRef(null);
  const seenFactorsRef=useRef(new Set());
  const introStartRef=useRef(null);
  const levelReadyRef=useRef(null);
  const introGateRef=useRef(screen.introGate);
  const factorInfoOpenerRef=useRef(null);
  introGateRef.current=screen.introGate;

  function commitScreen(next){
    screenRef.current=next;
    setScreen(next);
  }
  function updateScreen(recipe){
    commitScreen(recipe(screenRef.current));
  }
  function patchField(field){
    return value=>updateScreen(current=>{
      const patched=typeof value==='function'?value(current[field]):value;
      return {...current, [field]:patched};
    });
  }
  const setScreenStable=useRef(updateScreen);
  setScreenStable.current=updateScreen;
  function setFromEffect(recipe){
    setScreenStable.current(recipe);
  }

  const readout=boardReadout({
    round:screen.round, view:screen.view, feedback:screen.feedback, animating:screen.animating,
    introGate:screen.introGate, factorInfo:screen.factorInfo, startOpen:screen.startOpen, pulse:screen.pulse
  });
  const fresh=screen.round.turn===0&&!screen.round.game.deal.plays;
  const arrival=useLevelArrival({
    rootRef, fxRef, levelId:screen.round.levelId, fresh, introGate:screen.introGate,
    startOpen:screen.startOpen, reduced, introStartRef, levelReadyRef,
    onArrivingSettled:()=>setFromEffect(arrivalSettled),
    onArrivalBegan:motion=>setFromEffect(current=>arrivalBegan(current, motion))
  });
  const win=useWinCelebration({
    rootRef, fxRef, active:readout.finished&&readout.victory, levelId:screen.round.levelId,
    secured:readout.deal.T, target:readout.level.target, reduced,
    onSuccessSettled:()=>setFromEffect(successMarked)
  });
  useHoneyLayout(rootRef, {active:readout.finished&&readout.victory});
  useSkipFocus(rootRef, screen.animating);
  useDebugBridge({fxRef, changeLevel});

  function cancelHandles(){
    try{arrival.stopArrival({notify:false});}catch{/* the level change settles next */}
    try{win.stopWin({notify:false});}catch{/* the level change settles next */}
    try{fxRef.current.settle();}catch{/* settle must not block the tap */}
    presentationRef.current.abandon();
    try{cancelRef.current?.();}catch{/* the level change settles next */}
    try{resetMotionRef.current?.();}catch{/* the level change settles next */}
    try{lossMotionRef.current?.();}catch{/* the level change settles next */}
    try{breakMotionRef.current?.();}catch{/* the level change settles next */}
    cancelRef.current=null;
    resetMotionRef.current=null;
    lossMotionRef.current=null;
    breakMotionRef.current=null;
  }
  function changeLevel(id){
    clearWinMemo();
    cancelHandles();
    const next=levelScreen(id, {storage:browserStorage(), reduced:prefersReducedMotion()});
    saveRound(browserStorage(), next.round);
    seenFactorsRef.current=new Set();
    introGateRef.current=next.introGate;
    commitScreen(next);
  }

  function play(action, source){
    const current=screenRef.current;
    if(onboardingFinished(current.round))return;
    if(!boardTapDuringIntro(introGateRef.current).play)return;
    const root=rootRef.current;
    const level=onboardingLevel(current.round.levelId);
    runPresentedAction(current.round, action, presentationRef.current, {
      onCommit({next, change}){
        const record=commitPlay(browserStorage(), {
          next, turnBefore:current.round.turn, action, change,
          levelId:level.id, levelCount:ONBOARDING_COUNT, won:onboardingVictory(next)
        });
        for(const entry of record.events){
          const {name, ...details}=entry;
          dispatchCasualEvent(name, details);
        }
        const outcome=playOutcome(change, action);
        const first=takeFirstOutcome(seenFactorsRef.current, outcome);
        updateScreen(state=>ackAfterCommit({
          ...state,
          committedHand:action.type==='steer'
            ?current.round.game.deal.hand.filter((_,i)=>i!==action.index)
            :null
        }, {
          outcome, first, text:first?introCopy(first.kind, change.rewards[0]?.value):null
        }));
      },
      onSettle({next}){
        cancelRef.current=null;
        resetMotionRef.current=null;
        lossMotionRef.current=null;
        breakMotionRef.current=null;
        updateScreen(state=>{
          const settled=settledScreen(state, settledPresentation(next));
          return {...settled, committedHand:null};
        });
      },
      startMotion({change}, complete){
        return startPlayMotion({
          root, source, action, change, level,
          firstTap:current.round.levelId===1&&current.round.turn===0,
          seenFactors:seenFactorsRef.current,
          cancelRef, resetMotionRef, lossMotionRef, breakMotionRef,
          setView:patchField('view'), setFeedback:patchField('feedback'), setBeat:patchField('beat'),
          setShownGold:patchField('shownGold'), setAnimating:patchField('animating'),
          setPulse:patchField('pulse'), setHelp:patchField('help')
        }, complete);
      }
    });
  }
  const bankLive=useBoardChrome({
    rootRef, screen, readout, play, seenFactorsRef, setScreen:setFromEffect
  });

  useEffect(()=>()=>{
    fxRef.current.settle();
    presentationRef.current.abandon();
    cancelRef.current?.();
    resetMotionRef.current?.();
    lossMotionRef.current?.();
    breakMotionRef.current?.();
  }, []);

  function dismissIntro(via){
    if(!introGateRef.current)return;
    introGateRef.current=false;
    const outcome=dismissFeatureIntro({
      levelId:screenRef.current.round.levelId, storage:browserStorage(), via, fx:fxRef.current
    });
    if(!outcome.dismissed){
      introGateRef.current=true;
      return;
    }
    const next=dismissedIntro(screenRef.current, outcome);
    introGateRef.current=next.introGate;
    commitScreen(next);
    dispatchCasualEvent('feature_intro_dismiss', {feature:outcome.id, level:next.round.levelId, via});
  }
  function applyEndDecision(decision){
    const result=endTransition(screenRef.current, decision, ONBOARDING_COUNT);
    if(result.enterLevel!=null)changeLevel(result.enterLevel);
    else commitScreen(result.screen);
  }
  function resetProgress(){
    try{clearOnboardingProgress(window.localStorage);}catch{/* startLevel saves the fresh round */}
    changeLevel(1);
    dispatchCasualEvent('onboarding_reset', {level:1});
  }
  function skip(){
    dispatchCasualEvent('tutorial_skip', {level:screenRef.current.round.levelId});
    try{browserStorage()?.setItem(ONBOARDING_PROGRESS_KEY, String(GARDEN_2_START));}catch{/* the jump still starts the level */}
    changeLevel(GARDEN_2_START);
  }
  function goToLevelPrompt(){
    const raw=typeof window!=='undefined'
      ?window.prompt('Go to level (1–'+ONBOARDING_COUNT+')', String(screenRef.current.round.levelId))
      :null;
    if(raw==null)return;
    const wanted=Number.parseInt(String(raw).trim(), 10);
    const id=prepareOnboardingJump(browserStorage(), wanted, {
      levelCount:ONBOARDING_COUNT, introUnlocks:derivedFeatureUnlocks()
    });
    if(id==null){
      updateScreen(closedDevMenu);
      return;
    }
    dispatchCasualEvent('debug_goto_level', {level:id});
    changeLevel(id);
  }
  function runSteps(steps){
    let consultSkip=false;
    for(const step of steps){
      if(step==='stopArrival')arrival.stopArrival();
      if(step==='closeStart')updateScreen(closedStart);
      if(step==='clearDock')updateScreen(clearedDock);
      if(step==='skipPresentation')presentationRef.current.acceptPointerDown();
      if(step==='consultPointer'&&presentationRef.current.acceptPointerDown()==='skip')consultSkip=true;
    }
    return consultSkip;
  }

  const ending=successPlan({
    victory:readout.victory, levelId:readout.level.id, secured:readout.deal.T,
    bank:screen.round.game.lastAction?.type==='bank', reduced
  });
  return <OnboardingPhone
    screen={screen} readout={readout} ending={ending} bankLive={bankLive} reduced={reduced}
    fx={fxRef.current} rootRef={rootRef} introStartRef={introStartRef} levelReadyRef={levelReadyRef}
    phoneClass={phoneClassName(screen, {
      levelId:readout.level.id, garden:readout.level.garden,
      feedback:screen.feedback, eventType:screen.round.event.type
    })}
    onPointerDownCapture={event=>{
      const decision=boardPointerDecision({
        gate:introGateRef.current,
        inIntro:!!event.target?.closest?.('.sgv-feature-intro'),
        presenting:presentationRef.current.isPresenting(),
        startOpen:screenRef.current.startOpen,
        arriving:screenRef.current.arriving||arrival.active,
        docking:screenRef.current.docking
      });
      const consultSkip=runSteps(decision.steps);
      if(decision.prevent||consultSkip)event.preventDefault();
      if(decision.stop||consultSkip)event.stopPropagation();
    }}
    onClickCapture={event=>{
      const decision=boardClickDecision({
        gate:introGateRef.current,
        inIntro:!!event.target?.closest?.('.sgv-feature-intro')
      });
      const block=decision.consultClick&&presentationRef.current.acceptClick()!=='action';
      if(decision.prevent||block)event.preventDefault();
      if(decision.stop||block)event.stopPropagation();
    }}
    onKeyDownCapture={event=>{
      const decision=boardKeyDecision({
        key:event.key, gate:introGateRef.current,
        presenting:presentationRef.current.isPresenting(),
        finished:onboardingFinished(screenRef.current.round),
        victory:onboardingVictory(screenRef.current.round),
        startOpen:screenRef.current.startOpen,
        onButton:!!event.target?.closest?.('button')
      });
      if(!decision.handled)return;
      if(decision.prevent)event.preventDefault();
      if(decision.stop)event.stopPropagation();
      if(decision.dismissIntro){
        dismissIntro(event.target?.closest?.('.sgv-feature-intro-play')?'play':'scrim');
      }
      if(decision.skipPresentation)presentationRef.current.acceptPointerDown();
      if(decision.stopWin)win.stopWin();
      if(decision.endVia){
        applyEndDecision(dismissLevelScreen(
          onboardingVictory(screenRef.current.round)?'win':'lose', decision.endVia
        ));
      }
      if(decision.stopArrival)arrival.stopArrival();
      if(decision.closeStart)updateScreen(closedStart);
    }}
    onPlay={play}
    onFactorInfo={kind=>{
      factorInfoOpenerRef.current=rootRef.current?.querySelector(
        '.sgv-multiplier-pill[data-factor="'+kind+'"]'
      )||null;
      updateScreen(state=>openedFactor(state, kind));
    }}
    onReset={resetProgress}
    onToggleDev={()=>updateScreen(toggledDevMenu)}
    onGotoLevel={goToLevelPrompt}
    onToggleHelp={()=>{updateScreen(toggledHelp); updateScreen(closedDevMenu);}}
    onSkipGarden={()=>{updateScreen(closedDevMenu); skip();}}
    onDismissFactor={()=>{
      updateScreen(closedFactor);
      factorInfoOpenerRef.current?.focus?.();
      factorInfoOpenerRef.current=null;
    }}
    onDismissIntro={dismissIntro}
    onDismissStart={()=>{
      const opening=dismissLevelScreen('start', 'cta');
      if(opening.dismiss&&!opening.lock){
        arrival.stopArrival();
        updateScreen(closedStart);
      }
    }}
    onEndPrimary={()=>{
      if(readout.victory)win.stopWin({notify:false});
      applyEndDecision(dismissLevelScreen(readout.victory?'win':'lose', 'cta'));
    }}
    onEndBackdrop={()=>{
      if(readout.victory)win.stopWin({notify:false});
      applyEndDecision(dismissLevelScreen(readout.victory?'win':'lose', 'backdrop'));
    }}
    onFinishPresentation={()=>{
      fxRef.current.settle();
      presentationRef.current.finishPresentation();
    }}
  />;
}
