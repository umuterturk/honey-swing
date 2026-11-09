import {createElement, useEffect, useLayoutEffect, useRef} from 'react';
import {playFeatureIntroEnter} from '../featureIntroMotion.js';
import {useBoardCover} from './coverBoard.js';

export function dismissedIntro(screen, outcome){
  if(!outcome?.dismissed)return screen;
  return {
    ...screen,
    introGate:outcome.gate,
    introCard:outcome.intro,
    startOpen:outcome.handoff==='level-start'?true:screen.startOpen
  };
}

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

function HandIcon(){
  const cards=[
    {x:5,y:24,h:26,fill:'#B8D9FF',stroke:'#0A2A5E'},
    {x:14,y:18,h:32,fill:'#8DBDF7',stroke:'#0A2A5E'},
    {x:23,y:21,h:29,fill:'#2563C4',stroke:'#0A2A5E'},
    {x:42,y:21,h:29,fill:'#FFC2C2',stroke:'#5C0A14'},
    {x:51,y:16,h:34,fill:'#F57272',stroke:'#5C0A14'},
    {x:60,y:24,h:26,fill:'#CC2E2E',stroke:'#5C0A14'}
  ];
  return createElement('svg',{
    className:'sgv-feature-intro-icon sgv-feature-intro-hand-icon',
    viewBox:'0 0 72 72',width:'72',height:'72',
    'aria-hidden':'true',focusable:'false'
  }, cards.map(card=>createElement('rect',{
    key:card.x,x:card.x,y:card.y,width:8,height:card.h,rx:'2',
    fill:card.fill,stroke:card.stroke,'strokeWidth':'1.4'
  })));
}

const HAND_FACES=Object.freeze([
  Object.freeze({side:'left',shade:'2'}),
  Object.freeze({side:'left',shade:'4'}),
  Object.freeze({side:'left',shade:'5'}),
  Object.freeze({side:'right',shade:'2'}),
  Object.freeze({side:'right',shade:'4'}),
  Object.freeze({side:'right',shade:'6'})
]);

function HandDemo({intro,reduced}){
  if(reduced){
    return createElement('div',{className:'sgv-feature-intro-demo','aria-hidden':'true'},
      intro.demoScript.frames.map(frame=>createElement('span',{
        key:frame.id,className:'sgv-feature-intro-frame','data-frame':frame.id
      })));
  }
  return createElement('div',{
    className:'sgv-feature-intro-demo sgv-feature-intro-hand-demo','aria-hidden':'true'
  },
    createElement('span',{className:'sgv-feature-intro-hand'},
      HAND_FACES.map(face=>createElement('span',{
        key:face.side+face.shade,
        className:'sgv-feature-intro-mini',
        'data-side':face.side,
        'data-shade':face.shade
      }))
    ),
    createElement('span',{className:'sgv-feature-intro-flip-mark'},'FLIP')
  );
}

function introIcon(intro){
  if(intro.icon==='bank-jar')return createElement(BankJarIcon);
  if(intro.icon==='hand')return createElement(HandIcon);
  return null;
}

function introDemo(intro,reduced){
  if(intro.id==='hand')return createElement(HandDemo,{intro,reduced});
  return createElement(BankDemo,{intro,reduced});
}

// One NEW! card. PLAY and the scrim both dismiss; the board underneath does not.
export function FeatureIntroOverlay({
  intro,reduced=false,bus=null,onDismiss,levelId=0,introStartRef=null,levelReadyRef=null,rootRef=null
}){
  useBoardCover(rootRef);
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
    introIcon(intro),
    createElement('h2',{id:'sgv-feature-intro-title',className:'sgv-feature-intro-name'},intro.name),
    introDemo(intro,reduced),
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

export function renderFeatureIntro({
  screen, reduced, fx, onDismissIntro, introStartRef, levelReadyRef, rootRef
}){
  if(!screen.introGate||!screen.introCard)return null;
  return createElement(FeatureIntroOverlay,{
    key:'feature-intro',
    intro:screen.introCard,
    reduced,
    bus:fx,
    onDismiss:onDismissIntro,
    levelId:screen.round.levelId,
    introStartRef,
    levelReadyRef,
    rootRef
  });
}
