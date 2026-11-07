import React from 'react';
import {signed} from '../external/engines.js';
import {SimpleCard} from './MinimalBoard.jsx';
import {wouldSnap} from './onboardingLevels.js';

// Preserve the exact card/action DOM used by motion and accessibility flows.
export function OnboardingControls({shownHand,level,round,pulseIndex,finished,animating,
  available,onPlay,bankPulse,canBank,potDisplay,bankMessage,bankLive,
  remaining,docking,flipPulse,canFlip,getBankSource}){
  return (
      <section className="sgv-controls sgv-tutorial-controls" aria-label="Card actions">
        <div className="sgv-card-shelf" aria-hidden="true"/>
        <div className="sgv-hand" aria-label="Your cards">
          {shownHand.map((id,i)=><SimpleCard key={id} id={id} index={i}
            value={signed(id)} showDirection={true}
            risky={level.showChances&&wouldSnap(round,{type:'steer',index:i})}
            highlighted={pulseIndex===i}
            disabled={finished||animating||!available.some(a=>a.type==='steer'&&a.index===i)}
            onPlay={(index,element)=>onPlay({type:'steer',index},element)}/>)}
        </div>
        <div className="sgv-actions sgv-tutorial-actions">
          <button type="button"
            className={'sgv-action sgv-bank sgv-bank-command'+(bankPulse?' sgv-attention':'')}
            disabled={!canBank}
            onClick={()=>onPlay({type:'bank'},getBankSource())}
            aria-label={canBank?'Save '+potDisplay+' pending drops':bankMessage}>
            <span className="sgv-action-text">SAVE{canBank?' '+potDisplay:''}</span>
          </button>
          <p className="sgv-bank-live" aria-live="polite" aria-atomic="true">{bankLive}</p>
          {level.showFlip&&remaining>0&&<button type="button"
            className="sgv-action sgv-flip"
            data-dock={docking&&level.dock==='flip'?true:undefined}
            data-hint={flipPulse?true:undefined}
            disabled={!canFlip}
            onClick={e=>onPlay({type:'flip'},e.currentTarget.querySelector('.sgv-next-card'))}
            aria-label={'Flip a hidden card. '+remaining+' remain'}>
            <span className="sgv-action-icon">⟳</span>
            <span className="sgv-action-text">FLIP</span>
            <span className="sgv-flip-next"><span className="sgv-next-card">?</span>
              <small>{remaining} left</small></span>
          </button>}
        </div>
      </section>
  );
}
