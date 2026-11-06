import React,{useEffect,useRef,useState} from 'react';
import {overswingPayout,signed} from '../external/engines.js';
import {GardenScene} from './CasualArt.jsx';
import {HorizontalMeter,GlassChest,PendingPot,SimpleCard} from './MinimalBoard.jsx';
import {animateCardAction,animateFactorReset,animateSnapLoss,animatePotBreak,animateBankPour} from './minimalMotion.js';
import {rawPotValue,visiblePotPayout,displayOf,settledPresentation} from './presentation.js';
import {claimLevelAdvance,levelStartPlan,startTap,successPlan,successTap} from './presentationSequence.js';
import {createActionPresentation,motionKind,runPresentedAction} from './actionPresentation.js';
import {clearWinMemo,idleHintAction} from './idleHint.js';
import {bankAssistiveMessage,nextBankAnnouncement} from './bankStatus.js';
import {focusTargetAfterSkip,isSkipKey,rememberFocus} from './skipFocus.js';
import {ONBOARDING_SESSION_KEY,ONBOARDING_PROGRESS_KEY,clearOnboardingProgress} from './onboardingProgress.js';
import {
  newOnboardingRound,onboardingLevel,onboardingActions,onboardingFinished,
  onboardingVictory,wouldSnap,ONBOARDING_COUNT,GARDEN_2_START
} from './onboardingLevels.js';

