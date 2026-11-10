import {useEffect, useRef, useState} from 'react';
import {levelStartPlan} from './presentationSequence.js';
import {nextBankAnnouncement} from './bankStatus.js';
import {focusTargetAfterSkip, rememberFocus, skipFocusSelector} from './skipFocus.js';
import {takeFirstOutcome} from './presentationSequence.js';
import {prepareOnboardingJump, readFirstSession} from './onboardingProgress.js';
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
    const controls=[...root.querySelectorAll(skipFocusSelector)];
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
  // Level 1's first session uses the heartbeat. After move 2 commits, the
  // ordinary idle hint returns, including later turns of that same deal.
  const firstSessionCoaching=levelId===1&&!readFirstSession(browserStorage()).coachingDone;
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
    if(animating||readout.finished||introGate||startOpen||firstSessionCoaching)return;
    const timer=setTimeout(()=>{
      write(shownPulse);
      dispatchCasualEvent('hint_shown', {level:levelId, turn:round.turn});
    }, 3000);
    return ()=>clearTimeout(timer);
    // write reads the shell ref, so it stays out of the dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animating, round.turn, levelId, readout.finished, introGate, startOpen, firstSessionCoaching]);
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
