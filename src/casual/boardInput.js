import {introPointerDecision} from './featureIntroRegistry.js';
import {dismissLevelScreen} from './levelScreens.js';
import {startTap} from './presentationSequence.js';
import {isSkipKey} from './skipFocus.js';

export function boardPointerDecision({gate, inIntro, presenting, startOpen, arriving, docking}){
  const intro=introPointerDecision({gate, inIntro});
  if(intro.handled)return {prevent:!intro.dismiss, stop:!intro.dismiss, steps:[]};
  if(startOpen&&!presenting){
    const opening=dismissLevelScreen('start', 'tap');
    if(opening.dismiss&&!opening.lock){
      const steps=['stopArrival', 'closeStart'];
      if(docking)steps.push('clearDock');
      return {prevent:true, stop:true, steps};
    }
  }
  const tap=startTap({action:presenting, arrival:arriving});
  if(tap.consume)return {prevent:true, stop:true, steps:['skipPresentation']};
  const steps=[];
  if(tap.finishArrival)steps.push('stopArrival');
  if(docking)steps.push('clearDock');
  steps.push('consultPointer');
  return {prevent:false, stop:false, steps};
}

export function boardClickDecision({gate, inIntro}){
  const intro=introPointerDecision({gate, inIntro});
  if(intro.handled)return {prevent:!intro.dismiss, stop:!intro.dismiss, consultClick:false};
  return {prevent:false, stop:false, consultClick:true};
}

function keyResult(overrides){
  return {
    handled:false, prevent:false, stop:false, dismissIntro:false,
    skipPresentation:false, stopWin:false, endVia:null,
    stopArrival:false, closeStart:false, ...overrides
  };
}

export function boardKeyDecision({key, gate, presenting, finished, victory, startOpen, onButton}){
  if(!isSkipKey(key))return keyResult();
  if(gate)return keyResult({handled:true, prevent:true, stop:true, dismissIntro:true});
  if(presenting)return keyResult({handled:true, prevent:true, stop:true, skipPresentation:true});
  if(finished){
    if(onButton)return keyResult();
    return keyResult({handled:true, prevent:true, stop:true, stopWin:!!victory, endVia:'backdrop'});
  }
  if(!startOpen)return keyResult();
  const opening=dismissLevelScreen('start', 'skip');
  if(opening.dismiss&&!opening.lock){
    return keyResult({handled:true, prevent:true, stop:true, stopArrival:true, closeStart:true});
  }
  return keyResult();
}
