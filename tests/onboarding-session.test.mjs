import test from 'node:test';
import assert from 'node:assert/strict';
import {newOnboardingRound} from '../src/casual/onboardingLevels.js';
import {ONBOARDING_SESSION_KEY,ONBOARDING_PROGRESS_KEY} from '../src/casual/onboardingProgress.js';
import {
  loadOnboardingRound,saveOnboardingRound,unlockOnboardingLevel
} from '../src/casual/onboardingSession.js';

function memoryStorage(){
  const values=new Map();
  return {
    getItem:key=>values.get(key)??null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key)
  };
}

test('an in-progress round survives reload without resetting its game state',()=>{
  const storage=memoryStorage();
  const round=newOnboardingRound(2);
  round.turn=1;
  assert.equal(saveOnboardingRound(round,storage),true);
  assert.deepEqual(loadOnboardingRound(storage),round);
});

test('missing or corrupt session resumes at the unlocked level',()=>{
  const storage=memoryStorage();
  unlockOnboardingLevel(3,storage);
  assert.equal(loadOnboardingRound(storage).levelId,3);
  storage.setItem(ONBOARDING_SESSION_KEY,'not-json');
  assert.equal(loadOnboardingRound(storage).levelId,3);
  storage.setItem(ONBOARDING_SESSION_KEY,JSON.stringify({levelId:99,game:{}}));
  assert.equal(loadOnboardingRound(storage).levelId,3);
});

test('session storage failures do not prevent starting or saving a game',()=>{
  const storage={
    getItem(){throw Error('unavailable');},
    setItem(){throw Error('unavailable');}
  };
  assert.equal(loadOnboardingRound(storage).levelId,1);
  assert.equal(saveOnboardingRound(newOnboardingRound(1),storage),false);
  assert.equal(unlockOnboardingLevel(2,storage),false);
});

test('level unlock uses the existing progress storage contract',()=>{
  const storage=memoryStorage();
  assert.equal(unlockOnboardingLevel(4,storage),true);
  assert.equal(storage.getItem(ONBOARDING_PROGRESS_KEY),'4');
  assert.equal(loadOnboardingRound(storage).levelId,4);
});
