import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newOverswing,stepOverswing,overswingPayout} from '../src/external/engines.js';
import {newOnboardingRound,stepOnboarding} from '../src/casual/onboardingLevels.js';
import {ONBOARDING_SESSION_KEY} from '../src/casual/onboardingProgress.js';
import {loadSavedRound} from '../src/casual/sessionRecords.js';

const casualBase={
  runningPot:true,snapLimit:8,steerAlwaysToPot:true,
  steerNoncrossPenalty:0,flipNoncrossPenalty:0,enableResonance:false,
  enableSwingFactor:true,enableFlipFactor:true
};

test('running Pot overflow is discarded with no Snap or multiplier side effects',()=>{
  const rules={...casualBase,potCap:25};
  let game=newOverswing({deckOverride:[0,4],seed:1,initialHandSize:2});
  game.deal.potValue=20;
  game.deal.pot=[0];
  game.deal.W=1;
  game.deal.flipFactor=3;
  game.deal.S=3;
  game.deal.plays=2;
  const beforeW=game.deal.W;
  const beforeFlip=game.deal.flipFactor;
  game=stepOverswing(game,{type:'steer',index:1},rules);
  assert.equal(game.deal.potValue,25);
  assert.equal(game.lastAction.addedToPot,5);
  assert.equal(game.lastAction.potOverflow,true);
  assert.equal(game.lastAction.snap,false);
  assert.equal(game.lastAction.zeroBreak,false);
  assert.equal(game.deal.W,beforeW);
  assert.equal(game.deal.flipFactor,beforeFlip);
  assert.equal(overswingPayout(game,rules),25);
  assert.ok(game.deal.pot.includes(4)||game.deal.pot.length>=2);
});

test('exact potCap fill reports no overflow',()=>{
  const rules={...casualBase,potCap:30};
  let game=newOverswing({deckOverride:[0,4],seed:1,initialHandSize:2});
  game.deal.potValue=20;
  game.deal.pot=[0];
  game.deal.W=1;
  game.deal.flipFactor=2;
  game.deal.S=3;
  game.deal.plays=2;
  // multiplier ×4 × rank 5 = 20 → lands exactly on 40 without cap; with 30 caps to +10
  game=stepOverswing(game,{type:'steer',index:1},rules);
  assert.equal(game.deal.potValue,30);
  assert.equal(game.lastAction.addedToPot,10);
  assert.equal(game.lastAction.potOverflow,true);

  let exact=newOverswing({deckOverride:[1,2],seed:2,initialHandSize:2});
  // hand[0] id 1 → signed +2. From potValue 23, +2 lands exactly on 25.
  exact.deal.potValue=23;
  exact.deal.pot=[0];
  exact.deal.W=0;
  exact.deal.flipFactor=1;
  exact.deal.S=0;
  exact.deal.plays=1;
  exact=stepOverswing(exact,{type:'steer',index:0},{...rules,potCap:25});
  assert.equal(exact.deal.potValue,25);
  assert.equal(exact.lastAction.addedToPot,2);
  assert.equal(exact.lastAction.potOverflow,false);
});

test('null potCap keeps uncapped campaign-style running Pot math',()=>{
  const rules={...casualBase,potCap:null};
  let game=newOverswing({deckOverride:[0,4],seed:1,initialHandSize:2});
  game.deal.potValue=20;
  game.deal.pot=[0];
  game.deal.W=1;
  game.deal.flipFactor=3;
  game.deal.S=3;
  game.deal.plays=2;
  game=stepOverswing(game,{type:'steer',index:1},rules);
  assert.equal(game.deal.potValue,50);
  assert.equal(game.lastAction.addedToPot,30);
  assert.equal(game.lastAction.potOverflow,false);
});

test('Save resets visible multipliers',()=>{
  const round=newOnboardingRound(6);
  let state=stepOnboarding(round,{type:'steer',index:0});
  state=stepOnboarding(state,{type:'flip'});
  assert.ok(state.game.deal.flipFactor>1||state.game.deal.W>0);
  state=stepOnboarding(state,{type:'bank'});
  assert.equal(state.game.deal.W,0);
  assert.equal(state.game.deal.flipFactor,1);
});

test('a session saved on main loads and keeps the same score',()=>{
  const raw=readFileSync(new URL('./fixtures/main-level-6-session.json',import.meta.url),'utf8');
  const saved=JSON.parse(raw);
  assert.equal(saved.game.deal.jackpotFactor,1);
  assert.equal(ONBOARDING_SESSION_KEY,'swing-casual-onboarding-session-v3');
  const storage={
    getItem(key){return key===ONBOARDING_SESSION_KEY?raw:null;},
    setItem(){throw new Error('load must not write');}
  };
  const restored=loadSavedRound(storage,20);
  assert.ok(restored);
  assert.equal(restored.game.deal.jackpotFactor,1);
  assert.equal(restored.game.deal.T,saved.game.deal.T);
  const continued=stepOnboarding(restored,{type:'bank'});
  assert.notStrictEqual(continued,restored);
  const stripped=structuredClone(restored);
  delete stripped.game.deal.jackpotFactor;
  const without=stepOnboarding(stripped,{type:'bank'});
  assert.equal(continued.game.deal.T,without.game.deal.T);
  assert.equal(continued.game.deal.T,saved.game.deal.T+saved.game.deal.potValue);
});
