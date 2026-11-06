import {createElement} from 'react';

// Screens are visual. They never take the presentation lock, so a card, Bank,
// or Snap skip from the first frame still settles in that same tap.
export function dismissLevelScreen(kind,via){
  if(kind==='start'&&(via==='tap'||via==='skip'||via==='cta'))
    return {dismiss:true,advance:false,replay:false,lock:false};
  if(kind==='win'&&(via==='cta'||via==='skip'))
    return {dismiss:true,advance:true,replay:false,lock:false};
  if(kind==='win'&&via==='backdrop')
    return {dismiss:false,advance:false,replay:false,lock:false,settle:true};
  if(kind==='lose'&&(via==='cta'||via==='skip'||via==='backdrop'||via==='tap'))
    return {dismiss:true,advance:false,replay:true,lock:false};
  return {dismiss:false,advance:false,replay:false,lock:false};
}

export function LevelStartScreen({levelId,target,onDismiss}){
  return createElement('div',{
    className:'sgv-level-screen sgv-level-start',role:'dialog',
    'aria-labelledby':'sgv-level-start-title'
  },
  createElement('div',{className:'sgv-end-card'},
    createElement('h1',{id:'sgv-level-start-title'},'Level '+levelId),
    createElement('div',{className:'sgv-intro-target','aria-live':'polite'},
      createElement('div',{className:'sgv-intro-coin','aria-hidden':'true'},'●'),
      createElement('div',{className:'sgv-intro-message'},
        createElement('span',null,'COLLECT'),
        createElement('strong',null,target),
        createElement('span',null,'DROPS!')
      )
    ),
    createElement('button',{
      type:'button',className:'sgv-level-start-dismiss',onClick:onDismiss
    },'START')
  ));
}

export function LevelEndScreen({
  victory=false,score=0,target=0,label='NEXT',orchard=false,settled=false,
  praise=null,stars=0,reduced=false,onPrimary,onBackdrop,onReset
}){
  const earned=victory?Math.max(0,stars|0):0;
  const staticCard=!!(reduced||settled);
  return createElement('div',{
    className:'sgv-end-overlay sgv-level-end'+
      (settled?' sgv-success-settled':'')+(reduced?' sgv-win-static':''),
    role:'dialog','aria-modal':'true','aria-labelledby':'sgv-end-title',
    onPointerDown:event=>{
      if(event.target!==event.currentTarget)return;
      onBackdrop?.();
    }
  },
  createElement('div',{className:'sgv-end-card'},
    orchard?createElement('span',{className:'sgv-orchard-hook','aria-hidden':'true'}):null,
    victory&&praise?createElement('p',{
      className:'sgv-win-praise sgv-win-praise-'+praise.tier
    },praise.text):null,
    earned?createElement('div',{
      className:'sgv-win-stars',role:'img',
      'aria-label':earned+(earned===1?' star':' stars')
    },Array.from({length:earned},(_,index)=>createElement('span',{
      key:index,className:'sgv-win-star','data-star':String(index+1),'aria-hidden':'true'
    },'★'))):null,
    victory?createElement('p',{
      className:'sgv-win-tally','aria-label':'Score tally'
    },staticCard?String(score):null):null,
    createElement('div',{className:'sgv-end-symbol'},victory?'★':'♡'),
    createElement('h1',{id:'sgv-end-title'},victory?'Level complete!':'Try again!'),
    createElement('p',{className:'sgv-end-score'},'Drops secured: '+score+' / '+target),
    createElement('button',{type:'button',className:'sgv-end-cta',onClick:onPrimary},label),
    onReset?createElement('button',{
      type:'button',className:'sgv-end-reset',onClick:onReset
    },'RESET PROGRESS'):null
  ));
}
