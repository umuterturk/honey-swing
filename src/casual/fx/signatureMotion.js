import {gsap} from 'gsap';
import {centerOf} from './layerPoint.js';

const TRANSFORM_PROPS='transform,x,y,scale,xPercent,yPercent,rotation';
const REDUCED_HOLD_MS=1100;
const SNAP_LEAD_END=0.440;
const SNAP_NEXT=0.450;
const SNAP_END=0.900;

function paintPersistent(node){
  if(!node?.style)return;
  try{gsap.killTweensOf(node);}catch{/* a dead tween still needs the visible end */}
  try{gsap.set(node,{clearProps:TRANSFORM_PROPS});}catch{/* drop the inline transform below */}
  node.style.removeProperty('transform');
  node.style.opacity='1';
}

function dropTransient(node){
  if(!node)return;
  try{gsap.killTweensOf(node);}catch{/* removal still has to happen */}
  node.remove();
}

function linesOf(events){
  const lines=[];
  for(const event of events){
    if(Array.isArray(event.callouts))lines.push(...event.callouts.filter(Boolean));
    else if(event.callout)lines.push(event.callout);
  }
  return lines;
}

function labelSize(events){
  let size=22;
  for(const event of events){
    if(event.labelPx>size)size=event.labelPx;
  }
  return size;
}

function primary(events){
  const ranked=[...events].sort((a,b)=>(b.labelPx||0)-(a.labelPx||0));
  return ranked.find(event=>event.callout||event.callouts)||events[events.length-1]||events[0];
}

function burstOf(events){
  let best=null;
  for(const event of events){
    if((event.particles||0)>(best?.particles||0))best=event;
  }
  return best;
}

function hostOf(root){
  return root?.querySelector?.('.sgv-fx-layer')||root;
}

function anchorElement(root,event){
  switch(event?.anchor){
    case 'swing-pill': return root.querySelector('[data-factor="swing"]');
    case 'flip-pill': return root.querySelector('[data-factor="flip"]');
    case 'jar': return root.querySelector('.sgv-chest-mouth')||root.querySelector('.sgv-bank-command');
    case 'card': return root.querySelector('.sgv-flying-card')||root.querySelector('.sgv-card');
    case 'pot': return root.querySelector('.sgv-pending-pot');
    default: return root.querySelector('.sgv-meter-track');
  }
}

// Snap uses a meter edge. Every other anchor is the shared layer-local center.
function originFor(root,host,event){
  const node=anchorElement(root,event);
  const layer=host?.classList?.contains?.('sgv-fx-layer')?host:root.querySelector?.('.sgv-fx-layer')||host;
  if(event?.id!=='snap')return centerOf(node,layer);
  const rect=node?.getBoundingClientRect?.();
  if(!rect)return null;
  const origin=layer?.getBoundingClientRect?.();
  const originX=origin&&Number.isFinite(origin.left)?origin.left:(origin?.x||0);
  const originY=origin&&Number.isFinite(origin.top)?origin.top:(origin?.y||0);
  const left=Number.isFinite(rect.left)?rect.left:(rect.x||0);
  const top=Number.isFinite(rect.top)?rect.top:(rect.y||0);
  const width=rect.width||0;
  const right=Number.isFinite(rect.right)?rect.right:left+width;
  const x=Number(event.to)<0?left-originX:right-originX;
  const y=top+(rect.height||0)/2-originY;
  return {x,y};
}

function pin(node,origin){
  node.style.position='absolute';
  node.style.pointerEvents='none';
  if(!origin)return;
  node.style.left=origin.x+'px';
  node.style.top=origin.y+'px';
  node.style.transform='translate(-50%, -50%)';
}

