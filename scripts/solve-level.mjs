import {
  GARDEN,ONBOARDING_COUNT,newOnboardingRound,onboardingActions,
  onboardingVictory,onboardingFinished,stepOnboarding
} from '../src/casual/onboardingLevels.js';
import {canonicalKey} from '../src/casual/canonicalKey.js';

function handHasDuplicateIds(hand){
  const seen=new Set();
  for(const id of hand){
    if(seen.has(id))return true;
    seen.add(id);
  }
  return false;
}

function crossed(next){
  const action=next.game.lastAction;
  return !!action?.swung&&!action?.snap;
}

// One memoized DFS. mode restricts the action set. stopAtWin returns on the
// first winning child. paths keeps the lex-first shortest win, which is the
// path a left-to-right BFS would dequeue first.
function search(levelId,{maxStates,mode='all',stopAtWin=false,paths=false}={}){
  const memo=new Map();
  const budget={states:0,truncated:false,duplicateIds:false,
    wins:0,failedEnds:0,deadEnds:0,forcedLosses:0,zeroSnapForced:0};
  function go(round){
    if(handHasDuplicateIds(round.game.deal.hand))budget.duplicateIds=true;
    const key=canonicalKey(round);
    const cached=memo.get(key);
    if(cached)return cached;
    if(budget.states>=maxStates){budget.truncated=true;return null;}
    budget.states++;
    if(onboardingVictory(round)){
      budget.wins++;
      const win={win:true,forced:false,lines:1,maxT:round.game.deal.T,
        minMoves:0,suffix:paths?[]:null};
      memo.set(key,win);
      return win;
    }
    if(onboardingFinished(round)||onboardingActions(round).length===0){
      const dead=!onboardingFinished(round);
      if(dead)budget.deadEnds++;
      else budget.failedEnds++;
      budget.forcedLosses++;
      if(round.snaps===0)budget.zeroSnapForced++;
      const loss={win:false,forced:true,lines:0,maxT:null,minMoves:Infinity,suffix:null};
      memo.set(key,loss);
      return loss;
    }
    const available=onboardingActions(round);
    let win=false,forced=true,lines=0,maxT=null,minMoves=Infinity,suffix=null;
    let actionIndex=-1;
    for(const action of available){
      actionIndex++;
      if(mode==='no-flip'&&action.type==='flip')continue;
      if(mode==='no-steer'&&action.type==='steer')continue;
      const next=stepOnboarding(round,action);
      if(next===round)throw new Error('Engine rejected an available onboarding action');
      if(mode==='no-cross'&&crossed(next))continue;
      const child=go(next);
      if(!child)return null;
      lines+=child.lines;
      if(!child.forced)forced=false;
      if(!child.win)continue;
      win=true;
      if(child.maxT!=null&&(maxT==null||child.maxT>maxT))maxT=child.maxT;
      const moves=child.minMoves+1;
      const better=moves<minMoves||(moves===minMoves&&(suffix==null||actionIndex<suffix.at));
      if(better){
        minMoves=moves;
        suffix=paths?{at:actionIndex,actions:[action,...(child.suffix?.actions||child.suffix||[])]}:null;
      }
      if(stopAtWin)break;
    }
    if(forced){
      budget.forcedLosses++;
      if(round.snaps===0)budget.zeroSnapForced++;
    }
    const node={win,forced,lines,maxT,minMoves,suffix};
    memo.set(key,node);
    return node;
  }
  const root=go(newOnboardingRound(levelId));
  const shortest=root?.suffix?.actions||(Array.isArray(root?.suffix)?root.suffix:null);
  return {
    levelId,mode,
    win:!!root?.win&&!budget.truncated,
    truncated:budget.truncated||!root,
    states:budget.states,
    duplicateIds:budget.duplicateIds,
    wins:budget.wins,
    failedEnds:budget.failedEnds,
    deadEnds:budget.deadEnds,
    forcedLosses:budget.forcedLosses,
    zeroSnapForced:budget.zeroSnapForced,
    lines:root?.lines||0,
    maxT:root?.maxT??null,
    shortestWin:root?.win&&!budget.truncated?shortest:null
  };
}

