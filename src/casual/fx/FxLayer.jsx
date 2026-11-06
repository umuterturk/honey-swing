import {createElement,useEffect,useRef} from 'react';

// One pointer-events:none overlay. It never sits inside a card or button target.
// createElement keeps this file importable from the node test runner.
export function FxLayer({bus}){
  const rootRef=useRef(null);
  useEffect(()=>{
    const node=rootRef.current;
    bus?.attach(node);
    return ()=>{
      bus?.settle();
      bus?.attach(null);
    };
  },[bus]);
  return createElement('div',{
    ref:rootRef,className:'sgv-fx-layer','aria-hidden':'true'
  },createElement('canvas',{className:'sgv-fx-canvas','aria-hidden':'true'}));
}
