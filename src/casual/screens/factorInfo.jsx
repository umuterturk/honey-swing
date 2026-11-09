import {createElement, useEffect, useRef} from 'react';
import {factorInfoFor} from '../factorInfoContent.js';
import {FACTOR_COVER, useBoardCover} from './coverBoard.js';

export const openedFactor=(screen, kind)=>({...screen, factorInfo:kind});
export const closedFactor=screen=>({...screen, factorInfo:null});

// Short how-it-works card for Swing / Flip pills. Reuses feature-intro skin;
// omits the new badge and demo strip.
export function FactorInfoOverlay({info,onDismiss,rootRef=null}){
  useBoardCover(rootRef, FACTOR_COVER);
  const gotItRef=useRef(null);
  useEffect(()=>{gotItRef.current?.focus?.();},[info?.kind]);
  useEffect(()=>{
    if(!info)return;
    const onKey=event=>{
      if(event.key==='Escape'){
        event.preventDefault();
        onDismiss?.('escape');
      }
    };
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[info,onDismiss]);
  if(!info)return null;
  return createElement('div',{
    className:'sgv-feature-intro sgv-factor-info',
    role:'dialog','aria-modal':'true','aria-labelledby':'sgv-factor-info-title',
    'data-factor-info':info.kind,
    onClick(event){
      if(event.target?.closest?.('.sgv-feature-intro-play'))return;
      onDismiss?.('scrim');
    }
  },
  createElement('div',{className:'sgv-feature-intro-scrim','aria-hidden':'true'}),
  createElement('div',{className:'sgv-feature-intro-card'},
    createElement('img',{
      className:'sgv-feature-intro-icon',src:info.iconSrc,alt:'',
      'aria-hidden':'true',draggable:'false'
    }),
    createElement('h2',{id:'sgv-factor-info-title',className:'sgv-feature-intro-name'},info.title),
    createElement('p',{className:'sgv-feature-intro-copy'},info.copy),
    createElement('button',{
      ref:gotItRef,type:'button',className:'sgv-feature-intro-play',
      onClick(event){
        event.stopPropagation();
        onDismiss?.('got-it');
      }
    },info.buttonLabel)
  ));
}

export function renderFactorInfo({screen, onDismissFactor, rootRef}){
  const info=screen.factorInfo&&factorInfoFor(screen.factorInfo);
  if(!info)return null;
  return createElement(FactorInfoOverlay,{
    key:'factor-info',
    info,
    onDismiss:onDismissFactor,
    rootRef
  });
}
