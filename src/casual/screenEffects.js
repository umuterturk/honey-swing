import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {playWinCelebration} from './winMotion.js';
import {playLevelStart} from './levelStartMotion.js';
import {applyHoneyLayout} from './honeyWin.js';
import {levelStartPlan} from './presentationSequence.js';
import {successPlan} from './presentationSequence.js';
import {nextBankAnnouncement} from './bankStatus.js';
import {focusTargetAfterSkip, rememberFocus} from './skipFocus.js';
import {takeFirstOutcome} from './presentationSequence.js';
import {prepareOnboardingJump} from './onboardingProgress.js';
import {derivedFeatureUnlocks} from './featureIntroRegistry.js';
import {ONBOARDING_COUNT} from './onboardingLevels.js';
import {browserStorage, dispatchCasualEvent, prefersReducedMotion} from './platform.js';
import {closedFactor, dockExpired, shownPulse} from './screenState.js';

function devBuild(){return !!import.meta.env?.DEV;}

export function useDebugBridge({fxRef, changeLevel}){
  const changeLevelRef=useRef(changeLevel);
  changeLevelRef.current=changeLevel;
  useEffect(()=>{
    if(!devBuild()||typeof window==='undefined')return;
    const emit=spec=>fxRef.current.emit(spec);
    window.__swingFxEmit=emit;
    return ()=>{if(window.__swingFxEmit===emit)delete window.__swingFxEmit;};
  }, [fxRef]);
  useEffect(()=>{
    if(typeof window==='undefined')return;
    window.__swingGoToLevel=(levelId, options={})=>{
      const id=prepareOnboardingJump(browserStorage(), Number(levelId), {
        levelCount:ONBOARDING_COUNT, introUnlocks:derivedFeatureUnlocks()
      });
      if(id==null){
        console.warn('__swingGoToLevel: need an integer 1..'+ONBOARDING_COUNT);
        return false;
      }
      dispatchCasualEvent('debug_goto_level', {level:id});
      if(options.reload){
        window.location.reload();
        return id;
      }
      changeLevelRef.current(id);
      return id;
    };
    return ()=>{if(window.__swingGoToLevel)delete window.__swingGoToLevel;};
  }, []);
}

