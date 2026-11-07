import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARDING_PROGRESS_KEY,ONBOARDING_SESSION_KEY,SEEN_FEATURE_INTROS_KEY,
  prepareOnboardingJump,readUnlockedOnboardingLevel
} from '../src/casual/onboardingProgress.js';

function memoryStorage(seed={}){
  const map=new Map(Object.entries(seed));
  return {
    getItem(key){return map.has(key)?map.get(key):null;},
    setItem(key,value){map.set(key,String(value));},
    removeItem(key){map.delete(key);}
  };
}

test('prepareOnboardingJump unlocks the level and marks prior intros seen',()=>{
  const storage=memoryStorage({
    [ONBOARDING_SESSION_KEY]:'{"levelId":1}',
    [SEEN_FEATURE_INTROS_KEY]:'[]'
  });
  const id=prepareOnboardingJump(storage,15,{
    levelCount:20,
    introUnlocks:[
      {id:'bank',unlockLevel:1},
      {id:'swing',unlockLevel:3},
      {id:'flip',unlockLevel:5},
      {id:'future',unlockLevel:16}
    ]
  });
  assert.equal(id,15);
  assert.equal(storage.getItem(ONBOARDING_PROGRESS_KEY),'15');
  assert.equal(storage.getItem(ONBOARDING_SESSION_KEY),null);
  assert.deepEqual(JSON.parse(storage.getItem(SEEN_FEATURE_INTROS_KEY)),
    ['bank','swing','flip']);
  assert.equal(readUnlockedOnboardingLevel(storage,20),15);
});

test('prepareOnboardingJump clamps to the level count and rejects bad ids',()=>{
  const storage=memoryStorage();
  assert.equal(prepareOnboardingJump(storage,99,{levelCount:20,introUnlocks:[]}),20);
  assert.equal(prepareOnboardingJump(storage,0,{levelCount:20}),null);
  assert.equal(prepareOnboardingJump(storage,1.5,{levelCount:20}),null);
  assert.equal(prepareOnboardingJump(null,4,{levelCount:20}),null);
});
