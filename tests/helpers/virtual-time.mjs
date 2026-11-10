// Installed before GSAP loads. The ticker keeps the Date.now it first sees.
const realDateNow=Date.now;
let virtualNow=realDateNow();
Date.now=()=>virtualNow;

export function advanceVirtual(ms){
  virtualNow+=ms;
}

export function restoreVirtual(){
  Date.now=realDateNow;
}
