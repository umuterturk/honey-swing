import test, {after} from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {readFile} from 'node:fs/promises';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {gsap} from 'gsap';
import {createFxBus} from '../src/casual/fx/fxBus.js';
import {
  ONBOARDING_PROGRESS_KEY,ONBOARDING_SESSION_KEY,SEEN_FEATURE_INTROS_KEY,
  clearOnboardingProgress
} from '../src/casual/onboardingProgress.js';
import {
  ONBOARDING_COUNT,newOnboardingRound,onboardingLevel
} from '../src/casual/onboardingLevels.js';
import {introCopy,takeFirstOutcome} from '../src/casual/presentationSequence.js';
import {dismissLevelScreen} from '../src/casual/levelScreens.js';
import {
  FEATURE_INTROS,boardTapDuringIntro,dismissFeatureIntro,
  featureIntroForEntry,introFeatureIdsForLevel,introPointerDecision,
  nextUnseenIntro,readSeenFeatureIntros,validateFeatureIntroRegistry
} from '../src/casual/featureIntroRegistry.js';
import {INTRO_MOTION,playFeatureIntroEnter} from '../src/casual/featureIntroMotion.js';

register('./jsx-loader.mjs',import.meta.url);
const {FeatureIntroOverlay}=await import('../src/casual/FeatureIntroOverlay.jsx');

const read=async path=>readFile(new URL(path,import.meta.url),'utf8');

function testStorage(entries={}){
  const items=new Map(Object.entries(entries));
  return {
    getItem:key=>items.get(key)??null,
    setItem:(key,value)=>items.set(key,String(value)),
    removeItem:key=>items.delete(key),
    has:key=>items.has(key)
  };
}

function freshLevel(id=1){
  return newOnboardingRound(id);
}

after(()=>{
  gsap.globalTimeline.clear();
});

test('an unseen Level 1 shows the Bank card once',()=>{
  const storage=testStorage();
  const round=freshLevel(1);
  const first=featureIntroForEntry({round,storage,reduced:false});
  assert.equal(first.show,true);
  assert.equal(first.gate,true);
  assert.equal(first.phase,'intro');
  assert.equal(first.intro.id,'bank');
  assert.equal(first.intro.name,'Save');
  assert.equal(first.intro.copy,'Save honey into your Savings.');
  assert.equal(first.intro.copy.length<=42,true);
  const again=featureIntroForEntry({round,storage,reduced:false});
  assert.equal(again.show,true);
  assert.equal(again.intro.id,'bank');
  const dismissed=dismissFeatureIntro({levelId:1,storage,via:'play',fx:{settle(){}}});
  assert.equal(dismissed.dismissed,true);
  assert.equal(dismissed.gate,false);
  const afterDismiss=featureIntroForEntry({round,storage,reduced:false});
  assert.equal(afterDismiss.show,false);
  assert.equal(afterDismiss.gate,false);
  assert.equal(afterDismiss.phase,'level-start');
  assert.equal(nextUnseenIntro(readSeenFeatureIntros(storage),1),null);
  for(let id=2;id<=ONBOARDING_COUNT;id++){
    assert.equal(nextUnseenIntro(new Set(),id),null);
  }
});

test('restoring a mid-level round skips the intro card',()=>{
  const storage=testStorage();
  const mid=freshLevel(1);
  mid.turn=2;
  const restored=featureIntroForEntry({round:mid,storage,reduced:false});
  assert.equal(restored.show,false);
  assert.equal(restored.gate,false);
  assert.equal(restored.reason,'restore');
  assert.equal(readSeenFeatureIntros(storage).has('bank'),false);
  const played=freshLevel(3);
  played.game={...played.game,deal:{...played.game.deal,plays:1}};
  assert.equal(featureIntroForEntry({round:played,storage}).show,false);
});

test('the board ignores taps while the intro gate is up',()=>{
  assert.deepEqual(boardTapDuringIntro(true),{handled:true,play:false,dismiss:false});
  assert.equal(introPointerDecision({gate:true,inIntro:false}).play,false);
  assert.equal(introPointerDecision({gate:true,inIntro:false}).dismiss,false);
  assert.equal(introPointerDecision({gate:true,inIntro:true}).play,false);
  assert.equal(introPointerDecision({gate:true,inIntro:true}).dismiss,true);
  assert.equal(introPointerDecision({gate:false,inIntro:false}).play,true);
  assert.equal(introPointerDecision({gate:false,inIntro:false}).handled,false);
  const storage=testStorage();
  assert.equal(featureIntroForEntry({round:freshLevel(1),storage}).gate,true);
  assert.equal(dismissFeatureIntro({levelId:1,storage,via:'board',fx:{settle(){}}}).dismissed,false);
  assert.equal(readSeenFeatureIntros(storage).has('bank'),false);
  assert.equal(featureIntroForEntry({round:freshLevel(1),storage}).gate,true);
});

test('dismissing the Bank card then lets the level start',()=>{
  const storage=testStorage();
  const round=freshLevel(1);
  assert.equal(featureIntroForEntry({round,storage}).phase,'intro');
  const dismissed=dismissFeatureIntro({
    levelId:1,storage,via:'scrim',fx:{settle(){}}
  });
  assert.equal(dismissed.handoff,'level-start');
  assert.equal(dismissed.phase,'level-start');
  assert.equal(boardTapDuringIntro(false).play,true);
  const opening=featureIntroForEntry({round,storage});
  assert.equal(opening.show,false);
  assert.equal(opening.phase,'level-start');
  assert.deepEqual(dismissLevelScreen('start','cta'),{
    dismiss:true,advance:false,replay:false,lock:false
  });
  assert.deepEqual(dismissLevelScreen('start','tap'),{
    dismiss:true,advance:false,replay:false,lock:false
  });
});

test('reset to Level 1 clears the seen-set so the Bank card shows again',()=>{
  const storage=testStorage({
    [ONBOARDING_SESSION_KEY]:JSON.stringify(freshLevel(8)),
    [ONBOARDING_PROGRESS_KEY]:'9',
    [SEEN_FEATURE_INTROS_KEY]:JSON.stringify(['bank','swing']),
    'music-volume':'55'
  });
  assert.equal(clearOnboardingProgress(storage),true);
  assert.equal(storage.has(SEEN_FEATURE_INTROS_KEY),false);
  assert.equal(storage.has(ONBOARDING_PROGRESS_KEY),false);
  assert.equal(storage.getItem('music-volume'),'55');
  const round=freshLevel(1);
  const entry=featureIntroForEntry({round,storage,reduced:false});
  assert.equal(entry.show,true);
  assert.equal(entry.intro.id,'bank');
});

test('a veteran who already passed Level 1 skips Bank through the seen-set',()=>{
  const storage=testStorage({[ONBOARDING_PROGRESS_KEY]:'2'});
  const entry=featureIntroForEntry({round:freshLevel(1),storage,reduced:false});
  assert.equal(entry.show,false);
  assert.equal(entry.gate,false);
  assert.equal(readSeenFeatureIntros(storage).has('bank'),true);
  assert.match(storage.getItem(SEEN_FEATURE_INTROS_KEY),/"bank"/);
  const fresh=testStorage({[ONBOARDING_PROGRESS_KEY]:'1'});
  assert.equal(featureIntroForEntry({round:freshLevel(1),storage:fresh}).show,true);
  assert.equal(fresh.has(SEEN_FEATURE_INTROS_KEY),false);
});

