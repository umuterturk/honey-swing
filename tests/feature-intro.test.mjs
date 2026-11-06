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
  assert.equal(first.intro.name,'Bank');
  assert.equal(first.intro.copy,'Save honey into your jar.');
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

test('PLAY or a scrim tap marks the Bank card seen and settles fx',()=>{
  for(const via of ['play','scrim']){
    const storage=testStorage();
    const bus=createFxBus({reducedMotion:()=>false});
    bus.emit({particles:4,tween:true});
    assert.ok(bus.liveParticles()>0);
    assert.ok(bus.tweenCount()>0);
    const result=dismissFeatureIntro({levelId:1,storage,via,fx:bus});
    assert.equal(result.dismissed,true);
    assert.equal(result.id,'bank');
    assert.equal(result.handoff,'level-start');
    assert.equal(result.phase,'level-start');
    assert.equal(readSeenFeatureIntros(storage).has('bank'),true);
    assert.match(storage.getItem(SEEN_FEATURE_INTROS_KEY),/"bank"/);
    assert.equal(bus.liveParticles(),0);
    assert.equal(bus.tweenCount(),0);
    assert.equal(bus.queued(),0);
  }
  const storage=testStorage();
  const blocked=dismissFeatureIntro({levelId:1,storage,via:'board',fx:{settle(){throw new Error('settle');}}});
  assert.equal(blocked.dismissed,false);
  assert.equal(blocked.gate,true);
  assert.equal(readSeenFeatureIntros(storage).has('bank'),false);
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

test('the feature intro registry matches the level unlocks',()=>{
  const rows=validateFeatureIntroRegistry();
  assert.deepEqual(rows.map(row=>[row.id,row.unlockLevel,row.registered]),[
    ['bank',1,true],
    ['swing',3,false],
    ['flip',5,false],
    ['flip_mult',6,false],
    ['zero',10,false],
    ['snap',11,false]
  ]);
  assert.deepEqual(Object.keys(FEATURE_INTROS),['bank']);
  assert.equal(FEATURE_INTROS.bank.unlockLevel,1);
  assert.equal(FEATURE_INTROS.bank.icon,'bank-jar');
  assert.equal(FEATURE_INTROS.bank.copyKey,'intro.bank');
  assert.equal(FEATURE_INTROS.bank.highlightTarget,'bank');
  assert.equal(FEATURE_INTROS.bank.demoScript.duration,1.4);
  assert.equal(FEATURE_INTROS.bank.demoScript.cycles,2);
  assert.equal(FEATURE_INTROS.bank.demoScript.frames.length,3);
  assert.deepEqual(introFeatureIdsForLevel(onboardingLevel(1),null),['bank']);
  assert.deepEqual(introFeatureIdsForLevel(onboardingLevel(5),onboardingLevel(4)),['flip']);
  assert.equal(introFeatureIdsForLevel(onboardingLevel(5),onboardingLevel(4)).includes('landing_band'),false);
  assert.throws(()=>validateFeatureIntroRegistry(undefined,{
    nope:{id:'nope',unlockLevel:1,name:'Nope',copy:'Nope.'}
  }),/Unknown feature intro: nope/);
  assert.throws(()=>validateFeatureIntroRegistry(undefined,{
    bank:{...FEATURE_INTROS.bank,unlockLevel:4}
  }),/unlock/);
  assert.throws(()=>validateFeatureIntroRegistry(undefined,{
    landing_band:{id:'landing_band',unlockLevel:5,name:'Band',copy:'A band.'}
  }),/Unknown feature intro: landing_band|landing band/i);
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

test('reduced motion shows the Bank card as a still storyboard with no tweens',()=>{
  const storage=testStorage();
  const entry=featureIntroForEntry({round:freshLevel(1),storage,reduced:true});
  assert.equal(entry.show,true);
  assert.equal(entry.motion,false);
  const bus=createFxBus({reducedMotion:()=>true});
  const scrim={style:{}};
  const card={style:{}};
  const handle=playFeatureIntroEnter({scrim,card,reduced:true,bus});
  assert.equal(handle.motion,false);
  assert.equal(bus.tweenCount(),0);
  assert.equal(bus.liveParticles(),0);
  assert.equal(scrim.style.opacity,'0.55');
  assert.equal(card.style.opacity,'1');
  assert.equal(card.style.transform,'none');
  const html=renderToStaticMarkup(createElement(FeatureIntroOverlay,{
    intro:FEATURE_INTROS.bank,reduced:true,onDismiss(){}
  }));
  assert.match(html,/sgv-feature-intro-static/);
  assert.match(html,/data-feature="bank"/);
  assert.match(html,/NEW!/);
  assert.match(html,/>Bank</);
  assert.match(html,/Save honey into your jar\./);
  assert.match(html,/>PLAY</);
  assert.doesNotMatch(html,/disabled=/);
  assert.equal((html.match(/sgv-feature-intro-frame/g)||[]).length,3);
  assert.doesNotMatch(html,/sgv-feature-intro-motion|landing|flip-band|\+\d/);
});

test('the intro card eases in under the fx bus and never scales past 1.04',()=>{
  const bus=createFxBus({reducedMotion:()=>false});
  const scrim={opacity:1};
  const card={opacity:1,scale:2};
  const handle=playFeatureIntroEnter({scrim,card,reduced:false,bus});
  assert.equal(handle.motion,true);
  assert.equal(bus.tweenCount(),1);
  assert.ok(Math.abs(handle.timeline.duration()-INTRO_MOTION.card.end)<0.001);
  let maxScale=0;
  for(let step=0;step<=40;step++){
    handle.timeline.progress(step/40);
    maxScale=Math.max(maxScale,Number(card.scale)||0);
  }
  assert.ok(maxScale<=INTRO_MOTION.card.maxScale);
  assert.ok(maxScale>=1);
  handle.timeline.progress(1);
  assert.ok(Math.abs(Number(scrim.opacity)-0.55)<0.001);
  bus.settle();
  assert.equal(bus.tweenCount(),0);
  assert.equal(bus.liveParticles(),0);
});

test('the Bank overlay is the only intro and the in-level acknowledgement stays',async()=>{
  const html=renderToStaticMarkup(createElement(FeatureIntroOverlay,{
    intro:FEATURE_INTROS.bank,reduced:false,onDismiss(){}
  }));
  assert.match(html,/class="sgv-feature-intro sgv-feature-intro-motion"/);
  assert.match(html,/sgv-feature-intro-play/);
  assert.match(html,/sgv-feature-intro-scrim/);
  assert.match(html,/aria-modal="true"/);
  assert.doesNotMatch(html,/Swing|Flip|Zero|Snap|landing/);
  assert.equal(introCopy('bank',5),'BANK 5');
  assert.equal(introCopy('cross'),'CROSS');
  assert.equal(introCopy('flip'),'FLIP');
  assert.equal(introCopy('flipFactor',2),'×2');
  assert.equal(introCopy('zero'),'Pot safe.');
  assert.equal(introCopy('snap'),'Pot lost. Bank safe.');
  const seen=new Set();
  assert.equal(takeFirstOutcome(seen,'bank').kind,'bank');
  assert.equal(takeFirstOutcome(seen,'bank'),null);
  const source=await read('../src/casual/SimplifiedGame.jsx');
  const registry=await read('../src/casual/featureIntroRegistry.js');
  const overlay=await read('../src/casual/FeatureIntroOverlay.jsx');
  const css=await read('../src/casual/minimal.css');
  assert.doesNotMatch(registry,/external\/engines/);
  assert.doesNotMatch(overlay,/external\/engines|landing_band|sgv-flip-band/);
  assert.match(source,/takeFirstOutcome\(seenFactorsRef\.current,'bank'\)/);
  assert.match(source,/introCopy\('bank',overswingPayout/);
  assert.match(source,/function play\(action,source\)\{\s*if\(finished\)return;\s*if\(!boardTapDuringIntro\(introGateRef\.current\)\.play\)return;/);
  assert.match(source,/introPointerDecision\(/);
  assert.match(source,/dismissFeatureIntro\(/);
  assert.match(source,/fx:fxRef\.current/);
  const introAt=source.indexOf('<FeatureIntroOverlay');
  const startAt=source.indexOf('<LevelStartScreen');
  assert.ok(introAt>0&&startAt>introAt);
  assert.match(source,/startOpen&&!introGate&&!finished&&!animating&&<LevelStartScreen/);
  assert.match(source,/data-intro-gate=\{introGate\?true:undefined\}/);
  assert.match(css,/\.sgv-phone\[data-intro-gate="true"\] \.sgv-controls\{[^}]*pointer-events:none/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[^}]*\.sgv-feature-intro/);
  assert.doesNotMatch(source,/landing_band|sgv-flip-band|createActionPresentation\(\{[^}]*intro/);
  assert.match(source,/clearOnboardingProgress\(window\.localStorage\)/);
  assert.match(source,/<button type="button" className="sgv-reset-progress"/);
});
