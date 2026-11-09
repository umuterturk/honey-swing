import test from 'node:test';
import assert from 'node:assert/strict';
import {newOverswing,stepOverswing,signed} from '../src/external/engines.js';
import {multiplierParts,multiplierRewards} from '../src/casual/multiplierView.js';
import {rawPotValue,actionPresentation} from '../src/casual/presentation.js';

test('original Overswing noncrossing STEER still discards; casual rule is opt-in only',()=>{
  let normal=newOverswing({deckOverride:[2,21,4,12,23,10,22,3,20,5],seed:20261104,initialHandSize:3});
  normal=stepOverswing(normal,{type:'steer',index:0},{snapLimit:8,bankCapacityLoss:0});
  normal=stepOverswing(normal,{type:'steer',index:0},{snapLimit:8,bankCapacityLoss:0});
  assert.equal(normal.deal.S,1);
  assert.equal(normal.lastAction.destination,'discard');
  assert.equal(normal.lastAction.addedToPot,0);
  assert.deepEqual(normal.deal.pot.map(id=>Math.abs(signed(id))),[3]);
});

test('landing exactly on zero resets all multipliers without losing absolute Pot',()=>{
  const rules={snapLimit:8,bankCapacityLoss:0,steerAlwaysToPot:true};
  let game=newOverswing({deckOverride:[2,23,10,20,22,3],seed:42,initialHandSize:2});
  game=stepOverswing(game,{type:'steer',index:0},rules); // +3
  game=stepOverswing(game,{type:'steer',index:0},rules); // -4 crossing, S = -1, W = 1
  assert.equal(game.deal.S,-1);
  assert.deepEqual(multiplierParts(game.deal).map(x=>x.value),[2,1]);
  // The hand refills when emptied, so +1 is now in hand, not atop the Flip deck.
  game=stepOverswing(game,{type:'steer',index:0},rules); // +1 exact zero -> Zero Break
  assert.equal(game.lastAction.zeroBreak,true);
  assert.equal(game.deal.S,0);
  assert.deepEqual(multiplierParts(game.deal).map(x=>x.value),[1,1]);
  assert.equal(multiplierRewards(game.deal,game.lastAction).length,0);
  assert.deepEqual(game.deal.pot.map(id=>Math.abs(signed(id))),[3,4,1]);
});

test('zero break retains Pot and produces no fake factor awards',()=>{
  const rules={snapLimit:8,bankCapacityLoss:0,steerAlwaysToPot:true};
  let game=newOverswing({deckOverride:[2,23,10,20,22,3],seed:42,initialHandSize:2});
  game=stepOverswing(game,{type:'steer',index:0},rules); // +3
  game=stepOverswing(game,{type:'steer',index:0},rules); // -4 -> -1
  const before={game,snaps:0,event:{type:'cross'}};
  const nextGame=stepOverswing(game,{type:'steer',index:0},rules); // +1 -> 0
  const after={game:nextGame,snaps:0,event:{type:'zero_break'}};
  const p=actionPresentation(before,after,{type:'steer'});
  assert.equal(p.zeroBreak,true);
  assert.equal(p.to,0);
  assert.equal(p.rawPotBefore,7);
  assert.equal(p.rawPotAfter,8);
  assert.deepEqual(p.factorsAfter.map(f=>f.value),[1,1]);
  assert.deepEqual(p.rewards,[]);
});

test('casual Zero Break still resets Swing tiers and retains pending Pot',()=>{
 const rules={snapLimit:8,bankCapacityLoss:0,steerAlwaysToPot:true,steerNoncrossPenalty:0,flipNoncrossPenalty:0};
 let game=newOverswing({deckOverride:[2,23,10,20,22,3],seed:42,initialHandSize:2});
 game=stepOverswing(game,{type:'steer',index:0},rules); // RIGHT 3
 game=stepOverswing(game,{type:'steer',index:0},rules); // LEFT 4 -> -1, W=1
 assert.equal(game.deal.W,1);
 const rawBefore=rawPotValue(game.deal);
 game=stepOverswing(game,{type:'steer',index:0},rules); // RIGHT 1 -> exactly 0
 assert.equal(game.lastAction.zeroBreak,true);
 assert.equal(game.deal.W,0);
 assert.equal(game.deal.S,0);
 assert.equal(rawPotValue(game.deal),rawBefore+1);
 assert.deepEqual(multiplierParts(game.deal).map(f=>f.value),[1,1]);
});
