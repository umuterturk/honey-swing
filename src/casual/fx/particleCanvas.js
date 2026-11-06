const LIFE=0.380;
const DRAW_CAP=40;
const BURST_COLORS=Object.freeze(['#e8a23a','#f0c14a','#fff0cf','#ffca4c']);

function place(particle,index,total){
  if(particle.x!=null)return;
  const count=Math.max(total,1);
  const angle=(index/count)*Math.PI*2-Math.PI/2;
  const spread=0.16+(index%5)*0.012;
  particle.x=0.5+Math.cos(angle)*spread;
  particle.y=0.46+Math.sin(angle)*spread*0.72;
  particle.vx=Math.cos(angle)*0.22;
  particle.vy=Math.sin(angle)*0.16-0.08;
  particle.size=2.5+(index%3);
  particle.life=LIFE;
  particle.color=particle.event==='win-burst'?BURST_COLORS[index%BURST_COLORS.length]:'#fff0cf';
}

// One loop for the shared pool. It starts when particles are live and stops
// when the pool is empty or settle clears it. Reduced motion never draws.
export function createParticleCanvas({
  canvas,pool,reduced=()=>false,
  requestFrame=fn=>window.requestAnimationFrame(fn),
  cancelFrame=id=>window.cancelAnimationFrame(id)
}={}){
  let rafId=0;
  let running=false;
  let last=0;

  function context(){
    try{return canvas?.getContext?.('2d')||null;}
    catch{return null;}
  }
  function clear(ctx){
    const g=ctx||context();
    if(!g)return;
    const width=canvas?.width||0;
    const height=canvas?.height||0;
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
  function draw(now){
    rafId=0;
    if(!running)return;
    if(reduced()){stop();return;}
    const ctx=context();
    if(!ctx){stop();return;}
    const live=pool.live().filter(particle=>particle.alive).slice(0,Math.min(DRAW_CAP,pool.cap||DRAW_CAP));
    clear(ctx);
    if(!live.length){stop();return;}
    const width=canvas.width||300;
    const height=canvas.height||150;
    const dt=last?Math.min(0.05,Math.max(0,(now-last)/1000)):0;
    last=now;
    live.forEach((particle,index)=>{
      place(particle,index,live.length);
      if(particle.born==null)particle.born=now;
      particle.x+=particle.vx*dt;
      particle.y+=particle.vy*dt;
      const age=Math.max(0,(now-particle.born)/1000);
      const fade=particle.life>0?Math.max(0,1-age/particle.life):1;
      ctx.globalAlpha=fade;
      ctx.fillStyle=particle.color||'#e8a23a';
      ctx.beginPath();
      ctx.arc(particle.x*width,particle.y*height,particle.size||3,0,Math.PI*2);
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
    rafId=requestFrame(draw)||0;
  }
  return {kick,stop,running:()=>running};
}
