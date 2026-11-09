export function browserStorage(){
  try{return window.localStorage;}catch{return null;}
}

export function prefersReducedMotion(){
  return typeof window!=='undefined'&&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function dispatchCasualEvent(name, details={}){
  if(typeof window==='undefined')return;
  window.dispatchEvent(new CustomEvent('swing-casual-event', {detail:{name, ...details}}));
}
