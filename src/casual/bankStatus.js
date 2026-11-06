import {overswingPayout} from '../external/engines.js';
import {onboardingLevel} from './onboardingLevels.js';

// One Bank status string. Disabled reasons are checked in order; the ready
// line is the engine's projected payout, not a second copy of the button label.
export function bankAssistiveMessage(round){
  const level=onboardingLevel(round.levelId);
  const deal=round.game.deal;
  const plays=deal.plays||0;
  if(plays<2){
    const remaining=2-plays;
    return remaining===1?'Play 1 more card to Bank.':`Play ${remaining} more cards to Bank.`;
  }
  if(level.requiresZeroBreak&&round.zeroBreakCount<1)return 'Hit Zero to unlock Bank.';
  if(!deal.pot.length)return 'Nothing to bank yet.';
  return 'Bank ready: '+overswingPayout(round.game,level.rules);
}

// Announce only when the message changes. The first observation is silent.
export function nextBankAnnouncement(previous,message){
  if(previous===message)return {previous,text:null};
  if(previous==null)return {previous:message,text:''};
  return {previous:message,text:message};
}
