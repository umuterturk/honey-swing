import {createElement,useEffect,useLayoutEffect,useRef} from 'react';
import {playFeatureIntroEnter} from './featureIntroMotion.js';

function BankJarIcon(){
  return createElement('svg',{
    className:'sgv-feature-intro-icon',viewBox:'0 0 72 72',width:'72',height:'72',
    'aria-hidden':'true',focusable:'false'
  },
  createElement('path',{
    d:'M22 16h28l-3 8H25z',fill:'#fff0cf',stroke:'#704b69','strokeWidth':'3','strokeLinejoin':'round'
  }),
  createElement('path',{
    d:'M24 24h24c1.2 12 2 20-2 28H26c-4-8-3.2-16-2-28z',
    fill:'#ffe7a8',stroke:'#704b69','strokeWidth':'3','strokeLinejoin':'round'
  }),
  createElement('path',{d:'M28 42h16c.4 6-.2 10-1.2 12H29.2c-1-2-1.6-6-1.2-12z',fill:'#f0c14a'}));
}

function BankDemo({intro,reduced}){
  if(reduced){
    return createElement('div',{className:'sgv-feature-intro-demo','aria-hidden':'true'},
      intro.demoScript.frames.map(frame=>createElement('span',{
        key:frame.id,className:'sgv-feature-intro-frame','data-frame':frame.id
      })));
  }
  return createElement('div',{className:'sgv-feature-intro-demo','aria-hidden':'true'},
    createElement('span',{className:'sgv-feature-intro-pot'}),
    createElement('span',{className:'sgv-feature-intro-chip'}),
    createElement('span',{className:'sgv-feature-intro-jar'}));
}

// One NEW! card. PLAY and the scrim both dismiss; the board underneath does not.
export function FeatureIntroOverlay({
  intro,reduced=false,bus=null,onDismiss,levelId=0,introStartRef=null,levelReadyRef=null
}){
  const scrimRef=useRef(null);
  const cardRef=useRef(null);
  const playRef=useRef(null);
  useLayoutEffect(()=>{
    let current=null;
    const start=()=>{
      current?.cancel();
      current=playFeatureIntroEnter({
        scrim:scrimRef.current,card:cardRef.current,reduced,bus
      });
    };
    if(introStartRef)introStartRef.current=start;
    // The level effect settles first, then calls start. A later mount on a
    // level that already settled starts here, with no settle left to kill it.
    if(levelReadyRef?.current===levelId)start();
    return ()=>{
      if(introStartRef?.current===start)introStartRef.current=null;
      current?.cancel();
      current=null;
    };
  },[intro,reduced,bus,levelId,introStartRef,levelReadyRef]);
  useEffect(()=>{playRef.current?.focus?.();},[intro]);
  if(!intro)return null;
  return createElement('div',{
    className:'sgv-feature-intro '+(reduced?'sgv-feature-intro-static':'sgv-feature-intro-motion'),
    role:'dialog','aria-modal':'true','aria-labelledby':'sgv-feature-intro-title',
    'data-feature':intro.id,
    onClick(event){
      if(event.target?.closest?.('.sgv-feature-intro-play'))return;
      onDismiss?.('scrim');
    }
  },
  createElement('div',{ref:scrimRef,className:'sgv-feature-intro-scrim','aria-hidden':'true'}),
  createElement('p',{className:'sgv-feature-intro-new'},'NEW!'),
  createElement('div',{ref:cardRef,className:'sgv-feature-intro-card'},
    intro.icon==='bank-jar'?createElement(BankJarIcon):null,
    createElement('h2',{id:'sgv-feature-intro-title',className:'sgv-feature-intro-name'},intro.name),
    createElement(BankDemo,{intro,reduced}),
    createElement('p',{className:'sgv-feature-intro-copy'},intro.copy),
    createElement('button',{
      ref:playRef,type:'button',className:'sgv-feature-intro-play',
      onClick(event){
        event.stopPropagation();
        onDismiss?.('play');
      }
    },'PLAY')
  ));
}
