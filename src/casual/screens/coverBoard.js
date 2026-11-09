import {useEffect} from 'react';

// While one overlay is mounted, the board underneath is out of the
// accessibility tree. The overlay's own buttons stay reachable.
// useEffect, not useLayoutEffect: the phone ref is attached after the
// child's layout effects on the first mount.
const BOARD=':scope > .sgv-hud, :scope > .sgv-middle, :scope > .sgv-controls';
// Factor info leaves the meter tappable so the other pill can swap the popup.
export const FACTOR_COVER=':scope > .sgv-hud, :scope > .sgv-controls';

export function useBoardCover(rootRef, selector=BOARD){
  useEffect(()=>{
    const phone=rootRef?.current;
    if(!phone)return;
    const nodes=[...phone.querySelectorAll(selector)];
    for(const node of nodes){
      node.setAttribute('aria-hidden', 'true');
      node.setAttribute('inert', '');
    }
    return ()=>{
      for(const node of nodes){
        node.removeAttribute('aria-hidden');
        node.removeAttribute('inert');
      }
    };
  }, [rootRef, selector]);
}
