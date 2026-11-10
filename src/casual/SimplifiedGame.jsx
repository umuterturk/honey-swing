import {gsap} from 'gsap';
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {createActionPresentation, runPresentedAction} from './actionPresentation.js';
import {boardClickDecision, boardKeyDecision, boardPointerDecision} from './boardInput.js';
import {boardReadout} from './boardReadout.js';
import {createFxBus} from './fx/fxBus.js';
import {boardTapDuringIntro, dismissFeatureIntro, derivedFeatureUnlocks} from './featureIntroRegistry.js';
import {BEAT} from './beatTune.js';
import {restCell, startCellBeat, stopCellBeat} from './heartbeat.js';
import {clearWinMemo, idleHintAction} from './idleHint.js';
import {dismissLevelScreen} from './levelScreens.js';
import {useHoneyLayout, useWinCelebration} from './screens/levelEnd.jsx';
import {useLevelArrival} from './screens/levelStart.jsx';
import {GARDEN_2_START, ONBOARDING_COUNT, onboardingFinished, onboardingLevel, onboardingVictory} from './onboardingLevels.js';
import {ONBOARDING_PROGRESS_KEY, clearOnboardingProgress, noteCommittedPlay, prepareOnboardingJump, readFirstSession} from './onboardingProgress.js';
import {OnboardingPhone} from './OnboardingPhone.jsx';
import {browserStorage, dispatchCasualEvent, prefersReducedMotion} from './platform.js';
import {introCopy, successPlan, takeFirstOutcome} from './presentationSequence.js';
import {settledPresentation} from './presentation.js';
import {playOutcome, startPlayMotion} from './playMotion.js';
import {animateTeachEnter, swingSpotlightPlan, teachDismissesCrossAck, teachFollowRevealed} from './swingTeach.js';
import {
  ackAfterCommit, arrivalBegan, arrivalSettled, clearedDock, closedDevMenu, closedFactor, closedStart,
  dismissedIntro, endTransition, initialScreen, levelScreen, openedFactor, phoneClassName,
  settledScreen, successMarked, toggledDevMenu, toggledHelp
} from './screenState.js';
import {commitPlay, saveRound} from './sessionRecords.js';
import {
  useBoardChrome, useDebugBridge, useSkipFocus
} from './screenEffects.js';