const SESSION_KEY=ONBOARDING_SESSION_KEY;
const PROGRESS_KEY=ONBOARDING_PROGRESS_KEY;
const event=(name,details={})=>{
  if(typeof window==='undefined')return;
  window.dispatchEvent(new CustomEvent('swing-casual-event',{detail:{name,...details}}));
};
function save(round){try{localStorage.setItem(SESSION_KEY,JSON.stringify(round));}catch{}}
function initialRound(){
  try{
    const state=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');
    if(state&&Number.isInteger(state.levelId)&&state.levelId>=1&&state.levelId<=ONBOARDING_COUNT&&
      state.game?.game==='overswing'&&state.game.deal&&Number.isInteger(state.turn)&&
      Number.isInteger(state.snaps)&&Number.isInteger(state.flipCount)&&
      Number.isInteger(state.zeroBreakCount))return state;
  }catch{}
  return newOnboardingRound(1);
}
export default function SimplifiedGame(){
  const [round,setRound]=useState(initialRound);
  const [view,setView]=useState(()=>displayOf(round));
  const [shownGold,setShownGold]=useState(round.game.deal.T);
  const [animating,setAnimating]=useState(false);
  const [feedback,setFeedback]=useState(null);
  const [pulse,setPulse]=useState(false);
  const [beat,setBeat]=useState('');
  const [help,setHelp]=useState(false);
  const [docking,setDocking]=useState(()=>Boolean(onboardingLevel(round.levelId).dock));
  const freshStart=round.turn===0&&!(round.game.deal.plays);
  const [successPour,setSuccessPour]=useState(false);
  const [successSettled,setSuccessSettled]=useState(false);
  const advancedRef=useRef(false);
  const [arriving,setArriving]=useState(()=>levelStartPlan(round.levelId,{
    fresh:freshStart,
    reduced:typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  }).motion);
  const [devMenuOpen,setDevMenuOpen]=useState(false);
  const rootRef=useRef(null),cancelRef=useRef(null),presentationRef=useRef(null);
  if(!presentationRef.current)presentationRef.current=createActionPresentation();
  const resetMotionRef=useRef(null),lossMotionRef=useRef(null),breakMotionRef=useRef(null);
  const seenFactorsRef=useRef(new Set());
  const priorFocusRef=useRef(null),skipFocusedRef=useRef(false);
  const bankAnnounceRef=useRef(null);
  const [bankLive,setBankLive]=useState('');
  const level=onboardingLevel(round.levelId);
  const {game}=round,deal=game.deal;
  const victory=onboardingVictory(round),finished=onboardingFinished(round);
  const available=finished||animating?[]:onboardingActions(round);
  const canBank=available.some(a=>a.type==='bank'&&a.dropIndex==null);
  const canFlip=available.some(a=>a.type==='flip');
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
    presentationRef.current.abandon();
    cancelRef.current?.();resetMotionRef.current?.();
    lossMotionRef.current?.();breakMotionRef.current?.();
  },[]);
  useEffect(()=>{
    event('level_start',{level:round.levelId});
  },[round.levelId]);
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
    const reduced=typeof window!=='undefined'&&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const plan=levelStartPlan(round.levelId,{fresh:round.turn===0&&!(round.game.deal.plays),reduced});
    setArriving(plan.motion);
    if(!plan.motion)return;
    const timer=setTimeout(()=>setArriving(false),plan.settled*1000);
    return ()=>clearTimeout(timer);
  },[round.levelId]);
  useEffect(()=>{
    setPulse(false);
    if(animating||finished)return;
    const timer=setTimeout(()=>{
      setPulse(true);
      event('hint_shown',{level:level.id,turn:round.turn});
    },3000);
    return ()=>clearTimeout(timer);
  },[animating,round.turn,round.levelId,finished,level.id]);
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

  function startLevel(id){
    clearWinMemo();
    presentationRef.current.abandon();
    cancelRef.current?.();resetMotionRef.current?.();
    lossMotionRef.current?.();breakMotionRef.current?.();
    cancelRef.current=null;resetMotionRef.current=null;
    lossMotionRef.current=null;breakMotionRef.current=null;
    const next=newOnboardingRound(id);
    save(next);
    setRound(next);setView(displayOf(next));setShownGold(0);
    setAnimating(false);setFeedback(null);setPulse(false);setBeat('');setHelp(false);
    setDocking(Boolean(onboardingLevel(id).dock));
    setSuccessPour(false);setSuccessSettled(false);advancedRef.current=false;
    setDevMenuOpen(false);
    seenFactorsRef.current=new Set();
  }
  function resetProgress(){
    // One-tap development reset: clear both persisted checkpoints, then restart.
    try{clearOnboardingProgress(window.localStorage);}catch{}
    // The new Level 1 state is saved by startLevel even after clearing storage.
    setDevMenuOpen(false);
    startLevel(1);
    event('onboarding_reset',{level:1});
  }
  function nextLevel(){
    if(round.levelId>=ONBOARDING_COUNT)return startLevel(ONBOARDING_COUNT);
    startLevel(round.levelId+1);
  }
  function skip(){
    event('tutorial_skip',{level:level.id});
    try{localStorage.setItem(PROGRESS_KEY,String(GARDEN_2_START));}catch{}
    startLevel(GARDEN_2_START);
  }

  function finishPresentation(){
    presentationRef.current.finishPresentation();
  }
  function play(action,source){
    if(finished)return;
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
          try{localStorage.setItem(PROGRESS_KEY,String(Math.min(ONBOARDING_COUNT,level.id+1)));}catch{}
          const settled=settledPresentation(next);
          setRound(settled.round);setView(settled.view);setShownGold(settled.shownGold);
          setSuccessPour(action.type==='bank');
          setSuccessSettled(false);
        }
      },
      onSettle({next}){
        const settled=settledPresentation(next);
        cancelRef.current=null;resetMotionRef.current=null;
        lossMotionRef.current=null;breakMotionRef.current=null;
        setRound(settled.round);setView(settled.view);setShownGold(settled.shownGold);
        setFeedback(settled.feedback);setAnimating(settled.animating);
      },
      startMotion({next,change},complete){
        if(onboardingVictory(next)){
          setAnimating(false);setFeedback(null);setPulse(false);setHelp(false);
          complete();
          return ()=>{setSuccessPour(false);setSuccessSettled(true);};
        }
        setAnimating(true);
        setFeedback(change.snap?'snap':change.zeroBreak?'zero_break':action.type);
        setBeat(change.zeroBreak?'Pot safe.':change.snap?'Pot lost. Bank safe.':'');
        setPulse(false);setHelp(false);
        resetMotionRef.current?.();breakMotionRef.current?.();
        resetMotionRef.current=null;breakMotionRef.current=null;
        const cancelAll=()=>{
          cancelRef.current?.();resetMotionRef.current?.();
          lossMotionRef.current?.();breakMotionRef.current?.();
        };
        if(!root||!source){complete();return cancelAll;}
        if(motionKind(action,change)==='bank'){
          cancelRef.current=animateBankPour({
            root,source,potValue:change.rawPotBefore,
            fromScore:change.securedBefore,toScore:change.securedAfter,
            onPourProgress:rawPot=>setView(v=>({...v,rawPot})),
            onTake:()=>setView(v=>({...v,rawPot:0,resonance:0})),
            onCount:setShownGold,onComplete:complete
          });
          return cancelAll;
        }
        const firstFactorAwards=change.rewards
          .filter(({kind})=>!seenFactorsRef.current.has(kind)).map(({kind})=>kind);
        change.rewards.forEach(({kind})=>seenFactorsRef.current.add(kind));
        cancelRef.current=animateCardAction({
          root,source,action,view:{...change,firstTap:round.levelId===1&&round.turn===0},
          firstFactorAwards,
          onMeter:position=>{
            setView(v=>({...v,position}));
            if(change.snap)setFeedback('snap');
          },
          onPot:rawPot=>setView(v=>({...v,rawPot,resonance:change.resonanceAfter})),
          onSnap:()=>{
            breakMotionRef.current?.();breakMotionRef.current=animatePotBreak(root,'snap');
            lossMotionRef.current?.();lossMotionRef.current=animateSnapLoss(root,change.rawPotBefore);
            setView(v=>({...v,snaps:change.snapsAfter}));
          },
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
  const ending=successPlan({victory,levelId:level.id,bank:round.game.lastAction?.type==='bank'});
  function settleSuccess(){setSuccessPour(false);setSuccessSettled(true);}
  function advanceLevel(){
    const claim=claimLevelAdvance(advancedRef.current);
    advancedRef.current=claim.claimed;
    settleSuccess();
    if(claim.advance)nextLevel();
  }
  return <main className="sgv-page">
    <div ref={rootRef}
      className={'sgv-phone sgv-onboarding sgv-onboarding-'+level.id+
        (level.garden===2?' sgv-orchard':'')+' sgv-event-'+(feedback||round.event.type)+
        (arriving?' sgv-arrive':'')}
      aria-busy={animating}
      onPointerDownCapture={event=>{
        const tap=startTap({action:presentationRef.current.isPresenting(),arrival:arriving});
        if(tap.finishArrival)setArriving(false);
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
        if(presentationRef.current.acceptClick()!=='action'){
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onKeyDownCapture={event=>{
        if(!presentationRef.current.isPresenting()||!isSkipKey(event.key))return;
        event.preventDefault();
        event.stopPropagation();
        presentationRef.current.acceptPointerDown();
      }}>
      <GardenScene/>
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
            {import.meta.env.DEV&&<button type="button" className="sgv-reset-progress"
              onClick={resetProgress} aria-label="Reset onboarding progress and restart Level 1"
              title="Reset onboarding progress">
              <span aria-hidden="true" className="sgv-reset-icon">↺</span>
              <span className="sgv-reset-label">Reset</span>
            </button>}
            {level.id>=4&&<>
              <button type="button" className="sgv-dev-menu-toggle"
                onClick={()=>setDevMenuOpen(open=>!open)}
                aria-label="More onboarding tools" aria-expanded={devMenuOpen}>⋯</button>
              {devMenuOpen&&<div className="sgv-dev-menu" role="group" aria-label="Onboarding tools">
                <button type="button" onClick={()=>{setHelp(value=>!value);setDevMenuOpen(false);}}>
                  {help?'Hide help':'Show help'}
                </button>
                {level.id<GARDEN_2_START&&<button type="button"
                  onClick={()=>{setDevMenuOpen(false);skip();}}>
                  Skip to Level 13
                </button>}
              </div>}
            </>}
          </div>
        </div>
      </header>
      <div className="sgv-middle">
        <HorizontalMeter position={view.position} limit={level.rules.snapLimit}
          multipliers={view.factors} visibleFactors={level.visibleFactors}
          showDanger={level.showChances} beat={beat} dock={docking?level.dock:null}/>
        <span className="sgv-flight-center" aria-hidden="true"/>
        <div className="sgv-bottle-pair" aria-label="Pending Pot and secured glass">
          <PendingPot value={potDisplay} target={level.target}
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
            aria-label={canBank?'Bank '+potDisplay+' pending drops':bankMessage}>
            <span className="sgv-action-text">BANK{canBank?' '+potDisplay:''}</span>
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
      {help&&!finished&&<ul className="sgv-glossary" role="note">
        <li>Card → meter → Pot</li>
        <li>BANK → glass</li>
        <li>Pill × this card</li>
        <li>0 keeps the Pot. Snap empties it.</li>
      </ul>}
      {finished&&victory&&ending.effects&&<div
        className={'sgv-success'+(successSettled?' sgv-success-settled':'')+(successPour&&ending.pour?' sgv-success-pour':'')}
        onPointerDown={event=>{
          if(event.target!==event.currentTarget)return;
          const tap=successTap('backdrop');
          event.preventDefault();event.stopPropagation();
          if(tap.settle)settleSuccess();
        }}>
        <div className="sgv-success-star" aria-hidden="true">★</div>
        {ending.orchard&&<span className="sgv-orchard-hook" aria-hidden="true"/>}
        <p className="sgv-success-score">{'Drops secured: '+deal.T+' / '+level.target}</p>
        <button type="button" onClick={()=>{
          const tap=successTap('cta');
          if(tap.settle)settleSuccess();
          if(tap.advance)advanceLevel();
        }}>{winLabel}</button>
      </div>}
      {finished&&!victory&&<div className="sgv-end-overlay" role="dialog" aria-modal="true" aria-labelledby="sgv-end-title">
        <div className="sgv-end-card">
          <div className="sgv-end-symbol">♡</div>
          <h1 id="sgv-end-title">Try again!</h1>
          <p>{'Drops secured: '+deal.T+' / '+level.target}</p>
          <button type="button" onClick={()=>startLevel(level.id)}>TRY AGAIN</button>
          {import.meta.env.DEV&&<button type="button" className="sgv-end-reset" onClick={resetProgress}>
            RESET PROGRESS
          </button>}
        </div>
      </div>}
      {animating&&<button type="button" className="sgv-skip-surface" aria-label="Skip animation"
        onPointerDown={event=>{event.preventDefault();event.stopPropagation();finishPresentation();}}
        onClick={event=>{event.preventDefault();event.stopPropagation();finishPresentation();}}/>}
    </div>
  </main>;
}