import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARDING_LEVELS,ONBOARDING_COUNT,GARDEN_2_START,levelValidation,onboardingLevel,
  newOnboardingRound,onboardingActions,stepOnboarding,onboardingVictory,wouldSnap
} from '../src/casual/onboardingLevels.js';
import {signed,newOverswing,stepOverswing,overswingPayout,overswingActions} from '../src/external/engines.js';
import {multiplierRewards} from '../src/casual/multiplierView.js';
import {simulateOnboardingLevel} from '../scripts/simulate-casual-onboarding.mjs';

const flip={type:'flip'},bank={type:'bank'};
const pot=round=>round.game.deal.potValue;
const factors=round=>[round.game.deal.W+1,round.game.deal.flipFactor,round.game.deal.jackpotFactor];
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

test('Garden 1 plus a playable Lower Orchard replace the ten-level tutorial',()=>{
  assert.equal(levelValidation(),true);
  assert.equal(ONBOARDING_COUNT,20);
  assert.equal(GARDEN_2_START,13);
  for(const level of ONBOARDING_LEVELS){
    assert.equal(onboardingLevel(level.id),level);
    assert.equal(level.showMeter,true);
    assert.equal(level.script.length,0);
    assert.equal(level.requiresFlip,false);
    assert.equal(level.visibleHandSlots,level.initialHandSize);
    assert.notEqual(level.visibleHandSlots,1);
    assert.equal(level.rules.runningPot,true);
    assert.equal(level.rules.snapLimit,8);
    assert.equal(level.rules.steerAlwaysToPot,true);
    assert.equal(level.rules.steerNoncrossPenalty,0);
    assert.equal(level.rules.flipNoncrossPenalty,0);
    assert.equal(level.rules.enableResonance,false);
    assert.equal(level.rules.flipOnly,[5,6,7,8,12].includes(level.id));
    assert.equal(level.showFlip,level.deck.length>level.initialHandSize);
    assert.equal(level.showChances,level.id>=11);
    assert.equal(level.garden,level.id>=13?2:1);
  }
});

test('each level docks only the factors it has taught',()=>{
  const expect={
    1:[],2:[],3:['swing'],4:['swing'],5:['swing'],
    6:['swing','flip'],7:['swing','flip'],8:['swing','flip'],
    9:['swing'],10:['swing'],11:['swing','flip'],12:['swing','flip'],
    13:['swing','flip'],14:['swing','flip'],15:['swing','flip'],
    16:['swing','flip'],17:['swing','flip'],18:['swing','flip'],19:['swing','flip'],
    20:['swing','flip']
  };
  for(const level of ONBOARDING_LEVELS){
    const factors=expect[level.id];
    assert.deepEqual([...level.visibleFactors],factors,level.name);
    assert.equal(level.rules.enableSwingFactor,factors.includes('swing'));
    assert.equal(level.rules.enableFlipFactor,factors.includes('flip'));
    assert.equal(level.rules.enableJackpotFactor,false);
    assert.equal(level.visibleFactors.includes('jackpot'),false);
    assert.equal(level.requiresZeroBreak,level.id===10);
  }
  assert.equal(onboardingLevel(3).dock,'swing');
  assert.equal(onboardingLevel(5).dock,'flip');
  assert.equal(onboardingLevel(6).dock,'flip-pill');
  assert.equal(onboardingLevel(8).dock,null);
  assert.equal(onboardingLevel(11).dock,'hearts');
  assert.equal(onboardingLevel(19).telegraph,true);
  assert.equal(onboardingLevel(5).pulse,'flip');
  assert.equal(onboardingLevel(6).pulse,'flip');
  assert.equal(onboardingLevel(8).pulse,'card-then-flip');
});

