// Garden levels. One frozen record each. This file imports nothing.
export const GARDEN=Object.freeze([
  Object.freeze({
    id:1,name:'Honey Drop',deck:Object.freeze([1,2,12]),hand:3,
    target:5,star2:5,star3:5,factors:Object.freeze([]),
    potCap:5,showChances:false,garden:1,auto3:true,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:2,name:'Two Ways',deck:Object.freeze([3,21]),hand:2,
    target:6,star2:6,star3:6,factors:Object.freeze([]),
    potCap:6,showChances:false,garden:1,auto3:true,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:3,name:'The Crossing',deck:Object.freeze([2,24]),hand:2,
    target:8,star2:11,star3:13,factors:Object.freeze(['swing']),
    potCap:8,showChances:false,garden:1,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:'swing',telegraph:false
  }),
  Object.freeze({
    id:4,name:'Either Side',deck:Object.freeze([1,3,24]),hand:3,
    target:11,star2:18,star3:24,factors:Object.freeze(['swing']),
    potCap:11,showChances:false,garden:1,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:5,name:'Mystery Card',deck:Object.freeze([2,1,0]),hand:2,
    target:6,star2:6,star3:6,factors:Object.freeze(['swing']),
    potCap:6,showChances:false,garden:1,auto3:true,
    flipOnly:true,zeroGate:false,pulse:'flip',dock:'flip',telegraph:false
  }),
  Object.freeze({
    id:6,name:'Hot Streak',deck:Object.freeze([1,0,11,2]),hand:2,
    target:13,star2:18,star3:22,factors:Object.freeze(['swing','flip']),
    potCap:13,showChances:false,garden:1,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'flip',dock:'flip-pill',telegraph:false
  }),
  Object.freeze({
    id:7,name:'Sweet Mix',deck:Object.freeze([2,24,0]),hand:2,
    target:10,star2:22,star3:34,factors:Object.freeze(['swing','flip']),
    potCap:10,showChances:false,garden:1,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:8,name:'Golden Flip',deck:Object.freeze([1,2,25]),hand:2,
    target:17,star2:28,star3:38,factors:Object.freeze(['swing','flip']),
    potCap:17,showChances:false,garden:1,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card-then-flip',dock:null,telegraph:false
  }),
  Object.freeze({
    id:9,name:'Easy Garden',deck:Object.freeze([4,25]),hand:2,
    target:11,star2:17,star3:17,factors:Object.freeze(['swing']),
    potCap:11,showChances:false,garden:1,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:10,name:'Perfect Stop',deck:Object.freeze([2,24,1]),hand:3,
    target:10,star2:14,star3:18,factors:Object.freeze(['swing']),
    potCap:10,showChances:false,garden:1,auto3:false,
    flipOnly:false,zeroGate:true,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:11,name:'Edge of the Jar',deck:Object.freeze([1,20,4,6,22,2]),hand:3,
    target:9,star2:21,star3:32,factors:Object.freeze(['swing','flip']),
    potCap:9,showChances:true,garden:1,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:'hearts',telegraph:false
  }),
  Object.freeze({
    id:12,name:'The Big Jar',deck:Object.freeze([3,0,25]),hand:2,
    target:24,star2:33,star3:41,factors:Object.freeze(['swing','flip']),
    potCap:24,showChances:true,garden:1,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:13,name:'Lower Orchard',deck:Object.freeze([2,1,25]),hand:2,
    target:16,star2:27,star3:38,factors:Object.freeze(['swing','flip']),
    potCap:16,showChances:true,garden:2,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:14,name:'Second Row',deck:Object.freeze([4,1,25]),hand:2,
    target:20,star2:38,star3:56,factors:Object.freeze(['swing','flip']),
    potCap:20,showChances:true,garden:2,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:15,name:'Light Test',deck:Object.freeze([3,8,0,25]),hand:2,
    target:30,star2:36,star3:41,factors:Object.freeze(['swing','flip']),
    potCap:30,showChances:true,garden:2,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:16,name:'Easy Row',deck:Object.freeze([4,8,25]),hand:2,
    target:11,star2:17,star3:17,factors:Object.freeze(['swing','flip']),
    potCap:34,showChances:true,garden:2,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:17,name:'Known Zero',deck:Object.freeze([2,8,24,1]),hand:3,
    target:10,star2:14,star3:18,factors:Object.freeze(['swing','flip']),
    potCap:36,showChances:true,garden:2,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:18,name:'Known Snap',deck:Object.freeze([1,8,20,4,6,22,2]),hand:3,
    target:9,star2:20,star3:30,factors:Object.freeze(['swing','flip']),
    potCap:60,showChances:true,garden:2,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:19,name:'Hard Path',deck:Object.freeze([3,8,0,25]),hand:2,
    target:24,star2:33,star3:41,factors:Object.freeze(['swing','flip']),
    potCap:82,showChances:true,garden:2,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:true
  }),
  Object.freeze({
    id:20,name:'Gift Jar',deck:Object.freeze([2,8,3]),hand:2,
    target:6,star2:7,star3:7,factors:Object.freeze(['swing','flip']),
    potCap:14,showChances:true,garden:2,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  })
]);
