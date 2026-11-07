import {useLayoutEffect} from 'react';
import {applyHoneyLayout} from './honeyWin.js';

// Keep win-screen sizing and input blocking together, outside game state logic.
export function useHoneyLayout(rootRef,finished,victory){
  useLayoutEffect(()=>{
    const phone=rootRef.current;
    if(!phone)return;
    const apply=()=>{
      const box=phone.getBoundingClientRect?.();
      const height=box?.height||phone.clientHeight||0;
      const width=box?.width||phone.clientWidth||0;
      if(!(height>0)||!(width>0))return;
      const style=getComputedStyle(phone);
      // padding* already resolves env(safe-area-inset-*); reading --safe-* returns
      // the unevaluated env() string, so parseFloat was always 0 on real phones.
      const top=parseFloat(style.paddingTop)||0;
      const right=parseFloat(style.paddingRight)||0;
      const bottom=parseFloat(style.paddingBottom)||0;
      const left=parseFloat(style.paddingLeft)||0;
      phone.classList.toggle('sgv-honey-short',height-top-bottom<520);
      applyHoneyLayout(phone.querySelector('.sgv-honey-win'),width,height,{top,right,bottom,left});
    };
    const nodes=[...phone.querySelectorAll(
      ':scope > .sgv-hud, :scope > .sgv-middle, :scope > .sgv-controls'
    )];
    for(const node of nodes){
      if(finished&&victory){
        node.setAttribute('aria-hidden','true');
        node.setAttribute('inert','');
      }else{
        node.removeAttribute('aria-hidden');
        node.removeAttribute('inert');
      }
    }
    apply();
    window.addEventListener('resize',apply);
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(apply):null;
    ro?.observe(phone);
    return ()=>{
      window.removeEventListener('resize',apply);
      ro?.disconnect();
    };
  },[finished,victory]);
}