test('running Pot pays only the card just played; Overswing still revalues the whole Pot',()=>{
  const casual={runningPot:true,snapLimit:8,steerAlwaysToPot:true,
    steerNoncrossPenalty:0,flipNoncrossPenalty:0,enableResonance:false,
    enableSwingFactor:true,enableFlipFactor:true,enableJackpotFactor:true};
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

test('a casual crossing Flip grows Swing and Flip; Overswing still grows Jackpot',()=>{
  const casual={runningPot:true,snapLimit:8,steerAlwaysToPot:true,
    steerNoncrossPenalty:0,flipNoncrossPenalty:0,enableResonance:false,
    enableSwingFactor:true,enableFlipFactor:true,enableJackpotFactor:false};
  let game=newOverswing({deckOverride:[1,0,25,21],seed:1,initialHandSize:2});
  game=stepOverswing(game,{type:'steer',index:0},casual);
  game=stepOverswing(game,{type:'flip'},casual);
  assert.equal(game.deal.S,-4);
  assert.equal(game.deal.W,1);
  assert.equal(game.deal.flipFactor,2);
  assert.equal(game.deal.flipStreak,1);
  assert.equal(game.deal.jackpotFactor,1);
  assert.equal(game.lastAction.addedToPot,24);
  assert.equal(game.lastAction.swingTierGained,true);
  assert.equal(game.lastAction.flipTierGained,true);
  assert.equal(game.lastAction.jackpotTierGained,false);
  game=stepOverswing(game,{type:'flip'},casual);
  assert.equal(game.deal.S,-6);
  assert.equal(game.lastAction.swung,false);
  assert.equal(game.deal.flipStreak,2);
  assert.equal(game.deal.flipFactor,3);
  assert.equal(game.deal.jackpotFactor,1);
  assert.equal(game.lastAction.addedToPot,12);

  const jackpotStillOn={...casual,enableJackpotFactor:true};
  let kept=newOverswing({deckOverride:[1,0,25],seed:1,initialHandSize:2});
  kept=stepOverswing(kept,{type:'steer',index:0},jackpotStillOn);
  kept=stepOverswing(kept,{type:'flip'},jackpotStillOn);
  assert.equal(kept.deal.flipFactor,1);
  assert.equal(kept.deal.flipStreak,0);
  assert.equal(kept.deal.jackpotFactor,2);
  assert.equal(kept.lastAction.flipTierGained,false);
  assert.equal(kept.lastAction.jackpotTierGained,true);

  const campaign={snapLimit:8,steerAlwaysToPot:true,steerNoncrossPenalty:0,
    flipNoncrossPenalty:0,enableSwingFactor:true,enableFlipFactor:true};
  let old=newOverswing({deckOverride:[1,0,25],seed:1,initialHandSize:2});
  old=stepOverswing(old,{type:'steer',index:0},campaign);
  old=stepOverswing(old,{type:'flip'},campaign);
  assert.equal(old.deal.W,1);
  assert.equal(old.deal.flipFactor,1);
  assert.equal(old.deal.flipStreak,0);
  assert.equal(old.deal.jackpotFactor,2);
  assert.equal(old.deal.potValue,undefined);
  assert.equal(old.lastAction.flipTierGained,false);
  assert.equal(old.lastAction.jackpotTierGained,true);
});

test('flipOnly does not draw the pile, and Flip stays legal on an empty hand',()=>{
  const deck=[2,1,0];
  const rules={snapLimit:8,steerAlwaysToPot:true,steerNoncrossPenalty:0,
    flipNoncrossPenalty:0,enableResonance:false,runningPot:true,flipOnly:true,
    enableSwingFactor:true,enableFlipFactor:false,enableJackpotFactor:false};
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
  assert.deepEqual(start.game.deal.hand.map(signed),[2,3,3]);
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
  assert.deepEqual(factors(across),[1,1,1]);
  assert.deepEqual(multiplierRewards(across.game.deal,across.game.lastAction),[]);
});

test('Level 5: the hidden card is a Flip, pays its rank, and never ticks Swing',()=>{
  let state=line(5,[3,2]);
  assert.deepEqual(state.game.deal.hand,[]);
  assert.equal(pot(state),5);
  assert.equal(onboardingActions(state).some(action=>action.type==='bank'),true);
  assert.equal(onboardingActions(state).some(action=>action.type==='flip'),true);
  state=play(state,flip);
  assert.equal(state.game.lastAction.addedToPot,1);
  assert.deepEqual(factors(state),[1,1,1]);
  state=play(state,bank);
  assert.equal(state.game.deal.T,6);
  const flipped=line(5,['flip',3,2,'bank']);
  assert.equal(flipped.flipCount,1);
  assert.equal(flipped.game.deal.T>=6,true);
});

test('Level 11: the safe line banks 11 and the taught Snap recovers to 9',()=>{
  let safe=line(11,[2,-1,'bank',5,-3,'bank']);
  assert.equal(safe.snaps,0);
  assert.equal(safe.game.deal.T,11);
  for(const leftover of [[-3,3],[3,-3]]){
    let state=line(11,[2,-1,'bank',5,7]);
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

test('Levels 15–20 open with a +9 Snap for feedback testing',()=>{
  for(let id=15;id<=20;id++){
    const round=newOnboardingRound(id);
    const index=round.game.deal.hand.findIndex(card=>signed(card)===9);
    assert.ok(index>=0,'L'+id+' missing opening +9');
    assert.equal(wouldSnap(round,{type:'steer',index}),true,'L'+id+' +9 should Snap');
  }
});

test('Garden 1 has no forced loss except Level 12, and every level has a win',()=>{
  for(let id=1;id<=ONBOARDING_COUNT;id++){
    const report=simulateOnboardingLevel(id,{maxStates:80000,maxDepth:24});
    assert.equal(report.truncated,false,'truncated '+id);
    assert.ok(report.shortestWin,'no win '+id);
    assert.equal(report.deadEnds,0,'dead end '+id);
    if(id<=9)assert.equal(report.forcedLosses,0,'forced loss '+id);
    if(id===11)assert.equal(report.zeroSnapForced,0,'snap-free forced loss');
    if(id<=4)assert.equal(report.failedEnds,0,'early fail '+id);
  }
});

test('the board keeps a next garden and does not offer Replay Challenge',async()=>{
  const {readFile}=await import('node:fs/promises');
  const source=await readFile(new URL('../src/casual/SimplifiedGame.jsx',import.meta.url),'utf8');
  assert.match(source,/<header className="sgv-hud sgv-tutorial-hud">/);
  assert.match(source,/<HorizontalMeter position=\{view\.position\}/);
  assert.doesNotMatch(source,/level\.showMeter\s*\?/);
  assert.match(source,/visiblePotPayout\(potentialPayout,rawPotValue\(deal\),view\.rawPot\)/);
  assert.match(source,/<PendingPot value=\{potDisplay\}/);
  assert.match(source,/<GlassChest banked=\{shownGold\}/);
  assert.match(source,/<SimpleCard key=\{id\}/);
  assert.match(source,/className=\{'sgv-action sgv-bank sgv-bank-command'/);
  assert.match(source,/const shownHand=deal\.hand\.slice/);
  assert.match(source,/LOWER ORCHARD/);
  assert.match(source,/Skip to Level 13/);
  assert.match(source,/startLevel\(GARDEN_2_START\)/);
  assert.doesNotMatch(source,/REPLAY CHALLENGE/);
  assert.doesNotMatch(source,/animatePotBreak\(root,'zero'\)/);
  assert.match(source,/Pot safe\./);
  assert.match(source,/Pot lost\. Savings safe\./);
  assert.match(source,/3000/);
});
