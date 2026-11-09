import {pathToFileURL} from 'node:url';
import {ONBOARDING_COUNT} from '../src/casual/onboardingLevels.js';
import {simulateOnboardingLevel} from './solve-level.mjs';

export {simulateOnboardingLevel};

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  for(let levelId=1;levelId<=ONBOARDING_COUNT;levelId++){
    const result=simulateOnboardingLevel(levelId);
    console.log(JSON.stringify(result));
    if(!result.shortestWin||result.truncated){
      console.error('Unwinnable onboarding level '+levelId);
      process.exitCode=1;
    }
  }
}
