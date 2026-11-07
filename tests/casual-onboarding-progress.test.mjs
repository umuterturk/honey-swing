import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
  ONBOARDING_SESSION_KEY,ONBOARDING_PROGRESS_KEY,SEEN_FEATURE_INTROS_KEY,
  clearOnboardingProgress
} from '../src/casual/onboardingProgress.js';
import {newOnboardingRound,onboardingActions} from '../src/casual/onboardingLevels.js';

function testStorage(entries){
  const items=new Map(Object.entries(entries));
  return {
    getItem:key=>items.get(key)??null,
    setItem:(key,value)=>items.set(key,String(value)),
    removeItem:key=>items.delete(key),
    has:key=>items.has(key)
  };
}

test('reset is repeatable and freshly starts the real Level 1 hand',()=>{
  const storage=testStorage({[ONBOARDING_PROGRESS_KEY]:'10'});
  for(let i=0;i<3;i++){
    assert.equal(clearOnboardingProgress(storage),true);
    const first=newOnboardingRound(1);
    storage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify(first));
    assert.equal(first.levelId,1);
    assert.equal(first.turn,0);
    assert.equal(first.game.deal.T,0);
    assert.equal(first.game.deal.pot.length,0);
    assert.equal(onboardingActions(first).filter(a=>a.type==='steer').length,3);
  }
  assert.equal(storage.has(ONBOARDING_PROGRESS_KEY),false);
});

