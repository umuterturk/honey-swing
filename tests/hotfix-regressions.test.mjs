import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {chooseBankPour} from '../src/casual/minimalMotion.js';
import {reducedBankSummary} from '../src/casual/motionSchedule.js';
import {
  LevelEndScreen,LevelStartScreen,dismissLevelScreen
} from '../src/casual/levelScreens.js';
import {ONBOARDING_PROGRESS_KEY,clearOnboardingProgress} from '../src/casual/onboardingProgress.js';
import {newOnboardingRound} from '../src/casual/onboardingLevels.js';

const read=async path=>readFile(new URL(path,import.meta.url),'utf8');

test('BANK plays the pot pour, including a win, and reduced motion stays static',async()=>{
  assert.deepEqual(chooseBankPour({reduced:false,hasRoot:true,hasSource:true,fromScore:0,toScore:8}),
    {timeline:true,static:false});
  assert.deepEqual(chooseBankPour({reduced:true,hasRoot:true,hasSource:true,fromScore:4,toScore:12}),
    {timeline:false,static:true});
  assert.deepEqual(reducedBankSummary(4,12),{pot:0,secured:12,gain:'+8'});
  const motion=await read('../src/casual/minimalMotion.js');
  assert.match(motion,/chooseBankPour\(/);
  assert.match(motion,/showReducedBank\(root,fromScore,toScore\)/);
  assert.match(motion,/export function animateBankPour\(/);
  const source=await read('../src/casual/SimplifiedGame.jsx');
  const start=source.slice(source.indexOf('startMotion('),source.indexOf('const winLabel'));
  assert.match(start,/motionKind\(action,change\)==='bank'/);
  assert.match(start,/animateBankPour\(/);
  assert.doesNotMatch(start.slice(0,start.indexOf('animateBankPour(')),/onboardingVictory/,
    'a winning Bank must not settle before the pour starts');
  const commit=source.slice(source.indexOf('onCommit({next,change})'),source.indexOf('onSettle'));
  const early=commit.slice(commit.indexOf('if(onboardingVictory(next))'));
  assert.doesNotMatch(early,/setView\(settled\.view\)/);
  assert.doesNotMatch(early,/setShownGold\(settled\.shownGold\)/);
});

test('the header reset renders without a dev gate and restarts Level 1',async()=>{
  const source=await read('../src/casual/SimplifiedGame.jsx');
  const header=source.slice(source.indexOf('<header className="sgv-hud sgv-tutorial-hud">'),
    source.indexOf('</header>'));
  assert.match(header,/<button type="button" className="sgv-reset-progress"/);
  assert.match(header,/onClick=\{resetProgress\}/);
  assert.match(header,/aria-label="Reset onboarding progress and restart Level 1"/);
  assert.doesNotMatch(header,/import\.meta\.env\.DEV/);
  assert.doesNotMatch(header,/level\.id>=\d+&&<button type="button" className="sgv-reset-progress"/);
  const reset=source.slice(source.indexOf('function resetProgress(){'),
    source.indexOf('function nextLevel(){'));
  assert.match(reset,/clearOnboardingProgress\(window\.localStorage\)/);
  assert.match(reset,/startLevel\(1\)/);
  const storage={
    items:new Map([[ONBOARDING_PROGRESS_KEY,'8']]),
    getItem(key){return this.items.get(key)??null;},
    setItem(key,value){this.items.set(key,String(value));},
    removeItem(key){this.items.delete(key);}
  };
  assert.equal(clearOnboardingProgress(storage),true);
  assert.equal(storage.getItem(ONBOARDING_PROGRESS_KEY),null);
  const first=newOnboardingRound(1);
  assert.equal(first.levelId,1);
  assert.equal(first.turn,0);
  const html=renderToStaticMarkup(createElement(LevelEndScreen,{
    victory:true,score:5,target:5,label:'NEXT',onPrimary(){},onReset(){}
  }));
  assert.match(html,/sgv-honey-reset/);
  assert.match(html,/aria-label="Reset progress"/);
  assert.doesNotMatch(html,/RESET PROGRESS/);
});

test('level start and win and lose screens render and can be dismissed',()=>{
  const start=renderToStaticMarkup(createElement(LevelStartScreen,{
    levelId:5,target:6,onDismiss(){}
  }));
  assert.match(start,/sgv-level-start/);
  assert.match(start,/Level 5/);
  assert.match(start,/COLLECT/);
  assert.match(start,/>6</);
  assert.match(start,/sgv-level-start-dismiss/);
  assert.deepEqual(dismissLevelScreen('start','tap'),
    {dismiss:true,advance:false,replay:false,lock:false});
  assert.deepEqual(dismissLevelScreen('start','skip'),
    {dismiss:true,advance:false,replay:false,lock:false});
  const win=renderToStaticMarkup(createElement(LevelEndScreen,{
    victory:true,score:11,target:8,label:'NEXT',onPrimary(){},onBackdrop(){},onReset(){}
  }));
  assert.match(win,/sgv-end-overlay/);
  assert.match(win,/Level complete!/);
  assert.match(win,/Honey Collected/);
  assert.match(win,/Target:\s*8/);
  assert.match(win,/score-board\.png/);
  assert.match(win,/empty-complete-jar\.png/);
  assert.match(win,/sgv-jar-mask/);
  assert.match(win,/sgv-fluid-surface/);
  assert.doesNotMatch(win,/sgv-win-star|★/);
  assert.match(win,/>NEXT</);
  const lose=renderToStaticMarkup(createElement(LevelEndScreen,{
    victory:false,score:2,target:8,label:'TRY AGAIN',onPrimary(){},onBackdrop(){}
  }));
  assert.match(lose,/Try again!/);
  assert.match(lose,/>TRY AGAIN</);
  assert.match(lose,/Drops secured: 2 \/ 8/);
  assert.deepEqual(dismissLevelScreen('win','cta'),
    {dismiss:true,advance:true,replay:false,lock:false});
  assert.deepEqual(dismissLevelScreen('win','skip'),
    {dismiss:true,advance:true,replay:false,lock:false});
  assert.deepEqual(dismissLevelScreen('win','backdrop'),
    {dismiss:false,advance:false,replay:false,lock:false,settle:true});
  assert.deepEqual(dismissLevelScreen('lose','cta'),
    {dismiss:true,advance:false,replay:true,lock:false});
  assert.deepEqual(dismissLevelScreen('lose','skip'),
    {dismiss:true,advance:false,replay:true,lock:false});
  assert.deepEqual(dismissLevelScreen('lose','backdrop'),
    {dismiss:true,advance:false,replay:true,lock:false});
});

test('the game mounts those screens and does not keep the Flip landing band',async()=>{
  const source=await read('../src/casual/SimplifiedGame.jsx');
  const board=await read('../src/casual/MinimalBoard.jsx');
  const css=await read('../src/casual/minimal.css');
  assert.match(source,/<LevelStartScreen /);
  assert.match(source,/<LevelEndScreen /);
  assert.match(source,/dismissLevelScreen\(/);
  assert.doesNotMatch(source,/flipLandingBand|flip_band_shown|flipChosenPayload|flip_chosen|sgv-flip-band/);
  assert.doesNotMatch(board,/FlipLandingBand|sgv-flip-band/);
  assert.doesNotMatch(css,/sgv-flip-band|sgv-flip-band-hatch|sgv-flip-band-chevron/);
  const levels=await read('../src/casual/onboardingLevels.js');
  assert.doesNotMatch(levels,/showSnapOverlap/);
});
