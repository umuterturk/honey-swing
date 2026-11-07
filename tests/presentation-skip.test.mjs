import test from 'node:test';
import assert from 'node:assert/strict';
import {signed} from '../src/external/engines.js';
import {
  newOnboardingRound,onboardingActions,stepOnboarding
} from '../src/casual/onboardingLevels.js';
import {settledPresentation} from '../src/casual/presentation.js';
import {
  createActionPresentation,commitOnboardingAction,motionKind,runPresentedAction
} from '../src/casual/actionPresentation.js';

function findKind(levelId,kind){
  const queue=[newOnboardingRound(levelId)];
  const seen=new Set();
  while(queue.length){
    const round=queue.shift();
    const deal=round.game.deal;
    const key=[round.turn,round.snaps,deal.T,deal.S,deal.potValue??0,deal.hand.join(','),deal.pos].join('|');
    if(seen.has(key))continue;
    seen.add(key);
    if(round.game.status!=='playing'||round.snaps>1||round.turn>6)continue;
    for(const action of onboardingActions(round)){
      const committed=commitOnboardingAction(round,action);
      if(!committed)continue;
      if(motionKind(action,committed.change)===kind)return {round,action,committed};
      queue.push(committed.next);
    }
  }
  throw new Error('No '+kind+' action on level '+levelId);
}

function harness(round){
  const presentation=createActionPresentation();
  const log=[];
  const box={round,commits:0,settles:[]};
  function attempt(action){
    const down=presentation.acceptPointerDown();
    const click=presentation.acceptClick();
    if(down==='skip'||click!=='action')return {down,click,status:'consumed'};
    const result=runPresentedAction(box.round,action,presentation,{
      onCommit(committed){
        log.push('commit');
        box.commits++;
        box.committed=committed;
        assert.equal(presentation.isPresenting(),false);
      },
      onSettle(committed){
        log.push('settle');
        box.settles.push(settledPresentation(committed.next));
        box.round=committed.next;
      },
      startMotion(){
        log.push('motion');
        assert.equal(box.commits,box.settles.length+1);
        return ()=>{log.push('cancel');};
      }
    });
    return {
      down,click,status:result.status,
      kind:motionKind(result.committed.action,result.committed.change)
    };
  }
  return {presentation,log,box,attempt};
}

test('card, Swing, Bank, and Snap each settle on one tap from the first frame',()=>{
  const cases=[
    ['card',1],
    ['swing',3],
    ['bank',1],
    ['snap',11]
  ];
  for(const [kind,levelId] of cases){
    const found=findKind(levelId,kind);
    const {presentation,log,box,attempt}=harness(found.round);
    const first=attempt(found.action);
    assert.equal(first.kind,kind);
    assert.equal(first.status,'presenting');
    assert.deepEqual(log,['commit','motion']);
    const started=performance.now();
    const skip=attempt(found.action);
    assert.equal(skip.down,'skip');
    assert.equal(skip.click,'skip');
    assert.equal(skip.status,'consumed');
    assert.ok(performance.now()-started<100,kind+' input stayed locked');
    assert.equal(presentation.finishPresentation(),false);
    assert.equal(presentation.isPresenting(),false);
    assert.deepEqual(log,['commit','motion','cancel','settle']);
    assert.equal(box.commits,1);
    assert.equal(box.settles.length,1);
    const settled=box.settles[0];
    assert.equal(settled.animating,false);
    assert.equal(settled.feedback,null);
    assert.equal(settled.shownGold,found.committed.next.game.deal.T);
    assert.equal(settled.view.position,found.committed.next.game.deal.S);
    assert.equal(settled.view.rawPot,found.committed.next.game.deal.potValue??0);
    assert.equal(settled.view.snaps,found.committed.next.snaps);
    assert.equal(settled.round.turn,found.committed.next.turn);
    assert.equal(settled.round.game.deal.T,found.committed.next.game.deal.T);
  }
});