function beatCoach(screen, {opening, dimUp, move2Beat, finished}){
  if(opening.coachingDone||dimUp)return 'off';
  if(screen.startOpen||screen.introGate||screen.arriving||finished)return 'off';
  if(screen.round.levelId!==1)return 'off';
  if(move2Beat)return 'move2';
  if(screen.animating)return 'off';
  if(screen.round.turn===0)return 'move1';
  if(screen.round.turn===1)return 'move2';
  return 'off';
}

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
  const teachEnterCancel=useRef(null);
  const seenFactorsRef=useRef(new Set());
  const introStartRef=useRef(null);
  const levelReadyRef=useRef(null);
  const introGateRef=useRef(screen.introGate);
  const factorInfoOpenerRef=useRef(null);
  const committedRef=useRef(null);
  const landedRef=useRef(false);
  const dimUpRef=useRef(false);
  const openingPlayRef=useRef(null);
  const [move2Beat, setMove2Beat]=useState(false);
  const [dimUp, setDimUp]=useState(false);
  const [showHand, setShowHand]=useState(false);
  const [needleOpen, setNeedleOpen]=useState(false);
  introGateRef.current=screen.introGate;

  function armMove2(){
    if(dimUpRef.current||!landedRef.current)return;
    const opening=readFirstSession(browserStorage());
    const pending=committedRef.current;
    if(!pending||pending.levelId!==1||pending.turn!==1||opening.coachingDone)return;
    setMove2Beat(true);
  }
  function onLandingDim(up){
    dimUpRef.current=!!up;
    setDimUp(!!up);
    if(!up)armMove2();
  }
  function onNeedleSettled(){
    presentationRef.current?.markNeedleSettled();
    setNeedleOpen(false);
    landedRef.current=true;
    armMove2();
  }
  function clearBeatLatch(){
    setMove2Beat(false);
    setNeedleOpen(false);
    setDimUp(false);
    dimUpRef.current=false;
    landedRef.current=false;
    committedRef.current=null;
    openingPlayRef.current=null;
  }

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
    try{teachEnterCancel.current?.();}catch{/* the level change settles next */}
    cancelRef.current=null;
    resetMotionRef.current=null;
    lossMotionRef.current=null;
    breakMotionRef.current=null;
    teachEnterCancel.current=null;
  }
  function changeLevel(id){
    clearWinMemo();
    cancelHandles();
    const next=levelScreen(id, {storage:browserStorage(), reduced:prefersReducedMotion()});
    saveRound(browserStorage(), next.round);
    seenFactorsRef.current=new Set();
    introGateRef.current=next.introGate;
    clearBeatLatch();
    commitScreen(next);
  }

  function controlFromEvent(event){
    const root=rootRef.current;
    if(!root)return null;
    const read=node=>{
      if(!node||typeof node.closest!=='function'||!root.contains(node))return null;
      const card=node.closest('[data-card-id]');
      if(card&&root.contains(card)){
        const id=Number(card.getAttribute('data-card-id'));
        return Number.isInteger(id)?{id, source:card}:null;
      }
      const flip=node.closest('.sgv-flip');
      if(flip&&root.contains(flip))return {action:{type:'flip'}, source:flip};
      const bank=node.closest('.sgv-bank-command');
      if(bank&&root.contains(bank))return {action:{type:'bank'}, source:bank};
      return null;
    };
    const direct=read(event.target);
    if(direct)return direct;
    if(typeof event.clientX!=='number'||(event.clientX===0&&event.clientY===0))return null;
    const skip=root.querySelector('.sgv-skip-surface');
    const prev=skip?.style.pointerEvents;
    if(skip)skip.style.pointerEvents='none';
    let hit=null;
    try{hit=root.ownerDocument.elementFromPoint(event.clientX, event.clientY);}
    finally{if(skip)skip.style.pointerEvents=prev??'';}
    return read(hit);
  }

  function play(action, source){
    stopCellBeat(rootRef.current);
    setMove2Beat(false);
    landedRef.current=false;
    const current=screenRef.current;
    if(onboardingFinished(current.round))return;
    if(!boardTapDuringIntro(introGateRef.current).play)return;
    const root=rootRef.current;
    const level=onboardingLevel(current.round.levelId);
    runPresentedAction(current.round, action, presentationRef.current, {
      onCommit({next, change}){
        committedRef.current=next;
        landedRef.current=false;
        openingPlayRef.current=noteCommittedPlay(browserStorage(), current.round.turn);
        const record=commitPlay(browserStorage(), {
          next, turnBefore:current.round.turn, action, change,
          levelId:level.id, levelCount:ONBOARDING_COUNT, won:onboardingVictory(next)
        });
        for(const entry of record.events){
          const {name, ...details}=entry;
          dispatchCasualEvent(name, details);
        }
        const outcome=playOutcome(change, action);
        const first=teachDismissesCrossAck(level.id, outcome)
          ?null
          :takeFirstOutcome(seenFactorsRef.current, outcome);
        updateScreen(state=>ackAfterCommit({
          ...state,
          teachEnter:false,
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
        setNeedleOpen(false);
        landedRef.current=true;
        armMove2();
        updateScreen(state=>{
          const settled=settledScreen(state, settledPresentation(next));
          return {
            ...settled, committedHand:null,
            teachEnter:teachFollowRevealed(current.round, next)
          };
        });
      },
      startMotion({change}, complete){
        const spotlight=swingSpotlightPlan({
          levelId:level.id, type:change.type, snap:!!change.snap, rewards:change.rewards,
          from:change.from, to:change.to, reduced:prefersReducedMotion()
        });
        const cardPlay=action.type==='steer'||action.type==='flip';
        const noted=openingPlayRef.current;
        const playNumber=noted?.playNumber||0;
        // Dim moves 1–3 while coaching is still open, and move 3 of the deal
        // that just finished coaching. A later retry does not continue that count.
        const openingDim=!!noted&&playNumber>=1&&playNumber<=BEAT.dimPlays&&
          (!noted.coachingDoneBefore||noted.advanced);
        const landingDim=!!(cardPlay&&!spotlight&&openingDim);
        const handle=startPlayMotion({
          root, source, action, change, level,
          firstTap:current.round.levelId===1&&current.round.turn===0,
          seenFactors:seenFactorsRef.current,
          landingDim, onNeedleSettled, onDim:onLandingDim,
          cancelRef, resetMotionRef, lossMotionRef, breakMotionRef,
          setView:patchField('view'), setFeedback:patchField('feedback'), setBeat:patchField('beat'),
          setShownGold:patchField('shownGold'), setAnimating:patchField('animating'),
          setPulse:patchField('pulse'), setHelp:patchField('help')
        }, complete);
        if(presentationRef.current.isPresenting())setNeedleOpen(true);
        return handle;
      }
    });
  }
  useLayoutEffect(()=>{
    if(!screen.teachEnter)return;
    const cancel=animateTeachEnter(rootRef.current);
    teachEnterCancel.current=cancel;
    return ()=>{
      cancel();
      if(teachEnterCancel.current===cancel)teachEnterCancel.current=null;
    };
  }, [screen.teachEnter, screen.round.levelId, screen.round.turn]);

  const bankLive=useBoardChrome({
    rootRef, screen, readout, play, seenFactorsRef, setScreen:setFromEffect
  });
  const opening=readFirstSession(browserStorage());
  const coach=beatCoach(screen, {opening, dimUp, move2Beat, finished:readout.finished});
  const hint=coach==='move1'?idleHintAction(screen.round):null;
  const hintId=hint?.type==='steer'?screen.round.game.deal.hand[hint.index]:null;
  useEffect(()=>{
    if(coach!=='move1'){
      setShowHand(false);
      return;
    }
    setShowHand(false);
    let alive=true;
    const call=gsap.delayedCall(BEAT.handDelay, ()=>{if(alive)setShowHand(true);});
    return ()=>{alive=false;call.kill();};
  }, [coach, screen.round.levelId, screen.round.turn]);
  useEffect(()=>{
    const root=rootRef.current;
    if(!root||coach==='off')return;
    return startCellBeat({
      root, reduced:prefersReducedMotion(), hintId:coach==='move1'?hintId:null
    });
  }, [coach, hintId, screen.round.levelId, screen.round.turn, screen.committedHand, screen.animating]);

  useEffect(()=>()=>{
    fxRef.current.settle();
    presentationRef.current.abandon();
    cancelRef.current?.();
    resetMotionRef.current?.();
    lossMotionRef.current?.();
    breakMotionRef.current?.();
    teachEnterCancel.current?.();
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
  function swingTeachActive(){
    return rootRef.current?.getAttribute('data-swing-teach')==='1';
  }
  function runSteps(steps){
    let consultSkip=false;
    const teach=swingTeachActive();
    for(const step of steps){
      if(step==='stopArrival')arrival.stopArrival();
      if(step==='closeStart')updateScreen(closedStart);
      if(step==='clearDock')updateScreen(clearedDock);
      if(step==='skipPresentation'&&!teach)presentationRef.current.acceptPointerDown();
      if(step==='consultPointer'&&!teach&&presentationRef.current.acceptPointerDown()==='skip')consultSkip=true;
    }
    return consultSkip;
  }

  const ending=successPlan({
    victory:readout.victory, levelId:readout.level.id, secured:readout.deal.T,
    bank:screen.round.game.lastAction?.type==='bank', reduced
  });
  return <OnboardingPhone
    screen={screen} readout={readout} ending={ending} bankLive={bankLive} reduced={reduced}
    coach={coach} showHand={showHand} needleOpen={needleOpen}
    fx={fxRef.current} rootRef={rootRef} introStartRef={introStartRef} levelReadyRef={levelReadyRef}
    phoneClass={phoneClassName(screen, {
      levelId:readout.level.id, garden:readout.level.garden,
      feedback:screen.feedback, eventType:screen.round.event.type
    })}
    onPointerDownCapture={event=>{
      const tapped=event.target?.closest?.('[data-card-id]');
      if(tapped)restCell(tapped);
      if(!swingTeachActive()&&presentationRef.current.isNeedleOpen()){
        const hit=controlFromEvent(event);
        if(hit){
          if(hit.source)restCell(hit.source);
          presentationRef.current.finishPresentation();
          presentationRef.current.holdClick();
          event.preventDefault();
          event.stopPropagation();
          const live=screenRef.current.round;
          let action=hit.action||null;
          if(!action&&Number.isInteger(hit.id)){
            const index=live.game.deal.hand.indexOf(hit.id);
            if(index>=0)action={type:'steer', index};
          }
          if(action)play(action, hit.source);
          return;
        }
      }
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
      const block=!swingTeachActive()&&decision.consultClick&&presentationRef.current.acceptClick()!=='action';
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
      if(decision.skipPresentation&&!swingTeachActive())presentationRef.current.acceptPointerDown();
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
