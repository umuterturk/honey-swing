import {createElement, useEffect, useRef, useState} from 'react';
import {playLevelStart} from '../levelStartMotion.js';
import {dispatchCasualEvent} from '../platform.js';
import {levelStartPlan} from '../presentationSequence.js';
import {useBoardCover} from './coverBoard.js';

export const closedStart=screen=>({...screen, startOpen:false});

export function dismissStart(via){
  if(via==='tap'||via==='skip'||via==='cta')
    return {dismiss:true,advance:false,replay:false,lock:false};
  return {dismiss:false,advance:false,replay:false,lock:false};
}

export function LevelStartScreen({levelId,target,onDismiss,rootRef=null}){
  useBoardCover(rootRef);
  return createElement('div',{
    className:'sgv-level-screen sgv-level-start',role:'dialog',
    'aria-labelledby':'sgv-level-start-title'
  },
  createElement('div',{className:'sgv-end-card'},
    createElement('h1',{id:'sgv-level-start-title'},'Level '+levelId),
    createElement('div',{className:'sgv-intro-target','aria-live':'polite'},
      createElement('div',{className:'sgv-intro-coin','aria-hidden':'true'},'●'),
      createElement('div',{className:'sgv-intro-message'},
        createElement('span',null,'COLLECT'),
        createElement('strong',null,target),
        createElement('span',null,'DROPS!')
      )
    ),
    createElement('button',{
      type:'button',className:'sgv-level-start-dismiss',onClick:onDismiss
    },'START')
  ));
}

export function renderLevelStart({screen, readout, onDismissStart, rootRef}){
  if(!screen.startOpen||screen.introGate||readout.finished||screen.animating)return null;
  return createElement(LevelStartScreen,{
    key:'level-start',
    levelId:readout.level.id,
    target:readout.level.target,
    onDismiss:onDismissStart,
    rootRef
  });
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
