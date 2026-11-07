import {createElement} from 'react';
import {VictoryJarArt} from './VictoryJarArt.js';

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
      src:'/victory-slogan-underline.png',alt:'',draggable:'false','aria-hidden':'true'
    }),
    // Mirror lives on the right wrapper only — GSAP animates the inner art, never the flip.
    createElement('span',{
      className:'sgv-honey-slogan-drops sgv-honey-slogan-drops-left','aria-hidden':'true'
    },
      createElement('img',{
        className:'sgv-honey-slogan-drops-art',
        src:'/victory-slogan-side-drops-left.png',alt:'',draggable:'false'
      })
    ),
    createElement('span',{
      className:'sgv-honey-slogan-drops sgv-honey-slogan-drops-right','aria-hidden':'true'
    },
      createElement('img',{
        className:'sgv-honey-slogan-drops-art',
        src:'/victory-slogan-side-drops-left.png',alt:'',draggable:'false'
      })
    )
  );
}

function celeImg(name,file){
  return createElement('img',{
    className:'sgv-cele '+name,src:'/celebration/'+file,alt:'',draggable:'false'
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
      className:'sgv-honey-scoreboard-art',src:'/score-board.png',alt:'',draggable:'false'
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
  praise=null,reduced=false,onPrimary,onBackdrop,onReset
}){
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
