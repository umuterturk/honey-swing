import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARDING_COUNT,onboardingLevel,
  newOnboardingRound,onboardingActions,stepOnboarding,onboardingVictory
} from '../src/casual/onboardingLevels.js';
import {signed,newOverswing,stepOverswing,overswingPayout,overswingActions} from '../src/external/engines.js';
import {multiplierRewards} from '../src/casual/multiplierView.js';
import {simulateOnboardingLevel} from '../scripts/simulate-casual-onboarding.mjs';
import {solveLevel} from '../scripts/solve-level.mjs';

const flip={type:'flip'},bank={type:'bank'};
const pot=round=>round.game.deal.potValue;
const factors=round=>[round.game.deal.W+1,round.game.deal.flipFactor];
function play(round,action){
  const next=stepOnboarding(round,action);
  assert.notStrictEqual(next,round,`rejected ${JSON.stringify(action)} on L${round.levelId} turn ${round.turn}`);
  return next;
}
function steerValue(round,value){
  const index=round.game.deal.hand.findIndex(id=>signed(id)===value);
  assert.ok(index>=0,`L${round.levelId} has no ${value} in [${round.game.deal.hand.map(signed)}]`);
  return play(round,{type:'steer',index});
}
function line(level,values){
  return values.reduce((round,value)=>value==='flip'?play(round,flip):
    value==='bank'?play(round,bank):steerValue(round,value),newOnboardingRound(level));
}

test('running Pot pays only the card just played; Overswing still revalues the whole Pot',()=>{
  const casual={runningPot:true,snapLimit:8,steerAlwaysToPot:true,
    steerNoncrossPenalty:0,flipNoncrossPenalty:0,enableResonance:false,
    enableSwingFactor:true,enableFlipFactor:true};
  let game=newOverswing({deckOverride:[0,4],seed:1,initialHandSize:2});
  game.deal.potValue=20;
  game.deal.pot=[0];
  game.deal.W=1;
  game.deal.flipFactor=3;
  game.deal.S=3;
  game.deal.plays=2;
  game=stepOverswing(game,{type:'steer',index:1},casual);
  assert.equal(game.deal.potValue,50);
  assert.equal(game.lastAction.addedToPot,30);
  assert.equal(overswingPayout(game,casual),50);

  const campaign={snapLimit:8,steerAlwaysToPot:true,steerNoncrossPenalty:0,
    flipNoncrossPenalty:0,enableSwingFactor:true};
  let old=newOverswing({deckOverride:[2,24],seed:3,initialHandSize:2});
  old=stepOverswing(old,{type:'steer',index:0},campaign);
  old=stepOverswing(old,{type:'steer',index:0},campaign);
  assert.equal(old.deal.potValue,undefined);
  assert.equal(overswingPayout(old,campaign),16);
  assert.equal(old.lastAction.addedToPot,5);
});

test('a crossing Flip grows Swing and Flip',()=>{
  const casual={runningPot:true,snapLimit:8,steerAlwaysToPot:true,
    steerNoncrossPenalty:0,flipNoncrossPenalty:0,enableResonance:false,
    enableSwingFactor:true,enableFlipFactor:true};
  let game=newOverswing({deckOverride:[1,0,25,21],seed:1,initialHandSize:2});
  game=stepOverswing(game,{type:'steer',index:0},casual);
  game=stepOverswing(game,{type:'flip'},casual);
  assert.equal(game.deal.S,-4);
  assert.equal(game.deal.W,1);
  assert.equal(game.deal.flipFactor,2);
  assert.equal(game.lastAction.addedToPot,24);
  assert.equal(game.lastAction.swingTierGained,true);
  assert.equal(game.lastAction.flipTierGained,true);
  game=stepOverswing(game,{type:'flip'},casual);
  assert.equal(game.deal.S,-6);
  assert.equal(game.lastAction.swung,false);
  assert.equal(game.deal.flipFactor,3);
  assert.equal(game.lastAction.addedToPot,12);
});

