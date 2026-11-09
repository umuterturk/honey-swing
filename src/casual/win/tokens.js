// Presentation geometry for the honey-jar win. Nothing here writes a score.
// Fill-first 2.0s celebration: jar fill is the hero; score counts after Hiveful.
export const HONEY_MOTION=Object.freeze({
  cap:2,
  settled:1.75,
  scrim:Object.freeze({start:0,end:0.15,opacity:1}),
  foliage:Object.freeze({start:0,end:0.25,fromY:12}),
  jarEntrance:Object.freeze({
    start:0.15,end:0.35,fromScale:0.92,peakScale:1.03,toScale:1
  }),
  fill:Object.freeze({start:0.35,end:1.05,ease:'power2.out'}),
  praise:Object.freeze({
    start:1,peakEnd:1.14,end:1.22,underlineAt:1.08,opacityEnd:1.1,
    fromScale:0.55,peakScale:1.14,toScale:1
  }),
  scoreboard:Object.freeze({
    start:1.1,end:1.75,fromScale:0.86,toScale:1,fromY:48
  }),
  flight:Object.freeze({
    emitStart:0.1,emitEnd:0.16,life:0.32,
    fadeIn:0.04,hold:0.2,fadeOut:0.08,lift:48
  }),
  count:Object.freeze({start:1.3,duration:0.45,end:1.75,ease:'power2.out'}),
  burst:Object.freeze({start:1.05,life:0.4}),
  subline:Object.freeze({start:1.25,end:1.25,opacity:0}),
  cta:Object.freeze({start:1.75,end:2,from:0,to:1,leg:0.2})
});

// Overlay aliases. Component CSS mirrors these custom properties.
export const HONEY_TOKENS=Object.freeze({
  scrim:'#1a0f12',
  scrimOpacity:1,
  backing:'transparent',
  backingOpacity:0,
  praise:Object.freeze({
    1:Object.freeze({fill:'#fff0cf',outline:'#704b69'}),
    2:Object.freeze({fill:'#f0c14a',outline:'#5a3a12'}),
    3:Object.freeze({fill:'#ffe08a',outline:'#5a3a12',glow:'0 0 18px #f0c14a88'})
  }),
  honeyBody:'#e8a317',
  honeyDepth:'#c47a0a',
  honeySurface:'#ffe08a',
  count:'#f0c14a',
  countOutline:'#3b2410',
  subline:'#fff0cf',
  flight:'#f0c14a',
  flightEdge:'#c47a0a',
  burst:Object.freeze(['#ff4d7d','#ffd24a','#6ec8ff','#c9a0ff','#ffa24a','#5ee0a8']),
  glassRim:'#acd7f7',
  easeOut:'cubic-bezier(.2,.8,.2,1)',
  easeBack:'cubic-bezier(.34,1.56,.64,1)'
});
