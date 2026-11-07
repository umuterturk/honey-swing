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

// Pop at the 0.800s gleam. Stagger ≤120ms. Path: up+out → fall. No skew.
const CONFETTI=[
  {dx:-168,lift:64,fall:140,rot:-28,bg:'#ff4d7d',delay:'.8s',flip:1},
  {dx:158,lift:58,fall:132,rot:24,bg:'#ffd24a',delay:'.81s',flip:-1},
  {dx:-128,lift:72,fall:148,rot:12,bg:'#6ec8ff',delay:'.82s',flip:1},
  {dx:136,lift:68,fall:144,rot:-18,bg:'#c9a0ff',delay:'.83s',flip:-1},
  {dx:-188,lift:52,fall:156,rot:36,bg:'#ffa24a',delay:'.84s',flip:1},
  {dx:180,lift:54,fall:152,rot:-16,bg:'#ff7ab8',delay:'.85s',flip:-1},
  {dx:-96,lift:70,fall:136,rot:-44,bg:'#fff0a8',delay:'.86s',flip:1},
  {dx:108,lift:60,fall:160,rot:20,bg:'#5ee0a8',delay:'.87s',flip:-1},
  {dx:-148,lift:56,fall:142,rot:8,bg:'#ff8ad4',delay:'.88s',flip:1},
  {dx:152,lift:62,fall:138,rot:-32,bg:'#ffc83d',delay:'.89s',flip:-1},
  {dx:-120,lift:48,fall:150,rot:28,bg:'#8ad4ff',delay:'.9s',flip:1},
  {dx:124,lift:50,fall:146,rot:-22,bg:'#e0a0ff',delay:'.91s',flip:-1},
  {dx:-176,lift:66,fall:134,rot:10,bg:'#ffb347',delay:'.92s',flip:1},
  {dx:172,lift:64,fall:128,rot:-14,bg:'#ffe08a',delay:'.88s',flip:-1}
];

function confettiBits(){
  return CONFETTI.map((piece,i)=>createElement('span',{
    key:'c'+i,
    className:'sgv-confetti sgv-confetti-ribbon sgv-confetti-'+i,
    style:{
      '--sgv-c-dx':piece.dx+'px',
      '--sgv-c-lift':piece.lift+'px',
      '--sgv-c-fall':piece.fall+'px',
      '--sgv-c-rot':piece.rot+'deg',
      '--sgv-c-flip':String(piece.flip),
      background:piece.bg,
      animationDelay:piece.delay
    }
  }));
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

function heroJar(marks){
  return createElement('div',{
    className:'sgv-chest-art sgv-honey-hero-art','aria-hidden':'true'
  },
  createElement('img',{
    className:'sgv-jar-layer sgv-jar-back',
    src:'/empty-complete-jar.png',alt:'',draggable:'false'
  }),
  createElement('div',{className:'sgv-jar-mask sgv-jar-honey-layer'},
    createElement('div',{className:'sgv-fluid-fill'},
      createElement('span',{className:'sgv-fluid-surface'}),
      createElement('span',{className:'sgv-fluid-bubble sgv-fluid-bubble-a'}),
      createElement('span',{className:'sgv-fluid-bubble sgv-fluid-bubble-b'}),
      createElement('span',{className:'sgv-fluid-bubble sgv-fluid-bubble-c'})
    )
  ),
  createElement('div',{className:'sgv-jar-mask sgv-jar-lights','aria-hidden':'true'},
    createElement('span',{className:'sgv-honey-internal-light'}),
    createElement('span',{className:'sgv-honey-reflection'}),
    createElement('span',{className:'sgv-honey-gleam-sweep'})
  ),
  createElement('img',{
    className:'sgv-jar-layer sgv-jar-front',
    src:'/empty-front-jar.png',alt:'',draggable:'false'
  }),
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
  createElement('div',{className:'sgv-honey-warm-light','aria-hidden':'true'}),
  createElement('div',{className:'sgv-honey-foliage-rear','aria-hidden':'true'},...rearFoliage()),
  createElement('div',{className:'sgv-end-card'},
    createElement('h1',{id:'sgv-end-title',className:'sgv-honey-title'},'Level complete!'),
    createElement('p',{id:'sgv-honey-status',className:'sgv-honey-status',role:'status'},announcement),
    praise?praiseMark(praise.text,praise.tier):null,
    createElement('div',{className:'sgv-honey-stage'},
      heroJar(marks),
      createElement('div',{className:'sgv-honey-count-slot'},
        createElement('p',{className:'sgv-win-tally','aria-hidden':'true'},
          staticCard?String(score):'0')
      ),
      createElement('p',{className:'sgv-honey-subline','aria-hidden':'true'},score+' / '+target)
    ),
    createElement('div',{className:'sgv-honey-foliage-front','aria-hidden':'true'},...frontFoliage()),
    createElement('div',{className:'sgv-honey-confetti','aria-hidden':'true'},...confettiBits()),
    createElement('button',{type:'button',className:'sgv-end-cta',onClick:onPrimary},label),
    winReset(onReset)
  ));
}
