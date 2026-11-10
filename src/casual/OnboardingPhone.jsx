import React, {useRef} from 'react';
import {signed} from '../external/engines.js';
import {GardenScene} from './CasualArt.jsx';
import {FxLayer} from './fx/FxLayer.jsx';
import {HorizontalMeter, GlassChest, PendingPot, SimpleCard} from './MinimalBoard.jsx';
import {GARDEN_2_START} from './onboardingLevels.js';
import {wouldSnap} from './onboardingRound.js';
import {screens} from './screens/index.js';
import {publicUrl} from './publicUrl.js';
import {nextHandSlots} from './handSlots.js';
import {swingTeachConcealed, visibleHandIds} from './swingTeach.js';

// Painted honey bar has four sockets. Wider hands keep one socket per dealt slot.
const HAND_PANEL_SLOTS=4;

function TapHand(){
  return <span className="sgv-beat-hand" role="img" aria-label="Hand">
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path fill="#fff6d8" stroke="#5c3b16" strokeWidth="3" strokeLinejoin="round"
        d="M30 6c-2.4 0-4 1.8-4 4.2V30h-3.2c-2.6 0-4.4 2.2-4 4.8l2.6 16.4C22.2 57.4 26.4 62 32 62h7.2c6.4 0 11.2-4.4 12-10.8l2.2-15.6c.5-3.2-2-5.6-5-5.6H44V22c0-3.4-2.6-6-5.8-6-1.8 0-3.4.8-4.4 2V12.4c0-2.8-1.8-4.6-4-4.6-1.6 0-2.8.7-3.4 1.8V10c0-2.2-1.8-4-3.4-4z"/>
    </svg>
  </span>;
}

