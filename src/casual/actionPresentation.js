import {stepOnboarding} from './onboardingLevels.js';
import {actionPresentation} from './presentation.js';

// One visual transaction. The engine action is committed before begin();
// finishPresentation only installs that result. abandon() is for unmount and
// level changes, which must not replay or settle the interrupted action.
export function createActionPresentation(){
  let current=null;
  let swallowClick=false;
  function isPresenting(){return current!=null;}
  function finishPresentation(){
    const job=current;
    if(!job)return false;
    current=null;
    job.settled=true;
    job.cancelMotion?.();
    job.applyFinal?.();
    return true;
  }
  function abandon(){
    const job=current;
    if(!job)return false;
    current=null;
    job.settled=true;
    job.cancelMotion?.();
    return true;
  }
  function begin({cancelMotion,applyFinal}){
    const job={settled:false,cancelMotion,applyFinal};
    current=job;
    return {
      complete(){
        if(job.settled)return false;
        job.settled=true;
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
  return {isPresenting,finishPresentation,abandon,begin,acceptPointerDown,acceptClick};
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
    applyFinal:()=>hooks.onSettle(committed)
  });
  const started=hooks.startMotion(committed,()=>session.complete());
  cancelMotion=typeof started==='function'?started:()=>{};
  return {status:presentation.isPresenting()?'presenting':'settled',committed};
}