test('a skipping tap is not a card or Bank action, and the next tap plays once',()=>{
  const round=newOnboardingRound(1);
  const firstAction=onboardingActions(round).find(action=>action.type==='steer');
  const {presentation,box,attempt}=harness(round);
  assert.equal(attempt(firstAction).status,'presenting');
  const during=attempt({type:'bank'});
  assert.equal(during.down,'skip');
  assert.equal(during.status,'consumed');
  assert.equal(box.commits,1);
  assert.equal(box.round.turn,1);
  assert.equal(box.round.game.deal.T,0);
  assert.equal(presentation.isPresenting(),false);
  const nextAction=onboardingActions(box.round).find(action=>action.type==='steer');
  const started=performance.now();
  const again=attempt(nextAction);
  assert.ok(performance.now()-started<100);
  assert.equal(again.down,'play');
  assert.equal(again.status,'presenting');
  assert.equal(box.commits,2);
  presentation.finishPresentation();
  assert.equal(box.settles.length,2);
  assert.equal(box.settles[0].round.turn,1);
  assert.equal(box.settles[1].round.turn,2);
  assert.equal(box.settles[1].shownGold,box.round.game.deal.T);
  assert.equal(box.round.game.deal.T,box.settles[0].round.game.deal.T);
});

test('a triple tap settles one Bank and does not score it twice',()=>{
  const found=findKind(1,'bank');
  const before=found.round.game.deal.T;
  const {presentation,box,attempt}=harness(found.round);
  assert.equal(attempt(found.action).status,'presenting');
  const second=runPresentedAction(found.round,found.action,presentation,{
    onCommit(){throw new Error('in-flight Bank committed twice');},
    onSettle(){throw new Error('in-flight Bank settled twice');},
    startMotion(){throw new Error('in-flight Bank started twice');}
  });
  assert.equal(second.status,'locked');
  assert.equal(attempt(found.action).status,'consumed');
  assert.equal(presentation.acceptClick(),'action');
  assert.equal(presentation.finishPresentation(),false);
  assert.equal(box.commits,1);
  assert.equal(box.settles.length,1);
  const gained=box.round.game.deal.T-before;
  assert.ok(gained>0);
  assert.equal(box.settles[0].shownGold,before+gained);
  assert.equal(box.round.game.deal.potValue??0,0);
  const replay=runPresentedAction(box.round,found.action,presentation,{
    onCommit(){throw new Error('settled Bank committed again');},
    onSettle(){throw new Error('settled Bank settled again');},
    startMotion(){throw new Error('settled Bank moved again');}
  });
  assert.equal(replay.status,'rejected');
  assert.equal(box.round.game.deal.T,before+gained);
});

test('engine commit happens before motion, and unmount does not settle',()=>{
  const round=newOnboardingRound(3);
  const action=onboardingActions(round).find(entry=>entry.type==='steer');
  const presentation=createActionPresentation();
  const order=[];
  const result=runPresentedAction(round,action,presentation,{
    onCommit(committed){
      order.push('commit');
      assert.equal(committed.next.turn,round.turn+1);
      assert.equal(presentation.isPresenting(),false);
    },
    onSettle(){order.push('settle');},
    startMotion(){
      order.push('motion');
      return ()=>order.push('cancel');
    }
  });
  assert.equal(result.status,'presenting');
  assert.equal(motionKind(result.committed.action,result.committed.change),'card');
  assert.deepEqual(order,['commit','motion']);
  assert.equal(presentation.abandon(),true);
  assert.deepEqual(order,['commit','motion','cancel']);
  assert.equal(presentation.isPresenting(),false);
  assert.equal(presentation.abandon(),false);
  assert.equal(presentation.finishPresentation(),false);
  const natural=createActionPresentation();
  let settles=0;
  runPresentedAction(round,action,natural,{
    onCommit(){},
    onSettle(){settles++;},
    startMotion(_committed,complete){complete();return ()=>{};}
  });
  assert.equal(settles,1);
  assert.equal(natural.finishPresentation(),false);
  assert.equal(settles,1);
});
