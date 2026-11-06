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
  onPrimary,onBackdrop,onReset
}){
  return createElement('div',{
    className:'sgv-end-overlay sgv-level-end'+(settled?' sgv-success-settled':''),
    role:'dialog','aria-modal':'true','aria-labelledby':'sgv-end-title',
    onPointerDown:event=>{
      if(event.target!==event.currentTarget)return;
      onBackdrop?.();
    }
  },
  createElement('div',{className:'sgv-end-card'},
    victory?createElement('div',{className:'sgv-success-star','aria-hidden':'true'},'★'):null,
    orchard?createElement('span',{className:'sgv-orchard-hook','aria-hidden':'true'}):null,
    createElement('div',{className:'sgv-end-symbol'},victory?'★':'♡'),
    createElement('h1',{id:'sgv-end-title'},victory?'Level complete!':'Try again!'),
    createElement('p',null,'Drops secured: '+score+' / '+target),
    createElement('button',{type:'button',onClick:onPrimary},label),
    onReset?createElement('button',{
      type:'button',className:'sgv-end-reset',onClick:onReset
    },'RESET PROGRESS'):null
  ));
}
