import {gsap} from 'gsap';

const TRANSFORM_PROPS='transform,x,y,scale,xPercent,yPercent,rotation';
const REDUCED_HOLD_MS=1100;

function showNode(node){
  if(!node?.style)return;
  try{gsap.killTweensOf(node);}catch{/* a dead tween still needs the visible end */}
  try{gsap.set(node,{clearProps:TRANSFORM_PROPS});}catch{/* drop the inline transform below */}
  node.style.removeProperty('transform');
  node.style.opacity='1';
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

function buildCallout(events){
  const main=primary(events);
  const node=document.createElement('span');
  node.className='sgv-fx-callout sgv-fx-callout-'+(main?.id||'fx');
  if(main?.magnitude==='M4'||main?.id==='snap')node.classList.add('sgv-fx-callout-danger');
  node.setAttribute('aria-hidden','true');
  node.style.fontSize=labelSize(events)+'px';
  node.style.pointerEvents='none';
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

function layerOf(root){
  return root?.querySelector?.('.sgv-fx-layer')||null;
}

function clearPrevious(root){
  for(const node of root.querySelectorAll?.('.sgv-fx-callout, .sgv-fx-halo')||[])node.remove();
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
  const nodes=[];
  const showFinal=()=>{
    for(const node of nodes)showNode(node);
    const meter=root.querySelector?.('.sgv-meter-track');
    if(meter){
      try{gsap.killTweensOf(meter);}catch{/* still clear the offset */}
      try{gsap.set(meter,{clearProps:TRANSFORM_PROPS});}catch{/* inline style below */}
      meter.style?.removeProperty('transform');
    }
    for(const pill of root.querySelectorAll?.('[data-factor]')||[])showNode(pill);
  };
  if(reduced){
    const callout=buildCallout(list);
    callout.style.opacity='1';
    root.appendChild(callout);
    nodes.push(callout);
    let held=callout;
    const timer=setTimeout(()=>{
      if(held?.parentNode)held.remove();
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
  const burst=burstOf(list);
  const particles=burst?.particles||0;
  const textual=list.filter(event=>event.callout||(event.callouts&&event.callouts.length));
  if(textual.length){
    const when=Math.max(...textual.map(event=>event.at||0));
    const entry=textual.find(event=>event.entry!=null)?.entry??textual[0].entry??0.150;
    const life=textual[0].life??0.900;
    const callout=buildCallout(textual);
    callout.style.opacity='0';
    nodes.push(callout);
    if(when===0)root.appendChild(callout);
    else timeline.call(()=>{if(callout.parentNode!==root)root.appendChild(callout);},null,when);
    timeline.fromTo(callout,{opacity:0},{
      opacity:1,duration:entry,ease:'power2.out',overwrite:'auto'
    },when);
    timeline.to(callout,{
      opacity:0,duration:0.150,ease:'sine.in',overwrite:'auto'
    },when+life-0.150);
    timeline.call(()=>{if(!stopped)callout.remove();},null,when+life);
  }
  for(const event of list){
    const at=event.at||0;
    if(event.halo){
      const halo=document.createElement('span');
      halo.className='sgv-fx-halo';
      halo.setAttribute('aria-hidden','true');
      halo.style.pointerEvents='none';
      nodes.push(halo);
      timeline.call(()=>{if(halo.parentNode!==root)root.appendChild(halo);},null,at);
      timeline.fromTo(halo,{opacity:0},{opacity:0.85,duration:event.halo/2,ease:'power2.out',overwrite:'auto'},at);
      timeline.to(halo,{opacity:0,duration:event.halo/2,ease:'sine.in',overwrite:'auto'},at+event.halo/2);
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
        const layer=layerOf(root);
        layer?.classList?.remove('sgv-fx-flash','sgv-fx-flash-cream','sgv-fx-flash-red');
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
    timeline.call(()=>{
      bus?.emit({id:burst.id,particles,colors:burst.colors,token});
    },null,at);
    // Drop this burst after the callout, so a finished signature does not
    // keep the canvas frame loop awake. Skip still drains the whole pool.
    timeline.call(()=>{
      bus?.pool?.release?.(particle=>particle.token===token);
    },null,at+0.900);
  }

  let stopped=false;
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
