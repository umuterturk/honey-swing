import {dismissEnd} from './screens/levelEnd.jsx';
import {dismissStart} from './screens/levelStart.jsx';

export {LevelEndScreen, dismissEnd} from './screens/levelEnd.jsx';
export {LevelStartScreen, closedStart, dismissStart} from './screens/levelStart.jsx';

// Screens are visual. They never take the presentation lock, so a card, Bank,
// or Snap skip from the first frame still settles in that same tap.
export function dismissLevelScreen(kind,via){
  if(kind==='start')return dismissStart(via);
  if(kind==='win'||kind==='lose')return dismissEnd(kind,via);
  return {dismiss:false,advance:false,replay:false,lock:false};
}
