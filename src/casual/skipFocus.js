// Keyboard skip target. The full-screen control is focused while a presentation
// runs, then focus returns to a real control so it is neither lost nor trapped.
// useSkipFocus queries this list. An open screen's call to action is on it,
// and the board behind an overlay is skipped because that region is inert.
export const skipFocusSelector='.sgv-card, .sgv-bank-command, .sgv-flip, .sgv-end-card button, .sgv-feature-intro-play';

export function isSkipKey(key){
  return key==='Escape'||key==='Enter'||key===' ';
}
function usable(node){
  if(!node||node.disabled)return false;
  if(node.classList?.contains?.('sgv-skip-surface'))return false;
  if(node.isConnected===false)return false;
  if(node.closest?.('[inert]'))return false;
  return true;
}
export function rememberFocus(active,root){
  if(!usable(active)||!root?.contains?.(active))return null;
  return active;
}
export function focusTargetAfterSkip({active,previous,controls=[]}){
  if(usable(active))return active;
  if(usable(previous))return previous;
  return controls.find(usable)||null;
}
