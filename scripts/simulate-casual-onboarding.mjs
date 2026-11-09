import {pathToFileURL} from 'node:url';
import {
  ONBOARDING_COUNT,newOnboardingRound,onboardingActions,
  onboardingVictory,onboardingFinished,stepOnboarding
} from '../src/casual/onboardingLevels.js';

// Bounded state-space exploration through the production engine, not copied scoring.
function fingerprint(round){
  const d=round.game.deal;
  return JSON.stringify({
    levelId:round.levelId,turn:round.turn,snaps:round.snaps,
    flipCount:round.flipCount,zeroBreakCount:round.zeroBreakCount,
    status:round.game.status,
    T:d.T,S:d.S,W:d.W,flips:d.flips,plays:d.plays,
    flipFactor:d.flipFactor,
    flipStreak:d.flipStreak,bankCount:d.bankCount,handCap:d.handCap,
    potValue:d.potValue??null,
    pot:d.pot,hand:d.hand,discard:d.discard,pos:d.pos
  });
}
export function simulateOnboardingLevel(levelId,{maxStates=25000,maxDepth=16}={}){
  const queue=[{round:newOnboardingRound(levelId),actions:[]}];
  const graph=[];
  const indexByKey=new Map();
  const result={levelId,states:0,wins:0,failedEnds:0,deadEnds:0,
    truncated:false,shortestWin:null,forcedLosses:0,zeroSnapForced:0};
  for(let cursor=0;cursor<queue.length;cursor++){
    if(indexByKey.size>=maxStates){result.truncated=true;break;}
    const {round,actions}=queue[cursor],key=fingerprint(round);
    if(indexByKey.has(key))continue;
    const node={key,win:false,terminal:false,dead:false,cut:false,
      snaps:round.snaps,childKeys:[]};
    indexByKey.set(key,graph.length);
    graph.push(node);
    if(onboardingVictory(round)){
      node.win=true;
      result.wins++;
      result.shortestWin??=actions;
      continue;
    }
    if(onboardingFinished(round)){
      node.terminal=true;
      result.failedEnds++;
      continue;
    }
    if(actions.length>=maxDepth){node.cut=true;result.truncated=true;continue;}
    const available=onboardingActions(round);
    if(available.length===0){node.dead=true;result.deadEnds++;continue;}
    for(const action of available){
      const next=stepOnboarding(round,action);
      if(next===round)throw new Error('Engine rejected an available onboarding action');
      node.childKeys.push(fingerprint(next));
      queue.push({round:next,actions:[...actions,action]});
    }
  }
  // A state is a forced loss when every explored continuation banks under the target.
  const memo=new Map();
  const forced=key=>{
    if(memo.has(key))return memo.get(key);
    const at=indexByKey.get(key);
    if(at==null){memo.set(key,false);return false;}
    const node=graph[at];
    const value=node.win||node.cut?false:
      node.terminal||node.dead?true:
      node.childKeys.length>0&&node.childKeys.every(child=>indexByKey.has(child)&&forced(child));
    memo.set(key,value);
    return value;
  };
  for(const node of graph){
    if(!forced(node.key))continue;
    result.forcedLosses++;
    if(node.snaps===0)result.zeroSnapForced++;
  }
  result.states=indexByKey.size;
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  for(let levelId=1;levelId<=ONBOARDING_COUNT;levelId++){
    const result=simulateOnboardingLevel(levelId);
    console.log(JSON.stringify(result));
    if(!result.shortestWin){
      console.error('Unwinnable onboarding level '+levelId);
      process.exitCode=1;
    }
  }
}
