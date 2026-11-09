import {
  onboardingActions,onboardingFinished,onboardingLevel,onboardingVictory,stepOnboarding
} from './onboardingLevels.js';
import {canonicalKey} from './canonicalKey.js';

// Same identity the solver walks. Sorting the hand and dropping discard keeps
// the memo on positions the engine can still tell apart.
const winMemo=new Map();
export function clearWinMemo(){winMemo.clear();}
export function winMemoSize(){return winMemo.size;}
export function hasWinningContinuation(round){
  const key=canonicalKey(round);
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
