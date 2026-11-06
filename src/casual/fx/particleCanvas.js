const LIFE=0.380;
const DRAW_CAP=40;
const BURST_COLORS=Object.freeze(['#e8a23a','#f0c14a','#fff0cf','#ffca4c']);

// Backing store in device pixels. CSS still stretches the canvas to the layer.
export function canvasBufferSize(cssWidth,cssHeight,dpr){
  const ratio=Number.isFinite(dpr)&&dpr>0?dpr:1;
  return {
    width:Math.max(1,Math.round(Number(cssWidth)*ratio)),
    height:Math.max(1,Math.round(Number(cssHeight)*ratio)),
    ratio
  };
}

export function syncCanvasBuffer(canvas,cssWidth,cssHeight,dpr){
  if(!canvas||!(cssWidth>0)||!(cssHeight>0))return null;
  const next=canvasBufferSize(cssWidth,cssHeight,dpr);
  if(canvas.width!==next.width)canvas.width=next.width;
  if(canvas.height!==next.height)canvas.height=next.height;
  return next;
}

function readBox(canvas){
  const host=canvas?.parentElement||canvas;
  let cssWidth=host?.clientWidth||0;
  let cssHeight=host?.clientHeight||0;
  if(!(cssWidth>0)||!(cssHeight>0)){
    const rect=host?.getBoundingClientRect?.();
    cssWidth=cssWidth||rect?.width||0;
    cssHeight=cssHeight||rect?.height||0;
  }
  const dpr=typeof window!=='undefined'&&window.devicePixelRatio>0?window.devicePixelRatio:1;
  return {cssWidth,cssHeight,dpr};
}

function place(particle,index,total){
  if(particle.placed)return;
  const count=Math.max(total,1);
  const angle=(index/count)*Math.PI*2-Math.PI/2;
  const spread=18+(index%5)*2;
  particle.vx=Math.cos(angle)*(90+index*3);
  particle.vy=Math.sin(angle)*(90+index*3);
  if(Math.hypot(particle.vx,particle.vy)<1)particle.vx=90;
  particle.x=Math.cos(angle)*spread;
  particle.y=Math.sin(angle)*spread;
  particle.size=2.5+(index%3);
  particle.life=LIFE;
  particle.color=particle.event==='win-burst'?BURST_COLORS[index%BURST_COLORS.length]:'#fff0cf';
  particle.placed=true;
  particle.radial=true;
}

// One loop for the shared pool. It starts when particles are live and stops
// when the pool is empty or settle clears it. Reduced motion never draws.
// Absolute particles are already in CSS pixels. The buffer is CSS size × dpr.
export function createParticleCanvas({
  canvas,pool,reduced=()=>false,budget=null,size=null,
  requestFrame=fn=>window.requestAnimationFrame(fn),
  cancelFrame=id=>window.cancelAnimationFrame(id)
}={}){
  let rafId=0;
  let running=false;
  let last=0;
  let ratio=1;

  function context(){
    try{return canvas?.getContext?.('2d')||null;}
    catch{return null;}
  }
  function resize(){
    const box=typeof size==='function'?size():readBox(canvas);
    const next=syncCanvasBuffer(canvas,box?.cssWidth,box?.cssHeight,box?.dpr);
    if(!next)return ratio;
    ratio=next.ratio;
    return ratio;
  }
  function clear(ctx){
    const g=ctx||context();
    if(!g)return;
    const width=canvas?.width||0;
    const height=canvas?.height||0;
    try{g.setTransform?.(1,0,0,1,0,0);}catch{/* the mock records arcs only */}
    try{g.clearRect(0,0,width,height);}catch{/* a detached canvas still settles */}
  }
  function stop(){
    running=false;
    const id=rafId;
    rafId=0;
    if(id){
      try{cancelFrame(id);}catch{/* already cancelled */}
    }
    clear();
  }
  function drawAbsolute(ctx,particle){
    const radius=(particle.radius||particle.size||3)*ratio;
    const x=(particle.x||0)*ratio;
    const y=(particle.y||0)*ratio;
    const alpha=particle.opacity==null?1:particle.opacity;
    if(particle.edge){
      ctx.globalAlpha=alpha;
      ctx.fillStyle=particle.edge;
      ctx.beginPath();
      ctx.arc(x+2*ratio,y+2*ratio,radius,0,Math.PI*2);
      ctx.fill();
    }
    ctx.globalAlpha=alpha;
    ctx.fillStyle=particle.color||'#f0c14a';
    ctx.beginPath();
    ctx.arc(x,y,radius,0,Math.PI*2);
    ctx.fill();
  }
  function draw(now){
    rafId=0;
    if(!running)return;
    if(reduced()){stop();return;}
    const ctx=context();
    if(!ctx){stop();return;}
    resize();
    const live=pool.live().filter(particle=>particle.alive).slice(0,Math.min(DRAW_CAP,pool.cap||DRAW_CAP));
    clear(ctx);
    if(!live.length){stop();return;}
    const width=canvas.width||300;
    const height=canvas.height||150;
    const frameMs=last?Math.min(50,Math.max(0,now-last)):0;
    if(last)budget?.sample(frameMs);
    const dt=frameMs/1000;
    last=now;
    const free=live.filter(particle=>!particle.absolute);
    live.forEach(particle=>{
      if(particle.absolute){
        drawAbsolute(ctx,particle);
        return;
      }
      const index=free.indexOf(particle);
      place(particle,index,free.length);
      if(particle.born==null)particle.born=now;
      particle.x+=particle.vx*dt;
      particle.y+=particle.vy*dt;
      const age=Math.max(0,(now-particle.born)/1000);
      const fade=particle.life>0?Math.max(0,1-age/particle.life):1;
      const originX=width/2;
      const originY=height/2;
      ctx.globalAlpha=fade;
      ctx.fillStyle=particle.color||'#e8a23a';
      ctx.beginPath();
      ctx.arc(originX+particle.x*ratio,originY+particle.y*ratio,(particle.size||3)*ratio,0,Math.PI*2);
      ctx.fill();
    });
    try{ctx.globalAlpha=1;}catch{/* the mock only records the draw */}
    if(!running)return;
    rafId=requestFrame(draw)||0;
  }
  function kick(){
    if(running||reduced())return;
    if(!pool||pool.liveCount()<=0)return;
    running=true;
    last=0;
    resize();
    rafId=requestFrame(draw)||0;
  }
  return {kick,stop,resize,running:()=>running,ratio:()=>ratio};
}