export function OnboardingPhone({
  screen, readout, ending, bankLive, reduced, fx, rootRef, introStartRef, levelReadyRef, phoneClass,
  onPointerDownCapture, onClickCapture, onKeyDownCapture, onPlay, onFactorInfo, onReset, onToggleDev,
  onGotoLevel, onToggleHelp, onSkipGarden, onDismissFactor, onDismissIntro, onDismissStart,
  onEndPrimary, onEndBackdrop, onFinishPresentation,
  coach='off', showHand=false, needleOpen=false
}){
  const {
    level, victory, finished, factorInfoEnabled, available, canBank, canFlip,
    potDisplay, remaining, hearts, bankMessage, bankPulse, flipPulse, pulseIndex
  }=readout;
  const deal=screen.round.game.deal;
  const concealed=swingTeachConcealed(screen.round);
  const sourceHand=visibleHandIds(screen.round, screen.committedHand||deal.hand);
  const slots=concealed?Math.max(1, sourceHand.length):level.visibleHandSlots;
  const handView=sourceHand.slice(0, slots).map((id, order)=>({id, value:signed(id), order}));
  const layoutRef=useRef(null);
  const layout=nextHandSlots(layoutRef.current, handView, Math.max(HAND_PANEL_SLOTS, slots), level.id);
  layoutRef.current=layout;
  const bothColours=handView.some(card=>card.value<0)&&handView.some(card=>card.value>0);
  const firstRedId=bothColours?handView.find(card=>card.value>0).id:null;
  const {view, shownGold, animating, introGate, docking, help, devMenuOpen, factorInfo, ack, beat}=screen;
  const teachSpotlight=rootRef.current?.getAttribute?.('data-swing-teach')==='1';
  const cardsOpen=needleOpen&&!teachSpotlight;
  return <main className="sgv-page">
    <div ref={rootRef}
      data-honey-win={finished&&victory?'true':undefined}
      data-factor-info={factorInfo?true:undefined}
      className={phoneClass}
      aria-busy={animating}
      data-intro-gate={introGate?true:undefined}
      onPointerDownCapture={onPointerDownCapture}
      onClickCapture={onClickCapture}
      onKeyDownCapture={onKeyDownCapture}>
      <GardenScene/>
      <FxLayer bus={fx}/>
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
            {Array.from({length:level.maxSnaps}, (_, i)=><span key={i}
              className={i<hearts?'sgv-heart':'sgv-heart sgv-heart-empty'}>♥</span>)}
          </div>}
          <div className="sgv-tutorial-tools">
            <button type="button" className="sgv-reset-progress"
              onClick={onReset} aria-label="Reset onboarding progress and restart Level 1"
              title="Reset onboarding progress">
              <span aria-hidden="true" className="sgv-reset-icon">↺</span>
              <span className="sgv-reset-label">Reset</span>
            </button>
            <button type="button" className="sgv-dev-menu-toggle"
              onClick={onToggleDev}
              aria-label="More onboarding tools" aria-expanded={devMenuOpen}>⋯</button>
            {devMenuOpen&&<div className="sgv-dev-menu" role="group" aria-label="Onboarding tools">
              <button type="button" onClick={onGotoLevel}>Go to level…</button>
              <button type="button" onClick={onToggleHelp}>{help?'Hide help':'Show help'}</button>
              {level.id<GARDEN_2_START&&<button type="button" onClick={onSkipGarden}>Skip to Level 13</button>}
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
          onFactorInfo={onFactorInfo}/>
        <span className="sgv-flight-center" aria-hidden="true"/>
        <div className="sgv-bottle-pair" aria-label="Pending Pot and secured glass">
          <img className="sgv-desk" src={publicUrl('desk2.webp')} alt="" draggable="false"/>
          <PendingPot value={potDisplay} cap={level.rules.potCap} target={level.target}
            bankable={canBank} interactive={false}/>
          <GlassChest banked={shownGold} target={level.target}/>
        </div>
      </div>
      <section className="sgv-controls sgv-tutorial-controls" aria-label="Card actions">
        <div className="sgv-hand-frame" data-rows={slots>HAND_PANEL_SLOTS?'2':undefined}>
          {coach==='move1'&&<p className="sgv-beat-cue" role="status">
            Tap a card.
            <span className="sgv-beat-hand-slot" aria-hidden={showHand?undefined:'true'}>
              {showHand&&<TapHand/>}
            </span>
          </p>}
          <img className="sgv-hand-panel" src={publicUrl(slots>HAND_PANEL_SLOTS?'handpanel-2-row.webp':'handpanel.webp')} alt="" draggable="false"/>
          <div className="sgv-hand" aria-label="Your cards"
            style={{
              '--hs-hand-slots':String(Math.max(HAND_PANEL_SLOTS, slots)),
              '--hs-hand-group-extra':'var(--hs-group-margin)'
            }}>
            {layout.slots.map(slot=>{
              if(slot.kind==='closed')return <span key={slot.key} className="sgv-cell-closed" aria-hidden="true"/>;
              const engineIndex=deal.hand.indexOf(slot.id);
              return <SimpleCard key={slot.id} id={slot.id} index={engineIndex}
                value={slot.value} showDirection={true}
                groupStart={slot.id===firstRedId}
                risky={level.showChances&&engineIndex>=0&&wouldSnap(screen.round, {type:'steer', index:engineIndex})}
                highlighted={coach==='off'&&pulseIndex===engineIndex}
                disabled={finished||(animating&&!cardsOpen)||engineIndex<0||!available.some(action=>action.type==='steer'&&action.index===engineIndex)}
                onPlay={(_index, element)=>onPlay(
                  {type:'steer', index:screen.round.game.deal.hand.indexOf(slot.id)}, element
                )}/>;
            })}
          </div>
        </div>
        <div className="sgv-actions sgv-tutorial-actions">
          <button type="button"
            className={'sgv-action sgv-bank sgv-bank-command'+(bankPulse?' sgv-attention':'')}
            disabled={!canBank}
            onClick={()=>onPlay({type:'bank'}, rootRef.current?.querySelector('.sgv-pending-pot'))}
            aria-label={canBank?'Save '+potDisplay+' pending drops':bankMessage}>
            <span>SAVE{canBank?' '+potDisplay:''}</span>
          </button>
          <p className="sgv-bank-live" aria-live="polite" aria-atomic="true">{bankLive}</p>
          {level.showFlip&&remaining>0&&<button type="button"
            className="sgv-action sgv-flip"
            data-dock={docking&&level.dock==='flip'?true:undefined}
            data-hint={flipPulse?true:undefined}
            disabled={!canFlip}
            onClick={event=>onPlay({type:'flip'}, event.currentTarget.querySelector('.sgv-next-card'))}
            aria-label={'Flip a hidden card. '+remaining+' remain'}>
            <span className="sgv-action-icon">⟳</span>
            <span>FLIP</span>
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
      {screens.map(renderScreen=>renderScreen({
        screen, readout, ending, reduced, fx, rootRef, introStartRef, levelReadyRef,
        onDismissFactor, onDismissIntro, onDismissStart, onEndPrimary, onEndBackdrop, onReset
      }))}
      {animating&&!teachSpotlight&&<button type="button" className="sgv-skip-surface" aria-label="Skip animation"
        onPointerDown={event=>{event.preventDefault(); event.stopPropagation(); onFinishPresentation();}}
        onClick={event=>{event.preventDefault(); event.stopPropagation(); onFinishPresentation();}}/>}
    </div>
  </main>;
}
