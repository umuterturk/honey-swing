// B4 vocabularies. Particle counts are the tier caps. M4's shake stays off
// here: only a Snap event turns shake on.
export const MAGNITUDE=Object.freeze({
  M1:Object.freeze({labelPx:22,particles:6,flash:null,flashMs:0,shake:false}),
  M2:Object.freeze({labelPx:28,particles:12,flash:'cream',flashMs:40,shake:false}),
  M3:Object.freeze({labelPx:34,particles:20,flash:'cream',flashMs:60,shake:false}),
  M4:Object.freeze({labelPx:34,particles:16,flash:'red',flashMs:60,shake:false})
});

export const SIGNATURE_PRESETS=Object.freeze({
  swing:Object.freeze({
    sound:'fx.swing',haptic:null,anchor:'swing-pill',
    colors:Object.freeze(['#fff0cf','#f0c14a']),
    callout:'SWING!'
  }),
  cross:Object.freeze({
    sound:'fx.cross',haptic:null,anchor:'swing-pill',
    colors:Object.freeze(['#ffe08a','#f0c14a','#fff0cf']),
    callout:'CROSS!'
  }),
  flip:Object.freeze({
    sound:'fx.flip',haptic:null,anchor:'card',
    colors:Object.freeze([]),
    callout:null,particles:0
  }),
  flipx:Object.freeze({
    sound:'fx.flipx',haptic:null,anchor:'flip-pill',
    colors:Object.freeze(['#e7b6f2','#f0c14a']),
    callout:null
  }),
  bank:Object.freeze({
    sound:'fx.bank',haptic:'light',anchor:'jar',
    colors:Object.freeze(['#e8a23a','#f0c14a','#fff3a8']),
    callout:'BANKED!'
  }),
  zero:Object.freeze({
    sound:'fx.zero',haptic:null,anchor:'meter',
    colors:Object.freeze([]),
    callout:'Pot safe.',shake:false,flash:null,particles:0
  }),
  snap:Object.freeze({
    sound:'fx.snap',haptic:'medium',anchor:'meter',
    colors:Object.freeze(['#e23d4a','#fff0cf']),
    callout:null,praise:false
  })
});
