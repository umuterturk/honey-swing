// Stub. Does nothing when vibrate is missing, and does not pulse in J0.
function hapticsAvailable(){
  return typeof navigator!=='undefined'&&typeof navigator.vibrate==='function';
}

export function pulse(kind){
  if(!kind||!hapticsAvailable())return false;
  return false;
}
