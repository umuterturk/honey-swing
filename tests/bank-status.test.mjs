import test from 'node:test';
import assert from 'node:assert/strict';
import {signed} from '../src/external/engines.js';
import {
  newOnboardingRound,onboardingActions,onboardingFinished,stepOnboarding
} from '../src/casual/onboardingLevels.js';
import {bankAssistiveMessage,nextBankAnnouncement,shouldAutoBank} from '../src/casual/bankStatus.js';

function steer(round,value){
  const index=round.game.deal.hand.findIndex(id=>signed(id)===value);
  const next=stepOnboarding(round,{type:'steer',index});
  assert.notStrictEqual(next,round);
  return next;
}

test('Level 10 start asks for two more cards',()=>{
  const start=newOnboardingRound(10);
  assert.equal(start.game.deal.plays,0);
  assert.equal(bankAssistiveMessage(start),'Play 2 more cards to Save.');
  assert.equal(bankAssistiveMessage(steer(start,3)),'Play 1 more card to Save.');
});

test('Level 10 after +3 then -5 asks for Zero',()=>{
  const state=steer(steer(newOnboardingRound(10),3),-5);
  assert.equal(state.game.deal.plays,2);
  assert.equal(state.zeroBreakCount,0);
  assert.ok(state.game.deal.pot.length>0);
  assert.equal(bankAssistiveMessage(state),'Hit Zero to unlock Save.');
});

test('an empty Pot after two plays and the Zero gate says nothing to bank',()=>{
  const queue=[newOnboardingRound(10)];
  const seen=new Set();
  let reachable=false;
  while(queue.length){
    const round=queue.pop();
    const deal=round.game.deal;
    const key=[round.turn,deal.plays,deal.pot.length,round.zeroBreakCount,deal.hand.join(',')].join('|');
    if(seen.has(key))continue;
    seen.add(key);
    if(deal.plays>=2&&round.zeroBreakCount>0&&deal.pot.length===0)reachable=true;
    if(onboardingFinished(round))continue;
    for(const action of onboardingActions(round))queue.push(stepOnboarding(round,action));
  }
  assert.equal(reachable,false);
  const round=newOnboardingRound(10);
  const direct={
    ...round,
    zeroBreakCount:1,
    game:{...round.game,deal:{...round.game.deal,plays:2,pot:[],potValue:0}}
  };
  assert.equal(bankAssistiveMessage(direct),'Nothing to save yet.');
});

test('Save ready uses the projected payout and aria-live updates only on change',()=>{
  let state=steer(steer(newOnboardingRound(10),3),-5);
  state=steer(state,2);
  assert.equal(state.game.lastAction.zeroBreak,true);
  assert.equal(bankAssistiveMessage(state),'Save ready: '+state.game.deal.potValue);
  const first=nextBankAnnouncement(null,'Play 2 more cards to Save.');
  assert.equal(first.text,'');
  const same=nextBankAnnouncement(first.previous,'Play 2 more cards to Save.');
  assert.equal(same.text,null);
  const changed=nextBankAnnouncement(same.previous,'Hit Zero to unlock Save.');
  assert.equal(changed.text,'Hit Zero to unlock Save.');
  const ready=nextBankAnnouncement(changed.previous,'Save ready: 17');
  assert.equal(ready.text,'Save ready: 17');
});

test('auto-Bank only when every legal action is Bank',()=>{
  assert.equal(shouldAutoBank([{type:'bank'}]),true);
  assert.equal(shouldAutoBank([{type:'bank'},{type:'bank',dropIndex:0}]),true);
  assert.equal(shouldAutoBank([{type:'bank'},{type:'flip'}]),false);
  assert.equal(shouldAutoBank([{type:'steer',index:0}]),false);
  assert.equal(shouldAutoBank([]),false);
  assert.equal(shouldAutoBank(null),false);
});

