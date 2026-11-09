import {createElement, useEffect, useLayoutEffect, useRef} from 'react';
import {applyHoneyLayout} from '../honeyWin.js';
import {successPlan} from '../presentationSequence.js';
import {publicUrl} from '../publicUrl.js';
import {VictoryJarArt} from '../VictoryJarArt.js';
import {playWinCelebration} from '../winMotion.js';
import {useBoardCover} from './coverBoard.js';

export function dismissEnd(kind, via){
  if(kind==='win'&&(via==='cta'||via==='skip'))
    return {dismiss:true,advance:true,replay:false,lock:false};
  if(kind==='win'&&via==='backdrop')
    return {dismiss:false,advance:false,replay:false,lock:false,settle:true};
  if(kind==='lose'&&(via==='cta'||via==='skip'||via==='backdrop'||via==='tap'))
    return {dismiss:true,advance:false,replay:true,lock:false};
  return {dismiss:false,advance:false,replay:false,lock:false};
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
  },
  createElement('span',{'aria-hidden':'true'},'↺'),
  ' Reset'
  );
}

function praiseMark(text,tier){
  return createElement('div',{className:'sgv-honey-praise-slot'},
    createElement('svg',{
      className:'sgv-win-praise sgv-win-praise-'+tier,
      viewBox:'0 0 360 92','aria-hidden':'true',
      preserveAspectRatio:'xMidYMid meet'
    },
    createElement('defs',null,
      createElement('path',{id:'sgv-praise-arc',d:'M22 72 Q180 10 338 72',fill:'none'}),
      createElement('linearGradient',{id:'sgv-praise-fill',x1:'0',y1:'0',x2:'0',y2:'1'},
        createElement('stop',{offset:'0%',stopColor:'#fff8dc'}),
        createElement('stop',{offset:'55%',stopColor:'#ffe08a'}),
        createElement('stop',{offset:'100%',stopColor:'#ffc83d'})
      )
    ),
    createElement('text',{className:'sgv-win-praise-word'},
      createElement('textPath',{href:'#sgv-praise-arc',startOffset:'51%',textAnchor:'middle'},text)
    )
    ),
    createElement('img',{
      className:'sgv-honey-slogan-underline',
      src:publicUrl('victory-slogan-underline.png'),alt:'',draggable:'false','aria-hidden':'true'
    }),
    // Mirror lives on the right wrapper only — GSAP animates the inner art, never the flip.
    createElement('span',{
      className:'sgv-honey-slogan-drops sgv-honey-slogan-drops-left','aria-hidden':'true'
    },
      createElement('img',{
        className:'sgv-honey-slogan-drops-art',
        src:publicUrl('victory-slogan-side-drops-left.png'),alt:'',draggable:'false'
      })
    ),
    createElement('span',{
      className:'sgv-honey-slogan-drops sgv-honey-slogan-drops-right','aria-hidden':'true'
    },
      createElement('img',{
        className:'sgv-honey-slogan-drops-art',
        src:publicUrl('victory-slogan-side-drops-left.png'),alt:'',draggable:'false'
      })
    )
  );
}

function celeImg(name,file){
  return createElement('img',{
    className:'sgv-cele '+name,src:publicUrl('celebration/'+file),alt:'',draggable:'false'
  });
}

function rearFoliage(){
  return [
    celeImg('sgv-cele-bush-long','bush-long-1.png'),
    celeImg('sgv-cele-leaf-biggest','leaf-biggest.png'),
    celeImg('sgv-cele-leaf-medium','leaf-medium.png')
  ];
}

function frontFoliage(){
  return [
    celeImg('sgv-cele-bush-big','bush-big.png'),
    celeImg('sgv-cele-plant','green-plant-1.png'),
    celeImg('sgv-cele-leaf-big','leaf-big.png'),
    celeImg('sgv-cele-daisy-1','daisy-1.png'),
    celeImg('sgv-cele-daisy-2','daisy-2.png'),
    celeImg('sgv-cele-daisy-small','daisy-small.png')
  ];
}

function heroJar(){
  return createElement(VictoryJarArt,{
    fillPercent:0,
    className:'sgv-honey-hero-art',
    showIdleStars:true,
    mouthClassName:'sgv-chest-mouth sgv-honey-mouth'
  });
}

