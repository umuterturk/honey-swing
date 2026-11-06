import test from 'node:test';
import assert from 'node:assert/strict';
import {signed} from '../src/external/engines.js';
import {
  ONBOARDING_COUNT,newOnboardingRound,onboardingActions,onboardingFinished,
  onboardingLevel,stepOnboarding
} from '../src/casual/onboardingLevels.js';
import {hasWinningContinuation,idleHintAction} from '../src/casual/idleHint.js';

const bank={type:'bank'};
const flip={type:'flip'};
function play(round,action){
  const next=stepOnboarding(round,action);
  assert.notStrictEqual(next,round);
  return next;
}
function steerValue(round,value){
  const index=round.game.deal.hand.findIndex(id=>signed(id)===value);
  assert.ok(index>=0,'missing '+value);
  return play(round,{type:'steer',index});
}
function line(level,values){
  return values.reduce((round,value)=>value==='flip'?play(round,flip):
    value==='bank'?play(round,bank):steerValue(round,value),newOnboardingRound(level));
}
const same=(a,b)=>!!a&&!!b&&a.type===b.type&&a.index===b.index&&a.dropIndex===b.dropIndex;

test('Level 15 after +4 then Flip does not hint the Bank that caps at 29',()=>{
  const state=line(15,[4,'flip']);
  let capped=play(state,bank);
  capped=steerValue(capped,1);
  capped=play(capped,bank);
  assert.equal(capped.game.deal.T,29);
  const kept=play(steerValue(state,1),bank);
  assert.equal(kept.game.deal.T,32);
  const hint=idleHintAction(state);
  assert.notEqual(hint.type,'bank');
  assert.equal(hint.type,'steer');
  assert.equal(signed(state.game.deal.hand[hint.index]),1);
  assert.equal(hasWinningContinuation(stepOnboarding(state,hint)),true);
  assert.equal(hasWinningContinuation(stepOnboarding(state,bank)),false);
});

test('Level 12 after +4 then +1 does not hint the Bank that caps at 17',()=>{
  const state=line(12,[4,1]);
  let capped=play(state,bank);
  capped=play(capped,flip);
  capped=play(capped,bank);
  assert.equal(capped.game.deal.T,17);
  assert.equal(play(state,flip).game.deal.potValue,29);
  const hint=idleHintAction(state);
  assert.notEqual(hint.type,'bank');
  assert.equal(hint.type,'flip');
  assert.equal(hasWinningContinuation(stepOnboarding(state,hint)),true);
  assert.equal(hasWinningContinuation(stepOnboarding(state,bank)),false);
});

test('Level 6 keeps the Flip line when Bank is also a winning action',()=>{
  const opening=idleHintAction(newOnboardingRound(6));
  assert.equal(opening.type,'flip');
  const state=line(6,[2,1]);
  const actions=onboardingActions(state);
  assert.equal(actions.some(action=>action.type==='bank'),true);
  assert.equal(actions.some(action=>action.type==='flip'),true);
  assert.equal(hasWinningContinuation(play(state,bank)),true);
  assert.equal(hasWinningContinuation(play(state,flip)),true);
  assert.equal(idleHintAction(state).type,'flip');
  const dealt=line(6,['flip','flip']);
  assert.equal(onboardingActions(dealt).some(action=>action.type==='flip'),false);
  assert.equal(idleHintAction(dealt).type,'bank');
});

test('when several actions still win, Bank stays ahead of a safe card',()=>{
  const state=line(1,[2,3]);
  const actions=onboardingActions(state);
  assert.equal(actions.some(action=>action.type==='bank'),true);
  assert.equal(actions.some(action=>action.type==='steer'),true);
  assert.equal(onboardingLevel(1).pulse,'card');
  for(const action of actions)assert.equal(hasWinningContinuation(stepOnboarding(state,action)),true);
  assert.equal(idleHintAction(state).type,'bank');
});

test('Level 15 opening hints the first safe card, not the losing Flip',()=>{
  const state=newOnboardingRound(15);
  const hint=idleHintAction(state);
  assert.equal(hint.type,'steer');
  assert.equal(hint.index,0);
  assert.equal(signed(state.game.deal.hand[0]),4);
  assert.equal(hasWinningContinuation(stepOnboarding(state,flip)),false);
  const afterFour=line(15,[4]);
  assert.equal(idleHintAction(afterFour).type,'flip');
  assert.equal(hasWinningContinuation(steerValue(afterFour,1)),false);
});

test('every idle hint keeps a win when any legal action still has one',()=>{
  for(let levelId=1;levelId<=ONBOARDING_COUNT;levelId++){
    const queue=[newOnboardingRound(levelId)];
    const seen=new Set();
    while(queue.length){
      const round=queue.shift();
      const deal=round.game.deal;
      const key=[round.turn,round.snaps,round.zeroBreakCount,deal.T,deal.S,deal.potValue??'',
        deal.hand.join(','),deal.pos,deal.flipFactor,deal.W].join('|');
      if(seen.has(key))continue;
      seen.add(key);
      if(onboardingFinished(round))continue;
      const actions=onboardingActions(round);
      const hint=idleHintAction(round);
      const winning=actions.filter(action=>hasWinningContinuation(stepOnboarding(round,action)));
      if(winning.length){
        assert.ok(winning.some(action=>same(action,hint)),
          'L'+levelId+' hint '+JSON.stringify(hint)+' leaves no win');
      }else if(actions.length){
        assert.ok(actions.some(action=>same(action,hint)),'L'+levelId+' hinted an illegal action');
      }
      const level=onboardingLevel(levelId);
      const flipLed=level.pulse==='flip'||
        (level.pulse==='card-then-flip'&&deal.S!==0);
      if(flipLed&&winning.some(action=>action.type==='flip')){
        assert.equal(hint.type,'flip','L'+levelId+' Flip line stolen');
      }else if(winning.some(action=>action.type==='bank'&&action.dropIndex==null)){
        assert.equal(hint.type,'bank');
      }
      for(const action of actions)queue.push(stepOnboarding(round,action));
    }
  }
});
