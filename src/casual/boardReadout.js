import {overswingPayout} from '../external/engines.js';
import {bankAssistiveMessage,shouldAutoBank} from './bankStatus.js';
import {idleHintAction} from './idleHint.js';
import {
  onboardingActions,onboardingFinished,onboardingLevel,onboardingVictory,winCta
} from './onboardingLevels.js';
import {rawPotValue,visiblePotPayout} from './presentation.js';

// What the board may show for one committed round. It does not play a card.
export function boardReadout({
  round,view,feedback=null,animating=false,introGate=false,factorInfo=null,startOpen=false,pulse=false
}){
  const level=onboardingLevel(round.levelId);
  const deal=round.game.deal;
  const victory=onboardingVictory(round);
  const finished=onboardingFinished(round);
  const factorInfoEnabled=!animating&&!introGate&&!startOpen&&!finished;
  const available=finished||animating||introGate||factorInfo?[]:onboardingActions(round);
  const canBank=available.some(action=>action.type==='bank'&&action.dropIndex==null);
  const canFlip=available.some(action=>action.type==='flip');
  const potentialPayout=overswingPayout(round.game,level.rules);
  const hint=pulse?idleHintAction(round):null;
  return {
    level,deal,victory,finished,factorInfoEnabled,available,canBank,canFlip,
    autoBank:shouldAutoBank(available),
    potDisplay:feedback==='bank'
      ?visiblePotPayout(potentialPayout,rawPotValue(deal),view.rawPot)
      :view.rawPot,
    remaining:deal.deck.length-deal.pos,
    hearts:Math.max(0,level.maxSnaps-view.snaps),
    shownHand:deal.hand.slice(0,level.visibleHandSlots),
    bankMessage:bankAssistiveMessage(round),
    hint,
    bankPulse:hint?.type==='bank',
    flipPulse:hint?.type==='flip',
    pulseIndex:hint?.type==='steer'?hint.index:null,
    winLabel:winCta(level)
  };
}
