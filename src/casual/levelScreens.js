import {createElement} from 'react';
import {overflowMarks} from './honeyWin.js';

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

function resetButton(onReset){
  if(!onReset)return null;
  return createElement('button',{
    type:'button',className:'sgv-end-reset',onClick:onReset,
    onPointerDown:event=>event.stopPropagation()
  },'RESET PROGRESS');
}

function winReset(onReset){
  if(!onReset)return null;
  return createElement('button',{
    type:'button',className:'sgv-honey-reset','aria-label':'Reset progress',
    onPointerDown:event=>event.stopPropagation(),
    onClick:onReset
  },'↻');
}

function heroJar(marks){
  return createElement('div',{
    className:'sgv-chest-art sgv-honey-hero-art','aria-hidden':'true'
  },
  createElement('div',{className:'sgv-chest-platform'}),
  createElement('div',{className:'sgv-chest-body'},
    createElement('div',{className:'sgv-chest-inner'},
      createElement('div',{className:'sgv-fluid-fill'},
        createElement('span',{className:'sgv-fluid-surface'}),
        createElement('span',{className:'sgv-fluid-bubble sgv-fluid-bubble-a'}),
        createElement('span',{className:'sgv-fluid-bubble sgv-fluid-bubble-b'}),
        createElement('span',{className:'sgv-fluid-bubble sgv-fluid-bubble-c'})
      )
    ),
    createElement('span',{className:'sgv-honey-gleam-sweep','aria-hidden':'true'}),
    createElement('span',{className:'sgv-glass-highlight sgv-glass-highlight-left'}),
    createElement('span',{className:'sgv-glass-highlight sgv-glass-highlight-right'}),
    createElement('span',{className:'sgv-glass-spark sgv-honey-gleam sgv-glass-spark-a'}),
    createElement('span',{className:'sgv-glass-spark sgv-honey-gleam sgv-glass-spark-b'})
  ),
  createElement('div',{className:'sgv-chest-rim'}),
  createElement('span',{className:'sgv-chest-mouth sgv-honey-mouth'}),
  marks.length?createElement('div',{className:'sgv-honey-overflow','aria-hidden':'true'},
    marks.map(mark=>createElement('span',{
      key:mark.key,className:'sgv-honey-mark sgv-honey-'+mark.kind,
      style:{left:mark.x,width:mark.w+'px',height:mark.h+'px'}
    }))
  ):null
  );
}

function quietLoss({score,target,label,onPrimary,onBackdrop,onReset}){
  return createElement('div',{
    className:'sgv-end-overlay sgv-level-end',role:'dialog','aria-modal':'true',
    'aria-labelledby':'sgv-end-title',
    onPointerDown:event=>{
      if(event.target?.closest?.('button'))return;
      onBackdrop?.();
    }
  },
  createElement('div',{className:'sgv-end-card'},
    createElement('div',{className:'sgv-end-symbol','aria-hidden':'true'},'♡'),
    createElement('h1',{id:'sgv-end-title'},'Try again!'),
    createElement('p',{className:'sgv-end-score'},'Drops secured: '+score+' / '+target),
    createElement('button',{type:'button',className:'sgv-end-cta',onClick:onPrimary},label),
    resetButton(onReset)
  ));
}

export function LevelEndScreen({
  victory=false,score=0,target=0,label='NEXT',settled=false,
  praise=null,reduced=false,onPrimary,onBackdrop,onReset
}){
  if(!victory)return quietLoss({score,target,label,onPrimary,onBackdrop,onReset});
  const tier=praise?.tier||0;
  const staticCard=!!(reduced||settled);
  const marks=overflowMarks(tier,score,target);
  const announcement=(praise?praise.text+' ':'')+score+' honey secured. Target '+target+'.';
  return createElement('div',{
    className:'sgv-end-overlay sgv-level-end sgv-honey-win'+
      (staticCard?' sgv-honey-final':'')+
      (settled?' sgv-success-settled':'')+(reduced?' sgv-win-static':''),
    role:'dialog','aria-modal':'true','aria-labelledby':'sgv-honey-status',
    onPointerDown:event=>{
      if(event.target?.closest?.('button'))return;
      onBackdrop?.();
    }
  },
  createElement('div',{className:'sgv-honey-scrim','aria-hidden':'true'}),
  createElement('div',{className:'sgv-end-card'},
    createElement('h1',{id:'sgv-end-title',className:'sgv-honey-title'},'Level complete!'),
    createElement('p',{id:'sgv-honey-status',className:'sgv-honey-status',role:'status'},announcement),
    praise?createElement('div',{className:'sgv-honey-praise-slot'},
      createElement('p',{
        className:'sgv-win-praise sgv-win-praise-'+praise.tier,'aria-hidden':'true'
      },praise.text)
    ):null,
    createElement('div',{className:'sgv-honey-stage'},
      heroJar(marks),
      createElement('div',{className:'sgv-honey-count-slot'},
        createElement('p',{className:'sgv-win-tally','aria-hidden':'true'},
          staticCard?String(score):'0')
      ),
      createElement('p',{className:'sgv-honey-subline','aria-hidden':'true'},score+' / '+target)
    ),
    createElement('button',{type:'button',className:'sgv-end-cta',onClick:onPrimary},label),
    winReset(onReset)
  ));
}
