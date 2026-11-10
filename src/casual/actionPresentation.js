import {stepOnboarding} from './onboardingLevels.js';
import {actionPresentation} from './presentation.js';

// One visual transaction. The engine action is committed before begin();
// finishPresentation only installs that result. abandon() is for unmount and
// level changes, which must not replay or settle the interrupted action.
// fx.settle() only kills cosmetic timelines. It does not commit or delay input.
export function createActionPresentation(options={}){
  const fx=options?.fx??null;
  let current=null;
  let swallowClick=false;
  let needleOpen=false;
  function isPresenting(){return current!=null;}
  function isNeedleOpen(){return !!current&&needleOpen;}
  function markNeedleSettled(){needleOpen=false;}
  function holdClick(){swallowClick=true;}
  function finishPresentation(){
    needleOpen=false;
    const job=current;
    if(!job){
      fx?.settle();
      return false;
    }
    current=null;
    job.settled=true;
    job.cancelMotion?.();
    fx?.settle();
    job.applyFinal?.();
    return true;
  }
  function abandon(){
    needleOpen=false;
    const job=current;
    fx?.settle();
    if(!job)return false;
    current=null;
    job.settled=true;
    job.cancelMotion?.();
    return true;
  }
  function begin({cancelMotion,applyFinal,trackNeedle=false}){
    needleOpen=!!trackNeedle;
    const job={settled:false,cancelMotion,applyFinal};
    current=job;
    return {
      complete(){
        if(job.settled)return false;
        job.settled=true;
        needleOpen=false;
        if(current===job)current=null;
        applyFinal?.();
        return true;
      }
    };
  }
  function acceptPointerDown(){
    if(!isPresenting()){
      swallowClick=false;
      return 'play';
    }
    finishPresentation();
    swallowClick=true;
    return 'skip';
  }
  function acceptClick(){
    if(swallowClick){
      swallowClick=false;
      return 'skip';
    }
    if(isPresenting()){
      finishPresentation();
      return 'skip';
    }
    return 'action';
  }
  return {
    isPresenting,isNeedleOpen,markNeedleSettled,holdClick,
    finishPresentation,abandon,begin,acceptPointerDown,acceptClick
  };
}

export function commitOnboardingAction(round,action){
  const next=stepOnboarding(round,action);
  if(next===round)return null;
  return {next,action,change:actionPresentation(round,next,action)};
}

export function motionKind(action,change){
  if(action?.type==='bank')return 'bank';
  if(change?.snap)return 'snap';
  if((change?.rewards||[]).some(reward=>reward.kind==='swing'))return 'swing';
  return 'card';
}

export function runPresentedAction(round,action,presentation,hooks){
  if(presentation.isPresenting())return {status:'locked'};
  const committed=commitOnboardingAction(round,action);
  if(!committed)return {status:'rejected'};
  hooks.onCommit(committed);
  let cancelMotion=()=>{};
  const session=presentation.begin({
    cancelMotion:()=>cancelMotion(),
    applyFinal:()=>hooks.onSettle(committed),
    trackNeedle:action.type==='steer'||action.type==='flip'
  });
  const started=hooks.startMotion(committed,()=>session.complete());
  cancelMotion=typeof started==='function'?started:()=>{};
  return {status:presentation.isPresenting()?'presenting':'settled',committed};
}
