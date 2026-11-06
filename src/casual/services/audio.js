// Stub. Does nothing when Web Audio is missing, and does not play in J0.
function audioAvailable(){
  if(typeof window==='undefined')return false;
  const Context=window.AudioContext||window.webkitAudioContext;
  return typeof Context==='function';
}

export function play(id){
  if(!id||!audioAvailable())return false;
  return false;
}