function scoreboard(score,target,staticCard){
  const met=Number(score)>=Number(target);
  return createElement('div',{className:'sgv-honey-scoreboard','aria-hidden':'true'},
    createElement('img',{
      className:'sgv-honey-scoreboard-art',src:publicUrl('score-board.png'),alt:'',draggable:'false'
    }),
    createElement('p',{className:'sgv-honey-scoreboard-label'},'Honey Collected'),
    createElement('p',{className:'sgv-win-tally'},staticCard?String(score):'0'),
    createElement('p',{
      className:'sgv-honey-scoreboard-target'+(met&&staticCard?' is-met':'')
    },
      createElement('span',{className:'sgv-honey-target-check','aria-hidden':'true'},'✓'),
      'Target: '+target
    )
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
  praise=null,reduced=false,onPrimary,onBackdrop,onReset,rootRef=null
}){
  useBoardCover(rootRef);
  if(!victory)return quietLoss({score,target,label,onPrimary,onBackdrop,onReset});
  const staticCard=!!(reduced||settled);
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
  createElement('div',{className:'sgv-honey-warm-light','aria-hidden':'true'}),
  createElement('div',{className:'sgv-honey-foliage-rear','aria-hidden':'true'},...rearFoliage()),
  createElement('div',{className:'sgv-end-card'},
    createElement('h1',{id:'sgv-end-title',className:'sgv-honey-title'},'Level complete!'),
    createElement('p',{id:'sgv-honey-status',className:'sgv-honey-status',role:'status'},announcement),
    praise?praiseMark(praise.text,praise.tier):null,
    createElement('div',{className:'sgv-honey-stage'},
      heroJar(),
      scoreboard(score,target,staticCard)
    ),
    createElement('div',{className:'sgv-honey-foliage-front','aria-hidden':'true'},...frontFoliage()),
    createElement('div',{className:'sgv-honey-cta-wrap'},
      createElement('button',{type:'button',className:'sgv-end-cta',onClick:onPrimary},label),
      createElement('div',{className:'sgv-honey-cta-stars','aria-hidden':'true'},
        createElement('span',{className:'sgv-honey-cta-star sgv-honey-cta-star-a'},'✦'),
        createElement('span',{className:'sgv-honey-cta-star sgv-honey-cta-star-b'},'✦'),
        createElement('span',{className:'sgv-honey-cta-star sgv-honey-cta-star-c'},'✦'),
        createElement('span',{className:'sgv-honey-cta-star sgv-honey-cta-star-d'},'✦'),
        createElement('span',{className:'sgv-honey-cta-star sgv-honey-cta-star-e'},'✦'),
        createElement('span',{className:'sgv-honey-cta-star sgv-honey-cta-star-f'},'✦')
      )
    ),
    winReset(onReset)
  ));
}

export function renderLevelEnd({
  screen, readout, ending, onEndPrimary, onEndBackdrop, onReset, rootRef
}){
  if(!readout.finished)return null;
  return createElement(LevelEndScreen,{
    key:'level-end',
    victory:readout.victory,
    score:readout.deal.T,
    target:readout.level.target,
    label:readout.victory?readout.winLabel:'TRY AGAIN',
    orchard:!!ending.orchard,
    settled:screen.successSettled,
    praise:ending.praise,
    reduced:readout.victory&&!ending.motion,
    onPrimary:onEndPrimary,
    onBackdrop:onEndBackdrop,
    onReset,
    rootRef
  });
}

export function useWinCelebration({
  rootRef, fxRef, active, levelId, secured, target, reduced, onSuccessSettled
}){
  const winMotionRef=useRef(null);
  function stopWin({notify=true}={}){
    const handle=winMotionRef.current;
    winMotionRef.current=null;
    try{handle?.cancel();}catch{/* a half-played celebration still shows its end */}
    try{fxRef.current.settle();}catch{/* settle must not block the tap */}
    try{handle?.showFinal?.();}catch{/* the inline end state is enough */}
    if(notify)onSuccessSettled();
  }
  useEffect(()=>{
    if(!active)return;
    const root=rootRef.current;
    if(!root)return;
    const plan=successPlan({victory:true, levelId, secured, reduced});
    let alive=true;
    const handle=playWinCelebration({
      victory:true, secured, target, tier:plan.tier||0,
      praise:root.querySelector('.sgv-win-praise'),
      tally:root.querySelector('.sgv-win-tally'),
      scoreboard:root.querySelector('.sgv-honey-scoreboard'),
      underline:root.querySelector('.sgv-honey-slogan-underline'),
      drops:[...root.querySelectorAll('.sgv-honey-slogan-drops-art')],
      targetRow:root.querySelector('.sgv-honey-scoreboard-target'),
      liquid:root.querySelector('.sgv-honey-hero-art .sgv-fluid-fill'),
      scrim:root.querySelector('.sgv-honey-scrim'),
      mouth:root.querySelector('.sgv-honey-mouth'),
      source:root.querySelector('.sgv-gold-counter'),
      pot:root.querySelector('.sgv-pending-pot'),
      layer:root.querySelector('.sgv-fx-layer'),
      cta:root.querySelector('.sgv-end-cta'),
      card:root.querySelector('.sgv-honey-win'),
      reduced, bus:fxRef.current,
      onSettled(){if(alive)onSuccessSettled();}
    });
    winMotionRef.current=handle;
    return ()=>{
      alive=false;
      if(winMotionRef.current===handle)winMotionRef.current=null;
      handle.cancel();
    };
    // onSuccessSettled goes through the shell ref. Depending on it restarts the win every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, levelId, secured]);
  return {stopWin};
}

export function useHoneyLayout(rootRef, {active}){
  useLayoutEffect(()=>{
    const phone=rootRef.current;
    if(!phone)return;
    const apply=()=>{
      const box=phone.getBoundingClientRect?.();
      const height=box?.height||phone.clientHeight||0;
      const width=box?.width||phone.clientWidth||0;
      if(!(height>0)||!(width>0))return;
      const style=getComputedStyle(phone);
      const top=parseFloat(style.paddingTop)||0;
      const right=parseFloat(style.paddingRight)||0;
      const bottom=parseFloat(style.paddingBottom)||0;
      const left=parseFloat(style.paddingLeft)||0;
      const short=height-top-bottom;
      phone.classList.toggle('sgv-honey-short', short>=520?false:true);
      applyHoneyLayout(phone.querySelector('.sgv-honey-win'), width, height, {top, right, bottom, left});
    };
    apply();
    window.addEventListener('resize', apply);
    const ro=typeof ResizeObserver==='function'?new ResizeObserver(apply):null;
    ro?.observe(phone);
    return ()=>{
      window.removeEventListener('resize', apply);
      ro?.disconnect();
    };
  }, [rootRef, active]);
}
