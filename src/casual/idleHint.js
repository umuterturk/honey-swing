import {
  onboardingActions,onboardingFinished,onboardingLevel,onboardingVictory,stepOnboarding
} from './onboardingLevels.js';

// Same state identity the onboarding simulator walks. A position wins when the
// engine can still reach the level target; this does not invent a second rules path.
function fingerprint(round){
  const d=round.game.deal;
  return JSON.stringify({
    levelId:round.levelId,turn:round.turn,snaps:round.snaps,
    flipCount:round.flipCount,zeroBreakCount:round.zeroBreakCount,
    status:round.game.status,
    T:d.T,S:d.S,W:d.W,flips:d.flips,plays:d.plays,
    flipFactor:d.flipFactor,
    flipStreak:d.flipStreak,bankCount:d.bankCount,handCap:d.handCap,
    potValue:d.potValue??null,
    pot:d.pot,hand:d.hand,discard:d.discard,pos:d.pos
  });
}
const winMemo=new Map();
export function clearWinMemo(){winMemo.clear();}
export function winMemoSize(){return winMemo.size;}
export function hasWinningContinuation(round){
  const key=fingerprint(round);
  if(winMemo.has(key))return winMemo.get(key);
  if(onboardingVictory(round)){winMemo.set(key,true);return true;}
  if(onboardingFinished(round)){winMemo.set(key,false);return false;}
  winMemo.set(key,false);
  let win=false;
  for(const action of onboardingActions(round)){
    if(hasWinningContinuation(stepOnboarding(round,action))){win=true;break;}
  }
  winMemo.set(key,win);
  return win;
}

// Current order, restricted to actions that still have a win: Flip-led Flip,
// then Bank, then Flip when no card remains, then the earliest card.
// Flip stays ahead of Bank so a legal Bank cannot steal a Flip-led line.
function preferHint(round,actions){
  const level=onboardingLevel(round.levelId);
  const bank=actions.find(action=>action.type==='bank'&&action.dropIndex==null);
  const flip=actions.find(action=>action.type==='flip');
  const steer=actions.find(action=>action.type==='steer');
  const flipLed=level.pulse==='flip'||
    (level.pulse==='card-then-flip'&&round.game.deal.S!==0);
  if(flipLed&&flip)return flip;
  if(bank)return bank;
  if(flip&&!steer)return flip;
  return steer||null;
}

export function idleHintAction(round){
  const available=onboardingActions(round);
  if(!available.length)return null;
  const safe=available.filter(action=>hasWinningContinuation(stepOnboarding(round,action)));
  return preferHint(round,safe.length?safe:available);
}