export function useLevelArrival({
  rootRef, fxRef, levelId, fresh, introGate, startOpen, reduced,
  introStartRef, levelReadyRef, onArrivingSettled, onArrivalBegan=()=>{}
}){
  const arrivalRef=useRef(null);
  const [handleOn, setHandleOn]=useState(false);
  function stopArrival({notify=true}={}){
    const handle=arrivalRef.current;
    arrivalRef.current=null;
    setHandleOn(false);
    try{handle?.cancel();}catch{/* a half-played arrival still has to show its end */}
    try{fxRef.current.settle();}catch{/* settle must not block the tap */}
    try{handle?.showFinal?.();}catch{/* the inline end state is enough */}
    if(notify)onArrivingSettled();
  }
  function beginArrival(){
    const root=rootRef.current;
    if(!root||!fresh||introGate){
      onArrivingSettled();
      return ()=>{};
    }
    try{arrivalRef.current?.cancel();}catch{/* the previous banner is already gone */}
    arrivalRef.current=null;
    const banner=document.createElement('div');
    banner.className='sgv-level-banner';
    banner.setAttribute('aria-hidden', 'true');
    banner.textContent='Level '+levelId;
    root.appendChild(banner);
    let alive=true;
    const plan=levelStartPlan(levelId, {fresh, reduced});
    const handle=playLevelStart({
      banner,
      jar:root.querySelector('.sgv-chest-area'),
      goal:root.querySelector('.sgv-goal-progress'),
      board:[...root.querySelectorAll('.sgv-meter-section, .sgv-hand, .sgv-actions, .sgv-pending-pot')],
      reduced, bus:fxRef.current,
      onSettled(){if(alive)onArrivingSettled();}
    });
    arrivalRef.current=handle;
    setHandleOn(true);
    onArrivalBegan(plan.motion);
    return ()=>{
      alive=false;
      if(arrivalRef.current===handle)arrivalRef.current=null;
      setHandleOn(false);
      handle.cancel();
    };
  }
  useEffect(()=>{
    dispatchCasualEvent('level_start', {level:levelId});
    levelReadyRef.current=levelId;
    introStartRef.current?.();
    if(introGate)return;
    return beginArrival();
    // fresh, reduced, and the gate are the values for this level entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);
  useEffect(()=>{
    if(introGate||!startOpen)return;
    if(levelReadyRef.current!==levelId)return;
    if(arrivalRef.current)return;
    return beginArrival();
    // beginArrival reads the latest fresh/reduced for this open start screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introGate, startOpen, levelId]);
  return {stopArrival, active:handleOn||!!arrivalRef.current};
}

export function useWinCelebration({
  rootRef, fxRef, active, levelId, secured, target, reduced, onSuccessSettled
}){
  const winMotionRef=useRef(null);
  function stopWin({notify=true}={}){
    const handle=winMotionRef.current;
    winMotionRef.current=null;
    try{handle?.cancel();}catch{/* a half-played celebration still shows its end */}
    try{fxRef.current.settle();}catch{/* settle must not block the tap */}
    try{handle?.showFinal?.();}catch{/* the inline end state is enough */}
    if(notify)onSuccessSettled();
  }
  useEffect(()=>{
    if(!active)return;
    const root=rootRef.current;
    if(!root)return;
    const plan=successPlan({victory:true, levelId, secured, reduced});
    let alive=true;
    const handle=playWinCelebration({
      victory:true, secured, target, tier:plan.tier||0,
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
      reduced, bus:fxRef.current,
      onSettled(){if(alive)onSuccessSettled();}
    });
    winMotionRef.current=handle;
    return ()=>{
      alive=false;
      if(winMotionRef.current===handle)winMotionRef.current=null;
      handle.cancel();
    };
    // onSuccessSettled goes through the shell ref. Depending on it restarts the win every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, levelId, secured]);
  return {stopWin};
}

export function useHoneyLayout(rootRef, {active}){
  useLayoutEffect(()=>{
    const phone=rootRef.current;
    if(!phone)return;
    const apply=()=>{
      const box=phone.getBoundingClientRect?.();
      const height=box?.height||phone.clientHeight||0;
      const width=box?.width||phone.clientWidth||0;
      if(!(height>0)||!(width>0))return;
      const style=getComputedStyle(phone);
      const top=parseFloat(style.paddingTop)||0;
      const right=parseFloat(style.paddingRight)||0;
      const bottom=parseFloat(style.paddingBottom)||0;
      const left=parseFloat(style.paddingLeft)||0;
      phone.classList.toggle('sgv-honey-short', height-top-bottom<520);
      applyHoneyLayout(phone.querySelector('.sgv-honey-win'), width, height, {top, right, bottom, left});
    };
    const nodes=[...phone.querySelectorAll(':scope > .sgv-hud, :scope > .sgv-middle, :scope > .sgv-controls')];
    for(const node of nodes){
      if(active){
        node.setAttribute('aria-hidden', 'true');
        node.setAttribute('inert', '');
      }else{
        node.removeAttribute('aria-hidden');
        node.removeAttribute('inert');
      }
    }
    apply();
    window.addEventListener('resize', apply);
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(apply):null;
    ro?.observe(phone);
    return ()=>{
      window.removeEventListener('resize', apply);
      ro?.disconnect();
    };
  }, [rootRef, active]);
}

export function useSkipFocus(rootRef, animating){
  const priorFocusRef=useRef(null);
  const skipFocusedRef=useRef(false);
  useEffect(()=>{
    const root=rootRef.current;
    if(!root)return;
    if(animating){
      priorFocusRef.current=rememberFocus(document.activeElement, root);
      root.querySelector('.sgv-skip-surface')?.focus();
      skipFocusedRef.current=true;
      return;
    }
    if(!skipFocusedRef.current)return;
    skipFocusedRef.current=false;
    const active=document.activeElement;
    const inside=active&&root.contains(active)?active:null;
    const controls=[...root.querySelectorAll('.sgv-card, .sgv-bank-command, .sgv-flip, .sgv-end-card button')];
    const target=focusTargetAfterSkip({active:inside, previous:priorFocusRef.current, controls});
    priorFocusRef.current=null;
    if(target&&target!==active)target.focus();
  }, [rootRef, animating]);
}

export function useBoardChrome({
  rootRef, screen, readout, play, seenFactorsRef, setScreen
}){
  const bankAnnounceRef=useRef(null);
  const [bankLive, setBankLive]=useState('');
  const {round, animating, introGate, introCard, startOpen, arriving, ack, factorInfo}=screen;
  const levelId=round.levelId;
  const fresh=round.turn===0&&!round.game.deal.plays;
  const writeRef=useRef(setScreen);
  writeRef.current=setScreen;
  function write(recipe){writeRef.current(recipe);}
  useEffect(()=>{
    const plan=levelStartPlan(levelId, {fresh, reduced:prefersReducedMotion()});
    if(!plan.dock)return;
    write(current=>({...current, docking:true}));
    const timer=setTimeout(()=>write(dockExpired), plan.dock.end*1000);
    return ()=>clearTimeout(timer);
    // fresh is the value at level entry. A later play must not restart the dock.
    // write reads the shell ref, so it stays out of the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId, readout.level.dock]);
  useEffect(()=>{
    if(!introGate||!introCard)return;
    dispatchCasualEvent('feature_intro_shown', {feature:introCard.id, level:levelId});
  }, [introGate, introCard, levelId]);
  useEffect(()=>{
    write(current=>current.pulse?{...current, pulse:false}:current);
    if(animating||readout.finished||introGate||startOpen)return;
    const timer=setTimeout(()=>{
      write(shownPulse);
      dispatchCasualEvent('hint_shown', {level:levelId, turn:round.turn});
    }, 3000);
    return ()=>clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animating, round.turn, levelId, readout.finished, introGate, startOpen]);
  useEffect(()=>{
    if(!ack)return;
    const token=ack;
    const timer=setTimeout(()=>write(current=>current.ack===token?{...current, ack:null}:current), 1100);
    return ()=>clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ack]);
  useEffect(()=>{
    if(!readout.factorInfoEnabled&&factorInfo)write(closedFactor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readout.factorInfoEnabled, factorInfo]);
  useEffect(()=>{write(closedFactor);}, [levelId]);
  useEffect(()=>{
    if(!readout.canBank)return;
    takeFirstOutcome(seenFactorsRef.current, 'bank');
  }, [readout.canBank, round.turn, levelId, seenFactorsRef]);
  useEffect(()=>{
    const result=nextBankAnnouncement(bankAnnounceRef.current, readout.bankMessage);
    bankAnnounceRef.current=result.previous;
    if(result.text)setBankLive(result.text);
  }, [readout.bankMessage]);
  useEffect(()=>{
    if(readout.finished||animating||introGate||startOpen||arriving||!readout.autoBank)return;
    const source=rootRef.current?.querySelector('.sgv-pending-pot');
    const timer=setTimeout(()=>play({type:'bank'}, source), 280);
    return ()=>clearTimeout(timer);
    // play is current whenever turn or level changes. Do not depend on its identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readout.autoBank, readout.finished, animating, introGate, startOpen, arriving, round.turn, levelId]);
  return bankLive;
}
