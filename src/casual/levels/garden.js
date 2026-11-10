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
    target:10,star2:13,star3:13,factors:Object.freeze(['swing']),
    potCap:13,showChances:false,garden:1,auto3:true,
    flipOnly:false,zeroGate:false,pulse:'card',dock:'swing',telegraph:false
  }),
  Object.freeze({
    id:4,name:'Either Side',deck:Object.freeze([1,3,24]),hand:3,
    target:12,star2:13,star3:14,factors:Object.freeze(['swing']),
    potCap:14,showChances:false,garden:1,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:5,name:'Hot Streak',deck:Object.freeze([1,0,11,2]),hand:2,
    target:13,star2:18,star3:22,factors:Object.freeze(['swing','flip']),
    potCap:13,showChances:false,garden:1,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'flip',dock:'flip-pill',telegraph:false
  }),
  Object.freeze({
    id:6,name:'Sweet Mix',deck:Object.freeze([2,24,0]),hand:2,
    target:10,star2:22,star3:34,factors:Object.freeze(['swing','flip']),
    potCap:10,showChances:false,garden:1,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:7,name:'Golden Flip',deck:Object.freeze([1,2,25]),hand:2,
    target:17,star2:28,star3:38,factors:Object.freeze(['swing','flip']),
    potCap:17,showChances:false,garden:1,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card-then-flip',dock:null,telegraph:false
  }),
  Object.freeze({
    id:8,name:'The Big Jar',deck:Object.freeze([3,0,25]),hand:2,
    target:24,star2:33,star3:41,factors:Object.freeze(['swing','flip']),
    potCap:24,showChances:false,garden:1,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:9,name:'Perfect Stop',deck:Object.freeze([2,24,1]),hand:3,
    target:10,star2:14,star3:18,factors:Object.freeze(['swing']),
    potCap:10,showChances:false,garden:1,auto3:false,
    flipOnly:false,zeroGate:true,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:10,name:'Still Safe',deck:Object.freeze([3,25,1]),hand:3,
    target:12,star2:16,star3:20,factors:Object.freeze(['swing']),
    potCap:20,showChances:false,garden:1,auto3:false,
    flipOnly:false,zeroGate:true,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:11,name:'Edge of the Jar',deck:Object.freeze([1,20,4,5,22,2]),hand:3,
    target:9,star2:21,star3:32,factors:Object.freeze(['swing','flip']),
    potCap:9,showChances:true,garden:1,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:'hearts',telegraph:false
  }),
  Object.freeze({
    id:12,name:'Known Snap',deck:Object.freeze([1,5,20,4,5,22,2]),hand:3,
    target:9,star2:20,star3:30,factors:Object.freeze(['swing','flip']),
    potCap:60,showChances:true,garden:1,auto3:false,
    flipOnly:false,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:13,name:'L13',deck:Object.freeze([0,1,20,21,2,22,1,2]),hand:6,
    target:44,star2:51,star3:57,factors:Object.freeze(['swing','flip']),
    potCap:40,showChances:true,garden:2,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:14,name:'L14',deck:Object.freeze([1,22,0,21,2,20,23,1,2]),hand:6,
    target:56,star2:64,star3:73,factors:Object.freeze(['swing','flip']),
    potCap:45,showChances:true,garden:2,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:15,name:'L15',deck:Object.freeze([3,24,1,22,0,21,2,25,1,23]),hand:6,
    target:95,star2:109,star3:124,factors:Object.freeze(['swing','flip']),
    potCap:55,showChances:true,garden:2,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:16,name:'L16',deck:Object.freeze([0,1,20,22,11,21,0,1]),hand:6,
    target:38,star2:44,star3:49,factors:Object.freeze(['swing','flip']),
    potCap:35,showChances:true,garden:2,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:17,name:'L17',deck:Object.freeze([2,22,1,24,3,20,21,2,22]),hand:6,
    target:70,star2:80,star3:91,factors:Object.freeze(['swing','flip']),
    potCap:50,showChances:true,garden:2,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:18,name:'L18',deck:Object.freeze([4,25,3,21,5,20,2,24,1,23]),hand:6,
    target:110,star2:126,star3:143,factors:Object.freeze(['swing','flip']),
    potCap:60,showChances:true,garden:2,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:19,name:'L19',deck:Object.freeze([5,25,4,23,2,21,24,3,22,5,21]),hand:6,
    target:140,star2:161,star3:182,factors:Object.freeze(['swing','flip']),
    potCap:70,showChances:true,garden:2,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card',dock:null,telegraph:false
  }),
  Object.freeze({
    id:20,name:'L20',deck:Object.freeze([0,1,2,20,21,22,0,1]),hand:6,
    target:40,star2:46,star3:52,factors:Object.freeze(['swing','flip']),
    potCap:35,showChances:true,garden:2,auto3:false,
    flipOnly:true,zeroGate:false,pulse:'card',dock:null,telegraph:false
  })
]);
