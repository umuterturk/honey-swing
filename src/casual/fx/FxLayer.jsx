import {createElement,useEffect,useRef} from 'react';
import {createParticleCanvas} from './particleCanvas.js';

function prefersReducedMotion(){
  return typeof window!=='undefined'&&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// One pointer-events:none overlay. It never sits inside a card or button target.
// createElement keeps this file importable from the node test runner.
export function FxLayer({bus}){
  const rootRef=useRef(null);
  useEffect(()=>{
    const node=rootRef.current;
    const canvas=node?.querySelector('canvas');
    bus?.attach(node);
    // Node tests load this file without Vite, so import.meta.env may be absent.
    if(import.meta.env?.MODE!=='production'&&node)node.__fxBus=bus||null;
    let view=null;
    let unsubscribe=()=>{};
    let observer=null;
    const onResize=()=>view?.resize();
    if(bus&&canvas){
      view=createParticleCanvas({
        canvas,pool:bus.pool,reduced:prefersReducedMotion,budget:bus.budget
      });
      view.resize();
      unsubscribe=bus.subscribe(()=>{
        if(prefersReducedMotion()||bus.liveParticles()<=0)view.stop();
        else view.kick();
      });
      if(typeof ResizeObserver==='function'&&node){
        observer=new ResizeObserver(onResize);
        observer.observe(node);
      }
      window.addEventListener('resize',onResize);
    }
    return ()=>{
      observer?.disconnect();
      window.removeEventListener('resize',onResize);
      unsubscribe();
      view?.stop();
      bus?.settle();
      bus?.attach(null);
      if(node&&node.__fxBus===bus)delete node.__fxBus;
    };
  },[bus]);
  return createElement('div',{
    ref:rootRef,className:'sgv-fx-layer','aria-hidden':'true'
  },createElement('canvas',{className:'sgv-fx-canvas','aria-hidden':'true'}));
}