function buildCallout(events){
  const main=primary(events);
  const node=document.createElement('span');
  node.className='sgv-fx-callout sgv-fx-callout-'+(main?.id||'fx');
  if(main?.magnitude==='M4'||main?.id==='snap')node.classList.add('sgv-fx-callout-danger');
  node.setAttribute('aria-hidden','true');
  node.style.fontSize=labelSize(events)+'px';
  const lines=linesOf(events);
  const amount=events.find(event=>event.amount!=null)?.amount;
  if(lines.length===1&&amount==null)node.textContent=lines[0];
  else{
    for(const line of lines){
      const row=document.createElement('span');
      row.textContent=line;
      node.appendChild(row);
    }
    if(amount!=null){
      const figure=document.createElement('span');
      figure.className='sgv-fx-amount';
      figure.textContent=String(amount);
      node.appendChild(figure);
    }
  }
  return node;
}

function lineCallout(text,event){
  const node=document.createElement('span');
  node.className='sgv-fx-callout sgv-fx-callout-snap sgv-fx-callout-danger';
  node.setAttribute('aria-hidden','true');
  node.style.fontSize=(event.labelPx||34)+'px';
  node.textContent=text;
  return node;
}

function clearPrevious(root){
  for(const node of root?.querySelectorAll?.('.sgv-fx-callout, .sgv-fx-halo')||[])node.remove();
}

function seconds(ms){
  return (Number(ms)||0)/1000;
}

function empty(particles=0){
  return {motion:false,timeline:null,particles,holdMs:0,cancel(){},showFinal(){}};
}

