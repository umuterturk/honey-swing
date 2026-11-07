import React from 'react';
import {GARDEN_2_START} from './onboardingLevels.js';

// Header and onboarding tools are presentational; the game owns all actions.
export function OnboardingHud({level,shownGold,hearts,docking,devMenuOpen,
  onReset,onToggleMenu,onGoToLevel,onToggleHelp,help,onSkip}){
  return (
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
              onClick={onReset} aria-label="Reset onboarding progress and restart Level 1"
              title="Reset onboarding progress">
              <span aria-hidden="true" className="sgv-reset-icon">↺</span>
              <span className="sgv-reset-label">Reset</span>
            </button>
            <button type="button" className="sgv-dev-menu-toggle"
              onClick={onToggleMenu}
              aria-label="More onboarding tools" aria-expanded={devMenuOpen}>⋯</button>
            {devMenuOpen&&<div className="sgv-dev-menu" role="group" aria-label="Onboarding tools">
              <button type="button" onClick={onGoToLevel}>
                Go to level…
              </button>
              <button type="button" onClick={onToggleHelp}>
                {help?'Hide help':'Show help'}
              </button>
              {level.id<GARDEN_2_START&&<button type="button"
                onClick={onSkip}>
                Skip to Level 13
              </button>}
            </div>}
          </div>
        </div>
      </header>
  );
}