test('a crossing Flip with runningPot off does not grow Flip',()=>{
  const rules={runningPot:false,snapLimit:8,steerAlwaysToPot:true,
    steerNoncrossPenalty:0,flipNoncrossPenalty:0,enableResonance:false,
    enableSwingFactor:true,enableFlipFactor:true};
  let game=newOverswing({deckOverride:[1,0,25,21],seed:1,initialHandSize:2});
  game=stepOverswing(game,{type:'steer',index:0},rules);
  game=stepOverswing(game,{type:'flip'},rules);
  assert.equal(game.lastAction.swung,true);
  assert.equal(game.deal.W,1);
  assert.equal(game.deal.flipFactor,1);
  assert.equal(game.lastAction.addedToPot,6);
  assert.equal(game.deal.potValue,undefined);
  game=stepOverswing(game,{type:'flip'},rules);
  assert.equal(game.lastAction.swung,false);
  assert.equal(game.deal.flipFactor,2);
  assert.equal(game.lastAction.addedToPot,2);

  let defaults=newOverswing({deckOverride:[1,0,25],seed:1,initialHandSize:2});
  defaults=stepOverswing(defaults,{type:'steer',index:0});
  defaults=stepOverswing(defaults,{type:'flip'});
  assert.equal(defaults.lastAction.swung,true);
  assert.equal(defaults.deal.flipFactor,1);
  assert.equal(defaults.lastAction.addedToPot,6);
  assert.equal(defaults.deal.potValue,undefined);
});

test('a crossing Flip with Flip disabled keeps the Flip factor',()=>{
  const swingOnly={runningPot:true,snapLimit:8,steerAlwaysToPot:true,
    steerNoncrossPenalty:0,flipNoncrossPenalty:0,enableResonance:false,
    enableSwingFactor:true,enableFlipFactor:false};
  let game=newOverswing({deckOverride:[1,0,25,4],seed:1,initialHandSize:2});
  game=stepOverswing(game,{type:'steer',index:0},swingOnly);
  game=stepOverswing(game,{type:'flip'},{...swingOnly,enableFlipFactor:true});
  assert.equal(game.deal.flipFactor,2);
  game=stepOverswing(game,{type:'flip'},swingOnly);
  assert.equal(game.lastAction.swung,true);
  assert.equal(game.deal.W,2);
  assert.equal(game.deal.flipFactor,2);
  assert.equal(game.lastAction.addedToPot,30);
});

test('flipOnly does not draw the pile, and Flip stays legal on an empty hand',()=>{
  const deck=[2,1,0];
  const rules={snapLimit:8,steerAlwaysToPot:true,steerNoncrossPenalty:0,
    flipNoncrossPenalty:0,enableResonance:false,runningPot:true,flipOnly:true,
    enableSwingFactor:true,enableFlipFactor:false};
  let held=newOverswing({deckOverride:deck,seed:5,initialHandSize:2});
  held=stepOverswing(held,{type:'steer',index:0},rules);
  held=stepOverswing(held,{type:'steer',index:0},rules);
  assert.deepEqual(held.deal.hand,[]);
  assert.equal(held.deal.deck[held.deal.pos],0);
  assert.equal(overswingActions(held,rules).some(action=>action.type==='flip'),true);

  const open={...rules,flipOnly:false};
  let drawn=newOverswing({deckOverride:deck,seed:5,initialHandSize:2});
  drawn=stepOverswing(drawn,{type:'steer',index:0},open);
  drawn=stepOverswing(drawn,{type:'steer',index:0},open);
  assert.deepEqual(drawn.deal.hand,[0]);
});

test('Level 1: every pair banks at least 5 and nothing can Snap',()=>{
  const start=newOnboardingRound(1);
  assert.equal(onboardingActions(start).some(action=>action.type==='flip'),false);
  for(const first of [0,1,2])for(const second of [0,1]){
    let state=play(start,{type:'steer',index:first});
    assert.equal(state.game.deal.T,0);
    state=play(state,{type:'steer',index:second});
    assert.equal(state.snaps,0);
    assert.ok(pot(state)>=5);
    assert.equal(overswingPayout(state.game,onboardingLevel(1).rules),pot(state));
    state=play(state,bank);
    assert.ok(state.game.deal.T>=5);
    assert.equal(onboardingVictory(state),true);
  }
});