export function solveLevel(levelId,{maxStates=200000}={}){
  const start=newOnboardingRound(levelId);
  // Flip-only piles never deal into the hand, so every later hand is a subset
  // of this one. The searches also flag any duplicate they actually visit.
  const open=search(levelId,{maxStates,mode:'all',stopAtWin:true,paths:true});
  const noFlip=search(levelId,{maxStates,mode:'no-flip',stopAtWin:true});
  const noSteer=search(levelId,{maxStates,mode:'no-steer',stopAtWin:true});
  return {
    levelId,
    solvable:open.win&&!open.truncated,
    truncated:open.truncated||noFlip.truncated||noSteer.truncated,
    states:open.states,
    winWithoutFlip:noFlip.win&&!noFlip.truncated,
    winWithoutSteer:noSteer.win&&!noSteer.truncated,
    duplicateIds:handHasDuplicateIds(start.game.deal.hand)||
      open.duplicateIds||noFlip.duplicateIds||noSteer.duplicateIds,
    shortestWin:open.shortestWin
  };
}

// Full path counts and the best secured total. Report-only: not used by CI.
export function enumerateLevel(levelId,{maxStates=2000000}={}){
  const level=GARDEN[levelId-1];
  if(!level)throw new RangeError('Unknown onboarding level '+levelId);
  const memo=new Map();
  const examples={maxT:null,maxPath:null,star2:null,star3:null};
  let states=0,truncated=false,duplicateIds=false,snapReached=false,maxAbsS=0;
  function go(round,path){
    if(handHasDuplicateIds(round.game.deal.hand))duplicateIds=true;
    if(round.snaps>0||round.game.lastAction?.snap)snapReached=true;
    maxAbsS=Math.max(maxAbsS,Math.abs(round.game.deal.S)||0);
    const key=canonicalKey(round);
    const cached=memo.get(key);
    if(cached)return cached;
    if(states>=maxStates){truncated=true;return null;}
    states++;
    if(onboardingVictory(round)){
      const total=round.game.deal.T;
      if(examples.maxT==null||total>examples.maxT){
        examples.maxT=total;
        examples.maxPath=path.slice();
      }
      if(total>=level.star2&&!examples.star2)examples.star2=path.slice();
      if(total>=level.star3&&!examples.star3)examples.star3=path.slice();
      const win={lines:1,maxT:total};
      memo.set(key,win);
      return win;
    }
    if(onboardingFinished(round)){
      const loss={lines:0,maxT:null};
      memo.set(key,loss);
      return loss;
    }
    const available=onboardingActions(round);
    if(!available.length){
      const loss={lines:0,maxT:null};
      memo.set(key,loss);
      return loss;
    }
    let lines=0,maxT=null;
    for(const action of available){
      const next=stepOnboarding(round,action);
      if(next===round)throw new Error('Engine rejected an available onboarding action');
      path.push(action);
      const child=go(next,path);
      path.pop();
      if(!child)return null;
      lines+=child.lines;
      if(child.maxT!=null&&(maxT==null||child.maxT>maxT))maxT=child.maxT;
    }
    const node={lines,maxT};
    memo.set(key,node);
    return node;
  }
  const root=go(newOnboardingRound(levelId),[]);
  const noFlip=search(levelId,{maxStates,mode:'no-flip',stopAtWin:false});
  const noSteer=search(levelId,{maxStates,mode:'no-steer',stopAtWin:false,paths:true});
  return {
    levelId,
    target:level.target,
    star2:level.star2,
    star3:level.star3,
    potCap:level.potCap,
    states,
    truncated:truncated||!root||noFlip.truncated||noSteer.truncated,
    duplicateIds:duplicateIds||noFlip.duplicateIds||noSteer.duplicateIds,
    winningLines:root?.lines||0,
    linesWithoutFlip:noFlip.lines,
    linesWithoutSteer:noSteer.lines,
    pathWithoutSteer:noSteer.shortestWin,
    maxWinningTotal:root?.maxT??null,
    snapReached,
    maxAbsS,
    star2Reached:examples.star2!=null,
    star3Reached:examples.star3!=null,
    pathStar2:examples.star2,
    pathStar3:examples.star3,
    pathMax:examples.maxPath
  };
}