// Plays one committed signature list on the fx bus. It never starts a
// presentation and never moves the meter percent.
export function playSignatures({events=[],root=null,bus=null,reduced=false}={}){
  const list=Array.isArray(events)?events.filter(Boolean):[];
  if(root)clearPrevious(root);
  if(!root||!list.length)return empty(0);
  const host=hostOf(root);
  const nodes=[];
  const showFinal=()=>{
    for(const node of nodes)dropTransient(node);
    nodes.length=0;
    clearPrevious(root);
    const meter=root.querySelector?.('.sgv-meter-track');
    paintPersistent(meter);
    for(const pill of root.querySelectorAll?.('[data-factor]')||[])paintPersistent(pill);
  };
  const place=(node,event)=>{
    pin(node,originFor(root,host,event));
    nodes.push(node);
  };
  if(reduced){
    const callout=buildCallout(list);
    callout.style.opacity='1';
    place(callout,primary(list));
    host.appendChild(callout);
    let held=callout;
    const timer=setTimeout(()=>{
      dropTransient(held);
      held=null;
    },REDUCED_HOLD_MS);
    timer.unref?.();
    let stopped=false;
    const cancel=()=>{
      if(stopped)return;
      stopped=true;
      clearTimeout(timer);
      showFinal();
    };
    return {motion:false,timeline:null,particles:0,holdMs:REDUCED_HOLD_MS,showFinal,cancel};
  }

  const timeline=gsap.timeline({paused:true});
  let stopped=false;
  const burst=burstOf(list);
  const particles=burst?.particles||0;
  const snap=list.find(event=>event.id==='snap'&&Array.isArray(event.callouts));
  const textual=list.filter(event=>event!==snap&&(event.callout||(event.callouts&&event.callouts.length)));
  const mount=(node,when)=>{
    const add=()=>{if(!stopped&&node.parentNode!==host)host.appendChild(node);};
    if(when<=0)add();
    else timeline.call(add,null,when);
  };
  const reveal=(node,start,end)=>{
    timeline.fromTo(node,{opacity:0},{
      opacity:1,duration:0.150,ease:'power2.out',overwrite:'auto'
    },start);
    timeline.to(node,{
      opacity:0,duration:0.150,ease:'sine.in',overwrite:'auto'
    },Math.max(start,end-0.150));
    timeline.call(()=>{if(!stopped)dropTransient(node);},null,end);
  };
  if(snap){
    const [first,second]=snap.callouts;
    const lead=lineCallout(first,snap);
    const follow=second?lineCallout(second,snap):null;
    place(lead,snap);
    mount(lead,0);
    reveal(lead,0,SNAP_LEAD_END);
    if(follow){
      const followOrigin=originFor(root,host,snap);
      place(follow,snap);
      if(followOrigin)follow.style.top=(followOrigin.y+28)+'px';
      mount(follow,SNAP_NEXT);
      reveal(follow,SNAP_NEXT,SNAP_END);
    }
  }
  if(textual.length){
    const when=Math.max(...textual.map(event=>event.at||0));
    const entry=textual.find(event=>event.entry!=null)?.entry??0.150;
    const life=textual[0].life??0.900;
    const callout=buildCallout(textual);
    callout.style.opacity='0';
    place(callout,primary(textual));
    mount(callout,when);
    timeline.fromTo(callout,{opacity:0},{
      opacity:1,duration:entry,ease:'power2.out',overwrite:'auto'
    },when);
    timeline.to(callout,{
      opacity:0,duration:0.150,ease:'sine.in',overwrite:'auto'
    },when+life-0.150);
    timeline.call(()=>{if(!stopped)dropTransient(callout);},null,when+life);
  }
  for(const event of list){
    const at=event.at||0;
    if(event.halo){
      const halo=document.createElement('span');
      halo.className='sgv-fx-halo';
      halo.setAttribute('aria-hidden','true');
      place(halo,event);
      mount(halo,at);
      timeline.fromTo(halo,{opacity:0},{opacity:0.85,duration:event.halo/2,ease:'power2.out',overwrite:'auto'},at);
      timeline.to(halo,{opacity:0,duration:event.halo/2,ease:'sine.in',overwrite:'auto'},at+event.halo/2);
      timeline.call(()=>{if(!stopped)dropTransient(halo);},null,at+event.halo);
    }
    timeline.call(()=>{
      const spec={id:event.id,particles:0};
      if(event.sound)spec.sound=event.sound;
      if(event.haptic)spec.haptic=event.haptic;
      if(event.flash)spec.flash=event.flash;
      if(event.shake)spec.shake=true;
      bus?.emit(spec);
    },null,at);
    if(event.flash&&event.flashMs>0){
      timeline.call(()=>{
        host?.classList?.remove('sgv-fx-flash','sgv-fx-flash-cream','sgv-fx-flash-red');
      },null,at+seconds(event.flashMs));
    }
    if(event.shake){
      const meter=root.querySelector?.('.sgv-meter-track');
      if(meter){
        const step=(event.shakeDuration||0.280)/4;
        const amp=event.shakeAmplitude??3;
        timeline.to(meter,{
          keyframes:[
            {x:amp,duration:step},
            {x:-amp,duration:step},
            {x:amp,duration:step},
            {x:0,duration:step}
          ],
          ease:'none',overwrite:'auto'
        },at);
      }
    }
    const pillName=event.anchor==='swing-pill'?'swing':event.anchor==='flip-pill'?'flip':null;
    if(pillName){
      const pill=root.querySelector?.('[data-factor="'+pillName+'"]');
      if(pill){
        timeline.fromTo(pill,{scale:1},{
          scale:1.12,duration:0.12,ease:'power2.out',yoyo:true,repeat:1,overwrite:'auto'
        },at);
      }
    }
  }
  if(burst&&particles>0){
    const at=(burst.at||0)+(burst.particleDelay||0);
    const token=(burst.id||'fx')+':'+at;
    const origin=originFor(root,host,burst);
    timeline.call(()=>{
      bus?.emit({id:burst.id,particles,colors:burst.colors,token,origin});
    },null,at);
    timeline.call(()=>{
      bus?.pool?.release?.(particle=>particle.token===token);
    },null,at+0.900);
  }

  let finishing=false;
  const nativeKill=timeline.kill.bind(timeline);
  timeline.kill=function(...args){
    if(finishing)return nativeKill.apply(timeline,args);
    finishing=true;
    stopped=true;
    let result;
    try{result=nativeKill.apply(timeline,args);}catch{result=undefined;}
    showFinal();
    finishing=false;
    return result;
  };
  bus?.register(timeline);
  const cancel=()=>{
    if(stopped){
      showFinal();
      try{bus?.settle();}catch{/* already clear */}
      return;
    }
    try{timeline.kill();}catch{showFinal();}
    try{bus?.settle();}catch{/* particles still drain on the next settle */}
    showFinal();
  };
  timeline.play();
  return {motion:true,timeline,particles,holdMs:0,showFinal,cancel};
}
