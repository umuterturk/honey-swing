export const PARTICLE_CAP=40;

// Oldest particles are dropped first so a burst can never exceed the cap.
export function createParticlePool({cap=PARTICLE_CAP}={}){
  const live=[];
  let nextId=1;
  function spawn(spec={}){
    while(live.length>=cap){
      const oldest=live.shift();
      if(oldest)oldest.alive=false;
    }
    const particle={...spec,id:nextId++,alive:cap>0};
    if(cap<=0)return particle;
    live.push(particle);
    return particle;
  }
  function release(particle){
    const index=live.indexOf(particle);
    if(index<0)return;
    particle.alive=false;
    live.splice(index,1);
  }
  function drain(){
    for(const particle of live)particle.alive=false;
    live.length=0;
  }
  return {
    cap,
    spawn,
    release,
    liveCount:()=>live.length,
    live:()=>live.slice(),
    drain
  };
}