function rowFrom(levelId,found){
  return {
    levelId,
    states:found.states,
    wins:found.wins,
    failedEnds:found.failedEnds,
    deadEnds:found.deadEnds,
    truncated:found.truncated,
    shortestWin:found.shortestWin,
    forcedLosses:found.forcedLosses,
    zeroSnapForced:found.zeroSnapForced
  };
}

// Six-card graphs run past the 200k proof cap (L19's shortest win alone is
// ~198k states; the full graph is millions). This BFS stops when the first
// win is dequeued, so the path is a real shortest win and truncation means
// the cap hit before any win. Deeper losses stay out of the row.
function shortestCensus(levelId,{maxStates}){
  const queue=[{round:newOnboardingRound(levelId),parent:-1,action:null}];
  const indexByKey=new Map();
  const graph=[];
  let truncated=false;
  let winAt=-1;
  for(let cursor=0;cursor<queue.length;cursor++){
    if(indexByKey.size>=maxStates){truncated=true;break;}
    const item=queue[cursor];
    const key=canonicalKey(item.round);
    if(indexByKey.has(key))continue;
    const node={key,win:false,terminal:false,dead:false,cut:false,
      snaps:item.round.snaps,childKeys:[]};
    indexByKey.set(key,graph.length);
    graph.push(node);
    if(onboardingVictory(item.round)){node.win=true;winAt=cursor;break;}
    if(onboardingFinished(item.round)){node.terminal=true;continue;}
    const available=onboardingActions(item.round);
    if(!available.length){node.dead=true;continue;}
    for(const action of available){
      const next=stepOnboarding(item.round,action);
      if(next===item.round)throw new Error('Engine rejected an available onboarding action');
      node.childKeys.push(canonicalKey(next));
      queue.push({round:next,parent:cursor,action});
    }
  }
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
  let wins=0,failedEnds=0,deadEnds=0,forcedLosses=0,zeroSnapForced=0;
  for(const node of graph){
    if(node.win)wins++;
    if(node.terminal)failedEnds++;
    if(node.dead)deadEnds++;
    if(!forced(node.key))continue;
    forcedLosses++;
    if(node.snaps===0)zeroSnapForced++;
  }
  const actions=[];
  if(winAt>=0){
    for(let at=winAt;queue[at].parent>=0;at=queue[at].parent)actions.push(queue[at].action);
    actions.reverse();
  }
  return {
    levelId,states:indexByKey.size,wins,failedEnds,deadEnds,
    truncated:truncated||winAt<0,shortestWin:winAt<0?null:actions,
    forcedLosses,zeroSnapForced
  };
}

export function simulateOnboardingLevel(levelId,{maxStates=200000}={}){
  // Hands of 5+ cards are proved by the short search. Their full graphs are
  // the --report census, not this row.
  if((GARDEN[levelId-1]?.hand||0)>=5)return shortestCensus(levelId,{maxStates});
  return rowFrom(levelId,search(levelId,{maxStates,mode:'all',stopAtWin:false,paths:true}));
}

function main(){
  const argv=process.argv.slice(2);
  const report=argv.includes('--report');
  const capArg=argv.find(arg=>arg.startsWith('--max-states='));
  const maxStates=capArg?Number(capArg.slice('--max-states='.length)):(report?2000000:200000);
  const ids=argv.filter(arg=>/^\d+$/.test(arg)).map(Number);
  const levels=ids.length?ids:[...Array(ONBOARDING_COUNT)].map((_,index)=>index+1);
  for(const levelId of levels){
    const result=report?enumerateLevel(levelId,{maxStates}):solveLevel(levelId,{maxStates});
    console.log(JSON.stringify(result));
    if(!report&&(!result.solvable||result.truncated)){
      console.error('Unwinnable onboarding level '+levelId);
      process.exitCode=1;
    }
    if(report&&result.truncated){
      console.error('Truncated onboarding level '+levelId);
      process.exitCode=1;
    }
  }
}

const invokedAsScript=typeof process!=='undefined'&&Array.isArray(process.argv)&&
  process.argv[1]?.endsWith('solve-level.mjs');
if(invokedAsScript)main();