test('Level 2: both orders fill 6, and a middle pass with Swing off is not a cross reward',()=>{
  let right=line(2,[4,-2]);
  assert.equal(right.game.deal.S,2);
  assert.equal(pot(right),6);
  right=play(right,bank);
  assert.equal(right.game.deal.T,6);
  let across=line(2,[-2,4]);
  assert.equal(across.game.deal.S,2);
  assert.equal(across.game.lastAction.swung,true);
  assert.equal(pot(across),6);
  assert.deepEqual(factors(across),[1,1]);
  assert.deepEqual(multiplierRewards(across.game.deal,across.game.lastAction),[]);
});

test('Level 5: the hidden card is a Flip, pays its rank, and never ticks Swing',()=>{
  let state=line(5,[2,1]);
  assert.deepEqual(state.game.deal.hand,[]);
  assert.equal(onboardingActions(state).some(action=>action.type==='bank'),true);
  assert.equal(onboardingActions(state).some(action=>action.type==='flip'),true);
  state=play(state,flip);
  assert.equal(state.game.deal.flipFactor,2);
  assert.equal(state.game.lastAction.addedToPot,4);
  assert.equal(state.game.deal.W,0);
  state=play(state,flip);
  assert.equal(state.game.deal.flipFactor,3);
  assert.equal(state.game.lastAction.addedToPot,6);
  assert.equal(state.game.deal.W,0);
  state=play(state,bank);
  assert.equal(state.game.deal.T,13);
  assert.equal(onboardingVictory(state),true);
  const flipped=line(5,['flip','flip',2,1,'bank']);
  assert.equal(flipped.flipCount,2);
  assert.equal(flipped.game.deal.W,0);
  assert.equal(flipped.game.deal.T>=13,true);
});

test('Level 11: the safe line banks 11 and the taught Snap recovers to 9',()=>{
  let safe=line(11,[2,-1,'bank',5,-3,'bank']);
  assert.equal(safe.snaps,0);
  assert.equal(safe.game.deal.T,11);
  for(const leftover of [[-3,3],[3,-3]]){
    let state=line(11,[2,-1,'bank',5,6]);
    assert.equal(state.snaps,1);
    assert.equal(state.game.deal.T,3);
    assert.equal(pot(state),0);
    const beforeZero=()=>pot(state);
    state=steerValue(state,leftover[0]);
    const held=beforeZero();
    state=steerValue(state,leftover[1]);
    assert.equal(state.game.lastAction.zeroBreak,true);
    assert.ok(pot(state)>=held);
    state=play(state,bank);
    assert.equal(state.game.deal.T,9,leftover.join(','));
    assert.equal(state.snaps,1);
  }
});

test('Garden 1 has no forced loss except Level 12, and every level has a win',()=>{
  for(let id=1;id<=ONBOARDING_COUNT;id++){
    const proof=solveLevel(id);
    assert.equal(proof.truncated,false,'truncated '+id);
    assert.equal(proof.solvable,true,'no win '+id);
    assert.equal(proof.duplicateIds,false,'duplicate hand '+id);
    if(id>12)continue;
    const report=simulateOnboardingLevel(id,{maxStates:80000});
    assert.equal(report.truncated,false,'truncated census '+id);
    assert.ok(report.shortestWin,'no win '+id);
    assert.equal(report.deadEnds,0,'dead end '+id);
    // L8 is the first losable level. L9 and L10 stay forced-loss free.
    if(id<=7||id===9||id===10)assert.equal(report.forcedLosses,0,'forced loss '+id);
    if(id===8)assert.ok(report.forcedLosses>0,'L8 is the first losable level');
    if(id===11)assert.equal(report.zeroSnapForced,0,'snap-free forced loss');
    if(id<=4)assert.equal(report.failedEnds,0,'early fail '+id);
  }
});
