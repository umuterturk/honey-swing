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

test('Level 3: the pulsed cross pays 13 and the other order still banks 8',()=>{
  let hot=line(3,[3,-5]);
  assert.equal(pot(hot),13);
  assert.equal(hot.game.lastAction.addedToPot,10);
  assert.deepEqual(factors(hot),[2,1,1]);
  assert.equal(play(hot,bank).game.deal.T,13);
  let quiet=line(3,[-5,3]);
  assert.equal(quiet.game.deal.S,-2);
  assert.equal(quiet.game.lastAction.swung,false);
  assert.equal(pot(quiet),8);
  assert.equal(play(quiet,bank).game.deal.T,8);
});

test('Level 4: every order clears, and the quiet line is 11',()=>{
  const table=[
    [[2,-5,4],24],[[4,-5,2],20],[[2,4,-5],11],
    [[4,2,-5],11],[[-5,2,4],15],[[-5,4,2],13]
  ];
  for(const [order,total] of table){
    const state=line(4,order);
    assert.equal(pot(state),total,order.join(','));
    assert.equal(state.snaps,0);
  }
  for(const order of [[2,4],[-5,2],[-5,4]]){
    let state=line(4,order);
    state=play(state,bank);
    const left=state.game.deal.hand.map(signed);
    assert.equal(left.length,1);
    state=steerValue(state,left[0]);
    state=play(state,bank);
    assert.equal(state.game.deal.T,11,order.join(','));
  }
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

test('Level 6: Flip-first banks 13 and hand-first banks 16, both ticking Flip twice',()=>{
  let first=line(6,['flip','flip']);
  assert.equal(pot(first),13);
  assert.equal(first.game.lastAction.addedToPot,9);
  assert.deepEqual(factors(first),[1,3,1]);
  assert.equal(play(first,bank).game.deal.T,13);
  let hand=line(6,[2,1,'flip','flip']);
  assert.equal(pot(hand),16);
  assert.deepEqual(factors(hand),[1,3,1]);
  assert.equal(hand.snaps,0);
});

test('Level 7: the cross banks 13 and the quiet line reaches 10 with one Flip',()=>{
  let cross=line(7,[3,-5]);
  assert.equal(pot(cross),13);
  assert.deepEqual(factors(cross),[2,1,1]);
  assert.equal(play(cross,bank).game.deal.T,13);
  let quiet=line(7,[-5,3,'flip']);
  assert.equal(pot(quiet),10);
  assert.equal(quiet.game.lastAction.addedToPot,2);
  assert.deepEqual(factors(quiet),[1,2,1]);
  let banked=line(7,[-5,3,'bank','flip','bank']);
  assert.equal(banked.game.deal.T,10);
});

test('Level 8: a crossing Flip ticks Swing and Flip and pays ×4',()=>{
  let hot=line(8,[2,'flip']);
  assert.equal(pot(hot),26);
  assert.equal(hot.game.lastAction.addedToPot,24);
  assert.deepEqual(factors(hot),[2,2,1]);
  assert.equal(hot.game.deal.flipStreak,1);
  assert.deepEqual(multiplierRewards(hot.game.deal,hot.game.lastAction).map(reward=>reward.kind),['swing','flip']);
  assert.equal(line(8,[3,'flip']).game.deal.potValue,27);
  assert.equal(line(8,[2,3,'flip']).game.deal.potValue,29);
  let early=line(8,['flip',2,3]);
  assert.equal(pot(early),22);
  assert.deepEqual(factors(early),[1,2,1]);
  assert.equal(play(early,bank).game.deal.T,22);
  let floor=line(8,[2,3,'bank','flip','bank']);
  assert.equal(floor.game.deal.T,17);
  assert.equal(onboardingVictory(floor),true);
});

test('Level 9: the quiet order still fills 11 and the cross fills 17',()=>{
  assert.equal(line(9,[5,-6]).game.deal.potValue,17);
  assert.equal(line(9,[-6,5]).game.deal.potValue,11);
  assert.equal(play(line(9,[-6,5]),bank).game.deal.T,11);
});

test('Level 10: Bank waits for zero, and the zero play does not drop the Pot',()=>{
  let state=line(10,[3,-5]);
  assert.equal(pot(state),13);
  assert.equal(onboardingActions(state).some(action=>action.type==='bank'),false);
  const before=pot(state);
  state=steerValue(state,2);
  assert.equal(state.game.lastAction.zeroBreak,true);
  assert.equal(state.game.lastAction.addedToPot,4);
  assert.equal(pot(state),17);
  assert.ok(pot(state)>=before);
  assert.deepEqual(factors(state),[1,1,1]);
  assert.equal(state.game.deal.S,0);
  state=play(state,bank);
  assert.equal(state.game.deal.T,17);
  const orders=[[3,-5,2],[-5,3,2],[3,2,-5],[2,3,-5],[-5,2,3],[2,-5,3]];
  for(const order of orders){
    let round=newOnboardingRound(10),sawZero=false,previous=0;
    for(const value of order){
      previous=pot(round);
      round=steerValue(round,value);
      if(round.game.lastAction.zeroBreak){
        sawZero=true;
        assert.ok(pot(round)>=previous,order.join(','));
      }
    }
    assert.equal(sawZero,true,order.join(','));
    assert.equal(onboardingActions(round).some(action=>action.type==='bank'),true);
    round=play(round,bank);
    assert.ok(round.game.deal.T>=10,order.join(',')+' banked '+round.game.deal.T);
  }
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

test('Level 12: plus-then-Flip banks 28 and Flip-first never reaches the target',()=>{
  let hot=line(12,[4,'flip']);
  assert.equal(pot(hot),28);
  assert.equal(hot.game.lastAction.addedToPot,24);
  assert.deepEqual(factors(hot),[2,2,1]);
  assert.equal(play(hot,bank).game.deal.T,28);
  assert.equal(line(12,[1,'flip']).game.deal.potValue,25);
  assert.equal(line(12,[4,1,'flip']).game.deal.potValue,29);
  assert.equal(line(12,[4,'flip',1]).game.deal.potValue,32);
  assert.equal(line(12,[1,'flip',4]).game.deal.potValue,41);
  assert.equal(line(12,['flip',4,1]).game.deal.potValue,22);
  let short=line(12,['flip',4,'bank',1,'bank']);
  assert.equal(short.game.deal.T,21);
  let obvious=line(12,[4,1,'bank','flip','bank']);
  assert.equal(obvious.game.deal.T,17);
  let best=0;
  const queue=[line(12,['flip'])];
  const seen=new Set();
  while(queue.length){
    const state=queue.pop();
    const d=state.game.deal;
    const key=JSON.stringify([state.turn,state.snaps,d.T,d.potValue,d.S,d.W,
      d.flipFactor,d.jackpotFactor,d.plays,d.hand,d.pos]);
    if(seen.has(key))continue;
    seen.add(key);
    best=Math.max(best,state.game.deal.T);
    if(state.game.deal.T>=24||state.game.status!=='playing')continue;
    for(const action of onboardingActions(state))queue.push(play(state,action));
  }
  assert.equal(best,22);
});

test('Lower Orchard stubs are winnable and the light test can miss by banking early',()=>{
  assert.equal(play(line(15,['flip','flip']),bank).game.deal.T,38);
  let miss=line(15,[4,'flip','bank']);
  assert.equal(miss.game.deal.T,6);
  assert.equal(onboardingVictory(miss),false);
  assert.equal(play(line(13,[3,2,-6]),bank).game.deal.T>=16,true);
  assert.equal(play(line(19,['flip','flip']),bank).game.deal.T,38);
  assert.equal(play(line(20,['flip',3]),bank).game.deal.T,14);
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
